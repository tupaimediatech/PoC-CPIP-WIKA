<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->decimal('addendum_value', 20, 2)->nullable()->after('contract_value');
            $table->decimal('bq_external', 20, 2)->nullable()->after('addendum_value')
                  ->comment('contract_value + addendum_value');
            $table->date('planned_end_date')->nullable()->after('start_date');
            $table->decimal('tarif_pph_final', 6, 4)->nullable()->after('hpp')
                  ->comment('Final income tax rate, e.g. 0.0175 for 1.75%');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['addendum_value', 'bq_external', 'planned_end_date', 'tarif_pph_final']);
        });
    }
};
