<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->decimal('volume_addendum', 15, 4)->nullable()->after('volume')
                  ->comment('Additional volume from approved change orders');
        });
    }

    public function down(): void
    {
        Schema::table('project_work_items', function (Blueprint $table) {
            $table->dropColumn('volume_addendum');
        });
    }
};
