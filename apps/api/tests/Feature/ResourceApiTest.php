<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ResourceApiTest extends TestCase
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
            'project_code' => 'RES-01',
            'project_name' => 'Resource Project',
            'division' => 'Infrastructure',
            'sbu' => 'SBU Resource',
            'owner' => 'Owner Resource',
            'location' => 'Jakarta',
            'contract_value' => 500,
            'planned_cost' => 400,
            'actual_cost' => 450,
            'planned_duration' => 12,
            'actual_duration' => 14,
            'progress_pct' => 100,
            'project_year' => 2026,
        ], $overrides));
    }

    private function makeWbs(Project $project, array $overrides = []): ProjectWbs
    {
        return ProjectWbs::create(array_merge([
            'project_id' => $project->id,
            'name_of_work_phase' => 'PEKERJAAN STRUKTUR',
        ], $overrides));
    }

    private function makeWorkItem(ProjectWbs $wbs, array $overrides = []): ProjectWorkItem
    {
        return ProjectWorkItem::create(array_merge([
            'period_id' => $wbs->id,
            'level' => 1,
            'item_name' => 'Besi Beton',
            'id_resource' => 'MAT-001',
            'resource_category' => 'Material',
            'sort_order' => 1,
            'is_total_row' => false,
        ], $overrides));
    }

    #[Test]
    public function it_returns_resources_from_project_work_items(): void
    {
        $project = $this->makeProject();
        $wbs = $this->makeWbs($project);
        $workItem = $this->makeWorkItem($wbs);

        $this->getJson('/api/resources')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $workItem->id)
            ->assertJsonPath('data.0.resource_id', 'MAT-001')
            ->assertJsonPath('data.0.resource_name', 'Besi Beton')
            ->assertJsonPath('data.0.resource_category', 'Material')
            ->assertJsonPath('data.0.project_name', 'Resource Project')
            ->assertJsonPath('data.0.location', 'Jakarta')
            ->assertJsonPath('data.0.year', 2026);
    }

    #[Test]
    public function it_returns_resource_categories_for_a_wbs_phase(): void
    {
        $project = $this->makeProject();
        $wbs = $this->makeWbs($project);

        $this->makeWorkItem($wbs, [
            'id_resource' => 'MAT-001',
            'resource_category' => 'Material',
        ]);

        $this->getJson("/api/wbs-phases/{$wbs->id}/resource-category")
            ->assertOk()
            ->assertJsonPath('data.tahap', 'PEKERJAAN STRUKTUR')
            ->assertJsonPath('data.items.0.id_resource', 'MAT-001')
            ->assertJsonPath('data.items.0.resource_category', 'Material');
    }

    #[Test]
    public function it_returns_resource_category_detail(): void
    {
        $project = $this->makeProject();
        $wbs = $this->makeWbs($project);
        $resourceCategory = $this->makeWorkItem($wbs, [
            'id_resource' => 'MAT-001',
            'resource_category' => 'Material',
        ]);

        $this->getJson("/api/resource-category/{$resourceCategory->id}")
            ->assertOk()
            ->assertJsonPath('data.id_resource', 'MAT-001')
            ->assertJsonPath('data.resource_category', 'Material');
    }

    #[Test]
    public function it_excludes_total_rows_and_rows_without_resource_id(): void
    {
        $project = $this->makeProject();
        $wbs = $this->makeWbs($project);

        $this->makeWorkItem($wbs, ['id_resource' => 'MAT-001']);
        $this->makeWorkItem($wbs, [
            'item_name' => 'Total Material',
            'id_resource' => 'TOTAL-001',
            'is_total_row' => true,
        ]);
        $this->makeWorkItem($wbs, [
            'item_name' => 'No Resource',
            'id_resource' => null,
        ]);

        $this->getJson('/api/resources')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resource_id', 'MAT-001');
    }

    #[Test]
    public function it_filters_resources(): void
    {
        $project = $this->makeProject([
            'project_code' => 'RES-01',
            'project_name' => 'Target Project',
            'location' => 'Bandung',
            'project_year' => 2025,
        ]);
        $otherProject = $this->makeProject([
            'project_code' => 'RES-02',
            'project_name' => 'Other Project',
            'location' => 'Jakarta',
            'project_year' => 2024,
        ]);

        $this->makeWorkItem($this->makeWbs($project), [
            'item_name' => 'Ready Mix K-350',
            'id_resource' => 'RMX-350',
            'resource_category' => 'Beton',
        ]);
        $this->makeWorkItem($this->makeWbs($otherProject), [
            'item_name' => 'Excavator',
            'id_resource' => 'ALT-001',
            'resource_category' => 'Alat',
        ]);

        $queries = [
            'resource_id=RMX',
            'resource_name=Ready',
            'resource_category=Beton',
            'project_name=Target%20Project',
            'location=Bandung',
            'year=2025',
        ];

        foreach ($queries as $query) {
            $this->getJson("/api/resources?{$query}")
                ->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.resource_id', 'RMX-350');
        }
    }

    #[Test]
    public function it_returns_distinct_filter_options(): void
    {
        $project = $this->makeProject([
            'project_name' => 'Target Project',
            'location' => 'Bandung',
            'project_year' => 2025,
        ]);
        $wbs = $this->makeWbs($project);

        $this->makeWorkItem($wbs, [
            'id_resource' => 'MAT-001',
            'resource_category' => 'Material',
        ]);
        $this->makeWorkItem($wbs, [
            'id_resource' => 'MAT-002',
            'resource_category' => 'Material',
        ]);

        $this->getJson('/api/resources/filter-options')
            ->assertOk()
            ->assertJsonPath('resource_category.0', 'Material')
            ->assertJsonPath('project_name.0', 'Target Project')
            ->assertJsonPath('location.0', 'Bandung')
            ->assertJsonPath('year.0', 2025);
    }
}
