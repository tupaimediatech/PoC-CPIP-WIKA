<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectWbs;
use App\Models\ProjectWorkItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProjectUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateApiUser();
    }

    private function makeExcelFile(array $headers, array $rows): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        foreach ($headers as $col => $header) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
            $sheet->setCellValue("{$colLetter}1", $header);
        }

        foreach ($rows as $rowIdx => $row) {
            foreach ($row as $col => $value) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
                $sheet->setCellValue("{$colLetter}" . ($rowIdx + 2), $value);
            }
        }

        $path = tempnam(sys_get_temp_dir(), 'cpip_test_') . '.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return $path;
    }

    private function makeUploadedFile(string $path): UploadedFile
    {
        return new UploadedFile(
            path: $path,
            originalName: 'test_projects.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            error: UPLOAD_ERR_OK,
            test: true,
        );
    }

    private function makeMultiSheetExcelFile(array $sheets): string
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);

        foreach ($sheets as $sheetName => $rows) {
            $sheet = $spreadsheet->createSheet();
            $sheet->setTitle(substr((string) $sheetName, 0, 31));

            foreach (array_values($rows) as $rowIndex => $row) {
                foreach (array_values($row) as $colIndex => $value) {
                    $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex + 1);
                    $sheet->setCellValue("{$colLetter}" . ($rowIndex + 1), $value);
                }
            }
        }

        $spreadsheet->setActiveSheetIndex(0);

        $path = tempnam(sys_get_temp_dir(), 'cpip_test_multi_') . '.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return $path;
    }

    #[Test]
    public function it_rejects_upload_without_file(): void
    {
        $this->postJson('/api/projects/upload', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file', 'files']);
    }

    #[Test]
    public function it_rejects_non_excel_file(): void
    {
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $this->postJson('/api/projects/upload', ['file' => $file])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function it_rejects_file_over_10mb(): void
    {
        $file = UploadedFile::fake()->create('large.xlsx', 11000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $this->postJson('/api/projects/upload', ['file' => $file])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function it_imports_projects_from_valid_excel(): void
    {
        $headers = [
            'project_code',
            'project_name',
            'division',
            'contract_value',
            'planned_cost',
            'actual_cost',
            'planned_duration',
            'actual_duration',
        ];
        $rows = [
            ['INF-01', 'Tol Semarang Seksi 3', 'Infrastructure', 850, 780, 910, 24, 28],
            ['BLD-02', 'Gedung Perkantoran BUMN', 'Building', 300, 270, 255, 14, 14],
        ];

        $path = $this->makeExcelFile($headers, $rows);
        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('imported', 2)
            ->assertJsonPath('skipped', 0);

        $this->assertDatabaseHas('projects', ['project_code' => 'INF-01']);
        $this->assertDatabaseHas('projects', ['project_code' => 'BLD-02']);

        @unlink($path);
    }

    #[Test]
    public function it_imports_project_level_unit_volume_and_harsat(): void
    {
        $headers = [
            'project_code',
            'project_name',
            'division',
            'unit',
            'volume pekerjaan',
            'harga satuan pekerjaan',
            'contract_value',
        ];
        $rows = [
            ['PRJ-HSP-01', 'Proyek Harga Satuan', 'Infrastructure', 'm2', 1250, 400000, 500000000],
        ];

        $path = $this->makeExcelFile($headers, $rows);
        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('skipped', 0);

        $this->assertDatabaseHas('projects', [
            'project_code' => 'PRJ-HSP-01',
            'unit' => 'm2',
            'volume' => 1250,
            'harsat' => 400000,
        ]);

        @unlink($path);
    }

    #[Test]
    public function it_derives_project_harsat_when_uploaded_file_has_contract_value_and_volume(): void
    {
        $headers = [
            'project_code',
            'project_name',
            'division',
            'unit',
            'volume pekerjaan',
            'contract_value',
        ];
        $rows = [
            ['PRJ-HSP-02', 'Proyek Derived Harsat', 'Infrastructure', 'm3', 200, 1000000],
        ];

        $path = $this->makeExcelFile($headers, $rows);
        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('skipped', 0);

        $this->assertDatabaseHas('projects', [
            'project_code' => 'PRJ-HSP-02',
            'unit' => 'm3',
            'volume' => 200,
            'harsat' => 5000,
        ]);

        @unlink($path);
    }

    #[Test]
    public function it_calculates_kpi_after_import(): void
    {
        $headers = [
            'project_code',
            'project_name',
            'division',
            'contract_value',
            'planned_cost',
            'actual_cost',
            'planned_duration',
            'actual_duration',
        ];
        $rows = [
            ['BLD-02', 'Gedung BUMN', 'Building', 300, 270, 255, 14, 14],
        ];

        $path = $this->makeExcelFile($headers, $rows);

        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])->assertOk();

        $project = Project::where('project_code', 'BLD-02')->first();

        $this->assertNotNull($project);
        $this->assertEqualsWithDelta(1.059, (float) $project->cpi, 0.001);
        $this->assertEquals(1.0, (float) $project->spi);
        $this->assertEquals('good', $project->status);

        @unlink($path);
    }

    #[Test]
    public function it_imports_project_level_unit_volume_and_harsat_from_flat_excel(): void
    {
        $headers = [
            'project_code',
            'project_name',
            'division',
            'unit',
            'volume',
            'harsat',
            'contract_value',
            'planned_cost',
            'actual_cost',
            'planned_duration',
            'actual_duration',
        ];
        $rows = [
            ['UNIT-01', 'Project Unit Rate', 'Infrastructure', 'm2', 1500, 750000, 300, 270, 255, 14, 14],
        ];

        $path = $this->makeExcelFile($headers, $rows);

        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])->assertOk();

        $this->assertDatabaseHas('projects', [
            'project_code' => 'UNIT-01',
            'unit' => 'm2',
            'volume' => 1500,
            'harsat' => 750000,
        ]);

        @unlink($path);
    }

    #[Test]
    public function it_imports_resource_display_fields_from_epc_wbs_data(): void
    {
        $path = $this->makeMultiSheetExcelFile([
            'Project Metadata' => [
                ['Kode Proyek', 'EPC-UNIT-01'],
                ['Nama Proyek', 'EPC Unit Rate Project'],
                ['Division', 'Infrastructure'],
                ['Unit', 'm3'],
                ['Volume', 2500],
                ['Harsat', 1250000],
                ['Nilai Kontrak', 5000000000],
                ['RAP', 4000000000],
                ['Planned Duration', 12],
                ['Actual Duration', 12],
            ],
            'WBS Data' => [
                [
                    'Nomor',
                    'Item Pekerjaan',
                    'Kategori Biaya',
                    'Sub Kategori',
                    'Satuan',
                    'Volume Budget',
                    'Volume Addendum',
                    'Harga Satuan',
                    'Volume Aktual',
                    'Harsat Aktual',
                    'Bobot Pekerjaan',
                    'Progress Plan',
                    'Actual Progress',
                ],
                ['I', 'Pekerjaan Tanah', 'Langsung', 'Material', '', '', '', '', '', '', '', '', ''],
                ['I.1', 'Galian Tanah', 'Langsung', 'Material', 'm3', 100, 0, 50000, 90, 52000, '10%', '100%', '90%'],
            ],
        ]);

        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])->assertOk();

        $this->assertDatabaseHas('projects', [
            'project_code' => 'EPC-UNIT-01',
            'unit' => 'm3',
            'volume' => 2500,
            'harsat' => 1250000,
        ]);

        $this->assertDatabaseHas('project_work_items', [
            'item_name' => 'Galian Tanah',
            'unit' => 'm3',
            'quantity' => 100,
            'price' => 50000,
        ]);

        @unlink($path);
    }

    #[Test]
    public function it_accepts_excel_headers_with_spaces_and_units(): void
    {
        $headers = [
            'project_code',
            'project_name',
            'Division',
            'Contract Value (M)',
            'Planned Duration (month)',
            'Actual Duration',
            'Planned Cost (M)',
            'Actual Cost (M)',
            'Progress %',
            'Owner',
        ];
        $rows = [
            ['INF-01', 'Tol Semarang', 'Infrastructure', 850, 24, 28, 780, 910, 100, 'BPJT'],
        ];

        $path = $this->makeExcelFile($headers, $rows);
        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('imported', 1)
            ->assertJsonPath('skipped', 0);

        $this->assertDatabaseHas('projects', ['project_code' => 'INF-01']);

        @unlink($path);
    }

    #[Test]
    public function it_upserts_existing_project_on_reimport(): void
    {
        $headers = [
            'project_code',
            'project_name',
            'division',
            'contract_value',
            'planned_cost',
            'actual_cost',
            'planned_duration',
            'actual_duration',
        ];

        $path = $this->makeExcelFile($headers, [
            ['INF-01', 'Tol Semarang', 'Infrastructure', 850, 780, 910, 24, 28],
        ]);
        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])->assertOk();
        @unlink($path);

        $path = $this->makeExcelFile($headers, [
            ['INF-01', 'Tol Semarang Updated', 'Infrastructure', 850, 780, 850, 24, 24],
        ]);
        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])->assertOk();
        @unlink($path);

        $this->assertDatabaseCount('projects', 1);
        $project = Project::where('project_code', 'INF-01')->first();
        $this->assertEquals('Tol Semarang Updated', $project->project_name);
        $this->assertEqualsWithDelta(0.9176, (float) $project->cpi, 0.0001);
    }

    #[Test]
    public function it_replaces_existing_project_row_and_children_when_project_code_matches(): void
    {
        $oldProject = Project::create([
            'project_code' => 'REP-01',
            'project_name' => 'Replacement Project',
            'division' => 'Building',
            'contract_value' => 100,
            'planned_cost' => 90,
            'actual_cost' => 95,
            'planned_duration' => 10,
            'actual_duration' => 11,
            'project_year' => 2024,
        ]);
        $oldWbs = ProjectWbs::create([
            'project_id' => $oldProject->id,
            'name_of_work_phase' => 'OLD WBS',
        ]);
        ProjectWorkItem::create([
            'period_id' => $oldWbs->id,
            'item_name' => 'Old Work Item',
            'id_resource' => 'OLD-01',
            'resource_category' => 'Material',
            'is_total_row' => false,
        ]);

        $path = $this->makeExcelFile(
            ['project_code', 'project_name', 'division', 'contract_value', 'planned_cost', 'actual_cost', 'planned_duration', 'actual_duration'],
            [['REP-01', 'Replacement Project Updated', 'Building', 200, 150, 125, 12, 10]],
        );

        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])->assertOk();
        @unlink($path);

        $this->assertDatabaseMissing('projects', ['id' => $oldProject->id]);
        $this->assertDatabaseMissing('project_wbs', ['id' => $oldWbs->id]);
        $this->assertDatabaseMissing('project_work_items', ['item_name' => 'Old Work Item']);
        $this->assertDatabaseHas('projects', [
            'project_code' => 'REP-01',
            'project_name' => 'Replacement Project Updated',
            'contract_value' => 200,
        ]);

        $newProject = Project::where('project_code', 'REP-01')->first();
        $this->assertNotNull($newProject);
        $this->assertNotSame($oldProject->id, $newProject->id);
    }

    #[Test]
    public function it_replaces_existing_project_by_name_when_project_code_is_new(): void
    {
        $oldProject = Project::create([
            'project_code' => 'OLD-CODE',
            'project_name' => 'Same Name Project',
            'division' => 'Infrastructure',
            'contract_value' => 100,
            'planned_cost' => 90,
            'actual_cost' => 95,
            'planned_duration' => 10,
            'actual_duration' => 11,
            'project_year' => 2024,
        ]);

        $path = $this->makeExcelFile(
            ['project_code', 'project_name', 'division', 'contract_value', 'planned_cost', 'actual_cost', 'planned_duration', 'actual_duration'],
            [['NEW-CODE', '  same   name project  ', 'Infrastructure', 300, 250, 200, 12, 12]],
        );

        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])->assertOk();
        @unlink($path);

        $this->assertDatabaseMissing('projects', ['id' => $oldProject->id]);
        $this->assertDatabaseMissing('projects', ['project_code' => 'OLD-CODE']);
        $this->assertDatabaseHas('projects', [
            'project_code' => 'NEW-CODE',
            'project_name' => 'same   name project',
        ]);
    }

    #[Test]
    public function it_fails_safely_when_project_name_matches_multiple_existing_projects(): void
    {
        foreach (['DUP-A', 'DUP-B'] as $code) {
            Project::create([
                'project_code' => $code,
                'project_name' => 'Duplicate Name',
                'division' => 'Building',
                'contract_value' => 100,
                'planned_cost' => 90,
                'actual_cost' => 95,
                'planned_duration' => 10,
                'actual_duration' => 11,
                'project_year' => 2024,
            ]);
        }

        $path = $this->makeExcelFile(
            ['project_code', 'project_name', 'division', 'contract_value', 'planned_cost', 'actual_cost', 'planned_duration', 'actual_duration'],
            [['DUP-C', 'Duplicate Name', 'Building', 300, 250, 200, 12, 12]],
        );

        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonFragment(['message' => 'Semua file gagal diimport.']);
        @unlink($path);

        $this->assertDatabaseHas('projects', ['project_code' => 'DUP-A']);
        $this->assertDatabaseHas('projects', ['project_code' => 'DUP-B']);
        $this->assertDatabaseMissing('projects', ['project_code' => 'DUP-C']);
    }

    #[Test]
    public function it_rolls_back_replacement_when_new_import_fails(): void
    {
        $oldProject = Project::create([
            'project_code' => 'ROLL-01',
            'project_name' => 'Rollback Project',
            'division' => 'Building',
            'contract_value' => 100,
            'planned_cost' => 90,
            'actual_cost' => 95,
            'planned_duration' => 10,
            'actual_duration' => 11,
            'project_year' => 2024,
        ]);

        try {
            DB::transaction(function (): void {
                app(\App\Services\ProjectReplacementService::class)->replaceExistingProject(
                    'ROLL-01',
                    'Rollback Project Updated',
                    999,
                );

                throw new \RuntimeException('Simulated import failure.');
            });
        } catch (\RuntimeException) {
        }

        $this->assertDatabaseHas('projects', [
            'id' => $oldProject->id,
            'project_code' => 'ROLL-01',
            'project_name' => 'Rollback Project',
        ]);
    }

    #[Test]
    public function it_commits_replacement_when_new_import_is_partial(): void
    {
        $oldProject = Project::create([
            'project_code' => 'PART-01',
            'project_name' => 'Partial Project',
            'division' => 'Building',
            'contract_value' => 100,
            'planned_cost' => 90,
            'actual_cost' => 95,
            'planned_duration' => 10,
            'actual_duration' => 11,
            'project_year' => 2024,
        ]);

        $path = $this->makeExcelFile(
            ['project_code', 'project_name', 'division', 'contract_value', 'planned_cost', 'actual_cost', 'planned_duration', 'actual_duration'],
            [
                ['PART-01', 'Partial Project Updated', 'Building', 300, 250, 200, 12, 12],
                ['BAD-PART', '', 'Building', 300, 250, 200, 12, 12],
            ],
        );

        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('results.0.status', 'partial');
        @unlink($path);

        $this->assertDatabaseMissing('projects', ['id' => $oldProject->id]);
        $this->assertDatabaseHas('projects', [
            'project_code' => 'PART-01',
            'project_name' => 'Partial Project Updated',
        ]);
        $this->assertDatabaseMissing('projects', ['project_code' => 'BAD-PART']);
    }

    #[Test]
    public function it_returns_error_when_required_columns_missing(): void
    {
        $headers = ['project_code', 'project_name', 'division'];
        $rows = [['INF-01', 'Tol Semarang', 'Infrastructure']];

        $path = $this->makeExcelFile($headers, $rows);
        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonFragment(['success' => false]);

        @unlink($path);
    }

    #[Test]
    public function it_skips_rows_with_invalid_division_and_reports_error(): void
    {
        $headers = [
            'project_code',
            'project_name',
            'division',
            'contract_value',
            'planned_cost',
            'actual_cost',
            'planned_duration',
            'actual_duration',
        ];
        $rows = [
            ['GOOD-01', 'Valid Project', 'Infrastructure', 500, 400, 450, 12, 14],
            ['BAD-01', 'Invalid Project', 'InvalidDiv', 500, 400, 450, 12, 14],
        ];

        $path = $this->makeExcelFile($headers, $rows);
        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('imported', 1)
            ->assertJsonPath('skipped', 1);

        $errors = $response->json('errors');
        $this->assertNotEmpty($errors);
        $this->assertStringContainsString('Baris 3', $errors[0]);

        $this->assertDatabaseHas('projects', ['project_code' => 'GOOD-01']);
        $this->assertDatabaseMissing('projects', ['project_code' => 'BAD-01']);

        @unlink($path);
    }

    #[Test]
    public function it_handles_empty_excel_file(): void
    {
        $path = $this->makeExcelFile([], []);

        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])->assertUnprocessable();

        @unlink($path);
    }

    #[Test]
    public function it_imports_project_from_metadata_spread_across_multiple_sheets(): void
    {
        $path = $this->makeMultiSheetExcelFile([
            'Summary' => [
                ['Kode Project', 'ADP-01'],
                ['Nama Proyek', 'Gedung Adaptive'],
                ['Divisi', 'Building'],
            ],
            'Cost' => [
                ['Nilai Kontrak', '1200'],
                ['Rencana Biaya', '1000'],
                ['Aktual Biaya', '950'],
            ],
            'Schedule' => [
                ['Rencana Durasi', '12'],
                ['Durasi Aktual', '10'],
                ['Project Manager', 'Budi'],
                ['Bulan', '2026-03'],
            ],
        ]);

        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('scanner', 'adaptive')
            ->assertJsonPath('imported', 1)
            ->assertJsonPath('skipped', 0)
            ->assertJsonPath('field_trace.project_code.sheet', 'Summary')
            ->assertJsonPath('field_trace.project_code.value', 'ADP-01')
            ->assertJsonPath('field_trace.project_manager.sheet', 'Schedule')
            ->assertJsonPath('field_candidates.project_code.0.strategy', 'paired_cells')
            ->assertJsonPath('project_row_trace.0.project_code', 'ADP-01');

        $this->assertDatabaseHas('projects', [
            'project_code' => 'ADP-01',
            'project_name' => 'Gedung Adaptive',
        ]);

        $project = Project::where('project_code', 'ADP-01')->first();

        $this->assertNotNull($project);
        $this->assertDatabaseHas('project_periods', [
            'project_id' => $project->id,
            'period' => '2026-03',
            'project_manager' => 'Budi',
        ]);

        @unlink($path);
    }

    #[Test]
    public function it_imports_project_table_found_on_non_active_sheet(): void
    {
        $path = $this->makeMultiSheetExcelFile([
            'Info' => [
                ['Catatan', 'Data proyek ada di sheet berikutnya'],
            ],
            'Data Proyek' => [
                [
                    'project_code',
                    'project_name',
                    'division',
                    'contract_value',
                    'planned_cost',
                    'actual_cost',
                    'planned_duration',
                    'actual_duration',
                ],
                ['INF-77', 'Jalan Tol Adaptive', 'Infrastructure', 900, 800, 780, 18, 16],
            ],
        ]);

        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('scanner', 'adaptive')
            ->assertJsonPath('imported', 1)
            ->assertJsonPath('skipped', 0)
            ->assertJsonPath('project_row_trace.0.sheet', 'Data Proyek')
            ->assertJsonPath('project_row_trace.0.row', 2);

        $this->assertDatabaseHas('projects', [
            'project_code' => 'INF-77',
            'project_name' => 'Jalan Tol Adaptive',
        ]);

        @unlink($path);
    }

    #[Test]
    public function it_reports_field_conflicts_when_metadata_values_disagree_between_sheets(): void
    {
        $path = $this->makeMultiSheetExcelFile([
            'Summary' => [
                ['Kode Project', 'CNF-01'],
                ['Nama Proyek', 'Proyek Konflik'],
                ['Divisi', 'Building'],
                ['Nilai Kontrak', '1000'],
                ['Rencana Biaya', '900'],
                ['Aktual Biaya', '850'],
                ['Rencana Durasi', '12'],
                ['Durasi Aktual', '10'],
            ],
            'Backup' => [
                ['Nilai Kontrak', '1100'],
                ['Rencana Biaya', '910'],
                ['Aktual Biaya', '845'],
            ],
        ]);

        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('scanner', 'adaptive')
            ->assertJsonPath('field_trace.contract_value.value', 1000)
            ->assertJsonPath('field_trace.contract_value.sheet', 'Summary')
            ->assertJsonPath('field_conflicts.contract_value.selected.value', 1000)
            ->assertJsonPath('field_conflicts.contract_value.alternatives.0.value', 1100);

        $warnings = $response->json('warnings');
        $this->assertNotEmpty($warnings);
        $this->assertStringContainsString('contract_value', $warnings[0]);

        $this->assertDatabaseHas('projects', [
            'project_code' => 'CNF-01',
            'contract_value' => 1000,
        ]);

        @unlink($path);
    }

    #[Test]
    public function it_prefers_better_formatted_project_code_candidates(): void
    {
        $path = $this->makeMultiSheetExcelFile([
            'Notes' => [
                ['Kode Project', 'Proyek Jalan Tol'],
                ['Nama Proyek', 'Tol Cerdas'],
                ['Divisi', 'Infrastructure'],
                ['Nilai Kontrak', '1500'],
                ['Rencana Biaya', '1200'],
                ['Aktual Biaya', '1100'],
                ['Rencana Durasi', '18'],
                ['Durasi Aktual', '16'],
            ],
            'Data' => [
                ['Kode Project', 'INF-88'],
            ],
        ]);

        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('scanner', 'adaptive')
            ->assertJsonPath('field_trace.project_code.value', 'INF-88')
            ->assertJsonPath('field_trace.project_code.sheet', 'Data')
            ->assertJsonPath('field_trace.project_code.quality_bonus', 20)
            ->assertJsonPath('field_conflicts.project_code.alternatives.0.value', 'Proyek Jalan Tol');

        $this->assertDatabaseHas('projects', [
            'project_code' => 'INF-88',
            'project_name' => 'Tol Cerdas',
        ]);

        @unlink($path);
    }

    #[Test]
    public function it_imports_complex_multisheet_workbook_with_derived_project_defaults(): void
    {
        $path = $this->makeMultiSheetExcelFile([
            'COVER & SUMMARY' => [
                ['', 'Nama Proyek:', 'PEMBANGUNAN RSUD TIPE C SURAKARTA', '', '', 'Nilai Kontrak:', 'Rp 45.000.000.000,-'],
                ['', 'Nama Kontrak:', 'WIKA-2024-05-RS', '', '', 'Addendum:', '(Rp 1.500.000.000)'],
                ['', 'Manager Proyek:', 'Farah A', '', '', 'Total Pagu:', 'Rp 43.500.000.000'],
            ],
            'REKAP_HPP_STRUKTUR' => [
                ['', 'A (No)', 'B (Item Pekerjaan)', 'C (Plan HPP)', 'D (Actual ITD)', 'E (Deviasi)'],
                ['', 'I.', 'PEKERJAAN PERSIAPAN', '1.200.000.000', '1.100.000.000', '100.000.000'],
                ['', '1.1', 'Mobilisasi Alat', '500.000.000', '450.000.000', '50.000.000'],
                ['', 'II.', 'PEKERJAAN STRUKTUR', '8.500.000.000', '9.200.000.000', '(700.000.000)'],
                ['', '', 'TOTAL COST ITD', '9.700.000.000', '10.300.000.000', '(600.000.000)'],
            ],
            'PENGGUNAAN_ALAT_BERAT' => [
                ['', 'Vendor', 'Alat', 'Jam Kerja', 'Rate/Jam', 'Total Biaya', 'Status'],
                ['', 'PT Alat Jaya', 'Excavator PC200', '450', '450.000', '202.500.000', 'Paid'],
                ['', '', 'Mobile Crane', '120', '1.200.000', '144.000.000', 'Pending'],
            ],
            'CURVA_S_PROGRESS' => [
                ['', '', 'Minggu Ke-', 'Rencana (%)', 'Realisasi (%)', 'Deviasi (%)', 'Keterangan'],
                ['', '', '12', '42,50%', '38,15%', '(4,35%)', 'Critical'],
                ['', '', '13', '45,10%', '40,20%', '(4,90%)', 'Material Delay'],
            ],
        ]);

        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('scanner', 'adaptive')
            ->assertJsonPath('field_trace.project_code.value', 'WIKA-2024-05-RS')
            ->assertJsonPath('field_trace.project_manager.value', 'Farah A')
            ->assertJsonPath('field_trace.contract_value.value', 45000000000)
            ->assertJsonPath('field_trace.addendum_value.value', -1500000000)
            ->assertJsonPath('field_trace.bq_external.value', 43500000000);

        $this->assertDatabaseHas('projects', [
            'project_code' => 'WIKA-2024-05-RS',
            'project_name' => 'PEMBANGUNAN RSUD TIPE C SURAKARTA',
            'division' => 'Building',
        ]);

        $project = Project::where('project_code', 'WIKA-2024-05-RS')->first();

        $this->assertNotNull($project);
        $this->assertEqualsWithDelta(9700000000, (float) $project->planned_cost, 0.01);
        $this->assertEqualsWithDelta(10300000000, (float) $project->actual_cost, 0.01);
        $this->assertEquals(4, (int) $project->planned_duration);
        $this->assertEquals(4, (int) $project->actual_duration);

        $warnings = $response->json('warnings');
        $this->assertContains('planned_cost diturunkan dari total HPP/work items.', $warnings);
        $this->assertContains('division diinferensikan sebagai Building.', $warnings);

        $this->assertDatabaseHas('project_periods', [
            'project_id' => $project->id,
            'project_manager' => 'Farah A',
        ]);

        @unlink($path);
    }

    #[Test]
    public function it_imports_single_sheet_metadata_when_values_are_combined_in_one_cell(): void
    {
        $path = $this->makeMultiSheetExcelFile([
            'laporan_bulanan site' => [
                ['PT Halo Bandung tbk.'],
                ['Proyek: Pembangunan RSUD Tipe B Surakarta', '', '', '', 'Periode: Maret 2026'],
                ['Kode Proyek: WIKA-2024-05-RS | Manager bpk heru s.'],
                ['Progres fisik s/d bulan lalu: 45.2% | bulan ini: 5.8% | total: 51.0%'],
                [''],
                ['Rekapituasi biaya HPP'],
                ['Nomor', 'Kateogri', 'Budget Awal', 'Addendum', 'Total Budget', 'Realisasi', 'deviasi', '%'],
                ['1', 'Pekerjaan Struktur', '', '', '', '', '', ''],
                ['', 'Pengadaan Besi Beton', '12.000.000.000', '-', '12.000.000.000', '11.500.000.000', '500.000.000', '4.10%'],
                ['', 'Beton ready mix k-350', '8.500.000.000', '1.000.000.000', '9.500.000.000', '9.800.000.000', '(300.000.000)', '-3.10%'],
                ['', 'Total Struktur', '', '', '21.500.000.000', '21.300.000.000', '200.000.000', ''],
                [''],
                ['', '', 'no', 'deskripsi vendor', 'material', 'qty', 'unit', 'harga satuan', 'total tagihan'],
                ['', '', '1', 'pt sinar beton surya', 'beton k-350', '1.2', 'm3', '850', '1.020.000.000'],
                ['', '', '2', 'cv baja mandiri', 'besi ulir d16', '5.5', 'kg', '12.5', '68.750.000'],
            ],
        ]);

        $response = $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('scanner', 'adaptive')
            ->assertJsonPath('field_trace.project_code.value', 'WIKA-2024-05-RS')
            ->assertJsonPath('field_trace.project_name.value', 'Pembangunan RSUD Tipe B Surakarta')
            ->assertJsonPath('field_trace.project_manager.value', 'bpk heru s.')
            ->assertJsonPath('field_trace.progress_total_pct.value', 51);

        $this->assertDatabaseHas('projects', [
            'project_code' => 'WIKA-2024-05-RS',
            'project_name' => 'Pembangunan RSUD Tipe B Surakarta',
            'division' => 'Building',
        ]);

        $project = Project::where('project_code', 'WIKA-2024-05-RS')->first();

        $this->assertNotNull($project);
        $this->assertEqualsWithDelta(21500000000, (float) $project->contract_value, 0.01);
        $this->assertEqualsWithDelta(21500000000, (float) $project->planned_cost, 0.01);
        $this->assertEqualsWithDelta(21300000000, (float) $project->actual_cost, 0.01);
        $this->assertEquals(1, (int) $project->planned_duration);
        $this->assertEquals(1, (int) $project->actual_duration);
        $this->assertEqualsWithDelta(51.0, (float) $project->progress_pct, 0.01);

        $warnings = $response->json('warnings');
        $this->assertContains('contract_value diturunkan dari planned_cost karena nilai kontrak tidak tersedia.', $warnings);
        $this->assertContains('planned_duration diisi fallback 1 bulan karena workbook tidak memuat data durasi/S-curve.', $warnings);
        $this->assertContains('actual_duration diisi fallback 1 bulan karena workbook tidak memuat data durasi/S-curve.', $warnings);

        $this->assertDatabaseHas('project_periods', [
            'project_id' => $project->id,
            'project_manager' => 'bpk heru s.',
        ]);

        $period = $project->periods()->first();
        $this->assertNotNull($period);

        $this->assertDatabaseHas('project_material_logs', [
            'period_id' => $period->id,
            'material_type' => 'beton k-350',
        ]);

        @unlink($path);
    }

    #[Test]
    public function uploaded_files_and_projects_are_visible_to_other_users(): void
    {
        $headers = [
            'project_code',
            'project_name',
            'division',
            'contract_value',
            'planned_cost',
            'actual_cost',
            'planned_duration',
            'actual_duration',
        ];
        $path = $this->makeExcelFile($headers, [
            ['SHARE-01', 'Shared Project', 'Building', 500, 450, 460, 12, 12],
        ]);

        $this->postJson('/api/projects/upload', [
            'files' => [$this->makeUploadedFile($path)],
        ])->assertOk();

        @unlink($path);

        // Swap to a different authenticated user
        $otherUser = User::factory()->create();
        Sanctum::actingAs($otherUser);

        $this->getJson('/api/projects')
            ->assertOk()
            ->assertJsonFragment(['project_code' => 'SHARE-01']);

        $this->getJson('/api/ingestion-files')
            ->assertOk()
            ->assertJsonFragment(['original_name' => 'test_projects.xlsx']);
    }
}
