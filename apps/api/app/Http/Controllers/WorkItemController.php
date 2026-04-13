<?php

namespace App\Http\Controllers;

use App\Models\ProjectMaterialLog;
use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Illuminate\Http\JsonResponse;

class WorkItemController extends Controller
{
    /**
     * Level 4 — work items for a WBS phase, returned as a nested tree.
     */
    public function index(ProjectWbs $wbsModel): JsonResponse
    {
        $flat = $wbsModel->workItems()
            ->orderBy('sort_order')
            ->get();

        $map = [];
        foreach ($flat as $item) {
            $map[$item->id] = [
                'id'             => $item->id,
                'name'           => $item->item_name,
                'item_no'        => $item->item_no,
                'volume'         => $item->volume !== null ? (float) $item->volume : null,
                'satuan'         => $item->satuan,
                'unit'           => $item->satuan,
                'internalPrice'  => $item->harsat_internal !== null ? (float) $item->harsat_internal : null,
                'harsatInternal' => $item->harsat_internal !== null ? (float) $item->harsat_internal : null,
                'totalBiaya'     => (float) ($item->total_budget ?? 0),
                'totalCost'      => (float) ($item->total_budget ?? 0),
                'realisasi'      => (float) ($item->realisasi ?? 0),
                'deviasi'        => (float) ($item->deviasi ?? 0),
                'deviasi_pct'    => (float) ($item->deviasi_pct ?? 0),
                'is_total_row'   => (bool) $item->is_total_row,
                'level'          => $item->level,
                'parent_id'      => $item->parent_id,
                'children'       => [],
            ];
        }

        $roots = [];
        foreach ($map as $id => &$node) {
            $parentId = $node['parent_id'];
            if ($parentId === null || !isset($map[$parentId])) {
                $roots[] = &$node;
            } else {
                $map[$parentId]['children'][] = &$node;
            }
        }
        unset($node);

        return response()->json([
            'data' => [
                'tahap'       => $wbsModel->name_of_work_phase,
                'rabInternal' => (float) ($wbsModel->rab_internal ?? 0),
                'bqExternal'  => (float) ($wbsModel->bq_external ?? 0),
                'items'       => array_values($roots),
            ],
        ]);
    }

    /**
     * Level 4 Detail — single work item with its descendant materials.
     * Returns everything [itemId]/page.tsx needs in one call.
     */
    public function detail(ProjectWorkItem $workItem): JsonResponse
    {
        $wbs = $workItem->wbsPhase;

        // Collect all descendant IDs (including self) using flat DB query
        $allIds = $wbs->workItems()->pluck('id', 'id')->toArray();
        $parentMap = $wbs->workItems()->pluck('parent_id', 'id')->toArray();
        $descendantIds = $this->collectDescendantIds($workItem->id, $parentMap);

        $materials = ProjectMaterialLog::whereIn('work_item_id', $descendantIds)
            ->where('is_discount', false)
            ->orderBy('id')
            ->get()
            ->map(fn($log) => $this->mapMaterialLog($log));

        return response()->json([
            'data' => [
                'tahap'       => $wbs->name_of_work_phase,
                'rabInternal' => (float) ($wbs->rab_internal ?? 0),
                'workItem'    => [
                    'id'      => $workItem->id,
                    'name'    => $workItem->item_name,
                    'item_no' => $workItem->item_no,
                    'volume'  => $workItem->volume !== null ? (float) $workItem->volume : null,
                    'satuan'  => $workItem->satuan,
                ],
                'materials' => $materials,
            ],
        ]);
    }

