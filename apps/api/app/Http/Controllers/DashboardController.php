<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectWorkItem;
use App\Services\DashboardDataService;
use App\Services\HarsatTrendService;
use App\Services\KpiCalculatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardDataService $dashboardData,
        private readonly HarsatTrendService $harsatTrend,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $this->normalizeFilters($request);

        return response()->json([
            'generated_at'     => now()->toIso8601String(),
            'filters'          => array_filter($filters, fn($value) => $value !== null && $value !== ''),
            'summary'          => $this->dashboardData->summary($filters),
            'projects'         => $this->dashboardData->projectList($filters),
            'filter_options'   => $this->dashboardData->filterOptions(),
            'sbu_distribution' => $this->dashboardData->sbuDistribution($filters),
            'harsat_trend'     => $this->harsatTrend->getTrendData(),
            'division_kpis'    => $this->divisionKpis(),
        ]);
    }

    /**
     * Per-division CPI/SPI weighted by EV/PV/AC across all leaf work items
     * (rows where bobot_pct > 0). Falls back to project-level CPI/SPI averages
     * when a division has no work-item rows.
     */
    private function divisionKpis(): array
    {
        $projects = Project::query()
            ->whereNotNull('division')
            ->get(['id', 'division', 'cpi', 'spi']);

        if ($projects->isEmpty()) return [];

        $byDivision = $projects->groupBy('division');

        $items = ProjectWorkItem::query()
            ->where('bobot_pct', '>', 0)
            ->join('project_wbs', 'project_work_items.period_id', '=', 'project_wbs.id')
            ->join('projects', 'project_wbs.project_id', '=', 'projects.id')
            ->whereNotNull('projects.division')
            ->select('project_work_items.*', 'projects.division as _division')
            ->get();

        $itemsByDivision = $items->groupBy('_division');
        $kpi = new KpiCalculatorService();

        $result = [];
        foreach ($byDivision as $division => $divProjects) {
            $rows = $itemsByDivision->get($division, collect());

            if ($rows->isNotEmpty()) {
                $agg = $kpi->summarizeFromWorkItems($rows);
                $cpi = $agg['cpi'];
                $spi = $agg['spi'];
                $pv = $agg['pv']; $ev = $agg['ev']; $ac = $agg['ac'];
            } else {
                // Fallback: simple mean of project-level CPI/SPI
                $cpiVals = $divProjects->pluck('cpi')->filter(fn($v) => $v !== null)->map(fn($v) => (float) $v);
                $spiVals = $divProjects->pluck('spi')->filter(fn($v) => $v !== null)->map(fn($v) => (float) $v);
                $cpi = $cpiVals->count() > 0 ? round($cpiVals->avg(), 4) : null;
                $spi = $spiVals->count() > 0 ? round($spiVals->avg(), 4) : null;
                $pv = $ev = $ac = 0.0;
            }

            $result[] = [
                'division'      => $division,
                'cpi'           => $cpi,
                'spi'           => $spi,
                'project_count' => $divProjects->count(),
                'sum_pv'        => $pv,
                'sum_ev'        => $ev,
                'sum_ac'        => $ac,
            ];
        }

        return $result;
    }

    private function normalizeFilters(Request $request): array
    {
        return [
            'division'     => $request->query('division'),
            'sbu'          => $request->query('sbu'),
            'location'     => $request->query('location'),
            'partnership'  => $request->query('partnership'),
            'status'       => $request->query('status'),
            'year'         => $request->filled('year') ? (int) $request->query('year') : null,
            'min_contract' => $request->filled('min_contract') ? (float) $request->query('min_contract') : null,
            'max_contract' => $request->filled('max_contract') ? (float) $request->query('max_contract') : null,
            'sort_by'      => $request->query('sort_by'),
            'sort_dir'     => $request->query('sort_dir'),
        ];
    }
}
