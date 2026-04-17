<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectPeriod;
use App\Models\ProjectWorkItem;
use App\Models\ProjectMaterialLog;
use App\Models\ProjectEquipmentLog;
use App\Models\ProjectProgressCurve;
use App\Models\ProjectRisk;
use App\Models\HarsatHistory;
use Illuminate\Database\Seeder;

class CompleteProjectSeeder extends Seeder
{
    /**
     * Seeds 12 projects across multiple SBUs/divisions/statuses,
     * plus harsat history data for the trend chart.
     */
    public function run(): void
    {
        $projects = [
            [
                'project_code' => 'PRJ-001',
                'project_name' => 'Pembangunan Jembatan Suramadu II',
                'division' => 'Infrastructure', 'sbu' => 'Jembatan',
                'owner' => 'Pemerintah', 'funding_source' => 'APBN',
                'contract_type' => 'Lumpsum', 'type_of_contract' => 'Design & Build',
                'payment_method' => 'Monthly Progress', 'partnership' => 'JO',
                'partner_name' => 'PT Hutama Karya (JO)',
                'consultant_name' => 'PT Bina Karya',
                'profit_center' => 'PC-1000', 'location' => 'Surabaya, Jawa Timur',
                'contract_value' => 850000, 'planned_cost' => 780000, 'actual_cost' => 820000,
                'planned_duration' => 36, 'actual_duration' => 38, 'progress_pct' => 95.5,
                'gross_profit_pct' => 3.53, 'project_year' => 2024, 'start_date' => '2024-01-15',
            ],
            [
                'project_code' => 'PRJ-002',
                'project_name' => 'RS Tri Harsi Extension',
                'division' => 'Building', 'sbu' => 'Gedung RS',
                'owner' => 'Swasta', 'funding_source' => 'Swasta',
                'contract_type' => 'Lumpsum', 'type_of_contract' => 'Konvensional',
                'payment_method' => 'Milestone', 'partnership' => 'Non JO',
                'partner_name' => null, 'consultant_name' => 'PT Virama Karya',
                'profit_center' => 'PC-2000', 'location' => 'Jakarta',
                'contract_value' => 320000, 'planned_cost' => 290000, 'actual_cost' => 275000,
                'planned_duration' => 24, 'actual_duration' => 22, 'progress_pct' => 100,
                'gross_profit_pct' => 9.38, 'project_year' => 2024, 'start_date' => '2024-03-01',
            ],
            [
                'project_code' => 'PRJ-003',
                'project_name' => 'Bandara Dhoho Kediri',
                'division' => 'Infrastructure', 'sbu' => 'Bandara',
                'owner' => 'BUMN', 'funding_source' => 'APBN',
                'contract_type' => 'Unit Price', 'type_of_contract' => 'EPCC',
                'payment_method' => 'Monthly Progress', 'partnership' => 'JO',
                'partner_name' => 'PT PP (Persero)',
                'consultant_name' => 'PT Indah Karya',
                'profit_center' => 'PC-3000', 'location' => 'Kediri, Jawa Timur',
                'contract_value' => 1200000, 'planned_cost' => 1100000, 'actual_cost' => 1250000,
                'planned_duration' => 48, 'actual_duration' => 52, 'progress_pct' => 78,
                'gross_profit_pct' => -4.17, 'project_year' => 2023, 'start_date' => '2023-06-01',
            ],
            [
                'project_code' => 'PRJ-004',
                'project_name' => 'IPAL Industri Cikarang',
                'division' => 'Infrastructure', 'sbu' => 'Sanitasi',
                'owner' => 'Swasta', 'funding_source' => 'Swasta',
                'contract_type' => 'Gabungan', 'type_of_contract' => 'Design & Build',
                'payment_method' => 'CPF (Turnkey)', 'partnership' => 'Non JO',
                'partner_name' => null, 'consultant_name' => 'PT Yodya Karya',
                'profit_center' => 'PC-1000', 'location' => 'Cikarang, Jawa Barat',
                'contract_value' => 180000, 'planned_cost' => 160000, 'actual_cost' => 155000,
                'planned_duration' => 18, 'actual_duration' => 17, 'progress_pct' => 100,
                'gross_profit_pct' => 13.89, 'project_year' => 2025, 'start_date' => '2025-01-10',
            ],
            [
                'project_code' => 'PRJ-005',
                'project_name' => 'Tol Semarang–Demak Seksi 3',
                'division' => 'Infrastructure', 'sbu' => 'Jembatan',
                'owner' => 'Pemerintah', 'funding_source' => 'APBN',
                'contract_type' => 'Unit Price', 'type_of_contract' => 'Konvensional',
                'payment_method' => 'Monthly Progress', 'partnership' => 'JO',
                'partner_name' => 'PT Waskita Karya',
                'consultant_name' => 'PT Bina Karya',
                'profit_center' => 'PC-3000', 'location' => 'Semarang, Jawa Tengah',
                'contract_value' => 950000, 'planned_cost' => 880000, 'actual_cost' => 960000,
                'planned_duration' => 30, 'actual_duration' => 35, 'progress_pct' => 88,
                'gross_profit_pct' => -1.05, 'project_year' => 2024, 'start_date' => '2024-02-01',
            ],
            [
                'project_code' => 'PRJ-006',
                'project_name' => 'Gedung Perkantoran BUMN Tower',
                'division' => 'Building', 'sbu' => 'Gedung RS',
                'owner' => 'BUMN', 'funding_source' => 'APBD',
                'contract_type' => 'Lumpsum', 'type_of_contract' => 'Design & Build',
                'payment_method' => 'Milestone', 'partnership' => 'Non JO',
                'partner_name' => null, 'consultant_name' => 'PT Virama Karya',
                'profit_center' => 'PC-2000', 'location' => 'Jakarta',
                'contract_value' => 450000, 'planned_cost' => 410000, 'actual_cost' => 400000,
                'planned_duration' => 30, 'actual_duration' => 28, 'progress_pct' => 100,
                'gross_profit_pct' => 11.11, 'project_year' => 2025, 'start_date' => '2025-02-15',
            ],
            [
                'project_code' => 'PRJ-007',
                'project_name' => 'Bendungan Citarum Hilir',
                'division' => 'Infrastructure', 'sbu' => 'Sanitasi',
                'owner' => 'Pemerintah', 'funding_source' => 'Loan',
                'contract_type' => 'Unit Price', 'type_of_contract' => 'EPCC',
                'payment_method' => 'Monthly Progress', 'partnership' => 'JO',
                'partner_name' => 'PT Brantas Abipraya',
                'consultant_name' => 'PT Indah Karya',
                'profit_center' => 'PC-4000', 'location' => 'Bandung, Jawa Barat',
                'contract_value' => 2100000, 'planned_cost' => 1900000, 'actual_cost' => 2200000,
                'planned_duration' => 60, 'actual_duration' => 68, 'progress_pct' => 72,
                'gross_profit_pct' => -4.76, 'project_year' => 2023, 'start_date' => '2023-01-10',
            ],
            [
                'project_code' => 'PRJ-008',
                'project_name' => 'RS Kasih Ibu Pavilion',
                'division' => 'Building', 'sbu' => 'Gedung RS',
                'owner' => 'Swasta', 'funding_source' => 'Swasta',
                'contract_type' => 'Lumpsum', 'type_of_contract' => 'Konvensional',
                'payment_method' => 'Milestone', 'partnership' => 'Non JO',
                'partner_name' => null, 'consultant_name' => 'PT Yodya Karya',
                'profit_center' => 'PC-2000', 'location' => 'Denpasar, Bali',
                'contract_value' => 210000, 'planned_cost' => 195000, 'actual_cost' => 190000,
                'planned_duration' => 18, 'actual_duration' => 18, 'progress_pct' => 100,
                'gross_profit_pct' => 9.52, 'project_year' => 2025, 'start_date' => '2025-03-01',
            ],
            [
                'project_code' => 'PRJ-009',
                'project_name' => 'Flyover Makassar Perintis',
                'division' => 'Infrastructure', 'sbu' => 'Jembatan',
                'owner' => 'Pemerintah', 'funding_source' => 'APBD',
                'contract_type' => 'Unit Price', 'type_of_contract' => 'Konvensional',
                'payment_method' => 'Monthly Progress', 'partnership' => 'Non JO',
                'partner_name' => null, 'consultant_name' => 'PT Bina Karya',
                'profit_center' => 'PC-3000', 'location' => 'Makassar, Sulawesi Selatan',
                'contract_value' => 380000, 'planned_cost' => 350000, 'actual_cost' => 345000,
                'planned_duration' => 24, 'actual_duration' => 24, 'progress_pct' => 100,
                'gross_profit_pct' => 9.21, 'project_year' => 2024, 'start_date' => '2024-04-01',
            ],
            [
                'project_code' => 'PRJ-010',
                'project_name' => 'Terminal 4 Soekarno Hatta',
                'division' => 'Infrastructure', 'sbu' => 'Bandara',
                'owner' => 'BUMN', 'funding_source' => 'APBN',
                'contract_type' => 'Gabungan', 'type_of_contract' => 'Design & Build',
                'payment_method' => 'Monthly Progress', 'partnership' => 'JO',
                'partner_name' => 'PT Adhi Karya',
                'consultant_name' => 'PT Virama Karya',
                'profit_center' => 'PC-4000', 'location' => 'Tangerang, Banten',
                'contract_value' => 3500000, 'planned_cost' => 3200000, 'actual_cost' => 3600000,
                'planned_duration' => 48, 'actual_duration' => 55, 'progress_pct' => 65,
                'gross_profit_pct' => -2.86, 'project_year' => 2023, 'start_date' => '2023-03-15',
            ],
            [
                'project_code' => 'PRJ-011',
                'project_name' => 'SPAM Regional Umbulan',
                'division' => 'Infrastructure', 'sbu' => 'Sanitasi',
                'owner' => 'Pemerintah', 'funding_source' => 'Loan',
                'contract_type' => 'Unit Price', 'type_of_contract' => 'Konvensional',
                'payment_method' => 'Monthly Progress', 'partnership' => 'Non JO',
                'partner_name' => null, 'consultant_name' => 'PT Indah Karya',
                'profit_center' => 'PC-1000', 'location' => 'Pasuruan, Jawa Timur',
                'contract_value' => 550000, 'planned_cost' => 500000, 'actual_cost' => 480000,
                'planned_duration' => 24, 'actual_duration' => 23, 'progress_pct' => 100,
                'gross_profit_pct' => 12.73, 'project_year' => 2025, 'start_date' => '2025-01-20',
            ],
            [
                'project_code' => 'PRJ-012',
                'project_name' => 'WTP Karian–Serpong',
                'division' => 'Infrastructure', 'sbu' => 'Sanitasi',
                'owner' => 'Pemerintah', 'funding_source' => 'APBN',
                'contract_type' => 'Unit Price', 'type_of_contract' => 'EPCC',
                'payment_method' => 'CPF (Turnkey)', 'partnership' => 'JO',
                'partner_name' => 'PT Pembangunan Perumahan',
                'consultant_name' => 'PT Yodya Karya',
                'profit_center' => 'PC-4000', 'location' => 'Serang, Banten',
                'contract_value' => 780000, 'planned_cost' => 720000, 'actual_cost' => 750000,
                'planned_duration' => 36, 'actual_duration' => 40, 'progress_pct' => 82,
                'gross_profit_pct' => 3.85, 'project_year' => 2024, 'start_date' => '2024-05-01',
            ],
        ];

        $createdCount = 0;
        foreach ($projects as $data) {
            $code = $data['project_code'];
            $project = Project::create($data);

            // Force KPI recalculation (create triggers saving hook)
            $this->command->info("✅ {$code}: CPI={$project->cpi}, SPI={$project->spi}, Status={$project->status}");
            $createdCount++;

            // Add 1 period + work items + materials for first 4 projects (for Level 3-7 drill-down)
            if (in_array($code, ['PRJ-001', 'PRJ-002', 'PRJ-003', 'PRJ-004'])) {
                $this->seedProjectDetails($project);
            }
        }

        $this->command->info("✅ Created {$createdCount} projects");

        // Seed harsat history for trend chart
        $this->seedHarsatHistory();

        $this->command->newLine();
        $this->command->info("🎉 Seeding complete!");
    }

