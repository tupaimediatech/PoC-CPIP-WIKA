<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add volume, satuan, and harsat_internal columns to project_work_items table
 *
 * Changes for Level 4 (Harsat Per Sumber Daya):
 * - volume: decimal(15,2) - Volume quantity (e.g., 500, 20.000)
 * - satuan: string(30) - Unit of measurement (e.g., m³, kg, ton)
 * - harsat_internal: decimal(20,2) - Internal unit price (IDR)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->decimal('volume', 15, 2)->nullable()
                ->after('item_name')
                ->comment('Volume quantity (e.g., 500, 20.000)');

            $table->string('satuan', 30)->nullable()
                ->after('volume')
                ->comment('Unit of measurement (e.g., m³, kg, ton)');

            $table->decimal('harsat_internal', 20, 2)->nullable()
                ->after('satuan')
                ->comment('Internal unit price (IDR)');
        });
    }

    public function down(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->dropColumn(['volume', 'satuan', 'harsat_internal']);
        });
    }
};
