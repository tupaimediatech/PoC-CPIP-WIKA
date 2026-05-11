<?php

namespace App\Services;

use App\Models\IngestionFile;
use App\Models\Project;
use App\Models\ProjectIndirectCostItem;
use App\Models\ProjectOtherCostItem;
use App\Models\ProjectProgressCurve;
use App\Models\ProjectRisk;
use App\Models\ProjectVendor;
use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Importer for the EPC Standard 7-sheet workbook layout used by WIKA.
 *
 * Expected sheet names (case-insensitive, exact-or-loose match):
 *   1. Project Metadata        — vertical key→value
 *   2. WBS Data                — flat WBS table (25 cols)
 *   3. Indirect Cost           — sub_kategori × budget/realisasi
 *   4. Other Cost              — Other Cost table + P&L Footer table
 *   5. Progress Curve          — monthly S-curve
 *   6. Risk Register           — risk catalog
 *   7. Vendor Detail           — extended vendor master
 *
 * A workbook is "supported" when it has at least Project Metadata + WBS Data.
 * Other sheets are optional; missing ones produce a warning, not a failure.
 */
class EpcStandardImport
{
    /** Sheet name → handler method. Lookup is case-insensitive on normalized labels. */
    private const SHEET_HANDLERS = [
        'project metadata' => 'importProjectMetadata',
        'wbs data'         => 'importWbsData',
        'indirect cost'    => 'importIndirectCost',
        'other cost'       => 'importOtherCost',
        'progress curve'   => 'importProgressCurve',
        'risk register'    => 'importRiskRegister',
        'vendor detail'    => 'importVendorDetail',
    ];

    private array $errors   = [];
    private array $warnings = [];
    private int   $imported = 0;
    private int   $skipped  = 0;
    private int   $total    = 0;

    public static function supports(string $filePath): bool
    {
        try {
            $spreadsheet = IOFactory::load($filePath);
        } catch (\Throwable) {
            return false;
        }

        $names = array_map(
            fn(string $n) => strtolower(trim($n)),
            $spreadsheet->getSheetNames()
        );

        return in_array('project metadata', $names, true)
            && in_array('wbs data', $names, true);
    }

    public function import(string $filePath, ?int $ingestionFileId = null): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheetMap    = $this->mapSheets($spreadsheet);

        if (!isset($sheetMap['project metadata'])) {
            throw new \RuntimeException('Sheet "Project Metadata" tidak ditemukan.');
        }
        if (!isset($sheetMap['wbs data'])) {
            throw new \RuntimeException('Sheet "WBS Data" tidak ditemukan.');
        }

        // Step 1 — Project metadata: returns the upserted Project.
        $project = $this->importProjectMetadata($sheetMap['project metadata'], $ingestionFileId);
        $this->imported++;
        $this->total++;

        // Step 2..7 — dispatch the rest. Order matters only insofar as each handler is independent.
        foreach (self::SHEET_HANDLERS as $key => $method) {
            if ($key === 'project metadata') continue;
            if (!isset($sheetMap[$key])) {
                $this->warnings[] = "Sheet '{$key}' tidak ada — bagian ini dilewati.";
                continue;
            }
            try {
                $this->{$method}($sheetMap[$key], $project, $ingestionFileId);
            } catch (\Throwable $e) {
                $this->errors[] = "Sheet '{$key}': " . $e->getMessage();
                $this->skipped++;
            }
        }

        // Recompute aggregate financials on the project from leaf work items.
        $this->recomputeProjectAggregates($project);

        // Rebuild Level 3 P&L summary tables (project_sales, project_direct_cost, etc.).
        (new FinancialSummaryAggregator)->rebuild($project);

