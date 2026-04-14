<?php

namespace App\Services;

use App\Enums\Division;
use App\Exceptions\ImportValidationException;
use App\Models\ColumnAlias;
use App\Models\Project;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProjectImport
{
    // Only these two are strictly required to identify a project.
    // Financial/operational fields are optional — KPI will be null when unavailable.
    private const REQUIRED_COLUMNS = [
        'project_code',
        'project_name',
    ];

    private WorkbookFieldMapper $mapper;

    private array $errors       = [];
    private array $unrecognized = [];
    private int   $imported     = 0;
    private int   $skipped      = 0;
    private int   $total        = 0;

    public function __construct()
    {
        $this->mapper = new WorkbookFieldMapper();
    }

    public function import(string $filePath, ?int $ingestionFileId = null): array
    {
        $this->errors       = [];
        $this->unrecognized = [];
        $this->imported     = 0;
        $this->skipped      = 0;
        $this->total        = 0;

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
        $sheet       = $spreadsheet->getActiveSheet();
        $raw         = $sheet->toArray(null, true, true, false);

        if (empty($raw)) {
            throw new \RuntimeException('File Excel kosong.');
        }

        // ── Auto-detect & normalize layout ────────────────────────────────────
        $rows = $this->isTransposed($raw) ? $this->transpose($raw) : $raw;

        // ── Header processing ─────────────────────────────────────────────────
        // resolveHeaders normalizes + applies builtin aliases + DB aliases in one pass
        $headers    = $this->mapper->resolveHeaders($rows[0], 'project');
        $rawHeaders = array_map(fn($h) => $this->mapper->normalizeHeader((string) $h), $rows[0]);

        $this->unrecognized = $this->mapper->findUnrecognized($rows[0], $headers, 'project');
        $this->validateHeaders($headers, $rawHeaders);

        // ── Data rows ─────────────────────────────────────────────────────────
        $dataRows = array_slice($rows, 1);

        foreach ($dataRows as $rowIndex => $row) {
            $lineNumber = $rowIndex + 2;

            if ($this->mapper->isEmptyRow($row)) continue;

            $this->total++;

            $data = array_combine($headers, $row);

            // Normalize division casing if present
            if (!empty($data['division'])) {
                $data['division'] = ucwords(strtolower(trim((string) $data['division'])));
            }

            $validator = $this->makeValidator($data);

            if ($validator->fails()) {
                foreach ($validator->errors()->all() as $error) {
                    $this->errors[] = "Baris {$lineNumber}: {$error}";
                }
                $this->skipped++;
                continue;
            }

            $numeric = fn($key) => isset($data[$key]) && $data[$key] !== '' ? (float) $data[$key] : null;
            $integer = fn($key) => isset($data[$key]) && $data[$key] !== '' ? (int)   $data[$key] : null;

            Project::updateOrCreate(
                ['project_code' => trim($data['project_code']), 'user_id' => Auth::id()],
                [
                    'ingestion_file_id' => $ingestionFileId,
                    'project_name'      => trim($data['project_name']),
                    'division'          => !empty($data['division']) ? trim($data['division']) : null,
                    'owner'             => !empty($data['owner'])    ? trim($data['owner'])    : null,
                    'contract_value'    => $numeric('contract_value'),
                    'planned_cost'      => $numeric('planned_cost'),
                    'actual_cost'       => $numeric('actual_cost'),
                    'planned_duration'  => $integer('planned_duration'),
                    'actual_duration'   => $integer('actual_duration'),
                    'progress_pct'      => $numeric('progress_pct') ?? 100.0,
                    'project_year'      => $integer('project_year') ?? now()->year,
                ]
            );

            $this->imported++;
        }

        return [
            'total'                => $this->total,
            'imported'             => $this->imported,
            'skipped'              => $this->skipped,
            'errors'               => $this->errors,
            'unrecognized_columns' => $this->unrecognized,
        ];
    }

    private function isTransposed(array $raw): bool
    {
        $colA = array_map(fn($row) => $row[0] ?? null, $raw);
        $colA = array_filter($colA, fn($v) => $v !== null && $v !== '');

        if (empty($colA)) return false;

        $normalized = array_map(
            fn($v) => $this->mapper->resolveAlias((string) $v, 'project')
                   ?? $this->mapper->normalizeHeader((string) $v),
            $colA
        );

        $matches = count(array_intersect($normalized, self::REQUIRED_COLUMNS));

        return $matches >= (count(self::REQUIRED_COLUMNS) * 0.5);
    }

    private function transpose(array $raw): array
    {
        if (empty($raw)) return [];

        $colCount = max(array_map('count', $raw));
        $padded   = array_map(
            fn($row) => array_pad(array_values($row), $colCount, null),
            $raw
        );

        $result = [];
        for ($col = 0; $col < $colCount; $col++) {
            $result[] = array_map(fn($row) => $row[$col], $padded);
        }

        return $result;
    }

    private function validateHeaders(array $headers, array $rawHeaders): void
    {
        $missing = array_diff(self::REQUIRED_COLUMNS, $headers);

        if (!empty($missing)) {
            $relevantUnrecognized = array_values(array_intersect(
                $this->unrecognized,
                array_filter($rawHeaders)
            ));

            if (!empty($relevantUnrecognized)) {
                throw new ImportValidationException(
                    count($relevantUnrecognized) . ' kolom wajib tidak dikenali',
                    $relevantUnrecognized,
                    'Tambahkan alias di halaman Column Mapping'
                );
            }

            throw new ImportValidationException(
                'Kolom wajib tidak ditemukan: ' . implode(', ', $missing) . '. ' .
                'Header yang terbaca: ' . implode(', ', array_filter($headers)) . '. ' .
                'Pastikan nama kolom sesuai atau lihat format yang didukung.'
            );
        }
    }

    private function makeValidator(array $data): \Illuminate\Validation\Validator
    {
        return Validator::make($data, [
            'project_code'     => 'required|string|max:20',
            'project_name'     => 'required|string|max:255',
            'division'         => ['nullable', Rule::enum(Division::class)],
            'contract_value'   => 'nullable|numeric|min:0',
            'planned_cost'     => 'nullable|numeric|min:0',
            'actual_cost'      => 'nullable|numeric|min:0',
            'planned_duration' => 'nullable|integer|min:1',
            'actual_duration'  => 'nullable|integer|min:1',
            'progress_pct'     => 'nullable|numeric|min:0|max:100',
            'project_year'     => 'nullable|integer|min:2000|max:2099',
        ], [
            'division.enum'        => 'Division harus ' . implode(' atau ', Division::values()) . '.',
            'project_year.integer' => 'Project year harus berupa angka.',
        ]);
    }
}
