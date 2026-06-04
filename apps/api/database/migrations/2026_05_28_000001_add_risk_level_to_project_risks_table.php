<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_risks', function (Blueprint $table) {
            $table->string('risk_level', 50)->nullable()
                  ->comment('Level risiko manual, e.g. rendah | sedang | tinggi | sangat tinggi');
        });
    }

    public function down(): void
    {
        Schema::table('project_risks', function (Blueprint $table) {
            $table->dropColumn('risk_level');
        });
    }
};
