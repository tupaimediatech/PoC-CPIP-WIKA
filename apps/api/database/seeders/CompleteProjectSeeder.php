<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use App\Models\ProjectMaterialLog;
use App\Models\ProjectEquipmentLog;
use App\Models\ProjectProgressCurve;
use App\Models\ProjectRisk;
use Illuminate\Database\Seeder;

class CompleteProjectSeeder extends Seeder
{
    /**
     * Complete project seeder with all fields filled.
     *
     * Structure:
     * - 1 Project (all fields filled)
     * - 2 ProjectWbs
     * - 4 ProjectWorkItems (2 per WBS phase)
     * - 4 ProjectMaterialLogs (2 per WBS phase)
     * - 4 ProjectEquipmentLogs (2 per WBS phase)
     * - 2 ProjectProgressCurves
     * - 2 ProjectRisks
     */
    public function run(): void
    {
        // ============================================================
        // LEVEL 1: PROJECT (1 record - all fields filled)
        // ============================================================
        $project = Project::updateOrCreate(
            ['project_code' => 'DEMO-001'],
            [
                'project_name'         => 'Proyek Pembangunan Jembatan Suramadu',
                'division'             => 'Infrastructure',
                'sbu'                  => 'Jembatan',
                'owner'                => 'Pemerintah',
                'profit_center'        => 'Building Construction Division',
                'type_of_contract'     => 'Design & Build',  // Jenis Kontrak
                'contract_type'        => 'Lumpsum',         // Tipe Kontrak
                'payment_method'       => 'Monthly Progress', // Cara Pembayaran
                'partnership'          => 'JO',
                'partner_name'         => 'PT Hutama Karya & PT Waskita Karya (JO)',
                'consultant_name'      => 'PT Bina Karya (Persero) - Konsultan Pengawas',
                'funding_source'       => 'APBN',
                'location'             => 'Surabaya, Jawa Timur',
                'contract_value'       => 850000.00,  // dalam Juta (M)
                'planned_cost'         => 780000.00,
                'actual_cost'          => 820000.00,
                'planned_duration'     => 36,         // dalam bulan
                'actual_duration'      => 38,
                'progress_pct'         => 95.50,
                'gross_profit_pct'     => 3.53,
                'project_year'         => 2024,
                'start_date'           => '2024-01-15',
                // cpi, spi, status dihitung otomatis oleh Model::saving()
            ]
        );

        $this->command->info("✅ Project created: {$project->project_code}");
        $this->command->info("   CPI: {$project->cpi}, SPI: {$project->spi}, Status: {$project->status}");

        // ============================================================
        // LEVEL 2: PROJECT WBS PHASES (2 records)
        // ============================================================
        $wbsPhases = [];

        // WBS Phase 1: PEKERJAAN PONDASI
        $wbsPhases[] = ProjectWbs::updateOrCreate(
            [
                'project_id' => $project->id,
                'name_of_work_phase' => 'PEKERJAAN PONDASI',
            ],
            [
                'client_name'        => 'PT Waskita Karya (Persero) Tbk',
                'project_manager'    => 'Ir. Budi Santoso, M.T.',
                'report_source'      => 'file_import',
                'progress_prev_pct'  => 0.00,
                'progress_this_pct'  => 8.50,
                'progress_total_pct' => 8.50,
                'contract_value'     => 850000000000,  // dalam Rupiah penuh
                'addendum_value'     => 0,
                'total_pagu'         => 850000000000,
                'hpp_plan_total'     => 780000000000,
                'hpp_actual_total'   => 65000000000,
                'hpp_deviation'      => 715000000000,
            ]
        );

        // WBS Phase 2: PEKERJAAN STRUKTUR
        $wbsPhases[] = ProjectWbs::updateOrCreate(
            [
                'project_id' => $project->id,
                'name_of_work_phase' => 'PEKERJAAN STRUKTUR',
            ],
            [
                'client_name'        => 'PT Waskita Karya (Persero) Tbk',
                'project_manager'    => 'Ir. Budi Santoso, M.T.',
                'report_source'      => 'file_import',
                'progress_prev_pct'  => 8.50,
                'progress_this_pct'  => 12.30,
                'progress_total_pct' => 20.80,
                'contract_value'     => 850000000000,
                'addendum_value'     => 50000000000,
                'total_pagu'         => 900000000000,
                'hpp_plan_total'     => 780000000000,
                'hpp_actual_total'   => 156000000000,
                'hpp_deviation'      => 624000000000,
            ]
        );

        $this->command->info("✅ Created 2 ProjectWbs");

        // ============================================================
        // LEVEL 3: PROJECT WORK ITEMS (2 per WBS phase = 4 total)
        // ============================================================
        foreach ($wbsPhases as $wbsPhaseIndex => $wbsPhase) {
            // Work Item 1: Level 0 (Category)
            $category1 = ProjectWorkItem::updateOrCreate(
                [
                    'period_id' => $wbsPhase->id,
                    'item_no'   => 'I.',
                ],
                [
                    'parent_id'    => null,
                    'level'        => 0,
                    'item_name'    => 'PEKERJAAN PERSIAPAN',
                    'sort_order'   => 1,
                    'budget_awal'  => 50000000000,
                    'addendum'     => 0,
                    'total_budget' => 50000000000,
                    'realisasi'    => $wbsPhaseIndex === 0 ? 25000000000 : 48000000000,
                    'deviasi'      => $wbsPhaseIndex === 0 ? 25000000000 : 2000000000,
                    'deviasi_pct'  => $wbsPhaseIndex === 0 ? 50.0000 : 4.0000,
                    'is_total_row' => false,
                ]
            );

            // Work Item 2: Level 1 (Sub-item under Category 1)
            ProjectWorkItem::updateOrCreate(
                [
                    'period_id' => $wbsPhase->id,
                    'item_no'   => '1.1',
                ],
                [
                    'parent_id'    => $category1->id,
                    'level'        => 1,
                    'item_name'    => 'Mobilisasi Alat dan Tenaga Kerja',
                    'sort_order'   => 1,
                    'budget_awal'  => 15000000000,
                    'addendum'     => 0,
                    'total_budget' => 15000000000,
                    'realisasi'    => $wbsPhaseIndex === 0 ? 8000000000 : 14500000000,
                    'deviasi'      => $wbsPhaseIndex === 0 ? 7000000000 : 500000000,
                    'deviasi_pct'  => $wbsPhaseIndex === 0 ? 46.6667 : 3.3333,
                    'is_total_row' => false,
                ]
            );

            // Work Item 3: Level 0 (Category 2)
            $category2 = ProjectWorkItem::updateOrCreate(
                [
                    'period_id' => $wbsPhase->id,
                    'item_no'   => 'II.',
                ],
                [
                    'parent_id'    => null,
                    'level'        => 0,
                    'item_name'    => 'PEKERJAAN STRUKTUR',
                    'sort_order'   => 2,
                    'budget_awal'  => 350000000000,
                    'addendum'     => 20000000000,
                    'total_budget' => 370000000000,
                    'realisasi'    => $wbsPhaseIndex === 0 ? 40000000000 : 108000000000,
                    'deviasi'      => $wbsPhaseIndex === 0 ? 330000000000 : 262000000000,
                    'deviasi_pct'  => $wbsPhaseIndex === 0 ? 89.1892 : 70.8108,
                    'is_total_row' => false,
                ]
            );

            // Work Item 4: Level 1 (Sub-item under Category 2)
            ProjectWorkItem::updateOrCreate(
                [
                    'period_id' => $wbsPhase->id,
                    'item_no'   => '2.1',
                ],
                [
                    'parent_id'    => $category2->id,
                    'level'        => 1,
                    'item_name'    => 'Pekerjaan Pondasi Bored Pile',
                    'sort_order'   => 1,
                    'budget_awal'  => 180000000000,
                    'addendum'     => 10000000000,
                    'total_budget' => 190000000000,
                    'realisasi'    => $wbsPhaseIndex === 0 ? 20000000000 : 55000000000,
                    'deviasi'      => $wbsPhaseIndex === 0 ? 170000000000 : 135000000000,
                    'deviasi_pct'  => $wbsPhaseIndex === 0 ? 89.4737 : 71.0526,
                    'is_total_row' => false,
                ]
            );
        }

        $this->command->info("✅ Created 4 ProjectWorkItems (2 per phase)");

        // ============================================================
        // LEVEL 4A: PROJECT MATERIAL LOGS (2 per phase = 4 total)
        // ============================================================
        foreach ($wbsPhases as $wbsPhaseIndex => $wbsPhase) {
            // Material Log 1
            ProjectMaterialLog::updateOrCreate(
                [
                    'period_id'  => $wbsPhase->id,
                    'supplier_name' => 'PT Beton Jaya Makmur',
                    'material_type' => 'Beton K-350',
                ],
                [
                    'work_item_id'            => null,
                    'tahun_perolehan'         => '2024',
                    'lokasi_vendor'           => 'Surabaya, Jawa Timur',
                    'rating_performa'         => '5/5',
                    'qty'                     => $wbsPhaseIndex === 0 ? 150.5000 : 280.0000,
                    'satuan'                  => 'm3',
                    'harga_satuan'            => 1250000.00,
                    'total_tagihan'           => $wbsPhaseIndex === 0 ? 188125000.00 : 350000000.00,
                    'realisasi_pengiriman'    => '100% (Selesai)',
                    'deviasi_harga_market'    => '+0%',
                    'catatan_monitoring'      => 'Pengiriman tepat waktu, kualitas baik',
                    'is_discount'             => false,
                    'source_row'              => $wbsPhaseIndex + 1,
                ]
            );

            // Material Log 2
            ProjectMaterialLog::updateOrCreate(
                [
                    'period_id'  => $wbsPhase->id,
                    'supplier_name' => 'PT Krakatau Steel',
                    'material_type' => 'Besi Ulir D16',
                ],
                [
                    'work_item_id'            => null,
                    'tahun_perolehan'         => '2024',
                    'lokasi_vendor'           => 'Cilegon, Banten',
                    'rating_performa'         => '4/5',
                    'qty'                     => $wbsPhaseIndex === 0 ? 25.7500 : 48.5000,
                    'satuan'                  => 'ton',
                    'harga_satuan'            => 14500000.00,
                    'total_tagihan'           => $wbsPhaseIndex === 0 ? 373375000.00 : 703250000.00,
                    'realisasi_pengiriman'    => '100% (Selesai)',
                    'deviasi_harga_market'    => '-2%',
                    'catatan_monitoring'      => 'Harga di bawah pasar, kualitas standar',
                    'is_discount'             => false,
                    'source_row'              => $wbsPhaseIndex + 2,
                ]
            );
        }

        $this->command->info("✅ Created 4 ProjectMaterialLogs (2 per phase)");

        // ============================================================
        // LEVEL 4B: PROJECT EQUIPMENT LOGS (2 per phase = 4 total)
        // ============================================================
        foreach ($wbsPhases as $wbsPhaseIndex => $wbsPhase) {
            // Equipment Log 1
            ProjectEquipmentLog::updateOrCreate(
                [
                    'period_id'       => $wbsPhase->id,
                    'vendor_name'     => 'PT United Tractors',
                    'equipment_name'  => 'Excavator PC200-8',
                ],
                [
                    'work_item_id'   => null,
                    'jam_kerja'      => $wbsPhaseIndex === 0 ? 180.50 : 320.00,
                    'rate_per_jam'   => 450000.00,
                    'total_biaya'    => $wbsPhaseIndex === 0 ? 81225000.00 : 144000000.00,
                    'payment_status' => 'Paid',
                    'source_row'     => $wbsPhaseIndex + 1,
                ]
            );

            // Equipment Log 2
            ProjectEquipmentLog::updateOrCreate(
                [
                    'period_id'       => $wbsPhase->id,
                    'vendor_name'     => 'PT Komatsu Indonesia',
                    'equipment_name'  => 'Mobile Crane 50 Ton',
                ],
                [
                    'work_item_id'   => null,
                    'jam_kerja'      => $wbsPhaseIndex === 0 ? 95.00 : 175.50,
                    'rate_per_jam'   => 750000.00,
                    'total_biaya'    => $wbsPhaseIndex === 0 ? 71250000.00 : 131625000.00,
                    'payment_status' => $wbsPhaseIndex === 0 ? 'Paid' : 'Pending',
                    'source_row'     => $wbsPhaseIndex + 2,
                ]
            );
        }

        $this->command->info("✅ Created 4 ProjectEquipmentLogs (2 per phase)");

        // ============================================================
        // LEVEL 5: PROJECT PROGRESS CURVES (2 records)
        // ============================================================
        // Week 12
        ProjectProgressCurve::updateOrCreate(
            [
                'project_id'   => $project->id,
                'week_number'  => 12,
            ],
            [
                'week_date'      => '2024-04-01',
                'rencana_pct'   => 28.50,
                'realisasi_pct' => 25.80,
                'deviasi_pct'   => -2.70,
                'keterangan'    => 'Material Delay',
            ]
        );

        // Week 24
        ProjectProgressCurve::updateOrCreate(
            [
                'project_id'   => $project->id,
                'week_number'  => 24,
            ],
            [
                'week_date'      => '2024-07-01',
                'rencana_pct'   => 58.30,
                'realisasi_pct' => 52.10,
                'deviasi_pct'   => -6.20,
                'keterangan'    => 'Critical - Cuaca buruk',
            ]
        );

        $this->command->info("✅ Created 2 ProjectProgressCurves");

        // ============================================================
        // LEVEL 6: PROJECT RISKS (2 records)
        // ============================================================
        // Risk 1: Cost related
        ProjectRisk::updateOrCreate(
            [
                'project_id' => $project->id,
                'risk_code'  => 'RSK-001',
            ],
            [
                'risk_title'       => 'Kenaikan Harga Material Besi Beton',
                'risk_description' => 'Harga besi beton di pasar mengalami kenaikan signifikan sebesar 15% akibat fluktuasi harga bijih besi global dan nilai tukar dolar yang melemah.',
                'category'         => 'cost',
                'financial_impact_idr' => 2500000000.00,
                'probability'      => 4,
                'impact'           => 4,
                // severity dihitung otomatis: 4x4=16 -> high
                'mitigation'       => '1. Negosiasi ulang dengan supplier untuk kontrak jangka panjang
2. Eksplorasi alternative material lokal
3. Hedging harga melalui kontrak forward dengan pemasok',
                'status'           => 'open',
                'owner'            => 'Ir. Ahmad Hidayat',
                'identified_at'    => '2024-02-15',
                'target_resolved_at' => '2024-06-30',
            ]
        );

        // Risk 2: Schedule related
        ProjectRisk::updateOrCreate(
            [
                'project_id' => $project->id,
                'risk_code'  => 'RSK-002',
            ],
            [
                'risk_title'       => 'Keterlambatan Pengiriman Material Struktur',
                'risk_description' => 'Potensi keterlambatan pengiriman material struktur utama (bored pile) dari pabrik dapat mempengaruhi critical path proyek.',
                'category'         => 'schedule',
                'financial_impact_idr' => 1800000000.00,
                'probability'      => 3,
                'impact'           => 5,
                // severity dihitung otomatis: 3x5=15 -> high
                'mitigation'       => '1. Koordinasi intensif dengan vendor untuk jadwal produksi
2. Buffer stok material di site
3. Pre-order material untuk phase berikutnya',
                'status'           => 'mitigated',
                'owner'            => 'Bapak Dedy Kurniawan',
                'identified_at'    => '2024-01-20',
                'target_resolved_at' => '2024-05-15',
            ]
        );

        $this->command->info("✅ Created 2 ProjectRisks");

        // ============================================================
        // SUMMARY
        // ============================================================
        $this->command->newLine();
        $this->command->info('╔════════════════════════════════════════════════════════╗');
        $this->command->info('║           COMPLETE PROJECT SEEDER SUMMARY              ║');
        $this->command->info('╠════════════════════════════════════════════════════════╣');
        $this->command->info('║  Project Code: DEMO-001                                 ║');
        $this->command->info('║  Project Name: Proyek Pembangunan Jembatan Suramadu   ║');
        $this->command->info('║                                                          ║');
        $this->command->info('║  Records Created:                                       ║');
        $this->command->info('║  • Projects:         1                                  ║');
        $this->command->info('║  • WBS Phases:       2                                  ║');
        $this->command->info('║  • Work Items:       4 (2 per phase)                    ║');
        $this->command->info('║  • Material Logs:    4 (2 per phase)                    ║');
        $this->command->info('║  • Equipment Logs:   4 (2 per phase)                    ║');
        $this->command->info('║  • Progress Curves:  2                                  ║');
        $this->command->info('║  • Risks:            2                                  ║');
        $this->command->info('║  ────────────────────────────────────────────────────   ║');
        $this->command->info('║  Total Records:    19                                   ║');
        $this->command->info('╚════════════════════════════════════════════════════════╝');

        $this->command->newLine();
        $this->command->info('📊 KPI Status:');
        $this->command->info("   CPI:    {$project->cpi} (Cost Performance Index)");
        $this->command->info("   SPI:    {$project->spi} (Schedule Performance Index)");
        $this->command->info("   Status: {$project->status}");
    }
}
