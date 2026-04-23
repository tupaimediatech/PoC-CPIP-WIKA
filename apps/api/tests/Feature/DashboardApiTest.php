<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(array $overrides = []): Project
    {
        static $sequence = 1;

        return Project::create(array_merge([
            'project_code' => 'DSH-' . str_pad((string) $sequence++, 2, '0', STR_PAD_LEFT),
            'project_name' => 'Dashboard Project ' . $sequence,
            'division' => 'Infrastructure',
            'sbu' => 'SBU A',
            'owner' => 'Owner A',
            'location' => 'Jakarta',
            'partnership' => 'KSO',
            'contract_type' => 'Lumpsum',
            'contract_value' => 500,
            'planned_cost' => 400,
            'actual_cost' => 450,
            'planned_duration' => 12,
            'actual_duration' => 14,
            'progress_pct' => 100,
            'project_year' => 2025,
        ], $overrides));
    }

    #[Test]
    public function it_returns_dashboard_payload(): void
    {
        $this->makeProject([
            'project_code' => 'INF-01',
            'project_name' => 'Infra Alpha',
            'division' => 'Infrastructure',
        ]);
        $this->makeProject([
            'project_code' => 'BLD-01',
            'project_name' => 'Building Beta',
            'division' => 'Building',
            'planned_cost' => 300,
            'actual_cost' => 280,
            'planned_duration' => 12,
            'actual_duration' => 12,
        ]);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonStructure([
                'generated_at',
                'filters',
                'summary',
                'projects' => ['data', 'meta'],
                'filter_options',
                'sbu_distribution',
                'harsat_trend',
            ])
            ->assertJsonPath('summary.total_projects', 2)
            ->assertJsonPath('projects.meta.total', 2);
    }

    #[Test]
    public function it_applies_filters_to_summary_projects_and_sbu_distribution(): void
    {
        $this->makeProject([
            'project_code' => 'BLD-01',
            'project_name' => 'Building Match',
            'division' => 'Building',
            'sbu' => 'SBU Building',
            'project_year' => 2025,
            'planned_cost' => 300,
            'actual_cost' => 280,
            'planned_duration' => 12,
            'actual_duration' => 12,
        ]);
        $this->makeProject([
            'project_code' => 'INF-01',
            'project_name' => 'Infra Other',
            'division' => 'Infrastructure',
            'sbu' => 'SBU Infra',
            'project_year' => 2024,
        ]);

        $response = $this->getJson('/api/dashboard?division=Building&year=2025');

        $response->assertOk()
            ->assertJsonPath('summary.total_projects', 1)
            ->assertJsonPath('projects.meta.total', 1)
            ->assertJsonPath('projects.data.0.project_code', 'BLD-01')
            ->assertJsonPath('sbu_distribution.0.label', 'SBU Building')
            ->assertJsonCount(1, 'sbu_distribution')
            ->assertJsonPath('filters.division', 'Building')
            ->assertJsonPath('filters.year', 2025);
    }
}
