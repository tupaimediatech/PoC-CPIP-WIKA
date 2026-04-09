<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add deviasi_pct column to project_periods table
 *
 * Deviasi % formula: ((BQ External - RAB Internal) / RAB Internal) * 100
 * Where:
 * - BQ External = total_pagu
 * - RAB Internal = hpp_plan_total
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_periods', function (Blueprint $table) {
            $table->decimal('deviasi_pct', 8, 4)->nullable()
                ->after('hpp_deviation')
                ->comment('Deviasi % = ((total_pagu - hpp_plan_total) / hpp_plan_total) * 100');
        });
    }

    public function down(): void
    {
        Schema::table('project_periods', function (Blueprint $table) {
            $table->dropColumn('deviasi_pct');
        });
    }
};
