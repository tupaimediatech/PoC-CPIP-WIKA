<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_hpp_items — breakdown HPP per resource (Level 6)
 *
 * Menyimpan perbandingan 3 tahap biaya untuk setiap resource
 * dalam satu work item:
 *   - HPP Tender  : harga satuan saat tender/BQ
 *   - HPP RKP     : harga satuan rencana internal (Rencana Kerja Proyek)
 *   - Realisasi   : harga satuan aktual
 *
 * Satu work item bisa terdiri dari beberapa resource (material, upah,
 * alat, subkon, overhead), masing-masing punya perbandingan 3 tahap.
 *
 * Relasi:
 *   project_work_items (1) ──── (many) project_hpp_items
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_hpp_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('work_item_id')
                  ->constrained('project_work_items')
                  ->cascadeOnDelete();

            // ── Klasifikasi resource ─────────────────────────────────────
            $table->string('resource_type', 30)
                  ->comment('material | upah | alat | subkon | overhead');
            $table->string('resource_name', 255)
                  ->comment('Nama resource, e.g. Beton K-350, Tukang Batu, Excavator PC200');

            // ── Volume & satuan ──────────────────────────────────────────
            $table->decimal('volume', 15, 2)->nullable()
                  ->comment('Jumlah/kuantitas resource');
            $table->string('satuan', 30)->nullable()
                  ->comment('Satuan: m3, kg, ton, jam, ls, dll');

            // ── 3 tahap harga satuan ─────────────────────────────────────
            $table->decimal('hpp_tender', 20, 2)->nullable()
                  ->comment('Harga satuan saat tender/BQ (IDR)');
            $table->decimal('hpp_rkp', 20, 2)->nullable()
                  ->comment('Harga satuan rencana internal/RKP (IDR)');
            $table->decimal('realisasi', 20, 2)->nullable()
                  ->comment('Harga satuan aktual/realisasi (IDR)');

            // ── 3 tahap total (stored) ───────────────────────────────────
            $table->decimal('total_tender', 20, 2)->nullable()
                  ->comment('volume × hpp_tender');
            $table->decimal('total_rkp', 20, 2)->nullable()
                  ->comment('volume × hpp_rkp');
            $table->decimal('total_realisasi', 20, 2)->nullable()
                  ->comment('volume × realisasi');

            // ── Deviasi ──────────────────────────────────────────────────
            $table->decimal('deviasi_rkp_realisasi', 20, 2)->nullable()
                  ->comment('total_rkp - total_realisasi (positif = under budget)');
            $table->decimal('deviasi_pct', 8, 4)->nullable()
                  ->comment('(deviasi_rkp_realisasi / total_rkp) * 100');

            $table->timestamps();

            $table->index('work_item_id');
            $table->index('resource_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_hpp_items');
    }
};
