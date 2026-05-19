<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const PERCENT_TYPE = 'NUMERIC(20, 4)';

    private array $percentageColumns = [
        'projects' => ['progress_pct', 'gross_profit_pct'],
        'project_periods' => [
            'progress_prev_pct', 'progress_this_pct', 'progress_total_pct', 'deviasi_pct',
        ],
        'project_wbs' => [
            'progress_prev_pct', 'progress_this_pct', 'progress_total_pct', 'deviasi_pct',
        ],
        'project_work_items' => [
            'deviasi_pct', 'bobot_pct', 'progress_plan_pct', 'progress_actual_pct',
        ],
        'project_progress_curves' => ['rencana_pct', 'realisasi_pct', 'deviasi_pct'],
    ];

    public function up(): void
    {
        foreach ($this->percentageColumns as $table => $columns) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            foreach ($columns as $column) {
                if (Schema::hasColumn($table, $column)) {
                    $this->alterColumn($table, $column);
                }
            }
        }
    }

    public function down(): void
    {
        // Keep widened precision on rollback to avoid truncating imported data.
    }

    private function alterColumn(string $table, string $column): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement(sprintf(
                'ALTER TABLE "%s" ALTER COLUMN "%s" TYPE %s USING "%s"::%s',
                str_replace('"', '""', $table),
                str_replace('"', '""', $column),
                self::PERCENT_TYPE,
                str_replace('"', '""', $column),
                self::PERCENT_TYPE,
            ));

            return;
        }

        if ($driver === 'mysql') {
            DB::statement(sprintf(
                'ALTER TABLE `%s` MODIFY `%s` DECIMAL(20, 4) NULL',
                str_replace('`', '``', $table),
                str_replace('`', '``', $column),
            ));
        }
    }
};
