<?php

namespace App\Http\Controllers;

use App\Models\ProjectWbs;
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

        $mapped = $logs->map(fn($log) => [
            'id'            => $log->id,
            'material_type' => $log->material_type,
            'volume'        => (float) $log->qty,
            'satuan'        => $log->satuan,
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
        ]);

        return response()->json([
            'data' => $mapped,
            'meta' => [
                'total_tagihan' => $logs->sum(fn($l) => (float) $l->total_tagihan),
                'total_rows'    => $logs->count(),
            ],
        ]);
    }
}