    private function seedProjectDetails(Project $project): void
    {
        $period = ProjectPeriod::create([
            'project_id'       => $project->id,
            'period'           => $project->start_date ? date('Y-m', strtotime($project->start_date)) : '2024-01',
            'client_name'      => $project->owner,
            'project_manager'  => 'PM ' . $project->project_name,
            'report_source'    => 'file_import',
            'progress_prev_pct'  => 0,
            'progress_this_pct'  => round($project->progress_pct * 0.3, 2),
            'progress_total_pct' => round($project->progress_pct * 0.3, 2),
            'contract_value'   => $project->contract_value * 1_000_000,
            'addendum_value'   => 0,
            'total_pagu'       => $project->contract_value * 1_000_000,
            'hpp_plan_total'   => $project->planned_cost * 1_000_000,
            'hpp_actual_total' => $project->actual_cost * 0.3 * 1_000_000,
            'hpp_deviation'    => ($project->planned_cost - $project->actual_cost * 0.3) * 1_000_000,
        ]);

        // Work items
        $cat = ProjectWorkItem::create([
            'period_id' => $period->id, 'parent_id' => null, 'level' => 0,
            'item_no' => 'I.', 'item_name' => 'PEKERJAAN PERSIAPAN', 'sort_order' => 1,
            'budget_awal' => $project->planned_cost * 0.1 * 1_000_000, 'addendum' => 0,
            'total_budget' => $project->planned_cost * 0.1 * 1_000_000,
            'realisasi' => $project->actual_cost * 0.08 * 1_000_000,
            'deviasi' => ($project->planned_cost * 0.1 - $project->actual_cost * 0.08) * 1_000_000,
            'deviasi_pct' => 20.0, 'is_total_row' => false,
        ]);

        ProjectWorkItem::create([
            'period_id' => $period->id, 'parent_id' => $cat->id, 'level' => 1,
            'item_no' => '1.1', 'item_name' => 'Mobilisasi', 'sort_order' => 1,
            'budget_awal' => $project->planned_cost * 0.05 * 1_000_000, 'addendum' => 0,
            'total_budget' => $project->planned_cost * 0.05 * 1_000_000,
            'realisasi' => $project->actual_cost * 0.04 * 1_000_000,
            'deviasi' => ($project->planned_cost * 0.05 - $project->actual_cost * 0.04) * 1_000_000,
            'deviasi_pct' => 20.0, 'is_total_row' => false,
        ]);

        $cat2 = ProjectWorkItem::create([
            'period_id' => $period->id, 'parent_id' => null, 'level' => 0,
            'item_no' => 'II.', 'item_name' => 'PEKERJAAN STRUKTUR', 'sort_order' => 2,
            'budget_awal' => $project->planned_cost * 0.6 * 1_000_000, 'addendum' => 0,
            'total_budget' => $project->planned_cost * 0.6 * 1_000_000,
            'realisasi' => $project->actual_cost * 0.55 * 1_000_000,
            'deviasi' => ($project->planned_cost * 0.6 - $project->actual_cost * 0.55) * 1_000_000,
            'deviasi_pct' => 8.3, 'is_total_row' => false,
        ]);

        ProjectWorkItem::create([
            'period_id' => $period->id, 'parent_id' => $cat2->id, 'level' => 1,
            'item_no' => '2.1', 'item_name' => 'Pekerjaan Pondasi', 'sort_order' => 1,
            'budget_awal' => $project->planned_cost * 0.3 * 1_000_000, 'addendum' => 0,
            'total_budget' => $project->planned_cost * 0.3 * 1_000_000,
            'realisasi' => $project->actual_cost * 0.28 * 1_000_000,
            'deviasi' => ($project->planned_cost * 0.3 - $project->actual_cost * 0.28) * 1_000_000,
            'deviasi_pct' => 6.7, 'is_total_row' => false,
        ]);

        // Materials
        ProjectMaterialLog::create([
            'period_id' => $period->id, 'supplier_name' => 'PT Beton Jaya',
            'material_type' => 'Beton K-350', 'qty' => 200, 'satuan' => 'm3',
            'harga_satuan' => 1250000, 'total_tagihan' => 250000000,
            'tahun_perolehan' => (string) $project->project_year,
            'lokasi_vendor' => $project->location, 'rating_performa' => '4/5',
            'realisasi_pengiriman' => '100% (Selesai)', 'deviasi_harga_market' => '+2%',
            'catatan_monitoring' => 'Pengiriman tepat waktu', 'is_discount' => false, 'source_row' => 1,
        ]);

        ProjectMaterialLog::create([
            'period_id' => $period->id, 'supplier_name' => 'PT Krakatau Steel',
            'material_type' => 'Besi Ulir D16', 'qty' => 50, 'satuan' => 'ton',
            'harga_satuan' => 14500000, 'total_tagihan' => 725000000,
            'tahun_perolehan' => (string) $project->project_year,
            'lokasi_vendor' => 'Cilegon, Banten', 'rating_performa' => '5/5',
            'realisasi_pengiriman' => '85%', 'deviasi_harga_market' => '-1%',
            'catatan_monitoring' => 'Harga stabil', 'is_discount' => false, 'source_row' => 2,
        ]);

        // Equipment
        ProjectEquipmentLog::create([
            'period_id' => $period->id, 'vendor_name' => 'PT United Tractors',
            'equipment_name' => 'Excavator PC200', 'jam_kerja' => 200,
            'rate_per_jam' => 450000, 'total_biaya' => 90000000,
            'payment_status' => 'Paid', 'source_row' => 1,
        ]);

        // Progress curves
        ProjectProgressCurve::create([
            'project_id' => $project->id, 'week_number' => 4,
            'week_date' => date('Y-m-d', strtotime($project->start_date . ' +4 weeks')),
            'rencana_pct' => 10, 'realisasi_pct' => 8.5, 'deviasi_pct' => -1.5,
            'keterangan' => 'Slight delay in mobilization',
        ]);
        ProjectProgressCurve::create([
            'project_id' => $project->id, 'week_number' => 12,
            'week_date' => date('Y-m-d', strtotime($project->start_date . ' +12 weeks')),
            'rencana_pct' => 30, 'realisasi_pct' => 27, 'deviasi_pct' => -3,
            'keterangan' => 'Material delay',
        ]);
        ProjectProgressCurve::create([
            'project_id' => $project->id, 'week_number' => 24,
            'week_date' => date('Y-m-d', strtotime($project->start_date . ' +24 weeks')),
            'rencana_pct' => 55, 'realisasi_pct' => 50, 'deviasi_pct' => -5,
            'keterangan' => 'Recovery in progress',
        ]);

        // Risks
        ProjectRisk::create([
            'project_id' => $project->id, 'risk_code' => 'RSK-' . $project->project_code . '-01',
            'risk_title' => 'Kenaikan Harga Material', 'category' => 'cost',
            'risk_description' => 'Harga material mengalami kenaikan akibat fluktuasi pasar.',
            'financial_impact_idr' => $project->contract_value * 30000,
            'probability' => 3, 'impact' => 4, 'status' => 'open',
            'mitigation' => 'Negosiasi kontrak jangka panjang dengan supplier',
            'owner' => 'Project Manager', 'identified_at' => $project->start_date,
            'target_resolved_at' => date('Y-m-d', strtotime($project->start_date . ' +6 months')),
        ]);
        ProjectRisk::create([
            'project_id' => $project->id, 'risk_code' => 'RSK-' . $project->project_code . '-02',
            'risk_title' => 'Keterlambatan Pengiriman', 'category' => 'schedule',
            'risk_description' => 'Potensi keterlambatan pengiriman material struktur utama.',
            'financial_impact_idr' => $project->contract_value * 20000,
            'probability' => 2, 'impact' => 5, 'status' => 'mitigated',
            'mitigation' => 'Buffer stok material di site',
            'owner' => 'Procurement', 'identified_at' => $project->start_date,
            'target_resolved_at' => date('Y-m-d', strtotime($project->start_date . ' +3 months')),
        ]);

        $this->command->info("   → Seeded details for {$project->project_code}");
    }

