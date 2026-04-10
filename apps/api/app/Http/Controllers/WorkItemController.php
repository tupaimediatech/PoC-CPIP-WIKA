<?php

namespace App\Http\Controllers;

use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Illuminate\Http\JsonResponse;

class WorkItemController extends Controller
{
    /**
     * Level 4 — work items for a WBS phase, mapped to frontend format.
     */
    public function index(ProjectWbs $wbsModel): JsonResponse
    {
        $roots = $wbsModel->workItems()
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get();

        $all = $wbsModel->workItems()->orderBy('sort_order')->get()->keyBy('id');

        $items = $this->buildTree($roots, $all);

        return response()->json([
            'data' => [
                'tahap'       => $wbsModel->name_of_work_phase,
                'rabInternal' => (float) $wbsModel->hpp_plan_total,
                'bqExternal'  => (float) $wbsModel->total_pagu,
                'items'       => $items,
            ],
        ]);
    }

    private function buildTree($nodes, $all): array
    {
        return $nodes->map(function (ProjectWorkItem $node) use ($all) {
            $children = $all->filter(fn($i) => $i->parent_id === $node->id);

            return [
                'id'             => $node->id,
                'name'           => $node->item_name,
                'item_no'        => $node->item_no,
                'volume'         => $node->volume,
                'satuan'         => $node->satuan,
                'harsatInternal' => $node->harsat_internal,
                'totalBiaya'     => (float) $node->total_budget,
                'realisasi'      => (float) $node->realisasi,
                'deviasi'        => (float) $node->deviasi,
                'deviasi_pct'    => (float) ($node->deviasi_pct ?? 0),
                'is_total_row'   => (bool) $node->is_total_row,
                'children'       => $children->isNotEmpty()
                    ? $this->buildTree($children, $all)
                    : [],
            ];
        })->values()->toArray();
    }
}
