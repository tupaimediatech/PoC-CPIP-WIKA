<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            if (Schema::hasColumn('project_work_items', 'id_material') && !Schema::hasColumn('project_work_items', 'id_resource')) {
                $table->renameColumn('id_material', 'id_resource');
            }

            if (Schema::hasColumn('project_work_items', 'material_category') && !Schema::hasColumn('project_work_items', 'resource_category')) {
                $table->renameColumn('material_category', 'resource_category');
            }
        });
    }

    public function down(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            if (Schema::hasColumn('project_work_items', 'id_resource') && !Schema::hasColumn('project_work_items', 'id_material')) {
                $table->renameColumn('id_resource', 'id_material');
            }

            if (Schema::hasColumn('project_work_items', 'resource_category') && !Schema::hasColumn('project_work_items', 'material_category')) {
                $table->renameColumn('resource_category', 'material_category');
            }
        });
    }
};
