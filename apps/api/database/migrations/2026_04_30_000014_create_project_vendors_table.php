<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_vendors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ingestion_file_id')->nullable()->constrained()->nullOnDelete();
            $table->string('vendor_name', 255);
            $table->string('npwp', 32)->nullable();
            $table->string('lokasi', 100)->nullable();
            $table->string('po_number', 64);
            $table->date('po_date')->nullable();
            $table->decimal('contract_value', 20, 2)->nullable();
            $table->decimal('uang_muka', 20, 2)->nullable();
            $table->decimal('termin_paid', 20, 2)->nullable();
            $table->decimal('retensi', 20, 2)->nullable();
            $table->string('ppn_status', 32)->nullable();
            $table->string('currency', 32)->nullable()->default('IDR');
            $table->timestamps();

            $table->unique(['project_id', 'po_number']);
            $table->index('vendor_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_vendors');
    }
};
