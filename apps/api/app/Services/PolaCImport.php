<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectEquipmentLog;
use App\Models\ProjectMaterialLog;
use App\Models\ProjectWbs;
use App\Models\ProjectProgressCurve;
use App\Models\ProjectWorkItem;
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

        $project = null;
        $period  = null;

        // ── Pass 1: COVER sheet first to get project + period context ──────
        foreach ($sheetNames as $name) {
            $type = $this->detectSheetType($name);
            if ($type === self::SHEET_TYPE_COVER) {
                $raw            = $spreadsheet->getSheetByName($name)->toArray(null, true, true, false);
                [$project, $period] = $this->parseCoverSheet($raw, $ingestionFileId);
                break;
            }
        }

        if (!$project || !$period) {
            throw new \RuntimeException(
                'Sheet COVER & SUMMARY tidak ditemukan atau tidak bisa diparse. ' .
                'Sheets ditemukan: ' . implode(', ', $sheetNames)
            );
        }

        // ── Pass 2: remaining sheets ───────────────────────────────────────
        foreach ($sheetNames as $name) {
            $type = $this->detectSheetType($name);
            if ($type === self::SHEET_TYPE_COVER) continue;

            $raw = $spreadsheet->getSheetByName($name)->toArray(null, true, true, false);

            match ($type) {
                self::SHEET_TYPE_HPP       => $this->parseHppSheet($raw, $period->id),
                self::SHEET_TYPE_MATERIAL  => $this->parseMaterialSheet($raw, $period->id),
                self::SHEET_TYPE_EQUIPMENT => $this->parseEquipmentSheet($raw, $period->id),
                self::SHEET_TYPE_SCURVE    => $this->parseSCurveSheet($raw, $project->id),
                default                    => null,
            };
        }

        // Update RAB internal from computed work item totals
        $rabInternal = ProjectWorkItem::where('wbs_id', $period->id)
            ->whereNull('parent_id')->where('is_total_row', false)->sum('total_budget');

        if ($rabInternal) {
            $period->update(['rab_internal' => $rabInternal]);
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
    // Sheet type detection by name
    // ──────────────────────────────────────────────────────────────────────────
    private function detectSheetType(string $name): string
    {
        $lower = strtolower($name);

        if (str_contains($lower, 'cover') || str_contains($lower, 'summary')) {
            return self::SHEET_TYPE_COVER;
        }
        if (str_contains($lower, 'hpp') || str_contains($lower, 'rekap')) {
            return self::SHEET_TYPE_HPP;
        }
        if (str_contains($lower, 'material')) {
            return self::SHEET_TYPE_MATERIAL;
        }
        if (str_contains($lower, 'alat') || str_contains($lower, 'equipment')) {
            return self::SHEET_TYPE_EQUIPMENT;
        }
        if (str_contains($lower, 'curva') || str_contains($lower, 'curve') ||
            str_contains($lower, 's_curve') || str_contains($lower, 'progress')) {
            return self::SHEET_TYPE_SCURVE;
        }

        return 'unknown';
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COVER & SUMMARY sheet → projects + project_periods
    // ──────────────────────────────────────────────────────────────────────────
    private function parseCoverSheet(array $raw, ?int $ingestionFileId): array
    {
        $meta = [];

        foreach ($raw as $row) {
            $cells = array_values(array_filter($row, fn($c) => $c !== null && $c !== ''));
            if (count($cells) < 2) continue;

            $rawKey = (string) $cells[0];
            $key    = $this->mapper->resolveAlias($rawKey, 'project')
                   ?? $this->mapper->normalizeHeader($rawKey);
            $val    = $cells[1];

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
                case 'planned_duration':   $meta['planned_duration']   = (int) $val; break;
                case 'actual_duration':    $meta['actual_duration']    = (int) $val; break;
                case 'project_year':       $meta['project_year']       = (int) $val; break;
            }

            // Detect period from key label
            if (str_contains(strtolower($rawKey), 'periode') ||
                str_contains(strtolower($rawKey), 'bulan')) {
                $p = $this->mapper->parsePeriod((string) $val);
                if ($p) $meta['period'] = $p;
            }
        }

        if (empty($meta['project_code'])) {
            throw new \RuntimeException('project_code tidak ditemukan di sheet COVER & SUMMARY.');
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
                'progress_pct'      => $meta['progress_total_pct'] ?? null,
                'project_year'      => $meta['project_year'] ?? now()->year,
                'ingestion_file_id' => $ingestionFileId,
            ]
        );

        $wbsName = $meta['name_of_work_phase'] ?? $meta['period'] ?? 'PEKERJAAN UMUM';

        // If period is in YYYY-MM format, transform to "PEKERJAAN XXX"
        if (preg_match('/^\d{4}-\d{2}$/', $wbsName)) {
            $monthNum = substr($wbsName, 5, 2);
            $wbsName = $this->transformMonthToWbsName((int) $monthNum);
        }

        // Propagate project_manager to the project record if found in file
        if (!empty($meta['project_manager']) && empty($project->project_manager)) {
            $project->update(['project_manager' => $meta['project_manager']]);
        }

        $wbsPhase = ProjectWbs::updateOrCreate(
            ['project_id' => $project->id, 'name_of_work_phase' => $wbsName],
            [
                'ingestion_file_id' => $ingestionFileId,
                'report_source'     => 'file_import',
            ]
        );

        $this->imported++;

        return [$project, $wbsPhase];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REKAP_HPP sheet → project_work_items
    // ──────────────────────────────────────────────────────────────────────────
    private function parseHppSheet(array $raw, int $periodId): void
    {
        $headerIdx = $this->mapper->findHeaderRowByKeywords($raw, ['realisasi', 'budget'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['realisasi', 'anggaran']);

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
            $level    = $this->mapper->detectLevel($itemNo, $itemName);
            $parentId = $this->mapper->resolveParentId($level, $parentMap);

            $item = ProjectWorkItem::create([
                'wbs_id'    => $periodId,
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
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['vendor', 'material', 'satuan']);

        if ($headerIdx === null) {
            $this->errors[] = 'Sheet Material: header tidak ditemukan.';
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
                'wbs_id'     => $periodId,
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
                'wbs_id'      => $periodId,
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
        $headerIdx = $this->mapper->findHeaderRowByKeywords($raw, ['minggu', 'rencana', 'realisasi'])
                  ?? $this->mapper->findHeaderRowByKeywords($raw, ['week', 'rencana', 'realisasi']);

        if ($headerIdx === null) {
            $this->errors[] = 'Sheet S-Curve: header tidak ditemukan.';
            return;
        }

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