    /**
     * Level 6 HPP — HPP analysis for a work item.
     * Returns rabInternal, realisasi, CPI, and insight in one call.
     */
    public function hpp(ProjectWorkItem $workItem): JsonResponse
    {
        $wbs     = $workItem->wbsPhase;
        $project = $wbs->project;

        $cpi         = (float) $project->cpi;
        $spi         = (float) $project->spi;
        $plannedCost = (float) $project->planned_cost;
        $actualCost  = (float) $project->actual_cost;
        $delay       = $project->actual_duration - $project->planned_duration;
        $overrunPct  = $plannedCost > 0
            ? (($actualCost - $plannedCost) / $plannedCost) * 100
            : 0;

        $bullets = [];

        if ($cpi >= 1) {
            $savingsPct = $plannedCost > 0
                ? abs(($actualCost - $plannedCost) / $plannedCost * 100)
                : 0;
            $bullets[] = [
                'level' => 'info',
                'text'  => sprintf(
                    'Positive cost performance: CPI %.4f indicates the project is %.1f%% under budget.',
                    $cpi, $savingsPct
                ),
            ];
        } else {
            $bullets[] = [
                'level' => $cpi < 0.9 ? 'critical' : 'warning',
                'text'  => sprintf(
                    'Cost overrun detected: CPI %.4f indicates the project is %.1f%% over planned budget.',
                    $cpi, $overrunPct
                ),
            ];
        }

        if ($spi >= 1) {
            $bullets[] = ['level' => 'info', 'text' => sprintf('Schedule is on track: SPI %.4f.', $spi)];
        } else {
            $bullets[] = [
                'level' => $spi < 0.9 ? 'critical' : 'warning',
                'text'  => sprintf('Schedule delay detected: SPI %.4f. Project is %d days behind.', $spi, $delay),
            ];
        }

        $summaryLevel = $cpi < 0.9 || $spi < 0.9 ? 'critical' : ($cpi < 1 || $spi < 1 ? 'warning' : 'info');
        $summaryText  = $cpi >= 1 && $spi >= 1
            ? 'Project is performing well within budget and schedule.'
            : ($cpi < 1 && $spi < 1
                ? 'Project is over budget and behind schedule — immediate action required.'
                : ($cpi < 1
                    ? 'Project is over budget. Review cost control measures.'
                    : 'Project is behind schedule. Review timeline management.'));

        return response()->json([
            'data' => [
                'tahap'       => $wbs->name_of_work_phase,
                'rabInternal' => (float) ($wbs->rab_internal ?? 0),
                'realisasi'   => (float) $wbs->workItems()->whereNull('parent_id')->where('is_total_row', false)->sum('realisasi'),
                'workItem'    => [
                    'id'      => $workItem->id,
                    'name'    => $workItem->item_name,
                    'item_no' => $workItem->item_no,
                    'volume'  => $workItem->volume !== null ? (float) $workItem->volume : null,
                    'satuan'  => $workItem->satuan,
                ],
                'cpi'     => $cpi,
                'insight' => [
                    'bullets' => $bullets,
                    'summary' => ['level' => $summaryLevel, 'text' => $summaryText],
                ],
            ],
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Collect all descendant IDs (including self) from a flat parent_id map.
     */
    private function collectDescendantIds(int $id, array $parentMap): array
    {
        $ids = [$id];
        foreach ($parentMap as $childId => $parentId) {
            if ((int) $parentId === $id) {
                $ids = array_merge($ids, $this->collectDescendantIds($childId, $parentMap));
            }
        }
        return array_unique($ids);
    }

    private function mapMaterialLog($log): array
    {
        return [
            'id'            => $log->id,
            'material_type' => $log->material_type,
            'volume'        => $log->qty !== null ? (float) $log->qty : null,
            'satuan'        => $log->satuan,
            'work_item_id'  => $log->work_item_id,
            'is_discount'   => (bool) $log->is_discount,
            'vendor'        => [
                'nama'           => $log->supplier_name,
                'tahunPerolehan' => $log->tahun_perolehan,
                'lokasi'         => $log->lokasi_vendor,
                'ratingPerforma' => $log->rating_performa,
            ],
            'kontrak' => [
                'nilaiKontrak'        => $log->total_tagihan
                    ? 'Rp' . number_format((float) $log->total_tagihan, 0, ',', '.')
                    : null,
                'hargaSatuan'         => $log->harga_satuan && $log->satuan
                    ? 'Rp' . number_format((float) $log->harga_satuan, 0, ',', '.') . '/' . $log->satuan
                    : null,
                'realisasiPengiriman' => $log->realisasi_pengiriman,
                'deviasiHargaMarket'  => $log->deviasi_harga_market,
            ],
            'catatanMonitoring' => $log->catatan_monitoring,
        ];
    }
}
