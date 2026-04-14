<?php

namespace App\Http\Controllers;

use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Illuminate\Http\JsonResponse;

class HppItemController extends Controller
{
    /**
     * Level 6 — HPP items for a specific work item.
     *
     * GET /api/work-items/{workItem}/hpp
     */
    public function index(ProjectWorkItem $workItem): JsonResponse
    {
        $hppItems = $workItem->hppItems()
            ->orderBy('resource_type')
            ->orderBy('resource_name')
            ->get()
            ->map(fn ($item) => [
                'id'                   => $item->id,
                'resourceType'         => $item->resource_type,
                'resourceName'         => $item->resource_name,
                'volume'               => $item->volume,
                'satuan'               => $item->satuan,
                'hppTender'            => (float) $item->hpp_tender,
                'hppRkp'               => (float) $item->hpp_rkp,
                'realisasi'            => (float) $item->realisasi,
                'totalTender'          => (float) $item->total_tender,
                'totalRkp'             => (float) $item->total_rkp,
                'totalRealisasi'       => (float) $item->total_realisasi,
                'deviasiRkpRealisasi'  => (float) $item->deviasi_rkp_realisasi,
                'deviasiPct'           => (float) ($item->deviasi_pct ?? 0),
            ])
            ->values()
            ->toArray();

        // Aggregate summary
        $totalTender    = array_sum(array_column($hppItems, 'totalTender'));
        $totalRkp       = array_sum(array_column($hppItems, 'totalRkp'));
        $totalRealisasi = array_sum(array_column($hppItems, 'totalRealisasi'));

        return response()->json([
            'data' => [
                'workItem' => [
                    'id'          => $workItem->id,
                    'name'        => $workItem->item_name,
                    'itemNo'      => $workItem->item_no,
                    'totalBudget' => (float) $workItem->total_budget,
                    'realisasi'   => (float) $workItem->realisasi,
                ],
                'summary' => [
                    'totalTender'    => $totalTender,
                    'totalRkp'       => $totalRkp,
                    'totalRealisasi' => $totalRealisasi,
                    'deviasi'        => $totalRkp - $totalRealisasi,
                ],
                'items' => $hppItems,
            ],
        ]);
    }

    /**
     * Level 6 (aggregated) — All HPP items for an entire WBS phase.
     *
     * GET /api/wbs-phases/{wbsModel}/hpp
     */
    public function indexByWbs(ProjectWbs $wbsModel): JsonResponse
    {
        $workItems = $wbsModel->workItems()
            ->with('hppItems')
            ->orderBy('sort_order')
            ->get();

        $result = $workItems->map(function (ProjectWorkItem $workItem) {
            $hppItems = $workItem->hppItems
                ->sortBy('resource_type')
                ->map(fn ($item) => [
                    'id'                   => $item->id,
                    'resourceType'         => $item->resource_type,
                    'resourceName'         => $item->resource_name,
                    'volume'               => $item->volume,
                    'satuan'               => $item->satuan,
                    'hppTender'            => (float) $item->hpp_tender,
                    'hppRkp'               => (float) $item->hpp_rkp,
                    'realisasi'            => (float) $item->realisasi,
                    'totalTender'          => (float) $item->total_tender,
                    'totalRkp'             => (float) $item->total_rkp,
                    'totalRealisasi'       => (float) $item->total_realisasi,
                    'deviasiRkpRealisasi'  => (float) $item->deviasi_rkp_realisasi,
                    'deviasiPct'           => (float) ($item->deviasi_pct ?? 0),
                ])
                ->values()
                ->toArray();

            return [
                'workItem' => [
                    'id'          => $workItem->id,
                    'name'        => $workItem->item_name,
                    'itemNo'      => $workItem->item_no,
                    'totalBudget' => (float) $workItem->total_budget,
                    'realisasi'   => (float) $workItem->realisasi,
                ],
                'hppItems' => $hppItems,
            ];
        })->values()->toArray();

        // Grand totals across all work items
        $grandTender    = 0;
        $grandRkp       = 0;
        $grandRealisasi = 0;
        foreach ($result as $group) {
            foreach ($group['hppItems'] as $item) {
                $grandTender    += $item['totalTender'];
                $grandRkp       += $item['totalRkp'];
                $grandRealisasi += $item['totalRealisasi'];
            }
        }

        return response()->json([
            'data' => [
                'wbsPhase' => [
                    'id'           => $wbsModel->id,
                    'name'         => $wbsModel->name_of_work_phase,
                    'rabInternal'  => (float) $wbsModel->hpp_plan_total,
                    'bqExternal'   => (float) $wbsModel->total_pagu,
                ],
                'summary' => [
                    'totalTender'    => $grandTender,
                    'totalRkp'       => $grandRkp,
                    'totalRealisasi' => $grandRealisasi,
                    'deviasi'        => $grandRkp - $grandRealisasi,
                ],
                'workItems' => $result,
            ],
        ]);
    }
}
