<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class DashboardDataService
{
    public function baseProjectQuery(array $filters): Builder
    {
        $query = Project::query();

        $query->byDivision($filters['division'] ?? null);
        $query->bySbu($filters['sbu'] ?? null);
        $query->byLocation($filters['location'] ?? null);
        $query->byPartnership($filters['partnership'] ?? null);
        $query->byContractRange(
            $filters['min_contract'] ?? null,
            $filters['max_contract'] ?? null,
        );
        $query->byStatus($filters['status'] ?? null);
        $query->byYear($filters['year'] ?? null);

        return $query;
    }

    public function projectList(array $filters): array
    {
        $query = $this->baseProjectQuery($filters);

        $sortBy = in_array($filters['sort_by'] ?? null, ['cpi', 'spi', 'contract_value', 'project_name', 'gross_profit_pct'], true)
            ? $filters['sort_by']
            : 'cpi';
        $sortDir = ($filters['sort_dir'] ?? null) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $projects = $query->get();
        $overbudgetCount = $projects->filter(fn($project) => $project->cpi < 1)->count();
        $delayCount = $projects->filter(fn($project) => $project->spi < 1)->count();

        $availableYears = Project::distinct()
            ->orderByDesc('project_year')
            ->pluck('project_year')
            ->filter()
            ->values();

        return [
            'data' => $projects,
            'meta' => [
                'total'            => $projects->count(),
                'overbudget_count' => $overbudgetCount,
                'delay_count'      => $delayCount,
                'overbudget_pct'   => $projects->count() ? round($overbudgetCount / $projects->count() * 100, 1) : 0,
                'delay_pct'        => $projects->count() ? round($delayCount / $projects->count() * 100, 1) : 0,
                'available_years'  => $availableYears,
                'active_year'      => $filters['year'] ?? Project::max('project_year'),
            ],
        ];
    }

    public function summary(array $filters): array
    {
        $baseQuery = $this->baseProjectQuery($filters);
        $total = (clone $baseQuery)->count();

        if ($total === 0) {
            return [
                'total_projects'   => 0,
                'avg_cpi'          => 0,
                'avg_spi'          => 0,
                'overbudget_count' => 0,
                'delay_count'      => 0,
                'overbudget_pct'   => 0,
                'delay_pct'        => 0,
                'by_division'      => [],
                'status_breakdown' => [],
                'profitability'    => [],
                'overrun'          => [],
            ];
        }

        $stats = (clone $baseQuery)
            ->toBase()
            ->selectRaw('AVG(cpi) AS avg_cpi')
            ->selectRaw('AVG(spi) AS avg_spi')
            ->selectRaw('SUM(CASE WHEN cpi < 1 THEN 1 ELSE 0 END) AS overbudget_count')
            ->selectRaw('SUM(CASE WHEN spi < 1 THEN 1 ELSE 0 END) AS delay_count')
            ->first();

        $byDivision = (clone $baseQuery)
            ->toBase()
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

        $statusBreakdown = (clone $baseQuery)
            ->toBase()
            ->select('status', DB::raw('COUNT(*) AS count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status')
            ->map(fn($value) => (int) $value);

        $profitability = (clone $baseQuery)
            ->toBase()
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
            ->map(fn($row) => [
                'name' => $row->project_name,
                'pct'  => round(
                    $row->gross_profit_pct !== null
                        ? (float) $row->gross_profit_pct
                        : (($row->contract_value - $row->actual_cost) / $row->contract_value * 100),
                    1
                ) . '%',
            ]);

        $overrun = (clone $baseQuery)
            ->toBase()
            ->select('project_name', 'planned_cost', 'actual_cost')
            ->where('actual_cost', '>', DB::raw('planned_cost'))
            ->where('planned_cost', '>', 0)
            ->orderByRaw('(actual_cost - planned_cost) / planned_cost DESC')
            ->limit(10)
            ->get()
            ->map(fn($row) => [
                'name' => $row->project_name,
                'pct'  => round((($row->actual_cost - $row->planned_cost) / $row->planned_cost) * 100, 1) . '%',
            ]);

        $overbudgetCount = (int) $stats->overbudget_count;
        $delayCount = (int) $stats->delay_count;

        return [
            'total_projects'   => $total,
            'avg_cpi'          => round((float) $stats->avg_cpi, 4),
            'avg_spi'          => round((float) $stats->avg_spi, 4),
            'overbudget_count' => $overbudgetCount,
            'delay_count'      => $delayCount,
            'overbudget_pct'   => round($overbudgetCount / $total * 100, 1),
            'delay_pct'        => round($delayCount / $total * 100, 1),
            'by_division'      => $byDivision,
            'status_breakdown' => $statusBreakdown,
            'profitability'    => $profitability,
            'overrun'          => $overrun,
        ];
    }

    public function sbuDistribution(array $filters): array
    {
        $rows = $this->baseProjectQuery($filters)
            ->toBase()
            ->select('sbu', DB::raw('COUNT(*) as value'))
            ->whereNotNull('sbu')
            ->where('sbu', '!=', '')
            ->groupBy('sbu')
            ->orderByDesc('value')
            ->get()
            ->map(fn($row) => [
                'label' => $row->sbu,
                'value' => (int) $row->value,
            ]);

        return $rows->values()->all();
    }

    public function filterOptions(): array
    {
        $pluck = fn(string $column) => Project::distinct()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->orderBy($column)
            ->pluck($column)
            ->values();

        return [
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
        ];
    }
}
