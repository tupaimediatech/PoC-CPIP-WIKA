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
     * Complete demo seeder demonstrating the 7-level CPIP flow.
     *
     * Data Structure:
     * - Level 1-2: 1 Project
     * - Level 3: 2 WBS Phases
     * - Level 4: Work items with hierarchy
     * - Level 5: Material & Equipment logs linked to specific work items
     * - Level 6: HPP & CPI analysis data
     * - Level 7A: Risk register
     * - Level 7B: Progress curve (S-curve) timeline
     */
    public function run(): void
    {
        // ============================================================
        // LEVEL 1-2: PROJECT (Create or update project)
        // ============================================================
        $project = Project::updateOrCreate(
            ['project_code' => 'TOL-JAGORAWI'],
            [
                'project_name'         => 'Ruas Jalan Tol Jagorawi Section II',
                'division'             => 'Highway',
                'sbu'                  => 'Tol',
                'owner'                => 'BPJT Kementerian PUPR',
                'profit_center'        => 'Highway Division',
                'type_of_contract'     => 'Construction Only',
                'contract_type'        => 'Unit Price',
                'payment_method'       => 'Weekly Progress',
                'partnership'          => 'KSO',
                'partner_name'         => 'PT Waskita Karya - PT Hutama Karya - PT Brantas Abipraya',
                'consultant_name'      => 'PT Virama Karya',
                'funding_source'       => 'APBN & Pinjaman JBIC',
                'location'             => 'Bogor - Cianjur, Jawa Barat',
                'contract_value'       => 2850000000000,  // Rp2.85 Triliun
                'planned_cost'         => 2650000000000,  // Rp2.65 Triliun
                'actual_cost'          => 2780000000000,  // Rp2.78 Triliun
                'planned_duration'     => 24,              // 24 months
                'actual_duration'      => 26,              // 26 months
                'progress_pct'         => 88.00,           // 88% complete
                'gross_profit_pct'     => 4.20,
                'project_year'         => 2024,
                'start_date'           => '2024-03-01',
            ]
        );

        $this->command->info("✅ Level 1-2: Project created/updated");
        $this->command->info("   ID: {$project->id}");
        $this->command->info("   Project: {$project->project_name}");
        $this->command->info("   CPI: {$project->cpi}, SPI: {$project->spi}, Status: {$project->status}");

        // ============================================================
        // LEVEL 3: WBS PHASES (Create WBS phases for this project)
        // ============================================================
        $wbsPhases = [];

        // Phase 1: PEKERJAAN EARTHWORK
        $wbsPhases[] = ProjectWbs::updateOrCreate(
            [
                'project_id'         => $project->id,
                'name_of_work_phase' => 'PEKERJAAN EARTHWORK',
            ],
            [
                'client_name'        => 'BPJT Kementerian PUPR',
                'project_manager'    => 'Ir. Dedy Kusnadi, M.T.',
                'report_source'      => 'file_import',
                'progress_prev_pct'  => 0.00,
                'progress_this_pct'  => 12.50,
                'progress_total_pct' => 12.50,
                'contract_value'     => 850000000000,  // Rp850 Miliar
                'addendum_value'     => 0,
                'bq_external'        => 850000000000,
                'actual_costs'       => 780000000000,  // RAB Internal
                'realized_costs'     => 95000000000,  // Realisasi
                'hpp_deviation'      => 685000000000,
                'deviasi_pct'        => 6.50,
            ]
        );

        // Phase 2: PEKERJAAN STRUKTUR & PERKERASAN
        $wbsPhases[] = ProjectWbs::updateOrCreate(
            [
                'project_id'         => $project->id,
                'name_of_work_phase' => 'PEKERJAAN STRUKTUR & PERKERASAN',
            ],
            [
                'client_name'        => 'BPJT Kementerian PUPR',
                'project_manager'    => 'Ir. Dedy Kusnadi, M.T.',
                'report_source'      => 'file_import',
                'progress_prev_pct'  => 12.50,
                'progress_this_pct'  => 18.20,
                'progress_total_pct' => 30.70,
                'contract_value'     => 2000000000000,
                'addendum_value'     => 0,
                'bq_external'        => 2000000000000,
                'actual_costs'       => 1870000000000,
                'realized_costs'     => 585000000000,
                'hpp_deviation'     => 1285000000000,
                'deviasi_pct'        => 15.80,
            ]
        );

        $this->command->info("✅ Level 3: Created " . count($wbsPhases) . " WBS phases");
        foreach ($wbsPhases as $wbs) {
            $this->command->info("   - {$wbs->name_of_work_phase} (ID: {$wbs->id})");
        }

        // ============================================================
        // LEVEL 4: WORK ITEMS (Flat list - no categories)
        // ============================================================
        $earthworkPhase = $wbsPhases[0]; // PEKERJAAN EARTHWORK

        // Work Item 1: Clearing & Grubbing
        $clearingGrubbing = ProjectWorkItem::updateOrCreate(
            [
                'period_id'  => $earthworkPhase->id,
                'item_no'    => '1.1',
                'item_name'  => 'Clearing & Grubbing Area',
            ],
            [
                'parent_id'    => null,
                'level'        => 0,
                'sort_order'   => 1,
                'volume'       => 125000,
                'satuan'       => 'm2',
                'harsat_internal' => 15000,
                'total_budget' => 1875000000,
                'realisasi'    => 1750000000,
                'deviasi'      => 125000000,
                'deviasi_pct'  => 6.67,
                'is_total_row' => false,
            ]
        );

        // Work Item 2: Excavation & Embankment
        $excavationEmbankment = ProjectWorkItem::updateOrCreate(
            [
                'period_id'  => $earthworkPhase->id,
                'item_no'    => '1.2',
                'item_name'  => 'Excavation & Embankment',
            ],
            [
                'parent_id'    => null,
                'level'        => 0,
                'sort_order'   => 2,
                'volume'       => 450000,
                'satuan'       => 'm3',
                'harsat_internal' => 85000,
                'total_budget' => 38250000000,
                'realisasi'    => 35500000000,
                'deviasi'      => 2750000000,
                'deviasi_pct'  => 7.19,
                'is_total_row' => false,
            ]
        );

        // Work Item 3: Soil Improvement
        $soilImprovement = ProjectWorkItem::updateOrCreate(
            [
                'period_id'  => $earthworkPhase->id,
                'item_no'    => '1.3',
                'item_name'  => 'Soil Improvement (Vertical Drain)',
            ],
            [
                'parent_id'    => null,
                'level'        => 0,
                'sort_order'   => 3,
                'volume'       => 85000,
                'satuan'       => 'meter',
                'harsat_internal' => 450000,
                'total_budget' => 38250000000,
                'realisasi'    => 35000000000,
                'deviasi'      => 3250000000,
                'deviasi_pct'  => 8.50,
                'is_total_row' => false,
            ]
        );

        // === PEKERJAAN STRUKTUR & PERKERASAN Work Items ===
        $strukturPhase = $wbsPhases[1]; // PEKERJAAN STRUKTUR & PERKERASAN

        // Work Item 4: Flexible Pavement
        $flexiblePavement = ProjectWorkItem::updateOrCreate(
            [
                'period_id'  => $strukturPhase->id,
                'item_no'    => '2.1',
                'item_name'  => 'Flexible Pavement (Laston)',
            ],
            [
                'parent_id'    => null,
                'level'        => 0,
                'sort_order'   => 1,
                'volume'       => 280000,
                'satuan'       => 'm2',
                'harsat_internal' => 850000,
                'total_budget' => 238000000000,
                'realisasi'    => 210000000000,
                'deviasi'      => 28000000000,
                'deviasi_pct'  => 11.76,
                'is_total_row' => false,
            ]
        );

        $this->command->info("✅ Level 4: Created work items");
        $this->command->info("   - Clearing & Grubbing Area (ID: {$clearingGrubbing->id})");
        $this->command->info("   - Excavation & Embankment (ID: {$excavationEmbankment->id})");
        $this->command->info("   - Soil Improvement (ID: {$soilImprovement->id})");
        $this->command->info("   - Flexible Pavement (ID: {$flexiblePavement->id})");

        // ============================================================
        // LEVEL 5: MATERIAL LOGS (Linked to specific work items)
        // ============================================================

        // Materials for Clearing & Grubbing (work_item_id = $clearingGrubbing->id)
        ProjectMaterialLog::updateOrCreate(
            [
                'period_id'       => $earthworkPhase->id,
                'work_item_id'    => $clearingGrubbing->id,
                'supplier_name'   => 'CV Mitra Tani',
                'material_type'   => 'Jasa Potong Rumput & Pembersihan',
            ],
            [
                'qty'                       => 125,
                'satuan'                   => 'ha',
                'harga_satuan'             => 14000000,
                'total_tagihan'            => 1750000000,
                'is_discount'               => false,
                'tahun_perolehan'          => '2024',
                'lokasi_vendor'            => 'Bogor',
                'rating_performa'          => '5/5',
                'realisasi_pengiriman'     => '100% (Selesai)',
                'deviasi_harga_market'     => '+0%',
                'catatan_monitoring'       => 'Pekerjaan clearing selesai tepat waktu',
            ]
        );

        // Materials for Excavation & Embankment (work_item_id = $excavationEmbankment->id)
        ProjectMaterialLog::updateOrCreate(
            [
                'period_id'       => $earthworkPhase->id,
                'work_item_id'    => $excavationEmbankment->id,
                'supplier_name'   => 'PT Alam Sutera Realty',
                'material_type'   => 'Material Timbunan (Tanah Merah)',
            ],
            [
                'qty'                       => 500000,
                'satuan'                   => 'm3',
                'harga_satuan'             => 71000,
                'total_tagihan'            => 35500000000,
                'is_discount'               => false,
                'tahun_perolehan'          => '2024',
                'lokasi_vendor'            => 'Sentul',
                'rating_performa'          => '4/5',
                'realisasi_pengiriman'     => '100% (Selesai)',
                'deviasi_harga_market'     => '-3%',
                'catatan_monitoring'       => 'Kualitas tanah baik, pengiriman on-time',
            ]
        );

        // Materials for Soil Improvement (work_item_id = $soilImprovement->id)
        ProjectMaterialLog::updateOrCreate(
            [
                'period_id'       => $earthworkPhase->id,
                'work_item_id'    => $soilImprovement->id,
                'supplier_name'   => 'PT Geotechnical Indo',
                'material_type'   => 'Prefabricated Vertical Drain (PVD)',
            ],
            [
                'qty'                       => 85000,
                'satuan'                   => 'meter',
                'harga_satuan'             => 450000,
                'total_tagihan'            => 38250000000,
                'is_discount'               => false,
                'tahun_perolehan'          => '2024',
                'lokasi_vendor'            => 'Cikarang',
                'rating_performa'          => '5/5',
                'realisasi_pengiriman'     => '100% (Selesai)',
                'deviasi_harga_market'     => '+0%',
                'catatan_monitoring'       => 'PVD kualitas premium, pengiriman sesuai schedule',
            ]
        );

        ProjectMaterialLog::updateOrCreate(
            [
                'period_id'       => $earthworkPhase->id,
                'work_item_id'    => $soilImprovement->id,
                'supplier_name'   => 'PT Petrokimia Gresik',
                'material_type'   => 'Semen Untuk PVD Anchor',
            ],
            [
                'qty'                       => 2500,
                'satuan'                   => 'ton',
                'harga_satuan'             => 1200000,
                'total_tagihan'            => 3000000000,
                'is_discount'               => false,
                'tahun_perolehan'          => '2024',
                'lokasi_vendor'            => 'Gresik',
                'rating_performa'          => '4/5',
                'realisasi_pengiriman'     => '100% (Selesai)',
                'deviasi_harga_market'     => '+2%',
                'catatan_monitoring'       => 'Semen kualitas standar SNI',
            ]
        );

        // Discount row for Soil Improvement
        ProjectMaterialLog::updateOrCreate(
            [
                'period_id'       => $earthworkPhase->id,
                'work_item_id'    => $soilImprovement->id,
                'supplier_name'   => 'PT Geotechnical Indo',
                'material_type'   => 'DISCOUNT - Volume Besar PVD',
            ],
            [
                'qty'                       => null,
                'satuan'                   => null,
                'harga_satuan'             => null,
                'total_tagihan'            => -1912500000,
                'is_discount'               => true,
                'tahun_perolehan'          => null,
                'lokasi_vendor'            => null,
                'rating_performa'          => null,
                'realisasi_pengiriman'     => null,
                'deviasi_harga_market'     => null,
                'catatan_monitoring'       => 'Diskon 5% untuk pembelian di atas 80.000 meter',
            ]
        );

        $this->command->info("✅ Level 5: Created material logs");
        $this->command->info("   Material Logs linked to work_item_id:");
        $this->command->info("   - Clearing & Grubbing materials → work_item_id: {$clearingGrubbing->id}");
        $this->command->info("   - Excavation materials → work_item_id: {$excavationEmbankment->id}");
        $this->command->info("   - Soil Improvement materials → work_item_id: {$soilImprovement->id}");

        // ============================================================
        // LEVEL 5: EQUIPMENT LOGS
        // ============================================================

        // Equipment for Excavation & Embankment (work_item_id = $excavationEmbankment->id)
        ProjectEquipmentLog::updateOrCreate(
            [
                'period_id'       => $earthworkPhase->id,
                'work_item_id'    => $excavationEmbankment->id,
                'vendor_name'     => 'PT United Tractors',
                'equipment_name'  => 'Excavator Komatsu PC200-8',
            ],
            [
                'jam_kerja'      => 1800,
                'rate_per_jam'   => 550000,
                'total_biaya'    => 990000000,
                'payment_status' => 'Paid',
            ]
        );

        // Equipment for Soil Improvement
        ProjectEquipmentLog::updateOrCreate(
            [
                'period_id'       => $earthworkPhase->id,
                'work_item_id'    => $soilImprovement->id,
                'vendor_name'     => 'PT Bauer Spezial',
                'equipment_name'  => 'PVD Installation Machine',
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
                'period_id'       => $earthworkPhase->id,
                'work_item_id'    => $soilImprovement->id,
                'vendor_name'     => 'PT Alat Berat Jaya',
                'equipment_name'  => 'Bulldozer Komatsu D155AX',
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
                'period_id'       => $strukturPhase->id,
                'work_item_id'    => $flexiblePavement->id,
                'vendor_name'     => 'PT Waskita Beton Precast',
                'equipment_name'  => 'Asphalt Mixing Plant (AMP)',
            ],
            [
                'jam_kerja'      => 450,
                'rate_per_jam'   => 3500000,
                'total_biaya'    => 1575000000,
                'payment_status' => 'Pending',
            ]
        );

        $this->command->info("✅ Level 5: Created equipment logs");
        $this->command->info("   Equipment Logs linked to work_item_id:");
        $this->command->info("   - Excavation equipment → work_item_id: {$excavationEmbankment->id}");
        $this->command->info("   - Soil Improvement equipment → work_item_id: {$soilImprovement->id}");
        $this->command->info("   - Flexible Pavement equipment → work_item_id: {$flexiblePavement->id}");

        // ============================================================
        // LEVEL 7B: PROGRESS CURVE (S-Curve data)
        // ============================================================
        $progressCurves = [
            ['week' => 4,  'date' => '2024-03-29', 'plan' => 4.00,  'actual' => 3.80,  'deviasi' => -0.20, 'ket' => null],
            ['week' => 8,  'date' => '2024-04-26', 'plan' => 8.50,  'actual' => 7.80,  'deviasi' => -0.70, 'ket' => null],
            ['week' => 12, 'date' => '2024-05-24', 'plan' => 13.00, 'actual' => 11.50, 'deviasi' => -1.50, 'ket' => 'Hujan Lebat'],
            ['week' => 16, 'date' => '2024-06-21', 'plan' => 18.00, 'actual' => 16.20, 'deviasi' => -1.80, 'ket' => null],
            ['week' => 20, 'date' => '2024-07-19', 'plan' => 23.50, 'actual' => 21.00, 'deviasi' => -2.50, 'ket' => null],
            ['week' => 24, 'date' => '2024-08-16', 'plan' => 29.00, 'actual' => 26.50, 'deviasi' => -2.50, 'ket' => null],
            ['week' => 28, 'date' => '2024-09-13', 'plan' => 34.50, 'actual' => 31.80, 'deviasi' => -2.70, 'ket' => 'Kendala Material'],
            ['week' => 32, 'date' => '2024-10-11', 'plan' => 40.00, 'actual' => 37.20, 'deviasi' => -2.80, 'ket' => null],
            ['week' => 36, 'date' => '2024-11-08', 'plan' => 45.50, 'actual' => 42.80, 'deviasi' => -2.70, 'ket' => null],
            ['week' => 40, 'date' => '2024-12-06', 'plan' => 51.00, 'actual' => 48.50, 'deviasi' => -2.50, 'ket' => null],
            ['week' => 44, 'date' => '2025-01-03', 'plan' => 56.50, 'actual' => 54.20, 'deviasi' => -2.30, 'ket' => null],
            ['week' => 48, 'date' => '2025-01-31', 'plan' => 62.00, 'actual' => 60.00, 'deviasi' => -2.00, 'ket' => null],
            ['week' => 52, 'date' => '2025-02-28', 'plan' => 67.50, 'actual' => 65.80, 'deviasi' => -1.70, 'ket' => null],
            ['week' => 56, 'date' => '2025-03-28', 'plan' => 73.00, 'actual' => 71.50, 'deviasi' => -1.50, 'ket' => null],
            ['week' => 60, 'date' => '2025-04-25', 'plan' => 78.50, 'actual' => 77.20, 'deviasi' => -1.30, 'ket' => null],
            ['week' => 64, 'date' => '2025-05-23', 'plan' => 84.00, 'actual' => 82.80, 'deviasi' => -1.20, 'ket' => null],
            ['week' => 68, 'date' => '2025-06-20', 'plan' => 88.00, 'actual' => 88.00, 'deviasi' => 0.00,  'ket' => 'On Track'],
        ];

        foreach ($progressCurves as $curve) {
            ProjectProgressCurve::updateOrCreate(
                [
                    'project_id'   => $project->id,
                    'week_number'  => $curve['week'],
                ],
                [
                    'week_date'      => $curve['date'],
                    'rencana_pct'   => $curve['plan'],
                    'realisasi_pct' => $curve['actual'],
                    'deviasi_pct'   => $curve['deviasi'],
                    'keterangan'    => $curve['ket'],
                ]
            );
        }

        $this->command->info("✅ Level 7B: Created " . count($progressCurves) . " S-curve data points");

        // ============================================================
        // LEVEL 7A: RISK REGISTER
        // ============================================================
        $risks = [
            [
                'risk_code'       => 'RSK-TOL-001',
                'risk_title'      => 'Keterlambatan Pembebasan Lahan',
                'risk_description' => 'Proses pembebasan lahan di seksi 2 mengalami keterlambatan akibat sengketa wilayah dengan warga setempat.',
                'category'        => 'schedule',
                'financial_impact_idr' => 8500000000,
                'probability'     => 5,
                'impact'          => 5,
                'mitigation'       => '1. Koordinasi intensif dengan Kantor Pertanahan. 2. Negosiasi kompensasi dengan warga. 3. Penyesuaian ulang design alignment.',
                'status'          => 'open',
                'owner'           => 'Ir. Bambang Sutrisno',
                'identified_at'    => '2024-03-10',
                'target_resolved_at' => '2024-12-31',
            ],
            [
                'risk_code'       => 'RSK-TOL-002',
                'risk_title'      => 'Kenaikan Harga Aspal (Laston)',
                'risk_description' => 'Harga aspal kilang Pertamina mengalami kenaikan sebesar 18% akibat harga minyak dunia.',
                'category'        => 'cost',
                'financial_impact_idr' => 12500000000,
                'probability'     => 4,
                'impact'          => 4,
                'mitigation'       => '1. Negosiasi harga kontrak dengan supplier. 2. Alternatif penggunaan aspal modificated. 3. Hedging harga melalui kontrak jangka panjang.',
                'status'          => 'mitigated',
                'owner'           => 'Ibu Rina Wijaya',
                'identified_at'    => '2024-04-15',
                'target_resolved_at' => '2024-10-30',
            ],
            [
                'risk_code'       => 'RSK-TOL-003',
                'risk_title'      => 'Cuaca Ekstrem Musim Hujan',
                'risk_description' => 'Curah hujan tinggi di wilayah Bogor-Cianjur dapat mengganggu pekerjaan earthwork dan pavement.',
                'category'        => 'external',
                'financial_impact_idr' => 5500000000,
                'probability'     => 4,
                'impact'          => 3,
                'mitigation'       => '1. Monitor cuaca BMKG secara harian. 2. Siapkan sistem drainase sementara. 3. Penambahan cover plastic untuk area kerja kritikal.',
                'status'          => 'open',
                'owner'           => 'Ir. Agus Setiawan',
                'identified_at'    => '2024-02-20',
                'target_resolved_at' => '2025-01-31',
            ],
        ];

        foreach ($risks as $risk) {
            ProjectRisk::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'risk_code'  => $risk['risk_code'],
                ],
                $risk
            );
        }

        $this->command->info("✅ Level 7A: Created " . count($risks) . " risk entries");

        // ============================================================
        // SUMMARY
        // ============================================================
        $this->command->newLine();
        $this->command->info('╔════════════════════════════════════════════════════════════╗');
        $this->command->info('║             DEMO FLOW SEEDER SUMMARY                           ║');
        $this->command->info('╠════════════════════════════════════════════════════════════╣');
        $this->command->info('║  Project: Ruas Jalan Tol Jagorawi Section II                   ║');
        $this->command->info('║  Project Code: TOL-JAGORAWI                                    ║');
        $this->command->info('║                                                                  ║');
        $this->command->info('║  Data Created:                                                     ║');
        $this->command->info('║  • 1 Project (Level 1-2)                                        ║');
        $this->command->info('║  • 2 WBS Phases (Level 3)                                        ║');
        $this->command->info('║  • 4 Work Items (Level 4)                                        ║');
        $this->command->info('║  • 5 Material Logs (Level 5)                                     ║');
        $this->command->info('║  • 4 Equipment Logs (Level 5)                                    ║');
        $this->command->info('║  • 17 S-Curve Data Points (Level 7B)                             ║');
        $this->command->info('║  • 3 Risk Entries (Level 7A)                                     ║');
        $this->command->info('║  ────────────────────────────────────────────────────────── ║');
        $this->command->info('║  Total Records: 36+                                             ║');
        $this->command->info('╚════════════════════════════════════════════════════════════╝');
        $this->command->newLine();
        $this->command->info("📊 KPI Status:");
        $this->command->info("   CPI:    {$project->cpi} (Cost Performance Index)");
        $this->command->info("   SPI:    {$project->spi} (Schedule Performance Index)");
        $this->command->info("   Status: {$project->status}");
        $this->command->newLine();
        $this->command->info('✅ Demo Flow Seeder completed successfully!');
        $this->command->info('   You can now navigate through all 7 levels using:');
        $this->command->info('   http://localhost:3000/projects');
    }
}
