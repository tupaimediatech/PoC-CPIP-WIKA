<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->string('unit', 30)->nullable()
                ->after('resource_category')
                ->comment('Resource page unit, separate from work item satuan');

            $table->decimal('quantity', 20, 4)->nullable()
                ->after('unit')
                ->comment('Resource page quantity, separate from work item volume');

            $table->decimal('price', 20, 2)->nullable()
                ->after('quantity')
                ->comment('Resource page harga satuan, separate from harsat_internal');
        });
    }

    public function down(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->dropColumn(['unit', 'quantity', 'price']);
        });
    }
};
