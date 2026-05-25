<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * This migration is now a no-op because scope_of_work was moved into
 * the original create_projects_table migration for correct column ordering
 * on PostgreSQL (which ignores ->after()).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('projects', 'scope_of_work')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->string('scope_of_work')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('scope_of_work');
        });
    }
};
