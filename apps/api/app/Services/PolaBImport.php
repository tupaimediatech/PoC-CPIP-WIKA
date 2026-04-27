<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMaterialLog;
use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use App\Services\WorkItemCalculator;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Parser untuk Pola B — Mixed layout 1 sheet (File 4)
 *
 * Sheet tunggal berisi 3 zona berbeda:
 *   Zona 1: Metadata proyek (baris 1–7 ish): project_code, nama, manager, progress
 *   Zona 2: Tabel rekap HPP hierarkis (dimulai dari header "Nomor | Kategori | Budget ...")
 *   Zona 3: Tabel detail vendor/material (dimulai dari header "no | vendor | material | qty ...")
 */
class PolaBImport
{
    private WorkbookFieldMapper $mapper;

    private array $errors       = [];
    private array $unrecognized = [];
    private int   $imported     = 0;
    private int   $skipped      = 0;
    private int   $total        = 0;

    public function __construct()
    {
        $this->mapper = new WorkbookFieldMapper();
    }

    public function import(string $filePath, ?int $ingestionFileId = null): array
    {
        $this->errors       = [];
        $this->unrecognized = [];
        $this->imported     = 0;
        $this->skipped      = 0;
        $this->total        = 0;

        $spreadsheet = IOFactory::load($filePath);
        $sheet       = $spreadsheet->getActiveSheet();
        // formatData=false so percent/currency cells come through as raw numerics
        // (0.83, not "83.0%") instead of their display strings.
        $raw         = $sheet->toArray(null, true, false, false);

        if (empty($raw)) {
            throw new \RuntimeException('File Excel kosong.');
        }

        // ── Deteksi zona ──────────────────────────────────────────────────
        $mergedHeaderRow = $this->mapper->findHeaderRowByKeywords(
            $raw,
            ['item pekerjaan', 'volume budget', 'harga satuan', 'vendor']
        );

        $hppHeaderRow    = $mergedHeaderRow === null
            ? $this->mapper->findHeaderRowByKeywords($raw, ['budget', 'realisasi', 'deviasi'])
            : null;
        $vendorHeaderRow = $mergedHeaderRow === null
            ? ($this->mapper->findHeaderRowByKeywords($raw, ['vendor', 'material', 'qty'])
                ?? $this->mapper->findHeaderRowByKeywords($raw, ['supplier', 'material', 'qty']))
            : null;

        // ── Zona 1: Metadata ──────────────────────────────────────────────
        $metaBoundary = $mergedHeaderRow ?? $hppHeaderRow ?? count($raw);
        $metaRows = array_slice($raw, 0, $metaBoundary);
        $meta     = $this->parseMetadata($metaRows);

        if (empty($meta['project_code'])) {
            throw new \RuntimeException('project_code tidak ditemukan di metadata sheet.');
        }

        $this->total++;

        // Upsert project — financial/operational fields are nullable when not in file
        $project = Project::firstOrCreate(
            ['project_code' => $meta['project_code']],
            [
                'project_name'      => $meta['project_name'] ?? $meta['project_code'],
                'division'          => $meta['division'] ?? null,
                'owner'             => $meta['client_name'] ?? null,
                'contract_value'    => $meta['contract_value'] ?? null,
                'planned_cost'      => $meta['planned_cost'] ?? null,
                'actual_cost'       => $meta['actual_cost'] ?? null,
                'planned_duration'  => $meta['planned_duration'] ?? null,
                'actual_duration'   => $meta['actual_duration'] ?? null,
                'progress_pct'      => $meta['progress_total_pct'] ?? 0,
                'project_year'      => $meta['project_year'] ?? now()->year,
                'ingestion_file_id' => $ingestionFileId,
            ]
        );

        $this->imported++;

        if ($mergedHeaderRow !== null) {
            // ── Merged single-table layout: one WBS phase per Roman-numeral row ──
            $rows = array_slice($raw, $mergedHeaderRow);
            $this->parseMergedLayout(
                $rows,
                $project,
                $meta,
                $ingestionFileId,
                (int) ($meta['project_year'] ?? $project->project_year)
            );
        } else {
            // ── Traditional: single WBS phase from metadata ───────────────
            $wbsName = $meta['name_of_work_phase']
                ?? $meta['period_label']
                ?? $meta['period']
                ?? 'PEKERJAAN UMUM';

            $wbsPhase = ProjectWbs::updateOrCreate(
                ['project_id' => $project->id, 'name_of_work_phase' => $wbsName],
                [
                    'ingestion_file_id'  => $ingestionFileId,
                    'client_name'        => $meta['client_name'] ?? null,
                    'project_manager'    => $meta['project_manager'] ?? null,
                    'report_source'      => 'file_import',
                    'progress_prev_pct'  => $meta['progress_prev_pct'] ?? null,
                    'progress_this_pct'  => $meta['progress_this_pct'] ?? null,
                    'progress_total_pct' => $meta['progress_total_pct'] ?? null,
                    'contract_value'     => $meta['contract_value'] ?? null,
                    'addendum_value'     => $meta['addendum_value'] ?? null,
                    'bq_external'        => $meta['bq_external'] ?? null,
                ]
            );

            // ── Zona 2: HPP Table ─────────────────────────────────────────
            if ($hppHeaderRow !== null) {
                $hppRows = isset($vendorHeaderRow)
                    ? array_slice($raw, $hppHeaderRow, $vendorHeaderRow - $hppHeaderRow)
                    : array_slice($raw, $hppHeaderRow);

                $this->parseWorkItems($hppRows, $wbsPhase->id);
            }

            // ── Zona 3: Vendor/Material ───────────────────────────────────
            if ($vendorHeaderRow !== null) {
                $vendorRows = array_slice($raw, $vendorHeaderRow);
                $this->parseMaterialLogs(
                    $vendorRows,
                    $wbsPhase->id,
                    (int) ($meta['project_year'] ?? $project->project_year)
                );
            }
        }

        // ── Rollup: per-phase HPP totals + project-level CPI/SPI ──────────
        $phaseIds = $project->wbsPhases()->pluck('id')->all();

        foreach ($project->wbsPhases()->get() as $phase) {
            $phasePlan   = (float) ProjectWorkItem::where('period_id', $phase->id)
                ->whereNull('parent_id')->where('is_total_row', false)->sum('total_budget');
            $phaseActual = (float) ProjectWorkItem::where('period_id', $phase->id)
                ->whereNull('parent_id')->where('is_total_row', false)->sum('realisasi');
            $bqExternal  = (float) $phase->bq_external;

            // Fallback: merged-layout Excel doesn't expose per-phase contract
            // metadata, so default BQ External to the phase's planned total.
            if ($bqExternal <= 0) {
                $bqExternal = $phasePlan;
            }

            // Deviasi (%) follows the contract: (Nilai Budget − Nilai Aktual) / Nilai Budget.
            $deviasiPct = $phasePlan > 0
                ? (($phasePlan - $phaseActual) / $phasePlan) * 100
                : 0;

            $phase->update([
                'bq_external'    => $bqExternal,
                'actual_costs'   => $phasePlan,
                'realized_costs' => $phaseActual,
                'hpp_deviation'  => $phasePlan - $phaseActual,
                'deviasi_pct'    => $deviasiPct,
            ]);
        }

        // Project-level totals across every phase (top-level items in each phase).
        $hppPlan   = (float) ProjectWorkItem::whereIn('period_id', $phaseIds)
            ->whereNull('parent_id')->where('is_total_row', false)->sum('total_budget');
        $hppActual = (float) ProjectWorkItem::whereIn('period_id', $phaseIds)
            ->whereNull('parent_id')->where('is_total_row', false)->sum('realisasi');
        $evSum     = (float) ProjectWorkItem::whereIn('period_id', $phaseIds)
            ->whereNull('parent_id')->where('is_total_row', false)->sum('earned_value');
        $pvSum     = (float) ProjectWorkItem::whereIn('period_id', $phaseIds)
            ->whereNull('parent_id')->where('is_total_row', false)->sum('planned_value');

        if ($hppPlan > 0 || $hppActual > 0) {
            $progressPct = $hppPlan > 0 ? round(($evSum / $hppPlan) * 100, 2) : 0.0;

            $project->update([
                'planned_cost'     => $project->planned_cost   ?: $hppPlan,
                'actual_cost'      => $project->actual_cost    ?: $hppActual,
                'contract_value'   => $project->contract_value ?: $hppPlan,
                'progress_pct'     => $progressPct,
                'hpp'              => $hppPlan,
                'gross_profit_pct' => null,
            ]);

            // SPI = EV / PV. Boot hook returns null when duration info is absent, so
            // write it + status directly without re-triggering the hook.
            if ($pvSum > 0 && $evSum > 0) {
                $spi = round($evSum / $pvSum, 4);
                $cpi = (float) $project->fresh()->cpi;
                $status = ($cpi < 0.9 || $spi < 0.9) ? 'critical'
                    : ($cpi >= 1.0 && $spi >= 1.0 ? 'good' : 'warning');

                \DB::table('projects')->where('id', $project->id)->update([
                    'spi'    => $spi,
                    'status' => $status,
                ]);
            }
        }

        return [
            'total'                => $this->total,
            'imported'             => $this->imported,
            'skipped'              => $this->skipped,
            'errors'               => $this->errors,
            'unrecognized_columns' => array_values(array_unique($this->unrecognized)),
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Parse key-value metadata from the top zone (Zona 1)
    // ──────────────────────────────────────────────────────────────────────────
    private function parseMetadata(array $rows): array
    {
        $meta = [];

        foreach ($rows as $row) {
            $row = array_values(array_filter($row, fn($c) => $c !== null && $c !== ''));

            if (count($row) < 2) continue;

            $rawKey = (string) $row[0];
            // resolveAlias normalizes then checks builtin + DB aliases in one pass
            $key    = $this->mapper->resolveAlias($rawKey, 'project')
                   ?? $this->mapper->normalizeHeader($rawKey);
            $val    = $row[1];

            switch ($key) {
                case 'project_code':       $meta['project_code']       = trim((string) $val); break;
                case 'project_name':       $meta['project_name']       = trim((string) $val); break;
                case 'project_year':       $meta['project_year']       = (int) $val; break;
                case 'owner':
                case 'client_name':        $meta['client_name']        = trim((string) $val); break;
                case 'project_manager':    $meta['project_manager']    = trim((string) $val); break;
                case 'contract_value':     $meta['contract_value']     = $this->mapper->parseNumeric($val); break;
                case 'addendum_value':     $meta['addendum_value']     = $this->mapper->parseNumeric($val); break;
                case 'planned_cost':       $meta['planned_cost']       = $this->mapper->parseNumeric($val); break;
                case 'actual_cost':        $meta['actual_cost']        = $this->mapper->parseNumeric($val); break;
                case 'planned_duration':   $meta['planned_duration']   = (int) $val; break;
                case 'actual_duration':    $meta['actual_duration']    = (int) $val; break;
                case 'progress_pct':
                case 'progress_total_pct': $meta['progress_total_pct'] = $this->mapper->parseNumeric($val); break;
            }

            // Deteksi format "Periode: Maret 2026" atau "Bulan: 2026-03"
            if (str_contains(strtolower($rawKey), 'periode') ||
                str_contains(strtolower($rawKey), 'bulan')) {
                $meta['period_label'] = trim((string) $val);
                $p = $this->mapper->parsePeriod((string) $val);
                if ($p) $meta['period'] = $p;
            }

            // Progress fisik "s/d bulan lalu: X% | bulan ini: Y% | total: Z%"
            if (count($row) >= 4 && str_contains(strtolower($rawKey), 'progress')) {
                $meta['progress_prev_pct']  = $this->mapper->parseNumeric($row[1] ?? 0);
                $meta['progress_this_pct']  = $this->mapper->parseNumeric($row[2] ?? 0);
                $meta['progress_total_pct'] = $this->mapper->parseNumeric($row[3] ?? 0);
            }
        }

        if (isset($meta['contract_value'], $meta['addendum_value'])) {
            $meta['bq_external'] = $meta['contract_value'] + $meta['addendum_value'];
        }

        return $meta;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Parse HPP work items table (Zona 2)
    // ──────────────────────────────────────────────────────────────────────────
    private function parseWorkItems(array $rows, int $periodId): void
    {
        if (empty($rows)) return;

        // resolveHeaders normalizes + applies builtin aliases + DB aliases in one pass
        $headers = $this->mapper->resolveHeaders($rows[0], 'work_item');
        $this->unrecognized = array_merge(
            $this->unrecognized,
            $this->mapper->findUnrecognized($rows[0], $headers, 'work_item')
        );

        $dataRows  = array_slice($rows, 1);
        $sortOrder = 0;
        $parentMap = []; // level => last_id

        foreach ($dataRows as $row) {
            if ($this->mapper->isEmptyRow($row)) continue;

            $data = array_combine($headers, array_pad($row, count($headers), null));

            $itemName = trim((string) ($data['item_name'] ?? ''));
            if (empty($itemName)) continue;

            $this->total++;

            $isTotalRow = str_contains(strtolower($itemName), 'total') ||
                          str_contains(strtolower($itemName), 'jumlah');

            $itemNo   = trim((string) ($data['item_no'] ?? ''));
            $level    = $this->mapper->detectLevel($itemNo, $itemName);
            $parentId = $level > 0 ? ($parentMap[$level - 1] ?? null) : null;

            $item = ProjectWorkItem::create([
                'period_id'    => $periodId,
                'parent_id'    => $parentId,
                'level'        => $level,
                'item_no'      => $itemNo ?: null,
                'item_name'    => $itemName,
                'sort_order'   => $sortOrder++,
                'budget_awal'  => $this->mapper->parseNumeric($data['budget_awal'] ?? null),
                'addendum'     => $this->mapper->parseNumeric($data['addendum'] ?? null) ?? 0,
                'total_budget' => $this->mapper->parseNumeric($data['total_budget'] ?? null),
                'realisasi'    => $this->mapper->parseNumeric($data['realisasi'] ?? null),
                'deviasi'      => $this->mapper->parseNumeric($data['deviasi'] ?? null),
                'deviasi_pct'  => $this->mapper->parseNumeric($data['deviasi_pct'] ?? null),
                'is_total_row' => $isTotalRow,
            ]);

            $parentMap[$level] = $item->id;
            $this->imported++;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Parse vendor/material logs table (Zona 3)
    // ──────────────────────────────────────────────────────────────────────────
    private function parseMaterialLogs(array $rows, int $periodId, int $projectYear): void
    {
        if (empty($rows)) return;

        $headers = $this->mapper->resolveHeaders($rows[0], 'material');
        $this->unrecognized = array_merge(
            $this->unrecognized,
            $this->mapper->findUnrecognized($rows[0], $headers, 'material')
        );

        $dataRows = array_slice($rows, 1);

        foreach ($dataRows as $rowIndex => $row) {
            if ($this->mapper->isEmptyRow($row)) continue;

            $data = array_combine($headers, array_pad($row, count($headers), null));

            $supplierName = trim((string) ($data['supplier_name'] ?? ''));
            $materialType = trim((string) ($data['material_type'] ?? ''));

            if (empty($supplierName) && empty($materialType)) continue;

            $this->total++;
            $this->createMaterialLog($data, $periodId, $projectYear, $rowIndex + 2, null);
            $this->imported++;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Merged single-table layout: each level-0 (Roman-numeral) row becomes a new
    // ProjectWbs phase; level-1+ rows become ProjectWorkItems under that phase.
    // ──────────────────────────────────────────────────────────────────────────
    private function parseMergedLayout(
        array $rows,
        Project $project,
        array $meta,
        ?int $ingestionFileId,
        int $projectYear
    ): void {
        if (empty($rows)) return;

        $wiHeaders  = $this->mapper->resolveHeaders($rows[0], 'work_item');
        $matHeaders = $this->mapper->resolveHeaders($rows[0], 'material');

        $wiUnrecognized  = $this->mapper->findUnrecognized($rows[0], $wiHeaders, 'work_item');
        $matUnrecognized = $this->mapper->findUnrecognized($rows[0], $matHeaders, 'material');
        $this->unrecognized = array_merge(
            $this->unrecognized,
            array_values(array_intersect($wiUnrecognized, $matUnrecognized))
        );

        $dataRows  = array_slice($rows, 1);
        $sortOrder = 0;
        $parentMap = [];
        $currentPhase = null;

        foreach ($dataRows as $rowIndex => $row) {
            if ($this->mapper->isEmptyRow($row)) continue;

            $wi  = array_combine($wiHeaders,  array_pad($row, count($wiHeaders),  null));
            $mat = array_combine($matHeaders, array_pad($row, count($matHeaders), null));

            $itemName = trim((string) ($wi['item_name'] ?? ''));
            if ($itemName === '') continue;

            $this->total++;

            $itemNo = trim((string) ($wi['item_no'] ?? ''));
            $level  = $this->mapper->detectLevel($itemNo, $itemName);

            // Level 0 → new WBS phase. Row itself is NOT a work_item.
            if ($level === 0) {
                $currentPhase = ProjectWbs::updateOrCreate(
                    ['project_id' => $project->id, 'name_of_work_phase' => $itemName],
                    [
                        'ingestion_file_id'  => $ingestionFileId,
                        'client_name'        => $meta['client_name'] ?? null,
                        'project_manager'    => $meta['project_manager'] ?? null,
                        'report_source'      => 'file_import',
                        'progress_prev_pct'  => $meta['progress_prev_pct'] ?? null,
                        'progress_this_pct'  => $meta['progress_this_pct'] ?? null,
                        'progress_total_pct' => $meta['progress_total_pct'] ?? null,
                        'contract_value'     => $meta['contract_value'] ?? null,
                        'addendum_value'     => $meta['addendum_value'] ?? null,
                        'bq_external'        => $meta['bq_external'] ?? null,
                    ]
                );
                $parentMap = []; // reset so children start fresh under this phase
                $sortOrder = 0;
                $this->imported++;
                continue;
            }

            // Level 1+ rows require a current phase. Skip orphans.
            if ($currentPhase === null) continue;

            // Parent in the work-item tree: level-1 is a root under the phase
            // (parent_id=null); level-2 points at the last level-1 id; etc.
            $parentId = $level >= 2 ? ($parentMap[$level - 1] ?? null) : null;

            $volumeBudget   = $this->mapper->parseNumeric($wi['volume'] ?? null);
            $hargaSatuan    = $this->mapper->parseNumeric($wi['harsat_internal'] ?? null);
            $volumeAktual   = $this->mapper->parseNumeric($wi['volume_actual'] ?? null);
            $harsatAktual   = $this->mapper->parseNumeric($wi['harsat_actual'] ?? null);
            $progressPlan   = $this->mapper->parsePercentage($wi['progress_plan_pct'] ?? null);
            $actualProgress = $this->mapper->parsePercentage($wi['progress_actual_pct'] ?? null);

            $totalBudget = WorkItemCalculator::nilaiBudget($volumeBudget, $hargaSatuan);
            $realisasi   = WorkItemCalculator::nilaiAktual($volumeAktual, $harsatAktual);
            $plannedVal  = WorkItemCalculator::plannedValue($volumeBudget, $hargaSatuan, $progressPlan);
            $earnedVal   = WorkItemCalculator::earnedValue($volumeBudget, $hargaSatuan, $actualProgress);
            $actualCost  = WorkItemCalculator::actualCost($volumeAktual, $harsatAktual);
            $variance    = WorkItemCalculator::variance($totalBudget, $realisasi);
            $variancePct = WorkItemCalculator::variancePct($totalBudget, $realisasi);

            $vendorContract = $this->mapper->parseNumeric($wi['vendor_contract_value'] ?? null);
            $terminPaid     = $this->mapper->parseNumeric($wi['termin_paid'] ?? null);

            $isTotalRow = str_contains(strtolower($itemName), 'total') ||
                          str_contains(strtolower($itemName), 'jumlah');

            $subCategory = trim((string) ($wi['cost_subcategory'] ?? '')) ?: null;

            $item = ProjectWorkItem::create([
                'period_id'             => $currentPhase->id,
                'parent_id'             => $parentId,
                'level'                 => $level,
                'item_no'               => $itemNo ?: null,
                'item_name'             => $itemName,
                // id_material: stable per-project id derived from the Roman-numeral path.
                // material_category: reuse the Excel's "Sub Kategori" value.
                'id_material'           => $itemNo ?: null,
                'material_category'     => $subCategory,
                'sort_order'            => $sortOrder++,
                'volume'                => $volumeBudget,
                'satuan'                => trim((string) ($wi['satuan'] ?? '')) ?: null,
                'harsat_internal'       => $hargaSatuan,
                'volume_actual'         => $volumeAktual,
                'harsat_actual'         => $harsatAktual,
                'cost_category'         => trim((string) ($wi['cost_category'] ?? '')) ?: null,
                'cost_subcategory'      => $subCategory,
                'total_budget'          => $totalBudget,
                'realisasi'             => $realisasi,
                'deviasi'               => $variance,
                'deviasi_pct'           => $variancePct,
                'bobot_pct'             => $this->mapper->parsePercentage($wi['bobot_pct'] ?? null),
                'progress_plan_pct'     => $progressPlan,
                'progress_actual_pct'   => $actualProgress,
                'planned_value'         => $plannedVal,
                'earned_value'          => $earnedVal,
                'actual_cost_item'      => $actualCost,
                'vendor_name'           => trim((string) ($wi['vendor_name'] ?? '')) ?: null,
                'po_number'             => trim((string) ($wi['po_number'] ?? '')) ?: null,
                'vendor_contract_value' => $vendorContract,
                'termin_paid'           => $terminPaid,
                'retention'             => WorkItemCalculator::retensi5($vendorContract),
                'outstanding_debt'      => WorkItemCalculator::sisaHutang($vendorContract, $terminPaid),
                'data_source'           => trim((string) ($wi['data_source'] ?? '')) ?: null,
                'notes'                 => trim((string) ($wi['notes'] ?? '')) ?: null,
                'is_total_row'          => $isTotalRow,
            ]);

            $parentMap[$level] = $item->id;

            $vendorRaw = trim((string) ($mat['supplier_name'] ?? ''));
            $hasVendor = $vendorRaw !== '' && $vendorRaw !== '-' && $vendorRaw !== '0';

            if ($hasVendor) {
                $this->createMaterialLog($mat, $currentPhase->id, $projectYear, $rowIndex + 2, $item->id);
            }

            $this->imported++;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Shared: write a single project_material_logs row. Handles extended columns
    // and the tahun_perolehan fallback.
    // ──────────────────────────────────────────────────────────────────────────
    private function createMaterialLog(
        array $data,
        int $periodId,
        int $projectYear,
        int $sourceRow,
        ?int $workItemId
    ): void {
        $supplierName = trim((string) ($data['supplier_name'] ?? ''));
        $materialType = trim((string) ($data['material_type'] ?? ''));

        $isDiscount = str_contains(strtolower($materialType), 'discount') ||
                      str_contains(strtolower($materialType), 'potongan');

        $tahunPerolehan = null;
        if (array_key_exists('tahun_perolehan', $data) && $data['tahun_perolehan'] !== null && $data['tahun_perolehan'] !== '') {
            $parsed = (int) $this->mapper->parseNumeric($data['tahun_perolehan']);
            if ($parsed >= 2000 && $parsed <= 2099) {
                $tahunPerolehan = $parsed;
            }
        }
        $tahunPerolehan ??= ($projectYear ?: (int) now()->year);

        $rating     = $this->mapper->parseNumeric($data['rating_performa'] ?? null);
        $pengiriman = $this->mapper->parseNumeric($data['realisasi_pengiriman'] ?? null);
        $deviasiMkt = $this->mapper->parseNumeric($data['deviasi_harga_market'] ?? null);
        $lokasi     = trim((string) ($data['lokasi_vendor'] ?? '')) ?: null;
        $catatan    = trim((string) ($data['catatan_monitoring'] ?? '')) ?: null;

        ProjectMaterialLog::create([
            'period_id'            => $periodId,
            'work_item_id'         => $workItemId,
            'supplier_name'        => $supplierName ?: 'Unknown',
            'material_type'        => $materialType ?: 'Unknown',
            'qty'                  => $this->mapper->parseNumeric($data['qty'] ?? null),
            'satuan'               => trim((string) ($data['satuan'] ?? '')),
            'harga_satuan'         => $this->mapper->parseNumeric($data['harga_satuan'] ?? null),
            'total_tagihan'        => $this->mapper->parseNumeric($data['total_tagihan'] ?? null),
            'is_discount'          => $isDiscount,
            'source_row'           => $sourceRow,
            'tahun_perolehan'      => $tahunPerolehan,
            'lokasi_vendor'        => $lokasi,
            'rating_performa'      => $rating,
            'realisasi_pengiriman' => $pengiriman,
            'deviasi_harga_market' => $deviasiMkt,
            'catatan_monitoring'   => $catatan,
        ]);
    }

}
