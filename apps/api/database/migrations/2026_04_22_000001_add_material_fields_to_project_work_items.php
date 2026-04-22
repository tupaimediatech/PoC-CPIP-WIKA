<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->string('id_material', 100)->nullable()
                ->after('item_name')
                ->comment('Material identifier/code from source file or external system');

            $table->string('material_category', 100)->nullable()
                ->after('id_material')
                ->comment('Material category/group for the work item');
        });
    }

    public function down(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->dropColumn(['id_material', 'material_category']);
        });
    }
};
