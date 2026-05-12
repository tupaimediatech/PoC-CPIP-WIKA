<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('unit', 30)->nullable()
                ->after('location')
                ->comment('Project-level unit');

            $table->decimal('volume', 20, 4)->nullable()
                ->after('unit')
                ->comment('Project-level volume');

            $table->decimal('harsat', 20, 2)->nullable()
                ->after('volume')
                ->comment('Project-level harga satuan');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['unit', 'volume', 'harsat']);
        });
    }
};
