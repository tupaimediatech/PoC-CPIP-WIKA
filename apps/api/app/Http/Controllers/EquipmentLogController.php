<?php

namespace App\Http\Controllers;

use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
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

    /**
     * Level 5 — equipment logs for a specific work item.
     * Returns equipment linked to the specific work item (work_item_id).
     */
    public function showByWorkItem(ProjectWorkItem $workItem): JsonResponse
    {
        $logs = $workItem->equipmentLogs()
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
