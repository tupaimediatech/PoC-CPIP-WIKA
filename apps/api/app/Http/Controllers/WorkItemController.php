<?php

namespace App\Http\Controllers;

use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Illuminate\Http\JsonResponse;

class WorkItemController extends Controller
{
    /**
     * Level 4 — work items for a WBS phase, returned as a flat list.
     */
    public function index(ProjectWbs $wbsModel): JsonResponse
    {
        // Fetch ALL work items for this WBS phase (flat list, no hierarchy filter)
        $items = $wbsModel->workItems()
            ->orderBy('sort_order')
            ->get()
            ->map(function (ProjectWorkItem $item) {
                return [
                    'id'             => $item->id,
                    'name'           => $item->item_name,
                    'item_no'        => $item->item_no,
                    'volume'         => $item->volume,
                    'unit'           => $item->satuan,
                    'internalPrice'  => $item->harsat_internal,
                    'totalCost'      => (float) $item->total_budget,
                    'totalBiaya'     => (float) $item->total_budget,
                    'realisasi'      => (float) $item->realisasi,
                    'deviasi'        => (float) $item->deviasi,
                    'deviasi_pct'    => (float) ($item->deviasi_pct ?? 0),
                    'is_total_row'   => (bool) $item->is_total_row,
                    'level'          => $item->level,
                    'parent_id'      => $item->parent_id,
                ];
            })->values()->toArray();

        return response()->json([
            'data' => [
                'tahap'       => $wbsModel->name_of_work_phase,
                'rabInternal' => (float) $wbsModel->hpp_plan_total,
                'bqExternal'  => (float) $wbsModel->total_pagu,
                'items'       => $items,
            ],
        ]);
    }
}
