<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cleanup project_wbs and move project_manager to projects.
 *
 * Changes on `projects`:
 *   + project_manager  (moved from project_wbs)
 *
 * Changes on `project_wbs`:
 *   RENAME  total_pagu      → bq_external   (nilai BQ dari owner/client per WBS fase)
 *   RENAME  hpp_plan_total  → rab_internal   (RAB internal / HPP rencana per WBS fase)
 *   DROP    client_name             (redundan — sama dengan projects.owner)
 *   DROP    project_manager         (dipindah ke projects)
 *   DROP    progress_prev_pct       (konsep snapshot bulanan, tidak relevan untuk WBS)
 *   DROP    progress_this_pct
 *   DROP    progress_total_pct
 *   DROP    contract_value          (nilai kontrak ada di projects, tidak perlu per-WBS)
 *   DROP    addendum_value
 *   DROP    hpp_actual_total        (computable dari SUM(work_items.realisasi))
 *   DROP    hpp_deviation           (computable: bq_external - rab_internal)
 *   DROP    deviasi_pct             (computable)
 *   RENAME  unique constraint: uq_project_period → uq_project_wbs_phase
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Add project_manager to projects ───────────────────────────────
        Schema::table('projects', function (Blueprint $table) {
            $table->string('project_manager', 150)->nullable()
                  ->after('owner')
                  ->comment('Nama Project Manager / Site Manager');
        });

        // ── 2. Rename columns on project_wbs ─────────────────────────────────
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->renameColumn('total_pagu', 'bq_external');
            $table->renameColumn('hpp_plan_total', 'rab_internal');
        });

        // ── 3. Drop stale columns ─────────────────────────────────────────────
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->dropColumn([
                'client_name',
                'project_manager',
                'progress_prev_pct',
                'progress_this_pct',
                'progress_total_pct',
                'contract_value',
                'addendum_value',
                'hpp_actual_total',
                'hpp_deviation',
                'deviasi_pct',
            ]);
        });

        // ── 4. Rename stale unique constraint ─────────────────────────────────
        // Drop the old constraint (was created on ['project_id', 'period'],
        // now references ['project_id', 'name_of_work_phase'] after column rename).
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->dropUnique('uq_project_period');
            $table->unique(['project_id', 'name_of_work_phase'], 'uq_project_wbs_phase');
        });
    }

    public function down(): void
    {
        // ── Reverse constraint rename ─────────────────────────────────────────
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->dropUnique('uq_project_wbs_phase');
            $table->unique(['project_id', 'name_of_work_phase'], 'uq_project_period');
        });

        // ── Re-add dropped columns ────────────────────────────────────────────
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->string('client_name', 150)->nullable()->after('name_of_work_phase');
            $table->string('project_manager', 100)->nullable()->after('client_name');
            $table->decimal('progress_prev_pct', 6, 2)->nullable();
            $table->decimal('progress_this_pct', 6, 2)->nullable();
            $table->decimal('progress_total_pct', 6, 2)->nullable();
            $table->decimal('contract_value', 20, 2)->nullable();
            $table->decimal('addendum_value', 20, 2)->nullable();
            $table->decimal('hpp_actual_total', 20, 2)->nullable();
            $table->decimal('hpp_deviation', 20, 2)->nullable();
            $table->decimal('deviasi_pct', 8, 4)->nullable();
        });

        // ── Reverse column renames ────────────────────────────────────────────
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->renameColumn('bq_external', 'total_pagu');
            $table->renameColumn('rab_internal', 'hpp_plan_total');
        });

        // ── Remove project_manager from projects ──────────────────────────────
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('project_manager');
        });
    }
};
