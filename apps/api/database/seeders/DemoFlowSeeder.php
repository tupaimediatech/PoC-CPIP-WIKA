<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Project;
use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use App\Models\ProjectMaterialLog;
use App\Models\ProjectEquipmentLog;
use App\Models\ProjectProgressCurve;
use App\Models\ProjectRisk;
use Illuminate\Database\Seeder;

class DemoFlowSeeder extends Seeder
{
    /**
     * Complete demo seeder demonstrating the full CPIP flow.
     *
     * Hierarchy:
     *   Project
     *   └── WBS Phase (2x)
     *       └── Work Item Level 0 — Kategori
     *           └── Work Item Level 1 — Sub-item
     *               ├── Material Logs
     *               └── Equipment Logs
     *   └── S-Curve (per project)
     *   └── Risk Register (per project)
     */
    public function run(): void
    {
        // ============================================================
        // PROJECT
        // ============================================================
        $project = Project::updateOrCreate(
            ['project_code' => 'WIKA-TOL-001'],
            [
                'project_name'     => 'Ruas Jalan Tol Jagorawi Section II',
                'division'         => 'Infrastructure',   // must be Infrastructure|Building
                'sbu'              => 'Tol',
                'owner'            => 'BPJT Kementerian PUPR',
                'project_manager'  => 'Ir. Dedy Kusnadi, M.T.',
                'profit_center'    => 'Highway Division',
                'type_of_contract' => 'Construction Only',
                'contract_type'    => 'Unit Price',
                'payment_method'   => 'Weekly Progress',
                'partnership'      => 'KSO',
                'partner_name'     => 'PT Waskita Karya - PT Hutama Karya - PT Brantas Abipraya',
                'consultant_name'  => 'PT Virama Karya',
                'funding_source'   => 'APBN & Pinjaman JBIC',
                'location'         => 'Bogor - Cianjur, Jawa Barat',
                'contract_value'   => 2850000000000,  // Rp 2.85 Triliun
                'planned_cost'     => 2650000000000,  // Rp 2.65 Triliun
                'actual_cost'      => 2780000000000,  // Rp 2.78 Triliun
                'planned_duration' => 24,
                'actual_duration'  => 26,
                'progress_pct'     => 88.00,
                'gross_profit_pct' => 4.20,
                'project_year'     => 2024,
                'start_date'       => '2024-03-01',
            ]
        );

        $this->command->info("✅ Project created/updated");
        $this->command->info("   ID: {$project->id} | {$project->project_name}");
        $this->command->info("   CPI: {$project->cpi} | SPI: {$project->spi} | Status: {$project->status}");

        // ============================================================
        // WBS PHASES
        // ============================================================

        $wbsEarthwork = ProjectWbs::updateOrCreate(
            ['project_id' => $project->id, 'name_of_work_phase' => 'PEKERJAAN EARTHWORK'],
            [
                'report_source' => 'file_import',
                'bq_external'   => 850000000000,
                'rab_internal'  => 780000000000,
            ]
        );

        $wbsStruktur = ProjectWbs::updateOrCreate(
            ['project_id' => $project->id, 'name_of_work_phase' => 'PEKERJAAN STRUKTUR & PERKERASAN'],
            [
                'report_source' => 'file_import',
                'bq_external'   => 2000000000000,
                'rab_internal'  => 1870000000000,
            ]
        );

        $this->command->info("✅ WBS phases created (2)");

        // ============================================================
        // WORK ITEMS — EARTHWORK PHASE
        //
        // Level 0 = Kategori (item_no "I.", "II.", dsb.)
        // Level 1 = Sub-item  (item_no "1.1", "1.2", dsb.)
        // ============================================================

        // ── Kategori I ───────────────────────────────────────────────
        $catTanah = ProjectWorkItem::updateOrCreate(
            ['wbs_id' => $wbsEarthwork->id, 'item_no' => 'I.'],
            [
                'parent_id'    => null,
                'level'        => 0,
                'item_name'    => 'PEKERJAAN TANAH',
                'sort_order'   => 1,
                'budget_awal'  => 78375000000,
                'addendum'     => 0,
                'total_budget' => 78375000000,
                'realisasi'    => 72250000000,
                'deviasi'      => 6125000000,
                'deviasi_pct'  => 7.82,
                'is_total_row' => false,
            ]
        );

        // 1.1 Clearing & Grubbing
        $clearingGrubbing = ProjectWorkItem::updateOrCreate(
            ['wbs_id' => $wbsEarthwork->id, 'item_no' => '1.1'],
            [
                'parent_id'       => $catTanah->id,
                'level'           => 1,
                'item_name'       => 'Clearing & Grubbing Area',
                'sort_order'      => 2,
                'volume'          => 125000,
                'satuan'          => 'm2',
                'harsat_internal' => 15000,
                'budget_awal'     => 1875000000,
                'addendum'        => 0,
                'total_budget'    => 1875000000,
                'realisasi'       => 1750000000,
                'deviasi'         => 125000000,
                'deviasi_pct'     => 6.67,
                'is_total_row'    => false,
            ]
        );

        // 1.2 Excavation & Embankment
        $excavation = ProjectWorkItem::updateOrCreate(
            ['wbs_id' => $wbsEarthwork->id, 'item_no' => '1.2'],
            [
                'parent_id'       => $catTanah->id,
                'level'           => 1,
                'item_name'       => 'Excavation & Embankment',
                'sort_order'      => 3,
                'volume'          => 450000,
                'satuan'          => 'm3',
                'harsat_internal' => 85000,
                'budget_awal'     => 38250000000,
                'addendum'        => 0,
                'total_budget'    => 38250000000,
                'realisasi'       => 35500000000,
                'deviasi'         => 2750000000,
                'deviasi_pct'     => 7.19,
                'is_total_row'    => false,
            ]
        );

        // ── Kategori II ──────────────────────────────────────────────
        $catPerbaikan = ProjectWorkItem::updateOrCreate(
            ['wbs_id' => $wbsEarthwork->id, 'item_no' => 'II.'],
            [
                'parent_id'    => null,
                'level'        => 0,
                'item_name'    => 'PERBAIKAN TANAH',
                'sort_order'   => 4,
                'budget_awal'  => 38250000000,
                'addendum'     => 0,
                'total_budget' => 38250000000,
                'realisasi'    => 35000000000,
                'deviasi'      => 3250000000,
                'deviasi_pct'  => 8.50,
                'is_total_row' => false,
            ]
        );

        // 2.1 Soil Improvement
        $soilImprovement = ProjectWorkItem::updateOrCreate(
            ['wbs_id' => $wbsEarthwork->id, 'item_no' => '2.1'],
            [
                'parent_id'       => $catPerbaikan->id,
                'level'           => 1,
                'item_name'       => 'Soil Improvement (Vertical Drain)',
                'sort_order'      => 5,
                'volume'          => 85000,
                'satuan'          => 'meter',
                'harsat_internal' => 450000,
                'budget_awal'     => 38250000000,
                'addendum'        => 0,
                'total_budget'    => 38250000000,
                'realisasi'       => 35000000000,
                'deviasi'         => 3250000000,
                'deviasi_pct'     => 8.50,
                'is_total_row'    => false,
            ]
        );

        // ── Kategori I — Struktur & Perkerasan ───────────────────────
        $catPerkerasan = ProjectWorkItem::updateOrCreate(
            ['wbs_id' => $wbsStruktur->id, 'item_no' => 'I.'],
            [
                'parent_id'    => null,
                'level'        => 0,
                'item_name'    => 'PEKERJAAN PERKERASAN',
                'sort_order'   => 1,
                'budget_awal'  => 238000000000,
                'addendum'     => 0,
                'total_budget' => 238000000000,
                'realisasi'    => 210000000000,
                'deviasi'      => 28000000000,
                'deviasi_pct'  => 11.76,
                'is_total_row' => false,
            ]
        );

        // 1.1 Flexible Pavement
        $flexiblePavement = ProjectWorkItem::updateOrCreate(
            ['wbs_id' => $wbsStruktur->id, 'item_no' => '1.1'],
            [
                'parent_id'       => $catPerkerasan->id,
                'level'           => 1,
                'item_name'       => 'Flexible Pavement (Laston)',
                'sort_order'      => 2,
                'volume'          => 280000,
                'satuan'          => 'm2',
                'harsat_internal' => 850000,
                'budget_awal'     => 238000000000,
                'addendum'        => 0,
                'total_budget'    => 238000000000,
                'realisasi'       => 210000000000,
                'deviasi'         => 28000000000,
                'deviasi_pct'     => 11.76,
                'is_total_row'    => false,
            ]
        );

        $this->command->info("✅ Work items created (6)");

        // ============================================================
        // MATERIAL LOGS
        // ============================================================

        ProjectMaterialLog::updateOrCreate(
            [
                'wbs_id'        => $wbsEarthwork->id,
                'work_item_id'  => $clearingGrubbing->id,
                'supplier_name' => 'CV Mitra Tani',
                'material_type' => 'Jasa Potong Rumput & Pembersihan',
            ],
            [
                'qty'                   => 125,
                'satuan'                => 'ha',
                'harga_satuan'          => 14000000,
                'total_tagihan'         => 1750000000,
                'is_discount'           => false,
                'tahun_perolehan'       => '2024',
                'lokasi_vendor'         => 'Bogor',
                'rating_performa'       => '5/5',
                'realisasi_pengiriman'  => '100% (Selesai)',
                'deviasi_harga_market'  => '+0%',
                'catatan_monitoring'    => 'Pekerjaan clearing selesai tepat waktu',
            ]
        );

        ProjectMaterialLog::updateOrCreate(
            [
                'wbs_id'        => $wbsEarthwork->id,
                'work_item_id'  => $excavation->id,
                'supplier_name' => 'PT Alam Sutera Realty',
                'material_type' => 'Material Timbunan (Tanah Merah)',
            ],
            [
                'qty'                   => 500000,
                'satuan'                => 'm3',
                'harga_satuan'          => 71000,
                'total_tagihan'         => 35500000000,
                'is_discount'           => false,
                'tahun_perolehan'       => '2024',
                'lokasi_vendor'         => 'Sentul',
                'rating_performa'       => '4/5',
                'realisasi_pengiriman'  => '100% (Selesai)',
                'deviasi_harga_market'  => '-3%',
                'catatan_monitoring'    => 'Kualitas tanah baik, pengiriman on-time',
            ]
        );

        ProjectMaterialLog::updateOrCreate(
            [
                'wbs_id'        => $wbsEarthwork->id,
                'work_item_id'  => $soilImprovement->id,
                'supplier_name' => 'PT Geotechnical Indo',
                'material_type' => 'Prefabricated Vertical Drain (PVD)',
            ],
            [
                'qty'                   => 85000,
                'satuan'                => 'meter',
                'harga_satuan'          => 412500,
                'total_tagihan'         => 35062500000,
                'is_discount'           => false,
                'tahun_perolehan'       => '2024',
                'lokasi_vendor'         => 'Cikarang',
                'rating_performa'       => '5/5',
                'realisasi_pengiriman'  => '100% (Selesai)',
                'deviasi_harga_market'  => '+0%',
                'catatan_monitoring'    => 'PVD kualitas premium, pengiriman sesuai schedule',
            ]
        );

        // Diskon volume
        ProjectMaterialLog::updateOrCreate(
            [
                'wbs_id'        => $wbsEarthwork->id,
                'work_item_id'  => $soilImprovement->id,
                'supplier_name' => 'PT Geotechnical Indo',
                'material_type' => 'DISCOUNT - Volume Besar PVD',
            ],
            [
                'qty'                  => null,
                'satuan'               => null,
                'harga_satuan'         => null,
                'total_tagihan'        => -1912500000,
                'is_discount'          => true,
                'catatan_monitoring'   => 'Diskon 5% untuk pembelian di atas 80.000 meter',
            ]
        );

        $this->command->info("✅ Material logs created (4)");

        // ============================================================
        // EQUIPMENT LOGS
        // ============================================================

        ProjectEquipmentLog::updateOrCreate(
            [
                'wbs_id'         => $wbsEarthwork->id,
                'work_item_id'   => $excavation->id,
                'vendor_name'    => 'PT United Tractors',
                'equipment_name' => 'Excavator Komatsu PC200-8',
            ],
            [
                'jam_kerja'      => 1800,
                'rate_per_jam'   => 550000,
                'total_biaya'    => 990000000,
                'payment_status' => 'Paid',
            ]
        );

        ProjectEquipmentLog::updateOrCreate(
            [
                'wbs_id'         => $wbsEarthwork->id,
                'work_item_id'   => $soilImprovement->id,
                'vendor_name'    => 'PT Bauer Spezial',
                'equipment_name' => 'PVD Installation Machine',
            ],
            [
                'jam_kerja'      => 1200,
                'rate_per_jam'   => 1200000,
                'total_biaya'    => 1440000000,
                'payment_status' => 'Paid',
            ]
        );

        ProjectEquipmentLog::updateOrCreate(
            [
                'wbs_id'         => $wbsEarthwork->id,
                'work_item_id'   => $soilImprovement->id,
                'vendor_name'    => 'PT Alat Berat Jaya',
                'equipment_name' => 'Bulldozer Komatsu D155AX',
            ],
            [
                'jam_kerja'      => 850,
                'rate_per_jam'   => 750000,
                'total_biaya'    => 637500000,
                'payment_status' => 'Pending',
            ]
        );

        ProjectEquipmentLog::updateOrCreate(
            [
                'wbs_id'         => $wbsStruktur->id,
                'work_item_id'   => $flexiblePavement->id,
                'vendor_name'    => 'PT Waskita Beton Precast',
                'equipment_name' => 'Asphalt Mixing Plant (AMP)',
            ],
            [
                'jam_kerja'      => 450,
                'rate_per_jam'   => 3500000,
                'total_biaya'    => 1575000000,
                'payment_status' => 'Pending',
            ]
        );

        $this->command->info("✅ Equipment logs created (4)");

        // ============================================================
        // S-CURVE (Progress Curve)
        // ============================================================
        $progressCurves = [
            [4,  '2024-03-29', 4.00,  3.80,  -0.20, null],
            [8,  '2024-04-26', 8.50,  7.80,  -0.70, null],
            [12, '2024-05-24', 13.00, 11.50, -1.50, 'Hujan Lebat'],
            [16, '2024-06-21', 18.00, 16.20, -1.80, null],
            [20, '2024-07-19', 23.50, 21.00, -2.50, null],
            [24, '2024-08-16', 29.00, 26.50, -2.50, null],
            [28, '2024-09-13', 34.50, 31.80, -2.70, 'Kendala Material'],
            [32, '2024-10-11', 40.00, 37.20, -2.80, null],
            [36, '2024-11-08', 45.50, 42.80, -2.70, null],
            [40, '2024-12-06', 51.00, 48.50, -2.50, null],
            [44, '2025-01-03', 56.50, 54.20, -2.30, null],
            [48, '2025-01-31', 62.00, 60.00, -2.00, null],
            [52, '2025-02-28', 67.50, 65.80, -1.70, null],
            [56, '2025-03-28', 73.00, 71.50, -1.50, null],
            [60, '2025-04-25', 78.50, 77.20, -1.30, null],
            [64, '2025-05-23', 84.00, 82.80, -1.20, null],
            [68, '2025-06-20', 88.00, 88.00,  0.00, 'On Track'],
        ];

        foreach ($progressCurves as [$week, $date, $plan, $actual, $deviasi, $ket]) {
            ProjectProgressCurve::updateOrCreate(
                ['project_id' => $project->id, 'week_number' => $week],
                [
                    'week_date'      => $date,
                    'rencana_pct'    => $plan,
                    'realisasi_pct'  => $actual,
                    'deviasi_pct'    => $deviasi,
                    'keterangan'     => $ket,
                ]
            );
        }

        $this->command->info("✅ S-curve data created (" . count($progressCurves) . " points)");

        // ============================================================
        // RISK REGISTER
        // ============================================================
        $risks = [
            [
                'risk_code'            => 'RSK-TOL-001',
                'risk_title'           => 'Keterlambatan Pembebasan Lahan',
                'risk_description'     => 'Proses pembebasan lahan di seksi 2 mengalami keterlambatan akibat sengketa wilayah dengan warga setempat.',
                'category'             => 'schedule',
                'financial_impact_idr' => 8500000000,
                'probability'          => 5,
                'impact'               => 5,
                'mitigation'           => '1. Koordinasi intensif dengan Kantor Pertanahan. 2. Negosiasi kompensasi dengan warga. 3. Penyesuaian ulang design alignment.',
                'status'               => 'open',
                'owner'                => 'Ir. Bambang Sutrisno',
                'identified_at'        => '2024-03-10',
                'target_resolved_at'   => '2024-12-31',
            ],
            [
                'risk_code'            => 'RSK-TOL-002',
                'risk_title'           => 'Kenaikan Harga Aspal (Laston)',
                'risk_description'     => 'Harga aspal kilang Pertamina mengalami kenaikan sebesar 18% akibat harga minyak dunia.',
                'category'             => 'cost',
                'financial_impact_idr' => 12500000000,
                'probability'          => 4,
                'impact'               => 4,
                'mitigation'           => '1. Negosiasi harga kontrak dengan supplier. 2. Alternatif penggunaan aspal modificated. 3. Hedging harga melalui kontrak jangka panjang.',
                'status'               => 'mitigated',
                'owner'                => 'Ibu Rina Wijaya',
                'identified_at'        => '2024-04-15',
                'target_resolved_at'   => '2024-10-30',
            ],
            [
                'risk_code'            => 'RSK-TOL-003',
                'risk_title'           => 'Cuaca Ekstrem Musim Hujan',
                'risk_description'     => 'Curah hujan tinggi di wilayah Bogor-Cianjur dapat mengganggu pekerjaan earthwork dan pavement.',
                'category'             => 'external',
                'financial_impact_idr' => 5500000000,
                'probability'          => 4,
                'impact'               => 3,
                'mitigation'           => '1. Monitor cuaca BMKG secara harian. 2. Siapkan sistem drainase sementara. 3. Penambahan cover plastic untuk area kerja kritikal.',
                'status'               => 'open',
                'owner'                => 'Ir. Agus Setiawan',
                'identified_at'        => '2024-02-20',
                'target_resolved_at'   => '2025-01-31',
            ],
        ];

        foreach ($risks as $risk) {
            ProjectRisk::updateOrCreate(
                ['project_id' => $project->id, 'risk_code' => $risk['risk_code']],
                $risk
            );
        }

        $this->command->info("✅ Risk register created (" . count($risks) . " entries)");

        // ============================================================
        // SUMMARY
        // ============================================================
        $this->command->newLine();
        $this->command->info('╔═══════════════════════════════════════════════════╗');
        $this->command->info('║           DEMO FLOW SEEDER SUMMARY                ║');
        $this->command->info('╠═══════════════════════════════════════════════════╣');
        $this->command->info('║  Project   : Ruas Jalan Tol Jagorawi Section II   ║');
        $this->command->info('║  Code      : WIKA-TOL-001                         ║');
        $this->command->info('║  Division  : Infrastructure                       ║');
        $this->command->info('║                                                   ║');
        $this->command->info('║  Records Created:                                 ║');
        $this->command->info('║  • 1  Project                                     ║');
        $this->command->info('║  • 2  WBS Phases                                  ║');
        $this->command->info('║  • 6  Work Items (level 0 + level 1 hierarchy)    ║');
        $this->command->info('║  • 4  Material Logs                               ║');
        $this->command->info('║  • 4  Equipment Logs                              ║');
        $this->command->info('║  • 17 S-Curve Data Points                         ║');
        $this->command->info('║  • 3  Risk Entries                                ║');
        $this->command->info('╚═══════════════════════════════════════════════════╝');
        $this->command->newLine();
        $this->command->info("  CPI: {$project->cpi} | SPI: {$project->spi} | Status: {$project->status}");
        $this->command->newLine();
        $this->command->info('✅ DemoFlowSeeder completed.');
    }
}
