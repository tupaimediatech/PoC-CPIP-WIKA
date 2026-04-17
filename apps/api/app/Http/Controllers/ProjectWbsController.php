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
            'bqExternal'  => (float) $wbs->bq_external,       // nilai dari owner/client
            'rabInternal' => (float) $wbs->actual_costs,      // HPP internal (RAB)
            'realisasi'   => (float) $wbs->realized_costs,    // realisasi biaya
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

        // Option A: show children only (skip redundant parent row that matches the phase name).
        // If children exist (parent_id IS NOT NULL), show only those.
        // If flat list (all parent_id IS NULL), show all non-total rows.
        $hasChildren = $wbsModel->workItems()->whereNotNull('parent_id')->exists();

        $query = $wbsModel->workItems()
            ->where('is_total_row', false)
            ->orderBy('sort_order');

        if ($hasChildren) {
            $query->whereNotNull('parent_id');
        }

        $workItems = $query->get()
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
                'is_total_row'   => (bool) $item->is_total_row,
            ]);

        return response()->json([
            'data' => [
                'tahap'       => $wbsModel->name_of_work_phase,
                'rabInternal' => (float) $wbsModel->actual_costs,
                'bqExternal'  => (float) $wbsModel->bq_external,
                'items'       => $workItems,
            ],
        ]);
    }
}
