<?php

namespace App\Http\Controllers;

use App\Models\HarsatHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HarsatController extends Controller
{
    /**
     * GET /harsat/trend
     * Returns trend data in the format expected by TrendHarsatUtama component:
     * { years, categories: [{key, label}], data: { key: [values...] } }
     */
    public function trend(Request $request): JsonResponse
    {
        // Three fixed buckets, classified by keyword on material_type.
        // Values returned are SUM(total_tagihan) per bucket per year in IDR Milyar.
        $buckets = [
            ['key' => 'besi',     'label' => 'Besi',     'color' => '#E11D48', 'keywords' => ['besi', 'tulangan', 'steel']],
            ['key' => 'beton',    'label' => 'Beton',    'color' => '#16A34A', 'keywords' => ['beton', 'concrete', 'lean', 'k-350', 'k-125']],
            ['key' => 'jembatan', 'label' => 'Jembatan', 'color' => '#EAB308', 'keywords' => ['girder', 'pier', 'abutment', 'bearing', 'bekisting', 'bored pile', 'scaffolding', 'aspal', 'overlay', 'railing', 'deck', 'lantai jembatan']],
        ];

        $rows = DB::table('project_material_logs')
            ->select('material_type', 'tahun_perolehan', 'total_tagihan', 'harga_satuan', 'qty')
            ->whereNotNull('material_type')
            ->whereNotNull('tahun_perolehan')
            ->where('is_discount', false)
            ->get();

        if ($rows->isEmpty()) {
            return response()->json(['data' => null]);
        }

        $classify = function (string $type) use ($buckets): ?string {
            $lc = strtolower($type);
            foreach ($buckets as $b) {
                foreach ($b['keywords'] as $kw) {
                    if (str_contains($lc, $kw)) return $b['key'];
                }
            }
            return null;
        };

        $years = $rows->pluck('tahun_perolehan')->unique()->sort()->values()->map(fn($y) => (string) $y);

        // Initialize year accumulator per bucket
        $acc = [];
        foreach ($buckets as $b) {
            $acc[$b['key']] = array_fill_keys($years->toArray(), 0.0);
        }

        foreach ($rows as $r) {
            $bucket = $classify((string) $r->material_type);
            if ($bucket === null) continue;

            // Prefer total_tagihan when available, else fall back to qty × harga_satuan
            $value = (float) ($r->total_tagihan ?? 0);
            if ($value <= 0.0) {
                $value = ((float) ($r->qty ?? 0)) * ((float) ($r->harga_satuan ?? 0));
            }
            if ($value <= 0.0) continue;

            $acc[$bucket][(string) $r->tahun_perolehan] += $value;
        }

        $data = [];
        foreach ($buckets as $b) {
            $data[$b['key']] = $years->map(
                fn($y) => round($acc[$b['key']][$y] / 1_000_000_000, 2) // → Milyar
            )->values()->toArray();
        }

        $categories = array_map(
            fn($b) => ['key' => $b['key'], 'label' => $b['label'], 'color' => $b['color']],
            $buckets
        );

        return response()->json([
            'data' => [
                'years'      => $years->toArray(),
                'categories' => $categories,
                'data'       => $data,
            ],
        ]);
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
