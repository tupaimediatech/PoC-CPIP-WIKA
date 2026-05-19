<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const MONEY_TYPE = 'NUMERIC(30, 2)';
    private const QUANTITY_TYPE = 'NUMERIC(30, 4)';

    private array $moneyColumns = [
        'projects' => [
            'contract_value', 'planned_cost', 'actual_cost', 'hpp',
            'addendum_value', 'bq_external', 'harsat',
        ],
        'project_periods' => [
            'contract_value', 'addendum_value', 'total_pagu', 'bq_external',
            'hpp_plan_total', 'hpp_actual_total', 'actual_costs',
            'realized_costs', 'hpp_deviation',
        ],
        'project_wbs' => [
            'contract_value', 'addendum_value', 'total_pagu', 'bq_external',
            'hpp_plan_total', 'hpp_actual_total', 'actual_costs',
            'realized_costs', 'hpp_deviation',
        ],
        'project_work_items' => [
            'budget_awal', 'addendum', 'total_budget', 'realisasi',
            'deviasi', 'harsat_internal', 'harsat_actual', 'planned_value',
            'earned_value', 'actual_cost_item', 'vendor_contract_value',
            'termin_paid', 'retention', 'outstanding_debt', 'price',
        ],
        'project_material_logs' => ['harga_satuan', 'total_tagihan'],
        'project_equipment_logs' => ['rate_per_jam', 'total_biaya'],
        'project_risks' => ['financial_impact_idr'],
        'harsat_histories' => ['value'],
        'project_profit_loss' => ['beban_pph_final', 'laba_kotor', 'lsp'],
        'project_sales' => ['penjualan'],
        'project_direct_cost' => ['material', 'upah', 'alat', 'subkon'],
        'project_indirect_cost' => ['fasilitas', 'sekretariat', 'kendaraan', 'personalia', 'keuangan', 'umum'],
        'project_other_cost' => ['biaya_pemeliharaan', 'risiko'],
        'project_indirect_cost_items' => ['budget', 'realisasi', 'deviasi'],
        'project_other_cost_items' => ['nilai'],
        'project_vendors' => ['contract_value', 'uang_muka', 'termin_paid', 'retensi'],
    ];

    private array $quantityColumns = [
        'projects' => ['volume'],
        'project_work_items' => ['volume', 'volume_addendum', 'volume_actual', 'quantity'],
        'project_material_logs' => ['qty'],
        'project_equipment_logs' => ['jam_kerja'],
    ];

    public function up(): void
    {
        $this->alterColumns($this->moneyColumns, self::MONEY_TYPE);
        $this->alterColumns($this->quantityColumns, self::QUANTITY_TYPE);
    }

    public function down(): void
    {
        // Preserve widened precision on rollback. Narrowing money columns back to
        // older limits can fail or truncate legitimate uploaded values.
    }

    private function alterColumns(array $tables, string $type): void
    {
        foreach ($tables as $table => $columns) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            foreach ($columns as $column) {
                if (Schema::hasColumn($table, $column)) {
                    $this->alterColumn($table, $column, $type);
                }
            }
        }
    }

    private function alterColumn(string $table, string $column, string $type): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement(sprintf(
                'ALTER TABLE "%s" ALTER COLUMN "%s" TYPE %s USING "%s"::%s',
                str_replace('"', '""', $table),
                str_replace('"', '""', $column),
                $type,
                str_replace('"', '""', $column),
                $type,
            ));

            return;
        }

        if ($driver === 'mysql') {
            DB::statement(sprintf(
                'ALTER TABLE `%s` MODIFY `%s` %s NULL',
                str_replace('`', '``', $table),
                str_replace('`', '``', $column),
                str_replace('NUMERIC', 'DECIMAL', $type),
            ));
        }
    }
};
