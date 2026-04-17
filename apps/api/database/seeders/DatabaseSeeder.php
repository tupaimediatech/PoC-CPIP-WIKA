<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Note: WithoutModelEvents was removed so that Project's
     * `saving` boot hook fires and KPI (CPI/SPI/status) gets calculated.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('123'),
        ]);

        $this->call(ColumnAliasSeeder::class);
        $this->call(HarsatHistorySeeder::class);
        $this->call(DemoFlowSeeder::class);
    }
}
