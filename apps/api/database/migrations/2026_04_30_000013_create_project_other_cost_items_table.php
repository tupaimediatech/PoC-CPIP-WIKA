<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_other_cost_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ingestion_file_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kategori', 100)->comment('Biaya Pemeliharaan, Risiko, etc.');
            $table->string('item', 255)->nullable();
            $table->decimal('nilai', 20, 2)->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'kategori']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_other_cost_items');
    }
};
