<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectEquipmentLog;
use App\Models\ProjectMaterialLog;
use App\Models\ProjectWbs;
use App\Models\ProjectProgressCurve;
use App\Models\ProjectWorkItem;
use Illuminate\Support\Facades\Auth;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Parser untuk Pola C — Multi-sheet (File 5)
 *
 * 5 sheet, masing-masing punya target tabel berbeda:
 *   COVER & SUMMARY        → project_periods (metadata + kontrak + progress)
 *   REKAP_HPP_*            → project_work_items
 *   LOG_MATERIAL_STRATEGIS → project_material_logs
 *   PENGGUNAAN_ALAT_BERAT  → project_equipment_logs (forward-fill vendor_name)
 *   CURVA_S_PROGRESS       → project_progress_curves (sanitize "42,50%" → 42.50)
 */
class PolaCImport
{
    private WorkbookFieldMapper $mapper;

    private array $errors       = [];
    private array $unrecognized = [];
    private int   $imported     = 0;
    private int   $skipped      = 0;
    private int   $total        = 0;

    private const SHEET_TYPE_COVER     = 'cover';
    private const SHEET_TYPE_HPP       = 'hpp';
    private const SHEET_TYPE_MATERIAL  = 'material';
    private const SHEET_TYPE_EQUIPMENT = 'equipment';
    private const SHEET_TYPE_SCURVE    = 's_curve';

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
        $sheetNames  = $spreadsheet->getSheetNames();

        $project  = null;
        $phaseMap = []; // Roman prefix => ProjectWbs model

        // ── Pass 1: COVER sheet first to get project + WBS phases ─────────
        foreach ($sheetNames as $name) {
            $type = $this->detectSheetType($name);
            if ($type === self::SHEET_TYPE_COVER) {
                $raw = $spreadsheet->getSheetByName($name)->toArray(null, true, true, false);
                [$project, $phaseMap] = $this->parseCoverSheet($raw, $ingestionFileId);
                break;
            }
        }

        if (!$project || empty($phaseMap)) {
            throw new \RuntimeException(
                'Sheet COVER & SUMMARY tidak ditemukan atau tidak bisa diparse. ' .
                'Sheets ditemukan: ' . implode(', ', $sheetNames)
            );
        }

        // For sheets that need a single period_id fallback, use first phase
        $defaultPhase = reset($phaseMap);

        // ── Pass 2: remaining sheets ───────────────────────────────────────
        foreach ($sheetNames as $name) {
            $type = $this->detectSheetType($name);
            if ($type === self::SHEET_TYPE_COVER) continue;

            $raw = $spreadsheet->getSheetByName($name)->toArray(null, true, true, false);

            match ($type) {
                self::SHEET_TYPE_HPP       => $this->parseHppSheet($raw, $phaseMap, $defaultPhase->id),
                self::SHEET_TYPE_MATERIAL  => $this->parseMaterialSheet($raw, $defaultPhase->id),
                self::SHEET_TYPE_EQUIPMENT => $this->parseEquipmentSheet($raw, $defaultPhase->id),
                self::SHEET_TYPE_SCURVE    => $this->parseSCurveSheet($raw, $project->id),
                default                    => null,
            };
        }

        // Update HPP totals per phase
        foreach ($phaseMap as $phase) {
            $hppPlan   = ProjectWorkItem::where('period_id', $phase->id)
                ->where('is_total_row', false)->sum('total_budget');
            $hppActual = ProjectWorkItem::where('period_id', $phase->id)
                ->where('is_total_row', false)->sum('realisasi');

<<<<<<< Updated upstream
            if ($hppPlan || $hppActual) {
                $phase->update([
                    'hpp_plan_total'   => $hppPlan ?: $phase->hpp_plan_total,
                    'hpp_actual_total' => $hppActual ?: $phase->hpp_actual_total,
                    'hpp_deviation'    => ($hppPlan ?: 0) - ($hppActual ?: 0),
                ]);
            }
        }
=======
        $period->update([
            'actual_costs'     => $hppPlan ?: $period->actual_costs,
            'realized_costs'   => $hppActual ?: $period->realized_costs,
            'hpp_deviation'    => ($hppPlan ?: 0) - ($hppActual ?: 0),
        ]);
>>>>>>> Stashed changes

