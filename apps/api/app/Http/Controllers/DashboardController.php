<?php

namespace App\Http\Controllers;

use App\Services\DashboardDataService;
use App\Services\HarsatTrendService;
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
        ]);
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
