<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProjectApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateApiUser();
    }

    private function makeProject(array $overrides = []): Project
    {
        return Project::create(array_merge([
            'project_code' => 'TST-01',
            'project_name' => 'Test Project',
            'division' => 'Infrastructure',
            'owner' => 'Test Owner',
            'profit_center' => 'Test Profit Center',
            'contract_value' => 500,
            'planned_cost' => 400,
            'actual_cost' => 450,
            'planned_duration' => 12,
            'actual_duration' => 14,
            'progress_pct' => 100,
        ], $overrides));
    }

    #[Test]
    public function it_returns_empty_project_list(): void
    {
        $response = $this->getJson('/api/projects');

        $response->assertOk()
            ->assertJsonStructure(['data', 'meta'])
            ->assertJsonPath('meta.total', 0);
    }

    #[Test]
    public function it_returns_empty_building_cpi_list(): void
    {
        $this->getJson('/api/projects/building/cpi')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    #[Test]
    public function it_returns_all_projects(): void
    {
        $this->makeProject(['project_code' => 'TST-01']);
        $this->makeProject([
            'project_code' => 'TST-02',
            'project_name' => 'Another Project',
        ]);

        $response = $this->getJson('/api/projects');

        $response->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function it_filters_projects_by_division(): void
    {
        $this->makeProject(['project_code' => 'INF-01', 'division' => 'Infrastructure']);
        $this->makeProject([
            'project_code' => 'BLD-01',
            'division' => 'Building',
            'planned_cost' => 300,
            'actual_cost' => 280,
        ]);

        $response = $this->getJson('/api/projects?division=Infrastructure');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.division', 'Infrastructure');
    }

    #[Test]
    public function it_sorts_projects_by_cpi_ascending(): void
    {
        $this->makeProject([
            'project_code' => 'TST-01',
            'planned_cost' => 400,
            'actual_cost' => 450,
        ]);
        $this->makeProject([
            'project_code' => 'TST-02',
            'planned_cost' => 270,
            'actual_cost' => 255,
        ]);

        $response = $this->getJson('/api/projects?sort_by=cpi&sort_dir=asc');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertLessThan((float) $data[1]['cpi'], (float) $data[0]['cpi']);
    }

    #[Test]
    public function it_returns_building_projects_ordered_by_cpi_descending_with_selected_columns(): void
    {
        $this->makeProject([
            'project_code' => 'BLD-01',
            'project_name' => 'Building Alpha',
            'division' => 'Building',
            'profit_center' => 'Building PC A',
            'planned_cost' => 500,
            'actual_cost' => 400,
            'planned_duration' => 12,
            'actual_duration' => 12,
        ]);
        $this->makeProject([
            'project_code' => 'BLD-02',
            'project_name' => 'Building Beta',
            'division' => 'Building',
            'profit_center' => 'Building PC B',
            'planned_cost' => 500,
            'actual_cost' => 450,
            'planned_duration' => 12,
            'actual_duration' => 12,
        ]);
        $this->makeProject([
            'project_code' => 'INF-01',
            'project_name' => 'Infra One',
            'division' => 'Infrastructure',
            'profit_center' => 'Infra PC',
        ]);

        $response = $this->getJson('/api/projects/building/cpi');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissingPath('data.0.spi');

        $data = $response->json('data');

        $this->assertSame('Building', $data[0]['division']);
        $this->assertSame('Building', $data[1]['division']);
        $this->assertSame(['profit_center', 'project_name', 'cpi', 'division'], array_keys($data[0]));
        $this->assertSame('Building Alpha', $data[0]['project_name']);
        $this->assertGreaterThan((float) $data[1]['cpi'], (float) $data[0]['cpi']);
    }

    #[Test]
    public function it_returns_building_projects_ordered_by_spi_descending_with_selected_columns(): void
    {
        $this->makeProject([
            'project_code' => 'BLD-01',
            'project_name' => 'Building Alpha',
            'division' => 'Building',
            'profit_center' => 'Building PC A',
            'planned_duration' => 12,
            'actual_duration' => 10,
        ]);
        $this->makeProject([
            'project_code' => 'BLD-02',
            'project_name' => 'Building Beta',
            'division' => 'Building',
            'profit_center' => 'Building PC B',
            'planned_duration' => 12,
            'actual_duration' => 15,
        ]);
        $this->makeProject([
            'project_code' => 'INF-01',
            'project_name' => 'Infra One',
            'division' => 'Infrastructure',
            'profit_center' => 'Infra PC',
        ]);

        $response = $this->getJson('/api/projects/building/spi');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissingPath('data.0.cpi');

        $data = $response->json('data');

        $this->assertSame(['profit_center', 'project_name', 'spi', 'division'], array_keys($data[0]));
        $this->assertSame('Building Alpha', $data[0]['project_name']);
        $this->assertGreaterThan((float) $data[1]['spi'], (float) $data[0]['spi']);
    }

    #[Test]
    public function it_returns_infrastructure_projects_ordered_by_cpi_descending_with_selected_columns(): void
    {
        $this->makeProject([
            'project_code' => 'INF-01',
            'project_name' => 'Infra Alpha',
            'division' => 'Infrastructure',
            'profit_center' => 'Infra PC A',
            'planned_cost' => 600,
            'actual_cost' => 500,
        ]);
        $this->makeProject([
            'project_code' => 'INF-02',
            'project_name' => 'Infra Beta',
            'division' => 'Infrastructure',
            'profit_center' => 'Infra PC B',
            'planned_cost' => 600,
            'actual_cost' => 580,
        ]);
        $this->makeProject([
            'project_code' => 'BLD-01',
            'project_name' => 'Building One',
            'division' => 'Building',
            'profit_center' => 'Building PC',
        ]);

        $response = $this->getJson('/api/projects/infrastructure/cpi');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissingPath('data.0.spi');

        $data = $response->json('data');

        $this->assertSame(['profit_center', 'project_name', 'cpi', 'division'], array_keys($data[0]));
        $this->assertSame('Infrastructure', $data[0]['division']);
        $this->assertGreaterThan((float) $data[1]['cpi'], (float) $data[0]['cpi']);
    }

    #[Test]
    public function it_returns_infrastructure_projects_ordered_by_spi_descending_with_selected_columns(): void
    {
        $this->makeProject([
            'project_code' => 'INF-01',
            'project_name' => 'Infra Alpha',
            'division' => 'Infrastructure',
            'profit_center' => 'Infra PC A',
            'planned_duration' => 18,
            'actual_duration' => 12,
        ]);
        $this->makeProject([
            'project_code' => 'INF-02',
            'project_name' => 'Infra Beta',
            'division' => 'Infrastructure',
            'profit_center' => 'Infra PC B',
            'planned_duration' => 18,
            'actual_duration' => 20,
        ]);
        $this->makeProject([
            'project_code' => 'BLD-01',
            'project_name' => 'Building One',
            'division' => 'Building',
            'profit_center' => 'Building PC',
        ]);

        $response = $this->getJson('/api/projects/infrastructure/spi');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissingPath('data.0.cpi');

        $data = $response->json('data');

        $this->assertSame(['profit_center', 'project_name', 'spi', 'division'], array_keys($data[0]));
        $this->assertSame('Infrastructure', $data[0]['division']);
        $this->assertGreaterThan((float) $data[1]['spi'], (float) $data[0]['spi']);
    }

    #[Test]
    public function it_allows_null_kpi_values_and_sorts_them_last_in_division_kpi_lists(): void
    {
        $this->makeProject([
            'project_code' => 'BLD-01',
            'project_name' => 'Building With KPI',
            'division' => 'Building',
            'profit_center' => 'Building PC A',
            'planned_cost' => 500,
            'actual_cost' => 400,
            'planned_duration' => 12,
            'actual_duration' => 12,
        ]);
        $this->makeProject([
            'project_code' => 'BLD-02',
            'project_name' => 'Building Without KPI',
            'division' => 'Building',
            'profit_center' => 'Building PC B',
            'planned_cost' => null,
            'actual_cost' => null,
            'planned_duration' => null,
            'actual_duration' => null,
            'progress_pct' => null,
        ]);

        $cpiResponse = $this->getJson('/api/projects/building/cpi');
        $spiResponse = $this->getJson('/api/projects/building/spi');

        $cpiResponse->assertOk()->assertJsonCount(2, 'data');
        $spiResponse->assertOk()->assertJsonCount(2, 'data');

        $this->assertSame('Building With KPI', $cpiResponse->json('data.0.project_name'));
        $this->assertNull($cpiResponse->json('data.1.cpi'));
        $this->assertSame('Building With KPI', $spiResponse->json('data.0.project_name'));
        $this->assertNull($spiResponse->json('data.1.spi'));
    }

    #[Test]
    public function it_returns_correct_meta_overbudget_count(): void
    {
        $this->makeProject(['project_code' => 'TST-01', 'planned_cost' => 400, 'actual_cost' => 450]);
        $this->makeProject(['project_code' => 'TST-02', 'planned_cost' => 270, 'actual_cost' => 255]);

        $response = $this->getJson('/api/projects');

        $response->assertOk()
            ->assertJsonPath('meta.overbudget_count', 1);
    }

    #[Test]
    public function it_returns_summary_with_zero_when_no_projects(): void
    {
        $response = $this->getJson('/api/projects/summary');

        $response->assertOk()
            ->assertJsonPath('total_projects', 0);
    }

    #[Test]
    public function it_returns_correct_summary_data(): void
    {
        $this->makeProject([
            'project_code' => 'INF-01',
            'planned_cost' => 780,
            'actual_cost' => 910,
            'planned_duration' => 24,
            'actual_duration' => 28,
        ]);
        $this->makeProject([
            'project_code' => 'BLD-01',
            'division' => 'Building',
            'planned_cost' => 270,
            'actual_cost' => 255,
            'planned_duration' => 14,
            'actual_duration' => 14,
        ]);

        $response = $this->getJson('/api/projects/summary');

        $response->assertOk()
            ->assertJsonPath('total_projects', 2)
            ->assertJsonStructure([
                'total_projects',
                'avg_cpi',
                'avg_spi',
                'overbudget_count',
                'delay_count',
                'overbudget_pct',
                'delay_pct',
                'by_division',
                'status_breakdown',
            ]);
    }

    #[Test]
    public function it_groups_summary_by_division(): void
    {
        $this->makeProject(['project_code' => 'INF-01', 'division' => 'Infrastructure']);
        $this->makeProject([
            'project_code' => 'BLD-01',
            'division' => 'Building',
            'planned_cost' => 300,
            'actual_cost' => 280,
        ]);

        $response = $this->getJson('/api/projects/summary');

        $response->assertOk()
            ->assertJsonStructure(['by_division' => ['Infrastructure', 'Building']]);
    }

    #[Test]
    public function it_returns_project_detail(): void
    {
        $project = $this->makeProject();

        $response = $this->getJson("/api/projects/{$project->id}");

        $response->assertOk()
            ->assertJsonPath('data.project_code', 'TST-01')
            ->assertJsonPath('data.project_name', 'Test Project')
            ->assertJsonStructure(['data' => [
                'id',
                'project_code',
                'project_name',
                'division',
                'cpi',
                'spi',
                'status',
            ]]);
    }

    #[Test]
    public function it_returns_404_for_nonexistent_project(): void
    {
        $this->getJson('/api/projects/9999')->assertNotFound();
    }

    #[Test]
    public function it_creates_project_and_calculates_kpi(): void
    {
        $payload = [
            'project_code' => 'NEW-01',
            'project_name' => 'New Project',
            'division' => 'Building',
            'contract_value' => 300,
            'planned_cost' => 270,
            'actual_cost' => 255,
            'planned_duration' => 14,
            'actual_duration' => 14,
        ];

        $response = $this->postJson('/api/projects', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.project_code', 'NEW-01')
            ->assertJsonPath('data.status', 'good');

        $this->assertDatabaseHas('projects', ['project_code' => 'NEW-01']);
    }

    #[Test]
    public function it_validates_required_fields_on_create(): void
    {
        $response = $this->postJson('/api/projects', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors([
                'project_code',
                'project_name',
                'division',
                'contract_value',
                'planned_cost',
                'actual_cost',
                'planned_duration',
                'actual_duration',
            ]);
    }

    #[Test]
    public function it_validates_division_must_be_valid(): void
    {
        $response = $this->postJson('/api/projects', [
            'project_code' => 'TST-01',
            'project_name' => 'Test',
            'division' => 'InvalidDivision',
            'contract_value' => 100,
            'planned_cost' => 100,
            'actual_cost' => 100,
            'planned_duration' => 12,
            'actual_duration' => 12,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['division']);
    }

    #[Test]
    public function it_prevents_duplicate_project_code(): void
    {
        $this->makeProject(['project_code' => 'DUP-01']);

        $response = $this->postJson('/api/projects', [
            'project_code' => 'DUP-01',
            'project_name' => 'Duplicate',
            'division' => 'Building',
            'contract_value' => 100,
            'planned_cost' => 100,
            'actual_cost' => 100,
            'planned_duration' => 12,
            'actual_duration' => 12,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['project_code']);
    }

    #[Test]
    public function it_updates_project_and_recalculates_kpi(): void
    {
        $project = $this->makeProject([
            'planned_cost' => 400,
            'actual_cost' => 450,
        ]);

        $response = $this->putJson("/api/projects/{$project->id}", [
            'project_code' => 'TST-01',
            'project_name' => 'Test Project',
            'division' => 'Infrastructure',
            'contract_value' => 500,
            'planned_cost' => 400,
            'actual_cost' => 380,
            'planned_duration' => 12,
            'actual_duration' => 14,
        ]);

        $response->assertOk();
        $this->assertGreaterThan(1, (float) $response->json('data.cpi'));
    }

    #[Test]
    public function it_deletes_a_project(): void
    {
        $project = $this->makeProject();

        $this->deleteJson("/api/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Project berhasil dihapus.');

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    }

    #[Test]
    public function it_returns_404_when_deleting_nonexistent_project(): void
    {
        $this->deleteJson('/api/projects/9999')->assertNotFound();
    }

    #[Test]
    public function it_auto_calculates_cpi_on_create(): void
    {
        $project = $this->makeProject([
            'planned_cost' => 780,
            'actual_cost' => 910,
        ]);

        $this->assertEqualsWithDelta(0.8571, (float) $project->cpi, 0.0001);
    }

    #[Test]
    public function it_auto_sets_status_critical_when_cpi_below_0_9(): void
    {
        $project = $this->makeProject([
            'planned_cost' => 780,
            'actual_cost' => 910,
            'planned_duration' => 24,
            'actual_duration' => 28,
        ]);

        $this->assertEquals('critical', $project->status);
    }

    #[Test]
    public function it_auto_sets_status_good_for_gedung_bumn_data(): void
    {
        $project = $this->makeProject([
            'project_code' => 'BLD-02',
            'planned_cost' => 270,
            'actual_cost' => 255,
            'planned_duration' => 14,
            'actual_duration' => 14,
        ]);

        $this->assertEquals('good', $project->status);
    }
}
