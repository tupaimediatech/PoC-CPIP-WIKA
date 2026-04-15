<?php

namespace App\Http\Controllers;

use App\Exceptions\ImportValidationException;
use App\Http\Requests\ProjectRequest;
use App\Http\Requests\UploadExcelRequest;
use App\Services\AdaptiveWorkbookImport;
use App\Services\ProjectImport;
use App\Models\IngestionFile;
use App\Models\Project;
use App\Services\PolaBImport;
use App\Services\PolaCImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ProjectController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $query = Project::query();

        $query->byDivision($request->division);
        $query->bySbu($request->sbu);
        $query->byLocation($request->location);
        $query->byPartnership($request->partnership);
        $query->byContractRange(
            $request->filled('min_contract') ? (float) $request->min_contract : null,
            $request->filled('max_contract') ? (float) $request->max_contract : null,
        );
        $query->byStatus($request->status);

        $year = $request->filled('year') ? (int) $request->year : null;
        $query->byYear($year);

        $sortBy  = in_array($request->sort_by, ['cpi', 'spi', 'contract_value', 'project_name', 'gross_profit_pct'])
                    ? $request->sort_by : 'cpi';
        $sortDir = $request->sort_dir === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $projects        = $query->get();
        $overbudgetCount = $projects->filter(fn($p) => $p->cpi < 1)->count();
        $delayCount      = $projects->filter(fn($p) => $p->spi < 1)->count();

        $availableYears = Project::distinct()
            ->orderByDesc('project_year')
            ->pluck('project_year')
            ->filter()
            ->values();

        return response()->json([
            'data' => $projects,
            'meta' => [
                'total'            => $projects->count(),
                'overbudget_count' => $overbudgetCount,
                'delay_count'      => $delayCount,
                'overbudget_pct'   => $projects->count()
                    ? round($overbudgetCount / $projects->count() * 100, 1) : 0,
                'delay_pct'        => $projects->count()
                    ? round($delayCount / $projects->count() * 100, 1) : 0,
                'available_years'  => $availableYears,
                'active_year'      => $year ?? Project::max('project_year'),
            ],
        ]);
    }


    public function summary(): JsonResponse
    {
        $total = Project::count();

        if ($total === 0) {
            return response()->json([
                'total_projects'   => 0,
                'avg_cpi'          => 0,
                'avg_spi'          => 0,
                'overbudget_count' => 0,
                'delay_count'      => 0,
                'overbudget_pct'   => 0,
                'delay_pct'        => 0,
                'by_division'      => [],
                'status_breakdown' => [],
            ]);
        }

        $stats = DB::table('projects')
            ->where('user_id', Auth::id())
            ->selectRaw('AVG(cpi) AS avg_cpi')
            ->selectRaw('AVG(spi) AS avg_spi')
            ->selectRaw('SUM(CASE WHEN cpi < 1 THEN 1 ELSE 0 END) AS overbudget_count')
            ->selectRaw('SUM(CASE WHEN spi < 1 THEN 1 ELSE 0 END) AS delay_count')
            ->first();

        $byDivision = DB::table('projects')
            ->where('user_id', Auth::id())
            ->select('division')
            ->selectRaw('COUNT(*) AS total')
            ->selectRaw('AVG(cpi) AS avg_cpi')
            ->selectRaw('AVG(spi) AS avg_spi')
            ->selectRaw('SUM(CASE WHEN cpi < 1 THEN 1 ELSE 0 END) AS overbudget_count')
            ->selectRaw('SUM(CASE WHEN spi < 1 THEN 1 ELSE 0 END) AS delay_count')
            ->groupBy('division')
            ->get()
            ->keyBy('division')
            ->map(fn($row) => [
                'total'            => (int) $row->total,
                'avg_cpi'          => round((float) $row->avg_cpi, 4),
                'avg_spi'          => round((float) $row->avg_spi, 4),
                'overbudget_count' => (int) $row->overbudget_count,
                'delay_count'      => (int) $row->delay_count,
            ]);

        $statusBreakdown = DB::table('projects')
            ->where('user_id', Auth::id())
            ->select('status', DB::raw('COUNT(*) AS count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status')
            ->map(fn($v) => (int) $v);

        $overbudgetCount = (int) $stats->overbudget_count;
        $delayCount      = (int) $stats->delay_count;

        // Top-10 profitability — use stored gross_profit_pct if set, else calculate from contract/actual
        $profitability = DB::table('projects')
            ->where('user_id', Auth::id())
            ->select('project_name', 'gross_profit_pct', 'contract_value', 'actual_cost')
            ->where('contract_value', '>', 0)
            ->orderByRaw('
                COALESCE(
                    gross_profit_pct,
                    (contract_value - actual_cost) / contract_value * 100
                ) DESC
            ')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'name' => $r->project_name,
                'pct'  => round(
                    $r->gross_profit_pct !== null
                        ? (float) $r->gross_profit_pct
                        : (($r->contract_value - $r->actual_cost) / $r->contract_value * 100),
                    1
                ) . '%',
            ]);

        // Top-10 overrun (highest cost overrun %)
        $overrun = DB::table('projects')
            ->where('user_id', Auth::id())
            ->select('project_name', 'planned_cost', 'actual_cost')
            ->where('actual_cost', '>', DB::raw('planned_cost'))
            ->where('planned_cost', '>', 0)
            ->orderByRaw('(actual_cost - planned_cost) / planned_cost DESC')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'name' => $r->project_name,
                'pct'  => round((($r->actual_cost - $r->planned_cost) / $r->planned_cost) * 100, 1) . '%',
            ]);

        return response()->json([
            'total_projects'   => $total,
            'avg_cpi'          => round((float) $stats->avg_cpi, 4),
            'avg_spi'          => round((float) $stats->avg_spi, 4),
            'overbudget_count' => $overbudgetCount,
            'delay_count'      => $delayCount,
            'overbudget_pct'   => round($overbudgetCount / $total * 100, 1),
            'delay_pct'        => round($delayCount      / $total * 100, 1),
            'by_division'      => $byDivision,
            'status_breakdown' => $statusBreakdown,
            'profitability'    => $profitability,
            'overrun'          => $overrun,
        ]);
    }


    public function sbuDistribution(): JsonResponse
    {
        $rows = DB::table('projects')
            ->where('user_id', Auth::id())
            ->select('sbu', DB::raw('COUNT(*) as value'))
            ->whereNotNull('sbu')
            ->where('sbu', '!=', '')
            ->groupBy('sbu')
            ->orderByDesc('value')
            ->get()
            ->map(fn($r) => [
                'label' => $r->sbu,
                'value' => (int) $r->value,
            ]);

        return response()->json(['data' => $rows]);
    }


    public function filterOptions(): JsonResponse
    {
        $pluck = fn(string $col) => Project::distinct()
            ->whereNotNull($col)
            ->where($col, '!=', '')
            ->orderBy($col)
            ->pluck($col)
            ->values();

        return response()->json([
            'division'         => $pluck('division'),
            'sbu'              => $pluck('sbu'),
            'owner'            => $pluck('owner'),
            'contract_type'    => $pluck('contract_type'),
            'payment_method'   => $pluck('payment_method'),
            'partnership'      => $pluck('partnership'),
            'funding_source'   => $pluck('funding_source'),
            'location'         => $pluck('location'),
            'year'             => Project::distinct()
                ->whereNotNull('project_year')
                ->orderByDesc('project_year')
                ->pluck('project_year')
                ->values(),
            'consultant'       => $pluck('consultant_name'),
            'profit_center'    => $pluck('profit_center'),
            'type_of_contract' => $pluck('type_of_contract'),
            'partner_name'     => $pluck('partner_name'),
        ]);
    }


    public function show(Project $project): JsonResponse
    {
        return response()->json(['data' => $project]);
    }


    public function store(ProjectRequest $request): JsonResponse
    {
        return response()->json(['data' => Project::create($request->validated())], 201);
    }


    public function update(ProjectRequest $request, Project $project): JsonResponse
    {
        $project->update($request->validated());
        return response()->json(['data' => $project->fresh()]);
    }


    public function destroy(Project $project): JsonResponse
    {
        $project->delete();
        return response()->json(['message' => 'Project berhasil dihapus.']);
    }

    public function upload(UploadExcelRequest $request): JsonResponse
    {
        $files = $request->file('files') ?? [];

        if ($request->hasFile('file')) {
            $files[] = $request->file('file');
        }

        if (empty($files)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada file yang diterima. Pastikan key request adalah "files[]".',
            ], 422);
        }
        $results = [];

        foreach ($files as $file) {

            $storedPath = $file->store('ingestion-files', 'local');

            $ingestionFile = IngestionFile::create([
                'original_name' => $file->getClientOriginalName(),
                'stored_path'   => $storedPath,
                'disk'          => 'local',
                'status'        => 'pending',
                'user_id'       => Auth::id(),
            ]);

            try {
                $ingestionFile->markProcessing();

                $importer = $this->resolveImporter($ingestionFile->getAbsolutePath());
                $result   = $importer->import(
                    $ingestionFile->getAbsolutePath(),
                    $ingestionFile->id,
                );

                $ingestionFile->markDone(
                    $result['total'],
                    $result['imported'],
                    $result['skipped'],
                    $result['errors'],
                );

            } catch (ImportValidationException $e) {
                $ingestionFile->markFailed($e->getMessage());

                $result = [
                    'total'                => 0,
                    'imported'             => 0,
                    'skipped'              => 0,
                    'errors'               => [$e->getMessage()],
                    'unrecognized_columns' => $e->unrecognizedColumns(),
                    'suggestion'           => $e->suggestion(),
                ];
            } catch (\RuntimeException $e) {
                $ingestionFile->markFailed($e->getMessage());

                $result = [
                    'total'                => 0,
                    'imported'             => 0,
                    'skipped'              => 0,
                    'errors'               => [$e->getMessage()],
                    'unrecognized_columns' => [],
                    'suggestion'           => null,
                ];
            }

            $unrecognized = $result['unrecognized_columns'] ?? [];

            // Find projects affected by this import
            $affectedProjects = Project::where('ingestion_file_id', $ingestionFile->id)
                ->select('id', 'project_code', 'project_name', 'status')
                ->get()
                ->map(fn($p) => [
                    'id'           => $p->id,
                    'project_code' => $p->project_code,
                    'project_name' => $p->project_name,
                    'status'       => $p->status,
                ])
                ->values();

            $results[] = [
                'file_id'              => $ingestionFile->id,
                'file_name'            => $ingestionFile->original_name,
                'status'               => $ingestionFile->status,
                'total_rows'           => $result['total'],
                'imported'             => $result['imported'],
                'skipped'              => $result['skipped'],
                'errors'               => $result['errors'],
                'warnings'             => $result['warnings'] ?? [],
                'scanner'              => $result['scanner'] ?? 'pattern',
                'unrecognized_columns' => $unrecognized,
                'suggestion'           => $result['suggestion'] ?? null,
                'field_trace'          => $result['field_trace'] ?? [],
                'field_candidates'     => $result['field_candidates'] ?? [],
                'field_conflicts'      => $result['field_conflicts'] ?? [],
                'project_row_trace'    => $result['project_row_trace'] ?? [],
                'project_row_conflicts'=> $result['project_row_conflicts'] ?? [],
                'projects_affected'    => $affectedProjects,
            ];
        }

        $allSuccess = collect($results)->every(fn($r) => $r['status'] === 'success');
        $anySuccess = collect($results)->contains(fn($r) => in_array($r['status'], ['success', 'partial']));
        $httpStatus = $anySuccess ? 200 : 422;
        $firstResult = $results[0] ?? null;
        $singleFile = count($results) === 1;
        $totalRows = (int) collect($results)->sum('total_rows');
        $imported = (int) collect($results)->sum('imported');
        $skipped = (int) collect($results)->sum('skipped');
        $errors = collect($results)
            ->pluck('errors')
            ->flatten()
            ->values()
            ->all();
        $warnings = collect($results)
            ->pluck('warnings')
            ->flatten()
            ->values()
            ->all();

        return response()->json([
            'success' => $anySuccess,
            'message' => $allSuccess
                ? 'Semua file berhasil diimport.'
                : ($anySuccess ? 'Sebagian file berhasil diimport.' : 'Semua file gagal diimport.'),
            'total_rows' => $totalRows,
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors,
            'warnings' => $warnings,
            'results' => $results,
            'scanner'              => $singleFile ? ($firstResult['scanner'] ?? 'pattern') : 'mixed',
            'unrecognized_columns' => $singleFile ? ($firstResult['unrecognized_columns'] ?? []) : [],
            'suggestion'           => $singleFile ? ($firstResult['suggestion'] ?? null) : null,
            'field_trace'          => $singleFile ? ($firstResult['field_trace'] ?? []) : [],
            'field_candidates'     => $singleFile ? ($firstResult['field_candidates'] ?? []) : [],
            'field_conflicts'      => $singleFile ? ($firstResult['field_conflicts'] ?? []) : [],
            'project_row_trace'    => $singleFile ? ($firstResult['project_row_trace'] ?? []) : [],
            'project_row_conflicts'=> $singleFile ? ($firstResult['project_row_conflicts'] ?? []) : [],
        ], $httpStatus);
    }

    
    public function ingestionFiles(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $files   = IngestionFile::where('user_id', Auth::id())
            ->latest()
            ->withCount('projects')
            ->paginate($perPage);

        return response()->json($files);
    }

    public function download(IngestionFile $ingestionFile): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        abort_unless($ingestionFile->user_id === Auth::id(), 403, 'Unauthorized.');
        abort_unless($ingestionFile->fileExists(), 404, 'File tidak ditemukan di storage.');

        $absolutePath = $ingestionFile->getAbsolutePath();

        abort_unless(file_exists($absolutePath), 404, 'File fisik tidak ditemukan.');

        return response()->download($absolutePath, $ingestionFile->original_name);
    }

    public function reprocess(IngestionFile $ingestionFile): JsonResponse
    {
        abort_unless($ingestionFile->user_id === Auth::id(), 403, 'Unauthorized.');
        abort_unless($ingestionFile->fileExists(), 404, 'File tidak ditemukan di storage.');

        // Reset status
        $ingestionFile->markProcessing();

        try {
            $importer = $this->resolveImporter($ingestionFile->getAbsolutePath());
            $result   = $importer->import(
                $ingestionFile->getAbsolutePath(),
                $ingestionFile->id,
            );

            $ingestionFile->markDone(
                $result['total'],
                $result['imported'],
                $result['skipped'],
                $result['errors'],
            );

        } catch (ImportValidationException $e) {
            $ingestionFile->markFailed($e->getMessage());

            return response()->json([
                'success'              => false,
                'message'              => $e->getMessage(),
                'unrecognized_columns' => $e->unrecognizedColumns(),
                'suggestion'           => $e->suggestion(),
            ], 422);
        } catch (\RuntimeException $e) {
            $ingestionFile->markFailed($e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success'   => true,
            'message'   => "Reprocess selesai. {$ingestionFile->imported_rows} berhasil, {$ingestionFile->skipped_rows} dilewati.",
            'file_id'   => $ingestionFile->id,
            'status'    => $ingestionFile->status,
            'scanner'   => $result['scanner'] ?? 'pattern',
            'imported'  => $ingestionFile->imported_rows,
            'skipped'   => $ingestionFile->skipped_rows,
            'errors'    => $ingestionFile->errors,
            'warnings'  => $result['warnings'] ?? [],
            'field_trace'       => $result['field_trace'] ?? [],
            'field_candidates'  => $result['field_candidates'] ?? [],
            'field_conflicts'   => $result['field_conflicts'] ?? [],
            'project_row_trace' => $result['project_row_trace'] ?? [],
            'project_row_conflicts' => $result['project_row_conflicts'] ?? [],
        ]);
    }

    public function insight(Project $project): JsonResponse
    {
        $cpi         = (float) $project->cpi;
        $spi         = (float) $project->spi;
        $plannedCost = (float) $project->planned_cost;
        $actualCost  = (float) $project->actual_cost;
        $delay       = $project->actual_duration - $project->planned_duration;
        $overrunPct  = $plannedCost > 0
            ? (($actualCost - $plannedCost) / $plannedCost) * 100
            : 0;

        $bullets = [];

        if ($cpi >= 1) {
            $savingsPct = $plannedCost > 0
                ? abs(($actualCost - $plannedCost) / $plannedCost * 100)
                : 0;
            $bullets[] = [
                'level' => 'info',
                'text'  => sprintf(
                    'Positive cost performance: CPI %.4f indicates the project is %.1f%% under budget.',
                    $cpi, $savingsPct
                ),
            ];
        } else {
            $bullets[] = [
                'level' => $cpi < 0.9 ? 'critical' : 'warning',
                'text'  => sprintf(
                    'Cost overrun detected: CPI %.4f indicates the project is %.1f%% over planned budget.',
                    $cpi, $overrunPct
                ),
            ];
        }

        if ($spi >= 1) {
            $bullets[] = [
                'level' => 'info',
                'text'  => "Strong schedule performance: SPI {$spi} indicates the project is ahead of schedule compared to the baseline plan.",
            ];
        } elseif ($delay > 0) {
            $bullets[] = [
                'level' => $delay > 3 ? 'critical' : 'warning',
                'text'  => "Schedule delay: SPI {$spi} indicates the project is {$delay} month(s) behind the planned timeline.",
            ];
        } else {
            $bullets[] = [
                'level' => 'info',
                'text'  => "Schedule on track: SPI {$spi} indicates the project is progressing as planned.",
            ];
        }

        $sameDivision = Project::where('division', $project->division)
            ->where('id', '!=', $project->id)
            ->get();

        if ($sameDivision->isNotEmpty()) {
            $avgCpi  = round($sameDivision->avg('cpi'), 4);
            $cpiDiff = round($cpi - $avgCpi, 4);

            if (abs($cpiDiff) > 0.05) {
                $direction = $cpiDiff > 0 ? 'above' : 'below';
                $bullets[] = [
                    'level' => $cpiDiff < 0 ? 'warning' : 'info',
                    'text'  => sprintf(
                        "Division comparison: This project's CPI is %.1f%% %s the %s division average (avg CPI: %.2f).",
                        abs($cpiDiff * 100), $direction, $project->division, $avgCpi
                    ),
                ];
            }

            $alsoOverbudget = $sameDivision->filter(fn($p) => $p->cpi < 1)->count();
            if ($alsoOverbudget > 0 && $cpi < 1) {
                $bullets[] = [
                    'level' => 'warning',
                    'text'  => "{$alsoOverbudget} of {$sameDivision->count()} other {$project->division} projects are also over budget, suggesting a division-wide pattern.",
                ];
            }
        }

        if ($cpi < 0.9 && $spi < 0.9) {
            $bullets[] = [
                'level' => 'critical',
                'text'  => 'Project is facing dual issues: significant cost overrun and schedule delay. Immediate escalation and full review recommended.',
            ];
        }

        if ($cpi >= 1 && $spi >= 1) {
            $summaryLevel = 'info';
            $summaryText  = 'Overall project health is strong. The project is performing above plan with opportunities for scope optimization if the trend continues.';
        } elseif ($cpi < 0.9 && $spi < 0.9) {
            $summaryLevel = 'critical';
            $summaryText  = 'Overall project health is critical. Both cost and schedule are significantly off-track — immediate escalation and a full review are recommended.';
        } elseif ($cpi < 1 || $spi < 1) {
            $summaryLevel = 'warning';
            $summaryText  = 'Overall project health is at risk. One or more performance indicators are below target — proactive corrective actions are advised.';
        } else {
            $summaryLevel = 'info';
            $summaryText  = 'Overall project health is on track. Continue monitoring for any emerging deviations.';
        }

        return response()->json([
            'bullets' => $bullets,
            'summary' => [
                'level' => $summaryLevel,
                'text'  => $summaryText,
            ],
        ]);
    }

    /**
     * Auto-detect file pattern and return appropriate importer.
     *
     * Pola A — flat tabular 1 sheet     → ProjectImport (existing)
     * Pola B — mixed layout 1 sheet     → PolaBImport
     * Pola C — multi-sheet (>1 sheet)   → PolaCImport
     */
    private function resolveImporter(string $filePath): object
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheetCount  = $spreadsheet->getSheetCount();

        // Pola C: multi-sheet files → PolaCImport (structured multi-sheet parser)
        if ($sheetCount > 1) {
            return new PolaCImport();
        }

        // Single-sheet files: try Adaptive first, then Pola B, then Pola A
        $adaptiveImporter = new AdaptiveWorkbookImport();

        if ($adaptiveImporter->supports($filePath)) {
            return $adaptiveImporter;
        }

        // Pola B: single sheet with mixed zones (detect HPP + vendor sections)
        $raw = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        $hasHppHeader = false;
        $hasVendorHeader = false;

        foreach ($raw as $row) {
            $cells = array_map(fn($c) => strtolower(trim((string) $c)), $row);
            $rowStr = implode(' ', $cells);

            if (!$hasHppHeader && str_contains($rowStr, 'budget') && str_contains($rowStr, 'realisasi')) {
                $hasHppHeader = true;
            }
            if (!$hasVendorHeader && (str_contains($rowStr, 'vendor') || str_contains($rowStr, 'supplier'))
                && str_contains($rowStr, 'material')) {
                $hasVendorHeader = true;
            }
        }

        if ($hasHppHeader || $hasVendorHeader) {
            return new PolaBImport();
        }

        // Pola A: default flat tabular
        return new ProjectImport();
    }
}
