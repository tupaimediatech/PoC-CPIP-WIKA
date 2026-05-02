<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_indirect_cost_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ingestion_file_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sub_kategori', 100);
            $table->string('item_detail', 255)->nullable();
            $table->decimal('budget', 20, 2)->nullable();
            $table->decimal('realisasi', 20, 2)->nullable();
            $table->decimal('deviasi', 20, 2)->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'sub_kategori']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_indirect_cost_items');
    }
};