        return [
            'total'                => $this->total,
            'imported'             => $this->imported,
            'skipped'              => $this->skipped,
            'errors'               => $this->errors,
            'unrecognized_columns' => array_values(array_unique($this->unrecognized)),
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Sheet type detection by name
    // ──────────────────────────────────────────────────────────────────────────
    private function detectSheetType(string $name): string
    {
        $lower = strtolower($name);

        if (str_contains($lower, 'cover') || str_contains($lower, 'summary')
            || str_contains($lower, 'ringkasan')) {
            return self::SHEET_TYPE_COVER;
        }
        if (str_contains($lower, 'hpp') || str_contains($lower, 'rekap')
            || str_contains($lower, 'biaya') || str_contains($lower, 'detail')) {
            return self::SHEET_TYPE_HPP;
        }
        if (str_contains($lower, 'material') || str_contains($lower, 'vendor')
            || str_contains($lower, 'keuangan')) {
            return self::SHEET_TYPE_MATERIAL;
        }
        if (str_contains($lower, 'alat') || str_contains($lower, 'equipment')) {
            return self::SHEET_TYPE_EQUIPMENT;
        }
        if (str_contains($lower, 'curva') || str_contains($lower, 'curve')
            || str_contains($lower, 's_curve') || str_contains($lower, 'progress')
            || str_contains($lower, 'earned')) {
            return self::SHEET_TYPE_SCURVE;
        }

        return 'unknown';
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COVER & SUMMARY sheet → project + multiple WBS phases
    //
    // Returns [$project, $phaseMap] where $phaseMap is keyed by Roman prefix
    // e.g. ['I' => ProjectWbs, 'II' => ProjectWbs, ...]
    // ──────────────────────────────────────────────────────────────────────────
    private function parseCoverSheet(array $raw, ?int $ingestionFileId): array
    {
        $meta = [];

        // Only scan first rows for metadata (stop before table headers start)
        $metaRows = array_slice($raw, 0, min(count($raw), 6));
        foreach ($metaRows as $row) {

            // Extract key-value pairs from every 2 columns (A:B, C:D, E:F, G:H, ...)
            $pairs = [];
            $values = array_values($row);
            for ($i = 0; $i < count($values) - 1; $i += 2) {
                $k = $values[$i];
                $v = $values[$i + 1];
                if ($k !== null && trim((string) $k) !== '' && $v !== null && trim((string) $v) !== '') {
                    $pairs[] = [(string) $k, $v];
                }
            }

            if (empty($pairs)) continue;

            foreach ($pairs as [$rawKey, $val]) {
                $key = $this->mapper->resolveAlias($rawKey, 'project')
                    ?? $this->mapper->normalizeHeader($rawKey);

                switch ($key) {
                    case 'project_code':       $meta['project_code']       = trim((string) $val); break;
                    case 'project_name':       $meta['project_name']       = trim((string) $val); break;
                    case 'client_name':
                    case 'owner':              $meta['client_name']        = trim((string) $val); break;
                    case 'project_manager':    $meta['project_manager']    = trim((string) $val); break;
                    case 'contract_value':     $meta['contract_value']     = $this->mapper->parseNumeric($val); break;
                    case 'addendum_value':     $meta['addendum_value']     = $this->mapper->parseNumeric($val); break;
                    case 'progress_pct':
                    case 'progress_total_pct': $meta['progress_total_pct'] = $this->mapper->parseNumeric($val); break;
                    case 'planned_cost':       $meta['planned_cost']       = $this->mapper->parseNumeric($val); break;
                    case 'actual_cost':        $meta['actual_cost']        = $this->mapper->parseNumeric($val); break;
                    case 'planned_duration':   $meta['planned_duration']   = $this->parseDuration($val); break;
                    case 'actual_duration':    $meta['actual_duration']    = $this->parseDuration($val); break;
                    case 'project_year':       $meta['project_year']       = (int) $val; break;
                    case 'sbu':                $meta['sbu']                = trim((string) $val); break;
                    case 'division':           $meta['division']           = trim((string) $val); break;
                }

                // Detect period from key label
                if (str_contains(strtolower($rawKey), 'periode') ||
                    str_contains(strtolower($rawKey), 'bulan')) {
                    $p = $this->mapper->parsePeriod((string) $val);
                    if ($p) $meta['period'] = $p;
                }
            }
        }

        // Fallback: extract project_name from title row (e.g. "LAPORAN HPP - PEMBANGUNAN JALAN TOL ...")
        if (empty($meta['project_name']) && !empty($raw[0])) {
            $titleCell = trim((string) ($raw[0][0] ?? ''));
            if (!empty($titleCell) && mb_strlen($titleCell) > 10) {
                $name = preg_replace('/^(?:LAPORAN\s+(?:HPP|PROYEK|PROGRESS)|DETAIL\s+BIAYA\s+\w+|RINGKASAN\s+PROYEK)\s*[-–—:]\s*/i', '', $titleCell);
                $meta['project_name'] = $name ?: $titleCell;
            }
        }

        if (empty($meta['project_code'])) {
            throw new \RuntimeException('project_code tidak ditemukan di sheet COVER & SUMMARY.');
        }

        $this->total++;

        // Upsert project
        $project = Project::firstOrCreate(
            ['project_code' => $meta['project_code'], 'user_id' => Auth::id()],
            [
                'project_name'      => $meta['project_name'] ?? $meta['project_code'],
                'division'          => $meta['division'] ?? null,
                'sbu'               => $meta['sbu'] ?? null,
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

<<<<<<< Updated upstream
=======
        $totalPagu = ($meta['contract_value'] ?? 0) + ($meta['addendum_value'] ?? 0);

        $wbsName = $meta['name_of_work_phase'] ?? $meta['period'] ?? 'PEKERJAAN UMUM';

        // If period is in YYYY-MM format, transform to "PEKERJAAN XXX"
        if (preg_match('/^\d{4}-\d{2}$/', $wbsName)) {
            $monthNum = substr($wbsName, 5, 2);
            $wbsName = $this->transformMonthToWbsName((int) $monthNum);
        }

        $wbsPhase = ProjectWbs::updateOrCreate(
            ['project_id' => $project->id, 'name_of_work_phase' => $wbsName],
            [
                'ingestion_file_id'  => $ingestionFileId,
                'client_name'        => $meta['client_name'] ?? null,
                'project_manager'    => $meta['project_manager'] ?? null,
                'report_source'      => 'file_import',
                'progress_total_pct' => $meta['progress_total_pct'] ?? null,
                'contract_value'     => $meta['contract_value'] ?? null,
                'addendum_value'     => $meta['addendum_value'] ?? null,
                'bq_external'        => $totalPagu ?: null,
            ]
        );

>>>>>>> Stashed changes
        $this->imported++;

        // ── Parse summary table → create one WBS phase per Roman-numbered row ──
        $phaseMap = $this->parseSummaryPhases($raw, $project->id, $ingestionFileId, $meta);

        // Fallback: if no summary table found, create a single default phase
        if (empty($phaseMap)) {
            $totalPagu = ($meta['contract_value'] ?? 0) + ($meta['addendum_value'] ?? 0);
            $wbsName = $meta['name_of_work_phase'] ?? $meta['period'] ?? 'PEKERJAAN UMUM';

            if (preg_match('/^\d{4}-\d{2}$/', $wbsName)) {
                $wbsName = $this->transformMonthToWbsName((int) substr($wbsName, 5, 2));
            }

            $phase = ProjectWbs::updateOrCreate(
                ['project_id' => $project->id, 'name_of_work_phase' => $wbsName],
                [
                    'ingestion_file_id'  => $ingestionFileId,
                    'client_name'        => $meta['client_name'] ?? null,
                    'project_manager'    => $meta['project_manager'] ?? null,
                    'report_source'      => 'file_import',
                    'progress_total_pct' => $meta['progress_total_pct'] ?? null,
                    'contract_value'     => $meta['contract_value'] ?? null,
                    'addendum_value'     => $meta['addendum_value'] ?? null,
                    'total_pagu'         => $totalPagu ?: null,
                ]
            );
            $phaseMap['_default'] = $phase;
            $this->imported++;
        }

        return [$project, $phaseMap];
    }

    /**
     * Parse summary table rows from the COVER sheet to create multiple WBS phases.
     *
     * Expects rows like: ["I", "Pekerjaan Persiapan & Mobilisasi", "SBU-2", 8500, 8120, "3.2%", ...]
     * Returns associative array: ['I' => ProjectWbs, 'II' => ProjectWbs, ...]
     */
    private function parseSummaryPhases(array $raw, int $projectId, ?int $ingestionFileId, array $meta): array
    {
        // Find the summary table header row
        $headerIdx = $this->mapper->findHeaderRowByKeywords($raw, ['uraian', 'budget', 'aktual'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['uraian', 'bobot', 'plan']);

        if ($headerIdx === null) return [];

        $phaseMap = [];
        $dataRows = array_slice($raw, $headerIdx + 1);

        foreach ($dataRows as $row) {
            if ($this->mapper->isEmptyRow($row)) continue;

            $values = array_values($row);
            $romanNo = trim((string) ($values[0] ?? ''));
            $name    = trim((string) ($values[1] ?? ''));

            // Only process rows with a Roman numeral in the first column
            if (empty($romanNo) || !preg_match('/^[IVX]+$/', $romanNo)) continue;
            if (empty($name)) continue;

            $this->total++;

            $budget  = $this->mapper->parseNumeric($values[3] ?? null);
            $actual  = $this->mapper->parseNumeric($values[4] ?? null);
            $bobot   = $this->mapper->parsePercentage($values[5] ?? null);
            $plan    = $this->mapper->parsePercentage($values[6] ?? null);
            $actualPct = $this->mapper->parsePercentage($values[7] ?? null);

            $phase = ProjectWbs::updateOrCreate(
                ['project_id' => $projectId, 'name_of_work_phase' => $name],
                [
                    'ingestion_file_id'  => $ingestionFileId,
                    'client_name'        => $meta['client_name'] ?? null,
                    'project_manager'    => $meta['project_manager'] ?? null,
                    'report_source'      => 'file_import',
                    'progress_total_pct' => $actualPct,
                    'contract_value'     => $budget,
                    'hpp_plan_total'     => $budget,
                    'hpp_actual_total'   => $actual,
                    'hpp_deviation'      => $budget !== null && $actual !== null ? $budget - $actual : null,
                ]
            );

            $phaseMap[$romanNo] = $phase;
            $this->imported++;
        }

        return $phaseMap;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REKAP_HPP / Detail Biaya sheet → project_work_items
    //
    // Routes each item to the correct WBS phase by matching the Roman numeral
    // prefix of the WBS code (e.g. "I.1" → phase "I", "II.3" → phase "II").
    // ──────────────────────────────────────────────────────────────────────────
    private function parseHppSheet(array $raw, array $phaseMap, int $fallbackPeriodId): void
    {
        $headerIdx = $this->mapper->findHeaderRowByKeywords($raw, ['realisasi', 'budget'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['realisasi', 'anggaran'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['uraian', 'budget'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['uraian', 'aktual']);

        if ($headerIdx === null) {
            $this->errors[] = 'Sheet HPP: header tabel tidak ditemukan.';
            return;
        }

        $headers = $this->mapper->resolveHeaders($raw[$headerIdx], 'work_item');
        $this->unrecognized = array_merge(
            $this->unrecognized,
            $this->mapper->findUnrecognized($raw[$headerIdx], $headers, 'work_item')
        );

        $dataRows  = array_slice($raw, $headerIdx + 1);
        $sortOrder = 0;
        $parentMap = [];

        foreach ($dataRows as $row) {
            if ($this->mapper->isEmptyRow($row)) continue;

            $data     = array_combine($headers, array_pad($row, count($headers), null));
            $itemName = trim((string) ($data['item_name'] ?? ''));

            if (empty($itemName)) continue;

            $this->total++;

            $isTotalRow = str_contains(strtolower($itemName), 'total') ||
                          str_contains(strtolower($itemName), 'jumlah');

            $itemNo   = trim((string) ($data['item_no'] ?? ''));

            // Route to correct WBS phase by Roman prefix (e.g. "I.1" → "I", "XII.2" → "XII")
            $periodId = $fallbackPeriodId;
            if (!empty($itemNo) && preg_match('/^([IVX]+)/', $itemNo, $m)) {
                $prefix = $m[1];
                if (isset($phaseMap[$prefix])) {
                    $periodId = $phaseMap[$prefix]->id;
                }
            }

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
    // LOG_MATERIAL_STRATEGIS sheet → project_material_logs
    // ──────────────────────────────────────────────────────────────────────────
    private function parseMaterialSheet(array $raw, int $periodId): void
    {
        $headerIdx = $this->mapper->findHeaderRowByKeywords($raw, ['supplier', 'material', 'qty'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['vendor', 'material', 'satuan'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['vendor', 'kontrak', 'termin'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['vendor', 'lingkup', 'kontrak']);

        if ($headerIdx === null) {
            $this->errors[] = 'Sheet Material/Vendor: header tidak ditemukan.';
            return;
        }

        $headers = $this->mapper->resolveHeaders($raw[$headerIdx], 'material');
        $this->unrecognized = array_merge(
            $this->unrecognized,
            $this->mapper->findUnrecognized($raw[$headerIdx], $headers, 'material')
        );

        $dataRows = array_slice($raw, $headerIdx + 1);

        foreach ($dataRows as $rowIdx => $row) {
            if ($this->mapper->isEmptyRow($row)) continue;

            $data         = array_combine($headers, array_pad($row, count($headers), null));
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
                'source_row'    => $rowIdx + $headerIdx + 2,
            ]);

            $this->imported++;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PENGGUNAAN_ALAT_BERAT sheet → project_equipment_logs (forward-fill vendor)
    // ──────────────────────────────────────────────────────────────────────────
    private function parseEquipmentSheet(array $raw, int $periodId): void
    {
        $headerIdx = $this->mapper->findHeaderRowByKeywords($raw, ['vendor', 'alat', 'jam'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['vendor', 'equipment', 'jam']);

        if ($headerIdx === null) {
            $this->errors[] = 'Sheet Alat Berat: header tidak ditemukan.';
            return;
        }

        $headers = $this->mapper->resolveHeaders($raw[$headerIdx], 'equipment');
        $this->unrecognized = array_merge(
            $this->unrecognized,
            $this->mapper->findUnrecognized($raw[$headerIdx], $headers, 'equipment')
        );

        $dataRows   = array_slice($raw, $headerIdx + 1);
        $lastVendor = null; // forward-fill

        foreach ($dataRows as $rowIdx => $row) {
            if ($this->mapper->isEmptyRow($row)) continue;

            $data = array_combine($headers, array_pad($row, count($headers), null));

            // forward-fill: if vendor_name is empty, use last known vendor
            $vendorName = trim((string) ($data['vendor_name'] ?? ''));
            if (!empty($vendorName)) {
                $lastVendor = $vendorName;
            } else {
                $vendorName = $lastVendor ?? 'Unknown';
            }

            $equipmentName = trim((string) ($data['equipment_name'] ?? ''));
            if (empty($equipmentName)) continue;

            $this->total++;

            ProjectEquipmentLog::create([
                'period_id'      => $periodId,
                'work_item_id'   => null,
                'vendor_name'    => $vendorName,
                'equipment_name' => $equipmentName,
                'jam_kerja'      => $this->mapper->parseNumeric($data['jam_kerja'] ?? null),
                'rate_per_jam'   => $this->mapper->parseNumeric($data['rate_per_jam'] ?? null),
                'total_biaya'    => $this->mapper->parseNumeric($data['total_biaya'] ?? null),
                'payment_status' => trim((string) ($data['payment_status'] ?? '')),
                'source_row'     => $rowIdx + $headerIdx + 2,
            ]);

            $this->imported++;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CURVA_S_PROGRESS sheet → project_progress_curves
    // ──────────────────────────────────────────────────────────────────────────
    private function parseSCurveSheet(array $raw, int $projectId): void
    {
        // Standard S-curve format (weekly)
        $headerIdx = $this->mapper->findHeaderRowByKeywords($raw, ['minggu', 'rencana', 'realisasi'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['week', 'rencana', 'realisasi']);

        if ($headerIdx !== null) {
            $this->parseWeeklySCurve($raw, $headerIdx, $projectId);
            return;
        }

        // Earned Value format — parse as work items with EVM data, derive S-curve
        $headerIdx = $this->mapper->findHeaderRowByKeywords($raw, ['uraian', 'bobot', 'plan'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['wbs', 'earned', 'actual']);

        if ($headerIdx !== null) {
            $this->parseEarnedValueSheet($raw, $headerIdx, $projectId);
            return;
        }

        $this->errors[] = 'Sheet S-Curve/Earned Value: header tidak ditemukan.';
    }

    private function parseWeeklySCurve(array $raw, int $headerIdx, int $projectId): void
    {
        $headers = $this->mapper->resolveHeaders($raw[$headerIdx], 's_curve');
        $this->unrecognized = array_merge(
            $this->unrecognized,
            $this->mapper->findUnrecognized($raw[$headerIdx], $headers, 's_curve')
        );

        $dataRows = array_slice($raw, $headerIdx + 1);

        foreach ($dataRows as $row) {
            if ($this->mapper->isEmptyRow($row)) continue;

            $data = array_combine($headers, array_pad($row, count($headers), null));

            $weekNumber = (int) ($data['week_number'] ?? 0);
            if ($weekNumber <= 0) continue;

            $this->total++;

            $rencana   = $this->mapper->parsePercentage($data['rencana_pct'] ?? null);
            $realisasi = $this->mapper->parsePercentage($data['realisasi_pct'] ?? null);
            $deviasi   = $this->mapper->parsePercentage($data['deviasi_pct'] ?? null)
                      ?? ($realisasi !== null && $rencana !== null ? $realisasi - $rencana : null);

            ProjectProgressCurve::updateOrCreate(
                ['project_id' => $projectId, 'week_number' => $weekNumber],
                [
                    'rencana_pct'   => $rencana,
                    'realisasi_pct' => $realisasi,
                    'deviasi_pct'   => $deviasi,
                    'keterangan'    => trim((string) ($data['keterangan'] ?? '')),
                ]
            );

            $this->imported++;
        }
    }

    /**
     * Parse Earned Value & Progress sheet — group items by Roman numeral prefix,
     * aggregate weighted progress, and store as progress curve points.
     */
    private function parseEarnedValueSheet(array $raw, int $headerIdx, int $projectId): void
    {
        $headers = $this->mapper->resolveHeaders($raw[$headerIdx], 'work_item');
        $this->unrecognized = array_merge(
            $this->unrecognized,
            $this->mapper->findUnrecognized($raw[$headerIdx], $headers, 'work_item')
        );

        $dataRows = array_slice($raw, $headerIdx + 1);

        // Group items by Roman numeral prefix (I, II, III, ...)
        $groups = [];
        foreach ($dataRows as $row) {
            if ($this->mapper->isEmptyRow($row)) continue;

            $data   = array_combine($headers, array_pad($row, count($headers), null));
            $itemNo = trim((string) ($data['item_no'] ?? ''));

            if (empty($itemNo)) continue;

            // Extract Roman numeral prefix (e.g. "I" from "I.1", "II" from "II.3")
            if (preg_match('/^([IVX]+)/', $itemNo, $m)) {
                $prefix = $m[1];
                if (!isset($groups[$prefix])) {
                    $groups[$prefix] = ['plan_sum' => 0, 'actual_sum' => 0, 'bobot_sum' => 0, 'name' => ''];
                }

                $bobot = $this->mapper->parsePercentage($data['bobot_pct'] ?? null) ?? 0;
                $plan  = $this->mapper->parsePercentage($data['progress_plan_pct'] ?? null) ?? 0;
                $actual = $this->mapper->parsePercentage($data['progress_actual_pct'] ?? null) ?? 0;

                $groups[$prefix]['plan_sum']   += $bobot * $plan / 100;
                $groups[$prefix]['actual_sum'] += $bobot * $actual / 100;
                $groups[$prefix]['bobot_sum']  += $bobot;

                // Use name of first item in group as label
                if (empty($groups[$prefix]['name'])) {
                    $itemName = trim((string) ($data['item_name'] ?? ''));
                    $groups[$prefix]['name'] = $itemName;
                }
            }
        }

        $weekNum = 0;
        foreach ($groups as $prefix => $group) {
            $weekNum++;
            $this->total++;

            $planPct   = $group['bobot_sum'] > 0 ? round($group['plan_sum'] / $group['bobot_sum'] * 100, 2) : 0;
            $actualPct = $group['bobot_sum'] > 0 ? round($group['actual_sum'] / $group['bobot_sum'] * 100, 2) : 0;

            ProjectProgressCurve::updateOrCreate(
                ['project_id' => $projectId, 'week_number' => $weekNum],
                [
                    'rencana_pct'   => $planPct,
                    'realisasi_pct' => $actualPct,
                    'deviasi_pct'   => $actualPct - $planPct,
                    'keterangan'    => "$prefix. {$group['name']}",
                ]
            );

            $this->imported++;
        }
    }

    /**
     * Parse duration value that may include unit suffix like "730 hari" or "24 bulan".
     */
    private function parseDuration($val): ?int
    {
        $str = trim((string) $val);
        if ($str === '') return null;

        // Extract numeric part
        if (preg_match('/^([\d.,]+)\s*(hari|days?|bulan|months?)?/i', $str, $m)) {
            $num  = (int) str_replace(['.', ','], '', $m[1]);
            $unit = strtolower($m[2] ?? '');

            // Convert days to months (approximate)
            if (in_array($unit, ['hari', 'day', 'days'])) {
                return (int) round($num / 30);
            }

            return $num;
        }

        return (int) $val;
    }

    private function transformMonthToWbsName(int $month): string
    {
        return match ($month) {
            1 => 'PEKERJAAN PERSIAPAN',
            2 => 'PEKERJAAN PONDASI',
            3 => 'PEKERJAAN STRUKTUR',
            4 => 'PEKERJAAN ARSITEKTUR',
            5 => 'PEKERJAAN ME',
            6 => 'PEKERJAAN UTILITIES',
            7 => 'PEKERJAAN EXTERIOR',
            8 => 'PEKERJAAN PELENGKAPAN',
            default => 'PEKERJAAN LANLAIN',
        };
    }
}
