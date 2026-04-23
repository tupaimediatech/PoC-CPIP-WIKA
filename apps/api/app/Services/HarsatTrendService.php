<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class HarsatTrendService
{
    public function getTrendData(): ?array
    {
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
            return null;
        }

        $classify = function (string $type) use ($buckets): ?string {
            $lc = strtolower($type);
            foreach ($buckets as $bucket) {
                foreach ($bucket['keywords'] as $keyword) {
                    if (str_contains($lc, $keyword)) {
                        return $bucket['key'];
                    }
                }
            }

            return null;
        };

        $years = $rows->pluck('tahun_perolehan')
            ->unique()
            ->sort()
            ->values()
            ->map(fn($year) => (string) $year);

        $accumulator = [];
        foreach ($buckets as $bucket) {
            $accumulator[$bucket['key']] = array_fill_keys($years->toArray(), 0.0);
        }

        foreach ($rows as $row) {
            $bucket = $classify((string) $row->material_type);
            if ($bucket === null) {
                continue;
            }

            $value = (float) ($row->total_tagihan ?? 0);
            if ($value <= 0.0) {
                $value = ((float) ($row->qty ?? 0)) * ((float) ($row->harga_satuan ?? 0));
            }

            if ($value <= 0.0) {
                continue;
            }

            $accumulator[$bucket][(string) $row->tahun_perolehan] += $value;
        }

        $data = [];
        foreach ($buckets as $bucket) {
            $data[$bucket['key']] = $years->map(
                fn($year) => round($accumulator[$bucket['key']][$year] / 1_000_000_000, 2)
            )->values()->toArray();
        }

        $categories = array_map(
            fn($bucket) => ['key' => $bucket['key'], 'label' => $bucket['label'], 'color' => $bucket['color']],
            $buckets
        );

        return [
            'years'      => $years->toArray(),
            'categories' => $categories,
            'data'       => $data,
        ];
    }
}
