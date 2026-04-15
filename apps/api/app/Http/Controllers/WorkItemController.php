<?php

namespace App\Http\Controllers;

use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Illuminate\Http\JsonResponse;

class WorkItemController extends Controller
{
    /**
     * Level 5 — single work item detail with vendor/contract data.
     */
    public function show(ProjectWorkItem $workItem): JsonResponse
    {
        $wbs = $workItem->period;

        return response()->json([
            'data' => [
                'id'               => $workItem->id,
                'item_name'        => $workItem->item_name,
                'item_no'          => $workItem->item_no,
                'tahap'            => $wbs?->name_of_work_phase,
                'volume'           => (float) ($workItem->volume ?? 0),
                'satuan'           => $workItem->satuan,
                'harsat_internal'  => (float) ($workItem->harsat_internal ?? 0),
                'total_budget'     => (float) ($workItem->total_budget ?? 0),
                'realisasi'        => (float) ($workItem->realisasi ?? 0),
                'cost_category'    => $workItem->cost_category,
                'cost_subcategory' => $workItem->cost_subcategory,
                'bobot_pct'        => (float) ($workItem->bobot_pct ?? 0),
                'progress_plan_pct'   => (float) ($workItem->progress_plan_pct ?? 0),
                'progress_actual_pct' => (float) ($workItem->progress_actual_pct ?? 0),
                'planned_value'    => (float) ($workItem->planned_value ?? 0),
                'earned_value'     => (float) ($workItem->earned_value ?? 0),
                'actual_cost_item' => (float) ($workItem->actual_cost_item ?? 0),
                'harsat_actual'    => (float) ($workItem->harsat_actual ?? 0),
                'vendor_name'      => $workItem->vendor_name,
                'po_number'        => $workItem->po_number,
                'vendor_contract_value' => (float) ($workItem->vendor_contract_value ?? 0),
                'termin_paid'      => (float) ($workItem->termin_paid ?? 0),
                'retention'        => (float) ($workItem->retention ?? 0),
                'outstanding_debt' => (float) ($workItem->outstanding_debt ?? 0),
                'data_source'      => $workItem->data_source,
                'notes'            => $workItem->notes,
            ],
        ]);
    }

    /**
     * Level 6 — HPP summary aggregated by cost_category for a WBS phase.
     */
    public function hppSummary(ProjectWbs $wbsModel): JsonResponse
    {
        $items = $wbsModel->workItems()
            ->where('is_total_row', false)
            ->whereNotNull('parent_id')
            ->get();

        // If no children with parent_id, fall back to all non-total items
        if ($items->isEmpty()) {
            $items = $wbsModel->workItems()
                ->where('is_total_row', false)
                ->get();
        }

        $grouped = $items->groupBy(fn($i) => $i->cost_category ?? 'Lainnya');

        $rows = [];
        foreach (['Langsung', 'Tidak Langsung', 'Lainnya'] as $cat) {
            if (!$grouped->has($cat)) continue;

            $group = $grouped[$cat];
            $subs = $group->pluck('cost_subcategory')->filter()->unique()->values()->toArray();

            $label = match ($cat) {
                'Langsung' => 'Biaya Langsung (BL)',
                'Tidak Langsung' => 'Biaya Tidak Langsung (BTL)',
                default => 'Biaya Lainnya',
            };

            $rows[] = [
                'name'      => $label,
                'sub'       => implode(', ', $subs) ?: '-',
                'budget'    => (float) $group->sum(fn($i) => (float) $i->total_budget),
                'realisasi' => (float) $group->sum(fn($i) => (float) $i->realisasi),
            ];
        }

        return response()->json([
            'data' => [
                'rows'            => $rows,
                'total_budget'    => (float) $items->sum(fn($i) => (float) $i->total_budget),
                'total_realisasi' => (float) $items->sum(fn($i) => (float) $i->realisasi),
            ],
        ]);
    }

    /**
     * Level 4 — work items for a WBS phase, returned as a flat list.
     */
    public function index(ProjectWbs $wbsModel): JsonResponse
    {
        // Option A: show children only (skip redundant parent that matches the phase name).
        $hasChildren = $wbsModel->workItems()->whereNotNull('parent_id')->exists();

        $query = $wbsModel->workItems()
            ->where('is_total_row', false)
            ->orderBy('sort_order');

        if ($hasChildren) {
            $query->whereNotNull('parent_id');
        }

        $items = $query->get()
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
