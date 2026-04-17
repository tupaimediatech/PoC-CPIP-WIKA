<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->renameColumn('total_pagu', 'bq_external');
            $table->renameColumn('hpp_plan_total', 'actual_costs');
            $table->renameColumn('hpp_actual_total', 'realized_costs');
        });
    }

    public function down(): void
    {
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->renameColumn('bq_external', 'total_pagu');
            $table->renameColumn('actual_costs', 'hpp_plan_total');
            $table->renameColumn('realized_costs', 'hpp_actual_total');
        });
    }
};