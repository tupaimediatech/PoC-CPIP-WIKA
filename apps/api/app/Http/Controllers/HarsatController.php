<?php

namespace App\Http\Controllers;

use App\Models\HarsatHistory;
use App\Services\HarsatTrendService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HarsatController extends Controller
{
    public function __construct(
        private readonly HarsatTrendService $trendService,
    ) {
    }

    /**
     * GET /harsat/trend
     * Returns trend data in the format expected by TrendHarsatUtama component:
     * { years, categories: [{key, label}], data: { key: [values...] } }
     */
    public function trend(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->trendService->getTrendData()]);
    }

    /**
     * POST /harsat (protected) — upsert a single data point.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category'     => 'required|string|max:100',
            'category_key' => 'required|string|max:50',
            'year'         => 'required|integer|min:2000|max:2099',
            'value'        => 'required|numeric|min:0',
            'unit'         => 'nullable|string|max:50',
        ]);

        $row = HarsatHistory::updateOrCreate(
            ['category_key' => $validated['category_key'], 'year' => $validated['year']],
            $validated,
        );

        return response()->json(['data' => $row], 201);
    }
}
