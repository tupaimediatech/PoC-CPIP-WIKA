<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('project_code', 20)->unique();
            $table->string('project_name');
            $table->string('scope_of_work')->nullable();
            $table->string('division', 100);         // Infrastructure | Building
            $table->string('owner', 100)->nullable();
            $table->decimal('contract_value', 15, 2); // dalam Juta (M)
            $table->decimal('planned_cost', 15, 2);
            $table->decimal('actual_cost', 15, 2);
            $table->integer('planned_duration');      // dalam bulan
            $table->integer('actual_duration');
            $table->decimal('progress_pct', 5, 2)->default(100);

            // Calculated — dihitung otomatis setiap insert/update
            $table->decimal('cpi', 10, 4)->nullable(); // EV / AC = planned_cost / actual_cost
            $table->decimal('spi', 10, 4)->nullable(); // planned_duration / actual_duration
            $table->string('status', 20)->nullable();  // good | warning | critical

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};