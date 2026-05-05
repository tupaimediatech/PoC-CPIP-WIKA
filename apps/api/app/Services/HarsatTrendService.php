<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class HarsatTrendService
{
    private const PALETTE = [
        '#E11D48',
        '#16A34A',
        '#EAB308',
        '#2563EB',
        '#9333EA',
        '#0891B2',
        '#F97316',
        '#64748B',
    ];

    private const MAX_CATEGORIES = 5;

    public function getTrendData(): ?array
    {
        $rows = DB::table('project_work_items as pwi')
            ->join('project_wbs as pw', 'pw.id', '=', 'pwi.period_id')
            ->join('projects as p', 'p.id', '=', 'pw.project_id')
            ->whereNotNull('pwi.id_resource')
            ->whereNotNull('pwi.resource_category')
            ->where('pwi.resource_category', '!=', '')
            ->whereNotNull('p.project_year')
            ->where('pwi.is_total_row', false)
            ->select([
                'pwi.resource_category',
                'p.project_year',
                'pwi.harsat_internal',
                'pwi.harsat_actual',
                'pwi.volume',
                'pwi.volume_actual',
            ])
            ->get();

        if ($rows->isEmpty()) {
            return null;
        }

        $totalsByCategory = [];
        $byYearCategory   = [];
        $yearSet          = [];

        foreach ($rows as $row) {
            $category = trim((string) $row->resource_category);
            if ($category === '') {
                continue;
            }

            $year = (string) $row->project_year;

            $value = ((float) ($row->harsat_internal ?? 0)) * ((float) ($row->volume ?? 0));
            if ($value <= 0.0) {
                $value = ((float) ($row->harsat_actual ?? 0)) * ((float) ($row->volume_actual ?? 0));
            }
            if ($value <= 0.0) {
                continue;
            }

            $yearSet[$year] = true;
            $totalsByCategory[$category] = ($totalsByCategory[$category] ?? 0.0) + $value;
            $byYearCategory[$category][$year] = ($byYearCategory[$category][$year] ?? 0.0) + $value;
        }

        if (empty($byYearCategory)) {
            return null;
        }

        arsort($totalsByCategory);
        $topCategories = array_slice(array_keys($totalsByCategory), 0, self::MAX_CATEGORIES);

        $years = array_keys($yearSet);
        sort($years);

        $categories = [];
        $data       = [];
        foreach ($topCategories as $i => $category) {
            $key = $this->slug($category);
            $categories[] = [
                'key'   => $key,
                'label' => $category,
                'color' => self::PALETTE[$i % count(self::PALETTE)],
            ];
            $data[$key] = array_map(
                fn($year) => round(($byYearCategory[$category][$year] ?? 0.0) / 1_000_000_000, 2),
                $years
            );
        }

        return [
            'years'      => array_map('strval', $years),
            'categories' => $categories,
            'data'       => $data,
        ];
    }

    private function slug(string $value): string
    {
        $slug = strtolower(preg_replace('/[^A-Za-z0-9]+/', '_', $value) ?? '');
        return trim($slug, '_') ?: 'cat';
    }
}
