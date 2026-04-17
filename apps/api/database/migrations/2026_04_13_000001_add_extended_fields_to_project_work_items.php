<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add extended fields to project_work_items for richer Excel formats.
 *
 * These columns support the extended single-sheet format which embeds
 * EVM metrics, vendor data, and progress tracking per work item row.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            // Volume & harsat aktual
            $table->decimal('volume_actual', 20, 4)->nullable()->after('harsat_internal');
            $table->decimal('harsat_actual', 20, 4)->nullable()->after('volume_actual');

            // Cost categorization
            $table->string('cost_category', 100)->nullable()->after('harsat_actual')
                ->comment('Langsung / Tidak Langsung');
            $table->string('cost_subcategory', 100)->nullable()->after('cost_category')
                ->comment('Material, Upah, Alat, Subkon, Overhead, etc.');

            // Progress & EVM
            $table->decimal('bobot_pct', 8, 4)->nullable()->after('cost_subcategory');
            $table->decimal('progress_plan_pct', 8, 4)->nullable()->after('bobot_pct');
            $table->decimal('progress_actual_pct', 8, 4)->nullable()->after('progress_plan_pct');
            $table->decimal('planned_value', 20, 2)->nullable()->after('progress_actual_pct');
            $table->decimal('earned_value', 20, 2)->nullable()->after('planned_value');
            $table->decimal('actual_cost_item', 20, 2)->nullable()->after('earned_value');

            // Embedded vendor data
            $table->string('vendor_name', 255)->nullable()->after('actual_cost_item');
            $table->string('po_number', 100)->nullable()->after('vendor_name');
            $table->decimal('vendor_contract_value', 20, 2)->nullable()->after('po_number');
            $table->decimal('termin_paid', 20, 2)->nullable()->after('vendor_contract_value');
            $table->decimal('retention', 20, 2)->nullable()->after('termin_paid');
            $table->decimal('outstanding_debt', 20, 2)->nullable()->after('retention');

            // Audit
            $table->string('data_source', 100)->nullable()->after('outstanding_debt');
            $table->text('notes')->nullable()->after('data_source');
        });
    }

    public function down(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->dropColumn([
                'volume_actual', 'harsat_actual',
                'cost_category', 'cost_subcategory',
                'bobot_pct', 'progress_plan_pct', 'progress_actual_pct',
                'planned_value', 'earned_value', 'actual_cost_item',
                'vendor_name', 'po_number', 'vendor_contract_value',
                'termin_paid', 'retention', 'outstanding_debt',
                'data_source', 'notes',
            ]);
        });
    }
};
