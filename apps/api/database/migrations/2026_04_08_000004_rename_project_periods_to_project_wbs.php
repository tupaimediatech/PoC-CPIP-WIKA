<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rename project_periods table to project_wbs
 *
 * Changes:
 * 1. Rename table: project_periods → project_wbs
 * 2. Rename column: period → name_of_work_phase
 * 3. Increase column size: varchar(7) → varchar(255)
 * 4. Transform values: "YYYY-MM" → "PEKERJAAN XXX" format
 *
 * Example transformation:
 * - "2024-01" → "PEKERJAAN PERSIAPAN"
 * - "2024-02" → "PEKERJAAN PONDASI"
 * - "2024-03" → "PEKERJAAN STRUKTUR"
 */
return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Rename the table
        Schema::rename('project_periods', 'project_wbs');

        // Step 2: Rename the column and increase size
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->renameColumn('period', 'name_of_work_phase');
            $table->string('name_of_work_phase', 255)->nullable()->change();
        });

        // Step 3: Transform data values from "YYYY-MM" to "PEKERJAAN XXX" format
        // Uses SQLite-compatible syntax (|| for concat, SUBSTR instead of SUBSTRING)
        DB::statement("
            UPDATE project_wbs
            SET name_of_work_phase = 'PEKERJAAN ' ||
                CASE SUBSTR(name_of_work_phase, 6, 2)
                    WHEN '01' THEN 'PERSIAPAN'
                    WHEN '02' THEN 'PONDASI'
                    WHEN '03' THEN 'STRUKTUR'
                    WHEN '04' THEN 'ARSITEKTUR'
                    WHEN '05' THEN 'ME'
                    WHEN '06' THEN 'UTILITIES'
                    WHEN '07' THEN 'EXTERIOR'
                    WHEN '08' THEN 'PELENGKAPAN'
                    ELSE 'LANLAIN'
                END
            WHERE name_of_work_phase LIKE '____-__'
        ");
    }

    public function down(): void
    {
        // Reverse: Transform back from "PEKERJAAN XXX" to "YYYY-MM" format
        DB::statement("
            UPDATE project_wbs
            SET name_of_work_phase = SUBSTR(name_of_work_phase, 1, 4) || '-' ||
                CASE SUBSTR(name_of_work_phase, 10)
                    WHEN 'PERSIAPAN' THEN '01'
                    WHEN 'PONDASI' THEN '02'
                    WHEN 'STRUKTUR' THEN '03'
                    WHEN 'ARSITEKTUR' THEN '04'
                    WHEN 'ME' THEN '05'
                    WHEN 'UTILITIES' THEN '06'
                    WHEN 'EXTERIOR' THEN '07'
                    WHEN 'PELENGKAPAN' THEN '08'
                    ELSE '09'
                END
            WHERE name_of_work_phase LIKE 'PEKERJAAN %'
        ");

        // Reverse: Rename column back and reduce size
        Schema::table('project_wbs', function (Blueprint $table) {
            $table->string('period', 7)->nullable()->change();
            $table->renameColumn('name_of_work_phase', 'period');
        });

        // Reverse: Rename table back
        Schema::rename('project_wbs', 'project_periods');
    }
};
