<?php

namespace App\Http\Controllers;

use App\Models\ProjectWbs;
use Illuminate\Http\JsonResponse;

class EquipmentLogController extends Controller
{
    public function index(ProjectWbs $wbsModel): JsonResponse
    {
        $logs = $wbsModel->equipmentLogs()
            ->orderBy('vendor_name')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $logs,
            'meta' => [
                'total_biaya'   => $logs->sum(fn($l) => (float) $l->total_biaya),
                'total_rows'    => $logs->count(),
                'pending_count' => $logs->where('payment_status', 'Pending')->count(),
            ],
        ]);
    }
}
