<?php

namespace Database\Seeders;

use App\Models\HarsatHistory;
use Illuminate\Database\Seeder;

class HarsatHistorySeeder extends Seeder
{
    public function run(): void
    {
        // Realistic construction material unit price trends (IDR Juta per unit)
        $categories = [
            [
                'category'     => 'Besi Beton',
                'category_key' => 'besi_beton',
                'unit'         => 'kg',
                'values'       => [
                    2021 => 12.50,
                    2022 => 14.20,
                    2023 => 13.80,
                    2024 => 15.10,
                    2025 => 15.90,
                ],
            ],
            [
                'category'     => 'Beton Ready Mix',
                'category_key' => 'beton_ready_mix',
                'unit'         => 'm3',
                'values'       => [
                    2021 => 85.00,
                    2022 => 92.00,
                    2023 => 98.50,
                    2024 => 105.00,
                    2025 => 112.00,
                ],
            ],
            [
                'category'     => 'Kayu Bekisting',
                'category_key' => 'kayu_bekisting',
                'unit'         => 'm3',
                'values'       => [
                    2021 => 350.00,
                    2022 => 365.00,
                    2023 => 380.00,
                    2024 => 410.00,
                    2025 => 435.00,
                ],
            ],
            [
                'category'     => 'Semen Portland',
                'category_key' => 'semen_portland',
                'unit'         => 'kg',
                'values'       => [
                    2021 => 1.45,
                    2022 => 1.55,
                    2023 => 1.62,
                    2024 => 1.70,
                    2025 => 1.78,
                ],
            ],
            [
                'category'     => 'Aspal',
                'category_key' => 'aspal',
                'unit'         => 'kg',
                'values'       => [
                    2021 => 8.20,
                    2022 => 9.50,
                    2023 => 10.80,
                    2024 => 11.20,
                    2025 => 10.90,
                ],
            ],
        ];

        foreach ($categories as $cat) {
            foreach ($cat['values'] as $year => $value) {
                HarsatHistory::updateOrCreate(
                    ['category_key' => $cat['category_key'], 'year' => $year],
                    [
                        'category' => $cat['category'],
                        'value'    => $value,
                        'unit'     => $cat['unit'],
                    ],
                );
            }
        }
    }
}
