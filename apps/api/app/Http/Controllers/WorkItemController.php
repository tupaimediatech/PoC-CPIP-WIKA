<?php

namespace App\Http\Controllers;

use App\Models\ProjectVendor;
use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Illuminate\Http\JsonResponse;

class WorkItemController extends Controller
{
    /**
     * Level 5 — single work item detail with vendor/contract data.
     */
    public function show(ProjectWorkItem $resourceCategory): JsonResponse
    {
        $wbs = $resourceCategory->period;
        $materialLog = $resourceCategory->materialLogs()->latest('id')->first();

        $vendor = null;
        if ($wbs && $resourceCategory->po_number) {
            $vendor = ProjectVendor::where('project_id', $wbs->project_id)
                ->where('po_number', $resourceCategory->po_number)
                ->first();
        }
        if (!$vendor && $wbs && $resourceCategory->vendor_name) {
            $vendor = ProjectVendor::where('project_id', $wbs->project_id)
                ->where('vendor_name', $resourceCategory->vendor_name)
                ->first();
        }

        $kontrak = (float) ($resourceCategory->vendor_contract_value ?? 0);
        $termin  = (float) ($resourceCategory->termin_paid ?? 0);
        $retention = $resourceCategory->retention !== null
            ? (float) $resourceCategory->retention
            : $kontrak * 0.05;
        $outstanding = $resourceCategory->outstanding_debt !== null
            ? (float) $resourceCategory->outstanding_debt
            : $kontrak * 0.95 - $termin;

        return response()->json([
            'data' => [
                'id'               => $resourceCategory->id,
                'item_name'        => $resourceCategory->item_name,
                'item_no'          => $resourceCategory->item_no,
                'id_resource'      => $resourceCategory->id_resource,
                'resource_category'=> $resourceCategory->resource_category,
                'tahap'            => $wbs?->name_of_work_phase,
                'volume'           => (float) ($resourceCategory->volume ?? 0),
                'satuan'           => $resourceCategory->satuan,
                'harsat_internal'  => (float) ($resourceCategory->harsat_internal ?? 0),
                'total_budget'     => (float) ($resourceCategory->total_budget ?? 0),
                'realisasi'        => (float) ($resourceCategory->realisasi ?? 0),
                'cost_category'    => $resourceCategory->cost_category,
                'cost_subcategory' => $resourceCategory->cost_subcategory,
                'bobot_pct'        => (float) ($resourceCategory->bobot_pct ?? 0),
                'progress_plan_pct'   => (float) ($resourceCategory->progress_plan_pct ?? 0),
                'progress_actual_pct' => (float) ($resourceCategory->progress_actual_pct ?? 0),
                'planned_value'    => (float) ($resourceCategory->planned_value ?? 0),
                'earned_value'     => (float) ($resourceCategory->earned_value ?? 0),
                'actual_cost_item' => (float) ($resourceCategory->actual_cost_item ?? 0),
                'harsat_actual'    => (float) ($resourceCategory->harsat_actual ?? 0),
                'vendor_name'      => $resourceCategory->vendor_name,
                'po_number'        => $resourceCategory->po_number,
                'vendor_contract_value' => $kontrak,
                'termin_paid'      => $termin,
                'retention'        => $retention,
                'outstanding_debt' => $outstanding,
                'data_source'      => $resourceCategory->data_source,
                'notes'            => $resourceCategory->notes,
                'realisasi_pengiriman' => $materialLog?->realisasi_pengiriman,
                'deviasi_harga_market' => $materialLog?->deviasi_harga_market,
                'vendor_lokasi'    => $vendor?->lokasi,
                'vendor_npwp'      => $vendor?->npwp,
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
                    'id_resource'    => $item->id_resource,
                    'resource_category' => $item->resource_category,
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
                'rabInternal' => (float) $wbsModel->actual_costs,
                'bqExternal'  => (float) $wbsModel->bq_external,
                'items'       => $items,
            ],
        ]);
    }
}