        return [
            'total'                => $this->total,
            'imported'             => $this->imported,
            'skipped'              => $this->skipped,
            'errors'               => $this->errors,
            'warnings'             => $this->warnings,
            'unrecognized_columns' => [],
        ];
    }

    // ─── Sheet 1: Project Metadata ──────────────────────────────────────────
    private function importProjectMetadata(Worksheet $sheet, ?int $ingestionFileId = null): Project
    {
        $rows = $sheet->toArray(null, true, false, false);
        $kv   = [];

        foreach ($rows as $row) {
            $key = trim((string) ($row[0] ?? ''));
            $val = $row[1] ?? null;
            if ($key === '' || $val === null || $val === '') continue;
            // Skip section banners (column B is empty for them, but a defensive lower check)
            $kv[strtolower($key)] = $val;
        }

        $get = fn(array $aliases) => $this->firstOf($kv, $aliases);

        $code = trim((string) $get(['kode proyek']));
        $name = trim((string) $get(['nama proyek']));

        if ($code === '' || $name === '') {
            throw new \RuntimeException('Kode Proyek atau Nama Proyek kosong di sheet Project Metadata.');
        }

        $contractValue  = $this->numeric($get(['nilai kontrak awal (rp)', 'nilai kontrak (rp)', 'nilai kontrak']));
        $addendumValue  = $this->numeric($get(['addendum value (rp)', 'addendum (rp)', 'addendum']));
        $bqExternal     = $this->numeric($get(['bq external (rp)', 'bq external']))
                          ?? (($contractValue !== null && $addendumValue !== null) ? $contractValue + $addendumValue : null);
        $rapPlannedCost = $this->numeric($get(['rap / planned cost (rp)', 'rap (rp)', 'planned cost (rp)', 'rap']));

        $startDate       = $this->date($get(['start date', 'tanggal mulai']));
        $plannedEndDate  = $this->date($get(['planned end date', 'tanggal selesai rencana']));
        $plannedDuration = $this->numeric($get(['planned duration (bulan)', 'planned duration', 'durasi rencana (bulan)']));
        $actualDuration  = $this->numeric($get(['actual duration sd. periode (bulan)', 'actual duration (bulan)', 'actual duration']));

        $project = Project::updateOrCreate(
            ['project_code' => $code],
            [
                'ingestion_file_id' => $ingestionFileId,
                'project_name'      => $name,
                'project_year'      => (int) ($this->numeric($get(['tahun proyek'])) ?? now()->year),
                'owner'             => $this->stringOrNull($get(['pemberi tugas', 'project owner', 'client name'])),
                'sbu'               => $this->stringOrNull($get(['sbu'])),
                'profit_center'     => $this->stringOrNull($get(['profit center'])),
                'type_of_contract'  => $this->stringOrNull($get(['type of contract'])),
                'contract_type'     => $this->stringOrNull($get(['contract type'])),
                'payment_method'    => $this->stringOrNull($get(['payment method'])),
                'partnership'       => $this->stringOrNull($get(['partnership'])),
                'partner_name'      => $this->stringOrNull($get(['partner name'])),
                'consultant_name'   => $this->stringOrNull($get(['consultant name'])),
                'funding_source'    => $this->stringOrNull($get(['funding source'])),
                'location'          => $this->stringOrNull($get(['location', 'lokasi'])),
                'division'          => $this->stringOrNull($get(['division']))
                                       ?? DivisionResolver::fromCode($code),
                'contract_value'    => $contractValue,
                'addendum_value'    => $addendumValue,
                'bq_external'       => $bqExternal,
                'planned_cost'      => $rapPlannedCost,
                'start_date'        => $startDate,
                'planned_end_date'  => $plannedEndDate,
                'planned_duration'  => $plannedDuration !== null ? (int) $plannedDuration : null,
                'actual_duration'   => $actualDuration !== null ? (int) $actualDuration : null,
                'progress_pct'      => $this->percent($get(['progress total (%) - project level', 'progress total (%)', 'progress total'])),
            ]
        );

        return $project;
    }

    // ─── Sheet 2: WBS Data ──────────────────────────────────────────────────
    /**
     * Each top-level row (Nomor without a dot, e.g. "I", "II", "III") becomes
     * a ProjectWbs phase — that's what the Level 4 page lists. Child rows
     * ("I.1", "I.2", …) become ProjectWorkItem rows linked to their parent
     * phase via period_id, which feeds the Level 5 page.
     */
    private function importWbsData(Worksheet $sheet, Project $project, ?int $ingestionFileId): void
    {
        $rows = $sheet->toArray(null, true, false, false);
        if (count($rows) < 2) return;

        $headerRow = array_map(fn($h) => strtolower(trim((string) $h)), $rows[0]);
        $idx = fn(array $aliases) => $this->indexOf($headerRow, $aliases);

        $cols = [
            'nomor'           => $idx(['nomor']),
            'item_pekerjaan'  => $idx(['item pekerjaan']),
            'kategori'        => $idx(['kategori biaya']),
            'sub_kategori'    => $idx(['sub kategori']),
            'satuan'          => $idx(['satuan']),
            'volume_budget'   => $idx(['volume budget awal', 'volume budget']),
            'volume_addendum' => $idx(['volume addendum']),
            'harsat'          => $idx(['harga satuan (rp)', 'harga satuan']),
            'volume_aktual'   => $idx(['volume aktual']),
            'harsat_aktual'   => $idx(['harsat aktual (rp)', 'harsat aktual']),
            'bobot'           => $idx(['bobot pekerjaan']),
            'progress_plan'   => $idx(['progress plan']),
            'progress_actual' => $idx(['actual progress']),
            'vendor'          => $idx(['vendor']),
            'po'              => $idx(['nomor po']),
            'kontrak_vendor'  => $idx(['nilai kontrak vendor (rp)', 'nilai kontrak vendor']),
            'termin'          => $idx(['termin dibayar (rp)', 'termin dibayar']),
            'retensi'         => $idx(['retensi 10% (rp)', 'retensi (rp)', 'retensi']),
        ];

        // Wipe existing data for idempotent re-import (work items first, then phases).
        $existingPhaseIds = $project->wbsPhases()->pluck('id');
        if ($existingPhaseIds->isNotEmpty()) {
            ProjectWorkItem::whereIn('period_id', $existingPhaseIds)->delete();
        }
        $project->wbsPhases()->delete();

        $phaseByNomor = []; // 'I' => ProjectWbs id
        $sortOrder    = 0;

        foreach (array_slice($rows, 1) as $row) {
            $nomor = trim((string) ($row[$cols['nomor']] ?? ''));
            $name  = trim((string) ($row[$cols['item_pekerjaan']] ?? ''));
            if ($nomor === '' && $name === '') continue;

            $vol       = $this->numeric($row[$cols['volume_budget']]   ?? null);
            $volAdd    = $this->numeric($row[$cols['volume_addendum']] ?? null);
            $harsat    = $this->numeric($row[$cols['harsat']]          ?? null);
            $volAct    = $this->numeric($row[$cols['volume_aktual']]   ?? null);
            $harsatAct = $this->numeric($row[$cols['harsat_aktual']]   ?? null);

            $totalBudget = (($vol ?? 0) + ($volAdd ?? 0)) * ($harsat ?? 0);
            $realisasi   = ($volAct ?? 0) * ($harsatAct ?? 0);
            $deviasi     = $realisasi - $totalBudget;
            $deviasiPct  = $totalBudget > 0 ? round((($totalBudget - $realisasi) / $totalBudget) * 100, 2) : null;

            $isTopLevel = !str_contains($nomor, '.');

            if ($isTopLevel) {
                $wbs = ProjectWbs::create([
                    'project_id'         => $project->id,
                    'ingestion_file_id'  => $ingestionFileId,
                    'name_of_work_phase' => trim($name),
                    'progress_total_pct' => $this->numeric($row[$cols['progress_actual']] ?? null),
                    'contract_value'     => $totalBudget,
                    'bq_external'        => $totalBudget,
                    'actual_costs'       => $realisasi,
                    'realized_costs'     => $realisasi,
                    'hpp_deviation'      => $deviasi,
                    'deviasi_pct'        => $deviasiPct,
                ]);
                $phaseByNomor[$nomor] = $wbs->id;
                continue;
            }

            // Child row — find the parent phase via the nomor prefix (e.g. "I.1" → "I")
            $parentNomor = explode('.', $nomor)[0];
            $phaseId     = $phaseByNomor[$parentNomor] ?? null;
            if ($phaseId === null) {
                $this->errors[] = "Baris WBS {$nomor}: parent '{$parentNomor}' tidak ditemukan.";
                continue;
            }

            $level = substr_count($nomor, '.');
            $bobot = (float) ($this->percent($row[$cols['bobot']] ?? null) ?? 0);

            $subCategory = $this->stringOrNull($row[$cols['sub_kategori']] ?? null);

            $progressPlanPct   = $this->percent($row[$cols['progress_plan']] ?? null);
            $progressActualPct = $this->percent($row[$cols['progress_actual']] ?? null);

            // EVM: Nilai Budget = Volume Budget × Harga Satuan (excludes addendum per spec)
            $nilaiBudget  = ($vol ?? 0) * ($harsat ?? 0);
            $nilaiAktual  = ($volAct ?? 0) * ($harsatAct ?? 0);
            $plannedValue = $nilaiBudget * (($progressPlanPct ?? 0) / 100);
            $earnedValue  = $nilaiBudget * (($progressActualPct ?? 0) / 100);
            $actualCost   = $nilaiAktual;

            $kontrakVendor = $this->numeric($row[$cols['kontrak_vendor']] ?? null);
            $terminPaid    = $this->numeric($row[$cols['termin']] ?? null);
            // Retensi 5% from contract value, Sisa Hutang = kontrak × 0.95 − termin dibayar
            $retention   = $kontrakVendor !== null ? $kontrakVendor * 0.05 : null;
            $outstanding = $kontrakVendor !== null ? $kontrakVendor * 0.95 - ($terminPaid ?? 0) : null;

            ProjectWorkItem::create([
                'period_id'             => $phaseId,
                'parent_id'             => null,
                'level'                 => $level,
                'item_no'               => $nomor,
                'item_name'             => $name,
                'id_resource'           => $nomor ?: null,
                'resource_category'     => $subCategory,
                'sort_order'            => $sortOrder++,
                'volume'                => $vol,
                'volume_addendum'       => $volAdd,
                'satuan'                => $this->stringOrNull($row[$cols['satuan']] ?? null),
                'harsat_internal'       => $harsat,
                'volume_actual'         => $volAct,
                'harsat_actual'         => $harsatAct,
                'cost_category'         => $this->stringOrNull($row[$cols['kategori']] ?? null),
                'cost_subcategory'      => $subCategory,
                'bobot_pct'             => $bobot,
                'progress_plan_pct'     => $progressPlanPct,
                'progress_actual_pct'   => $progressActualPct,
                'planned_value'         => $plannedValue,
                'earned_value'          => $earnedValue,
                'actual_cost_item'      => $actualCost,
                'vendor_name'           => $this->stringOrNull($row[$cols['vendor']] ?? null),
                'po_number'             => $this->stringOrNull($row[$cols['po']] ?? null),
                'vendor_contract_value' => $kontrakVendor,
                'termin_paid'           => $terminPaid,
                'retention'             => $retention,
                'outstanding_debt'      => $outstanding,
                'total_budget'          => $totalBudget,
                'realisasi'             => $realisasi,
                'deviasi'               => $deviasi,
                'deviasi_pct'           => $deviasiPct,
                'is_total_row'          => false,
            ]);
        }
    }

    // ─── Sheet 3: Indirect Cost ─────────────────────────────────────────────
    private function importIndirectCost(Worksheet $sheet, Project $project, ?int $ingestionFileId): void
    {
        // Header row may be at row 1, 2, or 3 (banner rows above). Locate by scanning.
        $rows = $sheet->toArray(null, true, false, false);
        $headerIdx = $this->findHeaderRow($rows, ['sub kategori', 'budget', 'realisasi']);
        if ($headerIdx === null) return;

        $headerRow = array_map(fn($h) => strtolower(trim((string) $h)), $rows[$headerIdx]);
        $idx = fn(array $aliases) => $this->indexOf($headerRow, $aliases);

        $cols = [
            'sub_kategori' => $idx(['sub kategori']),
            'item'         => $idx(['item detail', 'item']),
            'budget'       => $idx(['budget (rp)', 'budget']),
            'realisasi'    => $idx(['realisasi (rp)', 'realisasi']),
            'deviasi'      => $idx(['deviasi (rp)', 'deviasi']),
            'catatan'      => $idx(['catatan']),
        ];

        ProjectIndirectCostItem::where('project_id', $project->id)->delete();

        foreach (array_slice($rows, $headerIdx + 1) as $row) {
            $sub = trim((string) ($row[$cols['sub_kategori']] ?? ''));
            if ($sub === '' || stripos($sub, 'total') === 0) continue;

            ProjectIndirectCostItem::create([
                'project_id'        => $project->id,
                'ingestion_file_id' => $ingestionFileId,
                'sub_kategori'      => $sub,
                'item_detail'       => $this->stringOrNull($row[$cols['item']] ?? null),
                'budget'            => $this->numeric($row[$cols['budget']] ?? null),
                'realisasi'         => $this->numeric($row[$cols['realisasi']] ?? null),
                'deviasi'           => $this->numeric($row[$cols['deviasi']] ?? null),
                'catatan'           => $this->stringOrNull($row[$cols['catatan']] ?? null),
            ]);
        }
    }

    // ─── Sheet 4: Other Cost (Table A + P&L Footer Table B) ─────────────────
    private function importOtherCost(Worksheet $sheet, Project $project, ?int $ingestionFileId): void
    {
        $rows = $sheet->toArray(null, true, false, false);

        // Table A: Other Cost — header has Kategori + Item + Nilai
        $aHeader = $this->findHeaderRow($rows, ['kategori', 'item', 'nilai']);
        if ($aHeader !== null) {
            $headerRow = array_map(fn($h) => strtolower(trim((string) $h)), $rows[$aHeader]);
            $idx = fn(array $aliases) => $this->indexOf($headerRow, $aliases);

            $cols = [
                'kategori' => $idx(['kategori']),
                'item'     => $idx(['item']),
                'nilai'    => $idx(['nilai (rp)', 'nilai']),
                'catatan'  => $idx(['catatan']),
            ];

            ProjectOtherCostItem::where('project_id', $project->id)->delete();

            foreach (array_slice($rows, $aHeader + 1) as $row) {
                $kat = trim((string) ($row[$cols['kategori']] ?? ''));
                if ($kat === '') continue;
                if (stripos($kat, 'subtotal') !== false || stripos($kat, 'total') === 0) continue;
                if (stripos($kat, 'p&l footer') !== false) break; // Reached Table B banner

                ProjectOtherCostItem::create([
                    'project_id'        => $project->id,
                    'ingestion_file_id' => $ingestionFileId,
                    'kategori'          => $kat,
                    'item'              => $this->stringOrNull($row[$cols['item']] ?? null),
                    'nilai'             => $this->numeric($row[$cols['nilai']] ?? null),
                    'catatan'           => $this->stringOrNull($row[$cols['catatan']] ?? null),
                ]);
            }
        }

        // Table B: P&L Footer — has Item + Tarif/Basis + Nilai
        $bHeader = $this->findHeaderRow($rows, ['item', 'tarif', 'nilai']);
        if ($bHeader !== null) {
            $headerRow = array_map(fn($h) => strtolower(trim((string) $h)), $rows[$bHeader]);
            $idx = fn(array $aliases) => $this->indexOf($headerRow, $aliases);

            $cItem  = $idx(['item']);
            $cNilai = $idx(['nilai (rp)', 'nilai']);

            foreach (array_slice($rows, $bHeader + 1) as $row) {
                $item = strtolower(trim((string) ($row[$cItem] ?? '')));
                if ($item === '') continue;
                $val = $this->numeric($row[$cNilai] ?? null);
                if ($val === null) continue;

                if (str_contains($item, 'tarif pph final')) {
                    // Stored as decimal (0.0175). If file stores as percent (1.75) treat > 1 as percent.
                    $project->tarif_pph_final = $val > 1 ? $val / 100 : $val;
                }
            }
            $project->save();
        }
    }

    // ─── Sheet 5: Progress Curve ────────────────────────────────────────────
    private function importProgressCurve(Worksheet $sheet, Project $project, ?int $ingestionFileId): void
    {
        $rows = $sheet->toArray(null, true, false, false);
        $headerIdx = $this->findHeaderRow($rows, ['bulan', 'plan', 'actual']);
        if ($headerIdx === null) return;

        $headerRow = array_map(fn($h) => strtolower(trim((string) $h)), $rows[$headerIdx]);
        $idx = fn(array $aliases) => $this->indexOf($headerRow, $aliases);

        $cols = [
            'bulan'       => $idx(['bulan']),
            'cutoff'      => $idx(['cutoff date', 'cutoff']),
            'plan_kum'    => $idx(['plan kumulatif (%)', 'plan kumulatif']),
            'actual_kum'  => $idx(['actual kumulatif (%)', 'actual kumulatif']),
        ];

        ProjectProgressCurve::where('project_id', $project->id)->delete();

        $weekNo = 0;
        foreach (array_slice($rows, $headerIdx + 1) as $row) {
            $bulan = trim((string) ($row[$cols['bulan']] ?? ''));
            if ($bulan === '') continue;

            $weekNo++;
            $rencana = $this->percent($row[$cols['plan_kum']] ?? null);
            $realisasi = $this->percent($row[$cols['actual_kum']] ?? null);

            ProjectProgressCurve::create([
                'project_id'    => $project->id,
                'week_number'   => $weekNo,
                'week_date'     => $this->date($row[$cols['cutoff']] ?? null),
                'rencana_pct'   => $rencana,
                'realisasi_pct' => $realisasi,
                'deviasi_pct'   => ($rencana !== null && $realisasi !== null) ? $realisasi - $rencana : null,
                'keterangan'    => $bulan,
            ]);
        }
    }

    // ─── Sheet 6: Risk Register ─────────────────────────────────────────────
    private function importRiskRegister(Worksheet $sheet, Project $project, ?int $ingestionFileId): void
    {
        $rows = $sheet->toArray(null, true, false, false);
        $headerIdx = $this->findHeaderRow($rows, ['risk id', 'category']);
        if ($headerIdx === null) return;

        $headerRow = array_map(fn($h) => strtolower(trim((string) $h)), $rows[$headerIdx]);
        $idx = fn(array $aliases) => $this->indexOf($headerRow, $aliases);

        $cols = [
            'risk_id'     => $idx(['risk id']),
            'description' => $idx(['description']),
            'category'    => $idx(['category']),
            'likelihood'  => $idx(['likelihood']),
            'impact'      => $idx(['impact']),
            'score'       => $idx(['risk score']),
            'mitigation'  => $idx(['mitigation']),
            'owner'       => $idx(['owner']),
            'status'      => $idx(['status']),
        ];

        ProjectRisk::where('project_id', $project->id)->delete();

        $qualMap = ['low' => 1, 'medium' => 3, 'high' => 4, 'critical' => 5];

        foreach (array_slice($rows, $headerIdx + 1) as $row) {
            $rid = trim((string) ($row[$cols['risk_id']] ?? ''));
            if ($rid === '') continue;

            $likelihood = strtolower(trim((string) ($row[$cols['likelihood']] ?? '')));
            $impact     = strtolower(trim((string) ($row[$cols['impact']] ?? '')));

            ProjectRisk::create([
                'project_id'       => $project->id,
                'risk_code'        => $rid,
                'risk_title'       => $this->stringOrNull($row[$cols['description']] ?? null) ?? '-',
                'risk_description' => $this->stringOrNull($row[$cols['description']] ?? null),
                'category'         => $this->stringOrNull($row[$cols['category']] ?? null),
                'probability'      => $qualMap[$likelihood] ?? null,
                'impact'           => $qualMap[$impact] ?? null,
                'mitigation'       => $this->stringOrNull($row[$cols['mitigation']] ?? null),
                'owner'            => $this->stringOrNull($row[$cols['owner']] ?? null),
                'status'           => strtolower($this->stringOrNull($row[$cols['status']] ?? null) ?? 'active'),
            ]);
        }
    }

    // ─── Sheet 7: Vendor Detail ─────────────────────────────────────────────
    private function importVendorDetail(Worksheet $sheet, Project $project, ?int $ingestionFileId): void
    {
        $rows = $sheet->toArray(null, true, false, false);
        $headerIdx = $this->findHeaderRow($rows, ['vendor', 'npwp', 'nomor po']);
        if ($headerIdx === null) return;

        $headerRow = array_map(fn($h) => strtolower(trim((string) $h)), $rows[$headerIdx]);
        $idx = fn(array $aliases) => $this->indexOf($headerRow, $aliases);

        $cols = [
            'vendor'    => $idx(['vendor']),
            'npwp'      => $idx(['npwp']),
            'lokasi'    => $idx(['lokasi']),
            'po'        => $idx(['nomor po']),
            'po_date'   => $idx(['po date']),
            'kontrak'   => $idx(['nilai kontrak (rp)', 'nilai kontrak']),
            'uang_muka' => $idx(['uang muka (rp)', 'uang muka']),
            'termin'    => $idx(['termin dibayar (rp)', 'termin dibayar']),
            'retensi'   => $idx(['retensi 10% (rp)', 'retensi (rp)', 'retensi']),
            'ppn'       => $idx(['ppn status']),
            'currency'  => $idx(['currency']),
        ];

        ProjectVendor::where('project_id', $project->id)->delete();

        foreach (array_slice($rows, $headerIdx + 1) as $row) {
            $vendor = trim((string) ($row[$cols['vendor']] ?? ''));
            $po     = trim((string) ($row[$cols['po']] ?? ''));
            if ($vendor === '' || $po === '') continue;

            ProjectVendor::create([
                'project_id'        => $project->id,
                'ingestion_file_id' => $ingestionFileId,
                'vendor_name'       => $vendor,
                'npwp'              => $this->stringOrNull($row[$cols['npwp']] ?? null),
                'lokasi'            => $this->stringOrNull($row[$cols['lokasi']] ?? null),
                'po_number'         => $po,
                'po_date'           => $this->date($row[$cols['po_date']] ?? null),
                'contract_value'    => $this->numeric($row[$cols['kontrak']] ?? null),
                'uang_muka'         => $this->numeric($row[$cols['uang_muka']] ?? null),
                'termin_paid'       => $this->numeric($row[$cols['termin']] ?? null),
                'retensi'           => $this->numeric($row[$cols['retensi']] ?? null),
                'ppn_status'        => $this->stringOrNull($row[$cols['ppn']] ?? null),
                'currency'          => $this->stringOrNull($row[$cols['currency']] ?? null) ?? 'IDR',
            ]);
        }
    }

    // ─── Aggregates: refresh project_cost / actual_cost from leaf items ─────
    private function recomputeProjectAggregates(Project $project): void
    {
        $leafs = ProjectWorkItem::query()
            ->where('bobot_pct', '>', 0)
            ->whereHas('period', fn($q) => $q->where('project_id', $project->id))
            ->get();

        $plannedCost = 0.0;
        $actualCost  = 0.0;
        foreach ($leafs as $r) {
            $plannedCost += (float) ($r->volume ?? 0) * (float) ($r->harsat_internal ?? 0);
            $actualCost  += (float) ($r->volume_actual ?? 0) * (float) ($r->harsat_actual ?? 0);
        }

        // Add indirect + other costs into actual_cost to keep CPI honest at the project level.
        $actualCost += (float) ProjectIndirectCostItem::where('project_id', $project->id)->sum('realisasi');
        $actualCost += (float) ProjectOtherCostItem::where('project_id', $project->id)->sum('nilai');

        $project->planned_cost = $project->planned_cost ?: $plannedCost;
        $project->actual_cost  = $actualCost;
        $project->hpp          = $actualCost; // legacy column kept in sync with actual_cost
        $project->save();
    }

    // ─── Helpers ───────────────────────────────────────────────────────────
    private function mapSheets(Spreadsheet $book): array
    {
        $map = [];
        foreach ($book->getAllSheets() as $sheet) {
            $key = strtolower(trim($sheet->getTitle()));
            $map[$key] = $sheet;
        }
        return $map;
    }

    private function findHeaderRow(array $rows, array $required): ?int
    {
        $req = array_map('strtolower', $required);
        foreach ($rows as $i => $row) {
            $cells = array_map(fn($c) => strtolower(trim((string) $c)), $row);
            $line = implode(' | ', $cells);
            $hit = true;
            foreach ($req as $needle) {
                if (!str_contains($line, $needle)) { $hit = false; break; }
            }
            if ($hit) return $i;
        }
        return null;
    }

    private function indexOf(array $headerRow, array $aliases): ?int
    {
        foreach ($aliases as $alias) {
            $needle = strtolower($alias);
            foreach ($headerRow as $i => $h) {
                if ($h === $needle) return $i;
            }
        }
        // Loose contains-match as fallback
        foreach ($aliases as $alias) {
            $needle = strtolower($alias);
            foreach ($headerRow as $i => $h) {
                if (str_contains($h, $needle)) return $i;
            }
        }
        return null;
    }

    private function firstOf(array $kv, array $aliases): mixed
    {
        foreach ($aliases as $a) {
            $key = strtolower($a);
            if (array_key_exists($key, $kv)) return $kv[$key];
        }
        return null;
    }

    private function numeric(mixed $v): ?float
    {
        if ($v === null || $v === '' || $v === '-') return null;
        if (is_numeric($v)) return (float) $v;

        // Strip currency labels & whitespace, keep digits/separators/sign.
        $s = preg_replace('/[^0-9,.\-]/', '', (string) $v);
        if ($s === '' || $s === '-' || $s === '.' || $s === ',') return null;

        $hasDot = str_contains($s, '.');
        $hasComma = str_contains($s, ',');

        if ($hasDot && $hasComma) {
            // Both present: the rightmost separator is the decimal mark.
            $lastDot = strrpos($s, '.');
            $lastComma = strrpos($s, ',');
            if ($lastComma > $lastDot) {
                // Indonesian: 1.250.000,50  → dots are thousand, comma is decimal
                $s = str_replace('.', '', $s);
                $s = str_replace(',', '.', $s);
            } else {
                // US: 1,250,000.50 → commas are thousand, dot is decimal
                $s = str_replace(',', '', $s);
            }
        } elseif ($hasComma) {
            // Only commas. If exactly one comma with 1–2 digits after, treat as decimal.
            // Otherwise treat as thousand separator (the common case for big Rp values).
            $parts = explode(',', $s);
            $tail = end($parts);
            if (count($parts) === 2 && strlen($tail) <= 2) {
                $s = str_replace(',', '.', $s);
            } else {
                $s = str_replace(',', '', $s);
            }
        } elseif ($hasDot) {
            // Only dots. If multiple dots OR a single dot followed by exactly 3 digits
            // (and the integer part is short), treat as Indonesian thousand separator.
            $parts = explode('.', $s);
            $tail = end($parts);
            if (count($parts) > 2 || (count($parts) === 2 && strlen($tail) === 3)) {
                $s = str_replace('.', '', $s);
            }
            // else: single dot with a non-3-digit tail → US decimal, keep as-is.
        }

        return is_numeric($s) ? (float) $s : null;
    }

    private function percent(mixed $v): ?float
    {
        $n = $this->numeric($v);
        if ($n === null) return null;
        // Treat values > 1.5 as percent (e.g. 87 → 87.00); ≤ 1.5 as fraction (0.87 → 87.00)
        return $n > 1.5 ? $n : $n * 100;
    }

    private function date(mixed $v): ?Carbon
    {
        if ($v === null || $v === '') return null;
        if (is_numeric($v)) {
            try {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $v));
            } catch (\Throwable) {
                return null;
            }
        }
        try {
            return Carbon::parse((string) $v);
        } catch (\Throwable) {
            return null;
        }
    }

    private function stringOrNull(mixed $v): ?string
    {
        if ($v === null) return null;
        $s = trim((string) $v);
        if ($s === '' || $s === '-') return null;
        return $s;
    }
}