    private function seedHarsatHistory(): void
    {
        $categories = [
            ['category' => 'Besi Beton', 'category_key' => 'besi_beton', 'unit' => 'kg',
             'values' => [2021 => 12500, 2022 => 13200, 2023 => 14500, 2024 => 15100, 2025 => 15800]],
            ['category' => 'Beton Ready Mix', 'category_key' => 'beton_ready_mix', 'unit' => 'm3',
             'values' => [2021 => 850000, 2022 => 920000, 2023 => 980000, 2024 => 1050000, 2025 => 1150000]],
            ['category' => 'Semen Portland', 'category_key' => 'semen_portland', 'unit' => 'kg',
             'values' => [2021 => 1150, 2022 => 1200, 2023 => 1280, 2024 => 1350, 2025 => 1420]],
            ['category' => 'Kayu Bekisting', 'category_key' => 'kayu_bekisting', 'unit' => 'm3',
             'values' => [2021 => 3500000, 2022 => 3800000, 2023 => 4100000, 2024 => 4300000, 2025 => 4600000]],
            ['category' => 'Aspal Hotmix', 'category_key' => 'aspal_hotmix', 'unit' => 'ton',
             'values' => [2021 => 1200000, 2022 => 1350000, 2023 => 1500000, 2024 => 1420000, 2025 => 1550000]],
        ];

        $count = 0;
        foreach ($categories as $cat) {
            foreach ($cat['values'] as $year => $value) {
                HarsatHistory::updateOrCreate(
                    ['category_key' => $cat['category_key'], 'year' => $year],
                    ['category' => $cat['category'], 'value' => $value, 'unit' => $cat['unit']],
                );
                $count++;
            }
        }

        $this->command->info("✅ Created {$count} harsat history records (5 categories × 5 years)");
    }
}
