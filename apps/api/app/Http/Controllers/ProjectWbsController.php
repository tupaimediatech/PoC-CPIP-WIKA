<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectWbs;
use Illuminate\Http\JsonResponse;

class ProjectWbsController extends Controller
{
    /**
     * Level 3 — list of WBS phases for a project.
     * Maps backend fields to the BQ vs RAB format expected by the frontend.
     */
    public function index(Project $project): JsonResponse
    {
        $wbsPhases = $project->wbsPhases()
            ->orderBy('id')
            ->get();

        $phases = $wbsPhases->map(fn(ProjectWbs $wbs) => [
            'id'          => $wbs->id,
            'name'        => $wbs->name_of_work_phase,
            'bqExternal'  => (float) $wbs->total_pagu,        // nilai dari owner/client
            'rabInternal' => (float) $wbs->hpp_plan_total,    // HPP internal (RAB)
            'realisasi'   => (float) $wbs->hpp_actual_total,  // realisasi biaya
            'deviasi'     => (float) $wbs->hpp_deviation,     // deviasi %
            'deviasiPct'  => (float) ($wbs->deviasi_pct ?? 0),
        ]);

        return response()->json([
            'data' => [
                'project_name'  => $project->project_name,
                'sbu'           => $project->sbu,
                'owner'         => $project->owner,
                'contract_type' => $project->contract_type,
                'phases'        => $phases,
            ],
        ]);
    }

    /**
     * Level 3 detail — single WBS phase with work items.
     */
    public function show(Project $project, ProjectWbs $wbsModel): JsonResponse
    {
        abort_unless($wbsModel->project_id === $project->id, 404);

        $workItems = $wbsModel->workItems()
            ->whereNull('parent_id')
            ->with('children')
            ->orderBy('sort_order')
            ->get()
            ->map(fn($item) => [
                'id'             => $item->id,
                'name'           => $item->item_name,
                'volume'         => $item->volume,
                'satuan'         => $item->satuan,
                'harsatInternal' => $item->harsat_internal,
                'totalBiaya'     => (float) $item->total_budget,
                'realisasi'      => (float) $item->realisasi,
                'deviasi'        => (float) $item->deviasi,
                'deviasi_pct'    => (float) ($item->deviasi_pct ?? 0),
            ]);

        return response()->json([
            'data' => [
                'tahap'       => $wbsModel->name_of_work_phase,
                'rabInternal' => (float) $wbsModel->hpp_plan_total,
                'bqExternal'  => (float) $wbsModel->total_pagu,
                'items'       => $workItems,
            ],
        ]);
    }
}
