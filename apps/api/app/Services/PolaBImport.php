<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMaterialLog;
use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Illuminate\Support\Facades\Auth;
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
        $raw         = $sheet->toArray(null, true, true, false);

        if (empty($raw)) {
            throw new \RuntimeException('File Excel kosong.');
        }

        // ── Deteksi zona ──────────────────────────────────────────────────
        $hppHeaderRow    = $this->mapper->findHeaderRowByKeywords($raw, ['budget', 'realisasi', 'deviasi']);
        $vendorHeaderRow = $this->mapper->findHeaderRowByKeywords($raw, ['vendor', 'material', 'qty'])
                        ?? $this->mapper->findHeaderRowByKeywords($raw, ['supplier', 'material', 'qty']);

        // ── Zona 1: Metadata ──────────────────────────────────────────────
        $metaRows = array_slice($raw, 0, $hppHeaderRow ?? count($raw));
        $meta     = $this->parseMetadata($metaRows);

        if (empty($meta['project_code'])) {
            throw new \RuntimeException('project_code tidak ditemukan di metadata sheet.');
        }

        $this->total++;

        // Upsert project — financial/operational fields are nullable when not in file
        $project = Project::firstOrCreate(
            ['project_code' => $meta['project_code'], 'user_id' => Auth::id()],
            [
                'project_name'      => $meta['project_name'] ?? $meta['project_code'],
                'division'          => $meta['division'] ?? null,
                'owner'             => $meta['client_name'] ?? null,
                'contract_value'    => $meta['contract_value'] ?? null,
                'planned_cost'      => $meta['planned_cost'] ?? null,
                'actual_cost'       => $meta['actual_cost'] ?? null,
                'planned_duration'  => $meta['planned_duration'] ?? null,
                'actual_duration'   => $meta['actual_duration'] ?? null,
                'progress_pct'      => $meta['progress_total_pct'] ?? null,
                'project_year'      => $meta['project_year'] ?? now()->year,
                'ingestion_file_id' => $ingestionFileId,
            ]
        );

        // Upsert WBS phase
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
                'total_pagu'         => $meta['total_pagu'] ?? null,
            ]
        );

        $this->imported++;

        // ── Zona 2: HPP Table ─────────────────────────────────────────────
        if ($hppHeaderRow !== null) {
            $hppRows = isset($vendorHeaderRow)
                ? array_slice($raw, $hppHeaderRow, $vendorHeaderRow - $hppHeaderRow)
                : array_slice($raw, $hppHeaderRow);

            $this->parseWorkItems($hppRows, $wbsPhase->id);
        }

        // ── Zona 3: Vendor/Material ───────────────────────────────────────
        if ($vendorHeaderRow !== null) {
            $vendorRows = array_slice($raw, $vendorHeaderRow);
            $this->parseMaterialLogs($vendorRows, $wbsPhase->id);
        }

        // Update HPP totals on WBS phase
        $hppPlan   = ProjectWorkItem::where('period_id', $wbsPhase->id)
            ->whereNull('parent_id')->where('is_total_row', false)->sum('total_budget');
        $hppActual = ProjectWorkItem::where('period_id', $wbsPhase->id)
            ->whereNull('parent_id')->where('is_total_row', false)->sum('realisasi');

        $totalPagu = (float) $wbsPhase->total_pagu;

        $wbsPhase->update([
            'hpp_plan_total'   => $hppPlan,
            'hpp_actual_total' => $hppActual,
            'hpp_deviation'    => $hppPlan - $hppActual,
            'deviasi_pct'      => $totalPagu > 0 ? (($totalPagu - $hppPlan) / $totalPagu) * 100 : 0,
        ]);

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
            $meta['total_pagu'] = $meta['contract_value'] + $meta['addendum_value'];
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
    private function parseMaterialLogs(array $rows, int $periodId): void
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

            $isDiscount = str_contains(strtolower($materialType), 'discount') ||
                          str_contains(strtolower($materialType), 'potongan');

            ProjectMaterialLog::create([
                'period_id'     => $periodId,
                'work_item_id'  => null,
                'supplier_name' => $supplierName ?: 'Unknown',
                'material_type' => $materialType ?: 'Unknown',
                'qty'           => $this->mapper->parseNumeric($data['qty'] ?? null),
                'satuan'        => trim((string) ($data['satuan'] ?? '')),
                'harga_satuan'  => $this->mapper->parseNumeric($data['harga_satuan'] ?? null),
                'total_tagihan' => $this->mapper->parseNumeric($data['total_tagihan'] ?? null),
                'is_discount'   => $isDiscount,
                'source_row'    => $rowIndex + 2,
            ]);

            $this->imported++;
        }
    }

}
