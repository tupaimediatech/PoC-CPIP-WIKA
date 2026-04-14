<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add new filter fields to projects table
 *
 * Changes:
 * 1. Rename contract_type → type_of_contract (Jenis Kontrak)
 * 2. Add new contract_type column (Tipe Kontrak: Unit Price, Lumpsum, Gabungan)
 * 3. Add profit_center_code (Kode Profit Center/SPK Intern)
 * 4. Add consultant_name (Nama MK/Konsultan)
 * 5. Add partner_name (Nama Mitra - filled only if partnership is JO)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // 1. Rename contract_type → type_of_contract (Jenis Kontrak)
            $table->renameColumn('contract_type', 'type_of_contract');

            // 2. Add new contract_type column (Tipe Kontrak)
            $table->string('contract_type', 100)->nullable()
                ->after('type_of_contract')
                ->comment('Tipe Kontrak: Unit Price, Lumpsum, Gabungan (Lumpsum + Unit price)');

            // 3. Add profit_center_code (Kode Profit Center/SPK Intern)
            $table->string('profit_center_code', 50)->nullable()
                ->after('owner')
                ->comment('Kode Profit Center/SPK Intern');

            // 5. Add partner_name (Nama Mitra - filled only if partnership is JO)
            $table->string('partner_name', 255)->nullable()
                ->after('partnership')
                ->comment('Nama Mitra - diisi hanya jika partnership = JO');
                    
            // 4. Add consultant_name (Nama MK/Konsultan)
            $table->string('consultant_name', 255)->nullable()
                ->after('partner_name')
                ->comment('Nama Manajemen Konstruksi/Konsultan');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Reverse the changes
            $table->dropColumn('partner_name');
            $table->dropColumn('consultant_name');
            $table->dropColumn('profit_center_code');
            $table->dropColumn('contract_type');
            $table->renameColumn('type_of_contract', 'contract_type');
        });
    }
};
