<?php

namespace App\Http\Controllers;

use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Illuminate\Http\JsonResponse;

class MaterialLogController extends Controller
{
    /**
     * Level 5 — material/vendor logs for a WBS phase, mapped to frontend format.
     */
    public function index(ProjectWbs $wbsModel): JsonResponse
    {
        $logs = $wbsModel->materialLogs()
            ->where('is_discount', false)
            ->orderBy('id')
            ->get();

        $mapped = $logs->map(fn($log) => $this->mapMaterialLog($log));

        return response()->json([
            'data' => $mapped,
            'meta' => [
                'total_tagihan' => $logs->sum(fn($l) => (float) $l->total_tagihan),
                'total_rows'    => $logs->count(),
            ],
        ]);
    }

    /**
     * Level 5 — material/vendor logs for a specific work item.
     * Returns materials linked to the specific work item (work_item_id).
     */
    public function showByWorkItem(ProjectWorkItem $workItem): JsonResponse
    {
        $logs = $workItem->materialLogs()
            ->where('is_discount', false)
            ->orderBy('id')
            ->get();

        $mapped = $logs->map(fn($log) => $this->mapMaterialLog($log));

        return response()->json([
            'data' => $mapped,
            'meta' => [
                'total_tagihan' => $logs->sum(fn($l) => (float) $l->total_tagihan),
                'total_rows'    => $logs->count(),
            ],
        ]);
    }

    /**
     * Level 5 — detail satu material beserta konteks work item dan tahap.
     * Cukup satu API call dari [subItemId]/page.tsx.
     */
    public function show(ProjectMaterialLog $material): JsonResponse
    {
        $workItem = $material->workItem;
        $wbs      = $workItem?->wbsPhase ?? $material->wbsPhase;

        return response()->json([
            'data' => [
                'tahap'    => $wbs?->name_of_work_phase ?? '-',
                'workItem' => $workItem ? [
                    'id'      => $workItem->id,
                    'name'    => $workItem->item_name,
                    'item_no' => $workItem->item_no,
                    'volume'  => $workItem->volume !== null ? (float) $workItem->volume : null,
                    'satuan'  => $workItem->satuan,
                ] : null,
                'material' => $this->mapMaterialLog($material),
            ],
        ]);
    }

    /**
     * Map a material log to the frontend format.
     */
    private function mapMaterialLog($log): array
    {
        return [
            'id'            => $log->id,
            'material_type' => $log->material_type,
            'volume'        => (float) $log->qty,
            'satuan'        => $log->satuan,
            'work_item_id'  => $log->work_item_id,
            'vendor'        => [
                'nama'            => $log->supplier_name,
                'tahunPerolehan'  => $log->tahun_perolehan,
                'lokasi'          => $log->lokasi_vendor,
                'ratingPerforma'  => $log->rating_performa,
            ],
            'kontrak'       => [
                'nilaiKontrak'         => $log->total_tagihan
                    ? 'Rp' . number_format((float) $log->total_tagihan, 0, ',', '.')
                    : null,
                'hargaSatuan'          => $log->harga_satuan && $log->satuan
                    ? 'Rp' . number_format((float) $log->harga_satuan, 0, ',', '.') . '/' . $log->satuan
                    : null,
                'realisasiPengiriman'  => $log->realisasi_pengiriman,
                'deviasiHargaMarket'   => $log->deviasi_harga_market,
            ],
            'catatanMonitoring' => $log->catatan_monitoring,
        ];
    }
}
