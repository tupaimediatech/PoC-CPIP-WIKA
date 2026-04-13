<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rename period_id → wbs_id in all child tables of project_wbs.
 *
 * Background: project_periods was renamed to project_wbs in a previous migration,
 * but the FK column in child tables was never updated from "period_id" to "wbs_id".
 * This migration aligns the column name with the actual referenced table.
 *
 * Affected tables:
 *   - project_work_items      (period_id → wbs_id)
 *   - project_material_logs   (period_id → wbs_id)
 *   - project_equipment_logs  (period_id → wbs_id)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── project_work_items ────────────────────────────────────────────────
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->dropForeign(['period_id']);
        });
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->renameColumn('period_id', 'wbs_id');
        });
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->foreign('wbs_id')
                  ->references('id')->on('project_wbs')
                  ->cascadeOnDelete();
        });

        // ── project_material_logs ─────────────────────────────────────────────
        Schema::table('project_material_logs', function (Blueprint $table) {
            $table->dropForeign(['period_id']);
        });
        Schema::table('project_material_logs', function (Blueprint $table) {
            $table->renameColumn('period_id', 'wbs_id');
        });
        Schema::table('project_material_logs', function (Blueprint $table) {
            $table->foreign('wbs_id')
                  ->references('id')->on('project_wbs')
                  ->cascadeOnDelete();
        });

        // ── project_equipment_logs ────────────────────────────────────────────
        Schema::table('project_equipment_logs', function (Blueprint $table) {
            $table->dropForeign(['period_id']);
        });
        Schema::table('project_equipment_logs', function (Blueprint $table) {
            $table->renameColumn('period_id', 'wbs_id');
        });
        Schema::table('project_equipment_logs', function (Blueprint $table) {
            $table->foreign('wbs_id')
                  ->references('id')->on('project_wbs')
                  ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // ── project_equipment_logs ────────────────────────────────────────────
        Schema::table('project_equipment_logs', function (Blueprint $table) {
            $table->dropForeign(['wbs_id']);
        });
        Schema::table('project_equipment_logs', function (Blueprint $table) {
            $table->renameColumn('wbs_id', 'period_id');
        });
        Schema::table('project_equipment_logs', function (Blueprint $table) {
            $table->foreign('period_id')
                  ->references('id')->on('project_wbs')
                  ->cascadeOnDelete();
        });

        // ── project_material_logs ─────────────────────────────────────────────
        Schema::table('project_material_logs', function (Blueprint $table) {
            $table->dropForeign(['wbs_id']);
        });
        Schema::table('project_material_logs', function (Blueprint $table) {
            $table->renameColumn('wbs_id', 'period_id');
        });
        Schema::table('project_material_logs', function (Blueprint $table) {
            $table->foreign('period_id')
                  ->references('id')->on('project_wbs')
                  ->cascadeOnDelete();
        });

        // ── project_work_items ────────────────────────────────────────────────
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->dropForeign(['wbs_id']);
        });
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->renameColumn('wbs_id', 'period_id');
        });
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->foreign('period_id')
                  ->references('id')->on('project_wbs')
                  ->cascadeOnDelete();
        });
    }
};
