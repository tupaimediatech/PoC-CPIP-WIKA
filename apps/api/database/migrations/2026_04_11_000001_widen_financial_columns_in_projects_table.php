<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Widen financial decimal columns in projects table from (15,2) to (20,2)
 * to match project_wbs and project_work_items, and prevent overflow for
 * large contract values (e.g. > 10 trillion IDR).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->decimal('contract_value', 20, 2)->nullable()->change();
            $table->decimal('planned_cost', 20, 2)->nullable()->change();
            $table->decimal('actual_cost', 20, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->decimal('contract_value', 15, 2)->nullable()->change();
            $table->decimal('planned_cost', 15, 2)->nullable()->change();
            $table->decimal('actual_cost', 15, 2)->nullable()->change();
        });
    }
};
