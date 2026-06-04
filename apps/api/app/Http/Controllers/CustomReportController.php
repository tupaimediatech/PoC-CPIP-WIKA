<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectWorkItem;
use Illuminate\Http\Request;

class CustomReportController extends Controller
{
    public function index (Request $request)
    {
        $level = (int) $request->query('level', 5);
        $projectName = $request->query('project_name');
        $vendor = $request->query('vendor');
        $yearFrom = $request->query('year_from');
        $yearTo = $request->query('year_to');
        $location = $request->query('location');
        $sbu = $request->query('sbu');
        $contractType = $request->query('contract_type');

        //Base Project query with filters
        $projectQuery = Project::query()
            ->when($projectName, fn($q) => $q->where('project_name', 'like', "%{$projectName}%"))
            ->when($location, fn($q) => $q->where('location', 'like', "%{$location}%"))
            ->when($sbu, fn($q) => $q->where('sbu', 'like', "%{$sbu}%"))
            ->when($contractType, fn($q) => $q->where('contract_type', 'like', "%{$contractType}%"))
            ->when($yearFrom, fn($q) => $q->where('project_year', '>=', (int) $yearFrom))
            ->when($yearTo, fn($q) => $q->where('project_year', '<=', (int) $yearTo));

        return match ($level) {
            3 => $this->level3($projectQuery),
            4 => $this->level4($projectQuery),
            5 => $this->level5($projectQuery, $vendor),
            6 => $this->level6($projectQuery, $vendor),
            7 => $this->level7($projectQuery),
            default =>response()->json(['error' => 'Invalid Level'], 422),
        };
    }
     // Level 3 - Profit & Loss Summary
     private function level3($projectQuery)
     {
        $data = $projectQuery->get()->map(fn($p) => [
            'project_name'     => $p->project_name,
            'scope_of_work'    => $p->scope_of_work,
            'contract_value'   => $p->contract_value,
            'hpp_pct'          => $p->hpp_pct,
            'gross_profit_pct' => $p->gross_profit_pct,
            'spi'              => $p->spi,
            'cpi'              => $p->cpi,
            'status'           => $p->delivery_budget_status,
        ]);
        return response()->json(['data' => $data]);
     }

    // Level 4 - WBS Overview
    private function level4($projectQuery)
    {
        $projects = $projectQuery->with('wbsPhases')->get();

        $data = $projects->flatMap(fn($p) =>
            $p->wbsPhases->map(fn($wbs) => [
                'project_name'  => $p->project_name,
                'scope_of_work' => $p->scope_of_work,
                'phase'         => $wbs->phase_name ?? $wbs->name ?? '-',
                'bq_external'   => $wbs->bq_external ?? $wbs->budget_awal ?? 0,
                'actual_costs'  => $wbs->actual_cost ?? $wbs->realisasi ?? 0,
                'deviasi_pct'   => $wbs->deviasi_pct ?? 0,
            ])
        );
        return response()->json(['data' => $data]);
    }

     // Level 5 - Harsat per Sumber Daya
    private function level5($projectQuery, ?string $vendor)
    {
        $projectIds = $projectQuery->pluck('id');

        $data = ProjectWorkItem::whereHas('wbsPhase', fn($q) => $q->whereIn('project_id', $projectIds))
            ->when($vendor, fn($q) => $q->where('vendor_name', 'like', "%{$vendor}%"))
            ->where('is_total_row', false)
            ->with('wbsPhase.project')
            ->get()
            ->map(fn($item) => [
                'project_name'  => $item->wbsPhase->project->project_name ?? '-',
                'scope_of_work' => $item->wbsPhase->project->scope_of_work ?? '-',
                'id_resource'   => $item->id_resource,
                'resource_name' => $item->item_name,
                'category'      => $item->cost_subcategory ?? $item->resource_category,
                'volume'        => $item->volume,
                'unit'          => $item->satuan ?? $item->unit,
                'harsat'        => $item->harsat_internal,
                'total'         => $item->budget_awal ?? $item->total_budget,
            ]);

        return response()->json(['data' => $data]);
    }

     // Level 6 - Monitoring Kontrak Vendor
    private function level6($projectQuery, ?string $vendor)
    {
        $projectIds = $projectQuery->pluck('id');

        $data = ProjectWorkItem::whereHas('wbsPhase', fn($q) => $q->whereIn('project_id', $projectIds))
            ->whereNotNull('vendor_name')
            ->where('vendor_name', '!=', '')
            ->when($vendor, fn($q) => $q->where('vendor_name', 'like', "%{$vendor}%"))
            ->where('is_total_row', false)
            ->with('wbsPhase.project')
            ->get()
            ->map(fn($item) => [
                'project_name'    => $item->wbsPhase->project->project_name ?? '-',
                'scope_of_work'   => $item->wbsPhase->project->scope_of_work ?? '-',
                'resource'        => $item->item_name,
                'vendor'          => $item->vendor_name,
                'contract_value'  => $item->vendor_contract_value,
                'harsat_internal' => $item->harsat_internal,
                'progress'        => $item->progress_actual_pct,
            ]);

        return response()->json(['data' => $data]);
    }

    private function level7($projectQuery)
    {
        $projects = $projectQuery->with('risks')->get();

        $data = $projects->flatMap(fn($p) =>
            $p->risks->map(fn($risk) => [
                'project_name'  => $p->project_name,
                'scope_of_work' => $p->scope_of_work,
                'category'      => $risk->category,
                'title'         => $risk->risk_title ?? $risk->description,
                'impact'        => $risk->financial_impact_idr ?? $risk->impact,
                'status'        => $risk->status,
            ])
        );

        return response()->json(['data' => $data]);
    }
}
