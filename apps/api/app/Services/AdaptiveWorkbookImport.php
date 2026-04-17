<?php

namespace App\Services;

use App\Enums\Division;
use App\Exceptions\ImportValidationException;
use App\Models\Project;
use App\Models\ProjectEquipmentLog;
use App\Models\ProjectMaterialLog;
use App\Models\ProjectWbs;
use App\Models\ProjectProgressCurve;
use App\Models\ProjectRisk;
use App\Models\ProjectWorkItem;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\IOFactory;

class AdaptiveWorkbookImport
{
    private array $errors = [];
    private array $unrecognized = [];
    private array $audit = [];
    private array $warnings = [];
    private int $imported = 0;
    private int $skipped = 0;
    private int $total = 0;

    public function __construct(
        private readonly ?WorkbookFieldMapper $mapper = null,
    ) {
    }

    public function supports(string $filePath): bool
    {
        $payload = $this->discoverWorkbook(IOFactory::load($filePath));

        if (!empty($payload['project_rows'])) {
            return true;
        }

        return $this->canAssembleProjectData($payload);
    }

    public function import(string $filePath, ?int $ingestionFileId = null): array
    {
        $this->resetState();

        $payload = $this->discoverWorkbook(IOFactory::load($filePath));

        if (empty($payload['project_rows']) && !$this->canAssembleProjectData($payload)) {
            throw new ImportValidationException(
                'Adaptive scanner belum menemukan field proyek wajib yang cukup untuk diimport.',
                array_values(array_unique($this->unrecognized)),
                'Tambahkan alias kolom atau lengkapi metadata proyek di workbook'
            );
        }

        DB::transaction(function () use ($payload, $ingestionFileId): void {
            $projects = $this->persistProjects($payload, $ingestionFileId);
            $primaryProject = $this->resolvePrimaryProject($projects, $payload['metadata']);

            if ($primaryProject !== null && $this->hasPeriodPayload($payload)) {
                $wbsPhase = $this->upsertPeriod($primaryProject, $payload['metadata'], $ingestionFileId);

                $this->syncWorkItems($wbsPhase, $payload['work_items']);
                $this->syncMaterialLogs($wbsPhase, $payload['materials']);
                $this->syncEquipmentLogs($wbsPhase, $payload['equipments']);
                $this->syncSCurves($primaryProject, $payload['s_curves']);
                $this->deriveWbsPhasesFromItems($primaryProject, $wbsPhase, $payload['metadata'], $ingestionFileId);
                $this->refreshProjectFinancials($primaryProject);
                $this->generateSampleRisks($primaryProject);
                $this->generateProgressCurve($primaryProject);
            }
        });

        return [
            'total' => $this->total,
            'imported' => $this->imported,
            'skipped' => $this->skipped,
            'errors' => $this->errors,
            'warnings' => $this->warnings,
            'unrecognized_columns' => array_values(array_unique($this->unrecognized)),
            'scanner' => 'adaptive',
            'field_trace' => $this->audit['field_trace'] ?? [],
            'field_candidates' => $this->audit['field_candidates'] ?? [],
            'project_row_trace' => $this->audit['project_row_trace'] ?? [],
            'field_conflicts' => $this->audit['field_conflicts'] ?? [],
            'project_row_conflicts' => $this->audit['project_row_conflicts'] ?? [],
        ];
    }

    private function discoverWorkbook(\PhpOffice\PhpSpreadsheet\Spreadsheet $spreadsheet): array
    {
        $metadataCandidates = [];
        $metadataCandidateLog = [];
        $projectRows = [];
        $workItems = [];
        $materials = [];
        $equipments = [];
        $sCurves = [];

        foreach ($spreadsheet->getWorksheetIterator() as $sheet) {
            $sheetName = $sheet->getTitle();
            $raw = $sheet->toArray(null, true, true, false);

            if (empty($raw)) {
                continue;
            }

            $this->collectMetadataCandidates($raw, $sheetName, $metadataCandidates, $metadataCandidateLog);
            $projectRows = array_merge($projectRows, $this->discoverProjectRows($raw, $sheetName));
            $workItems = array_merge($workItems, $this->discoverTableRows($raw, $sheetName, 'work_item'));
            $materials = array_merge($materials, $this->discoverTableRows($raw, $sheetName, 'material'));
            $equipments = array_merge($equipments, $this->discoverTableRows($raw, $sheetName, 'equipment'));
            $sCurves = array_merge($sCurves, $this->discoverTableRows($raw, $sheetName, 's_curve'));
        }

        $metadataPayload = $this->finalizeMetadata($metadataCandidates, $metadataCandidateLog);
        $this->audit['field_trace'] = $metadataPayload['field_trace'];
        $this->audit['field_candidates'] = $metadataPayload['field_candidates'];
        $this->audit['field_conflicts'] = $metadataPayload['field_conflicts'];
        $this->warnings = array_merge($this->warnings, $metadataPayload['warnings']);

        return [
            'metadata' => $metadataPayload['metadata'],
            'project_rows' => $projectRows,
            'work_items' => $workItems,
            'materials' => $materials,
            'equipments' => $equipments,
            's_curves' => $sCurves,
        ];
    }

    private function collectMetadataCandidates(
        array $raw,
        string $sheetName,
        array &$metadataCandidates,
        array &$metadataCandidateLog,
    ): void
    {
        foreach ($raw as $rowIndex => $row) {
            $nonEmpty = array_values(array_filter($row, fn($cell) => $cell !== null && trim((string) $cell) !== ''));

            if (empty($nonEmpty)) {
                continue;
            }

            $this->collectInlineKeyValueCandidates($nonEmpty, $sheetName, $rowIndex, $metadataCandidates, $metadataCandidateLog);

            if (count($nonEmpty) >= 4 && str_contains(strtolower((string) $nonEmpty[0]), 'progress')) {
                $this->storeMetadataCandidate($metadataCandidates, $metadataCandidateLog, 'progress_prev_pct', $nonEmpty[1] ?? null, $sheetName, $rowIndex, 96, 'progress_triplet');
                $this->storeMetadataCandidate($metadataCandidates, $metadataCandidateLog, 'progress_this_pct', $nonEmpty[2] ?? null, $sheetName, $rowIndex, 96, 'progress_triplet');
                $this->storeMetadataCandidate($metadataCandidates, $metadataCandidateLog, 'progress_total_pct', $nonEmpty[3] ?? null, $sheetName, $rowIndex, 96, 'progress_triplet');
            }

            foreach ($nonEmpty as $cell) {
                $this->collectCellMetadataCandidates((string) $cell, $sheetName, $rowIndex, $metadataCandidates, $metadataCandidateLog);
            }
        }
    }

    private function collectCellMetadataCandidates(
        string $cell,
        string $sheetName,
        int $rowIndex,
        array &$metadataCandidates,
        array &$metadataCandidateLog,
    ): void
    {
        $segments = array_values(array_filter(
            array_map('trim', preg_split('/\s*\|\s*/', $cell) ?: []),
            static fn ($segment) => $segment !== ''
        ));

        if (empty($segments)) {
            return;
        }

        $containsProgressContext = str_contains(strtolower($cell), 'progress')
            || str_contains(strtolower($cell), 'progres');

        foreach ($segments as $segment) {
            $this->collectColonSeparatedCandidate($segment, $sheetName, $rowIndex, $metadataCandidates, $metadataCandidateLog);
            $this->collectPrefixedLabelCandidate($segment, $sheetName, $rowIndex, $metadataCandidates, $metadataCandidateLog);
        }

        if ($containsProgressContext && count($segments) > 1) {
            $this->collectProgressSegmentCandidates($segments, $sheetName, $rowIndex, $metadataCandidates, $metadataCandidateLog);
        }
    }

    private function collectInlineKeyValueCandidates(
        array $cells,
        string $sheetName,
        int $rowIndex,
        array &$metadataCandidates,
        array &$metadataCandidateLog,
    ): void
    {
        for ($index = 0; $index < count($cells) - 1; $index += 2) {
            $label = (string) $cells[$index];
            $value = $cells[$index + 1];
            $field = $this->mapper()->resolveAlias($label, 'project');

            if ($field === null) {
                continue;
            }

            $score = $index === 0 ? 100 : 94;
            $this->storeMetadataCandidate(
                $metadataCandidates,
                $metadataCandidateLog,
                $field,
                $value,
                $sheetName,
                $rowIndex,
                $score,
                'paired_cells'
            );
        }
    }

    private function collectColonSeparatedCandidate(
        string $cell,
        string $sheetName,
        int $rowIndex,
        array &$metadataCandidates,
        array &$metadataCandidateLog,
    ): void
    {
        if (!str_contains($cell, ':')) {
            return;
        }

        [$label, $value] = array_map('trim', explode(':', $cell, 2));
        $field = $this->mapper()->resolveAlias($label, 'project');

        if ($field === null || $value === '') {
            return;
        }

        $this->storeMetadataCandidate(
            $metadataCandidates,
            $metadataCandidateLog,
            $field,
            $value,
            $sheetName,
            $rowIndex,
            92,
            'colon_pair'
        );
    }

    private function collectPrefixedLabelCandidate(
        string $segment,
        string $sheetName,
        int $rowIndex,
        array &$metadataCandidates,
        array &$metadataCandidateLog,
    ): void
    {
        if (str_contains($segment, ':')) {
            return;
        }

        $tokens = preg_split('/\s+/', trim($segment)) ?: [];
        $maxLabelTokens = min(3, count($tokens) - 1);

        for ($length = 1; $length <= $maxLabelTokens; $length++) {
            $label = implode(' ', array_slice($tokens, 0, $length));
            $value = implode(' ', array_slice($tokens, $length));
            $field = $this->mapper()->resolveAlias($label, 'project');

            if ($field === null || trim($value) === '') {
                continue;
            }

            $this->storeMetadataCandidate(
                $metadataCandidates,
                $metadataCandidateLog,
                $field,
                $value,
                $sheetName,
                $rowIndex,
                88,
                'prefixed_label'
            );

            return;
        }
    }

    private function collectProgressSegmentCandidates(
        array $segments,
        string $sheetName,
        int $rowIndex,
        array &$metadataCandidates,
        array &$metadataCandidateLog,
    ): void
    {
        foreach ($segments as $segment) {
            if (!str_contains($segment, ':')) {
                continue;
            }

            [$label, $value] = array_map('trim', explode(':', $segment, 2));
            $normalizedLabel = $this->mapper()->normalizeHeader($label);

            $field = match (true) {
                str_contains($normalizedLabel, 'bulan_lalu') => 'progress_prev_pct',
                str_contains($normalizedLabel, 'bulan_ini') => 'progress_this_pct',
                str_contains($normalizedLabel, 'total') => 'progress_total_pct',
                default => null,
            };

            if ($field === null || $value === '') {
                continue;
            }

            $this->storeMetadataCandidate(
                $metadataCandidates,
                $metadataCandidateLog,
                $field,
                $value,
                $sheetName,
                $rowIndex,
                95,
                'progress_segment'
            );
        }
    }

    private function storeMetadataCandidate(
        array &$metadataCandidates,
        array &$metadataCandidateLog,
        string $field,
        mixed $value,
        string $sheetName,
        int $rowIndex,
        int $baseScore,
        string $strategy,
    ): void {
        $normalized = $this->mapper()->parseFieldValue($field, $value);

        if ($normalized === null || $normalized === '') {
            return;
        }

        // When storing a period, also store the raw label (e.g. "Maret 2025")
        // so it can be used as the WBS phase name instead of a hardcoded mapping.
        if ($field === 'period' && is_string($value)) {
            $rawLabel = trim((string) $value);
            if ($rawLabel !== '' && $rawLabel !== $normalized) {
                $this->storeMetadataCandidate(
                    $metadataCandidates, $metadataCandidateLog,
                    'period_label', $rawLabel, $sheetName, $rowIndex, $baseScore, $strategy
                );
            }
        }

        $sheetBonus = $this->sheetScoreBonus($sheetName);
        $qualityBonus = $this->mapper()->confidenceAdjustment($field, $normalized);
        $score = $baseScore + $sheetBonus + $qualityBonus;
        $candidate = [
            'field' => $field,
            'value' => $normalized,
            'sheet' => $sheetName,
            'row' => $rowIndex + 1,
            'confidence' => $score,
            'base_score' => $baseScore,
            'sheet_bonus' => $sheetBonus,
            'quality_bonus' => $qualityBonus,
            'strategy' => $strategy,
        ];

        $metadataCandidateLog[$field][] = $candidate;
        $current = $metadataCandidates[$field] ?? null;

        if ($current === null || $score >= $current['score']) {
            $metadataCandidates[$field] = [
                'value' => $normalized,
                'score' => $score,
                'sheet' => $sheetName,
                'row' => $rowIndex + 1,
                'base_score' => $baseScore,
                'sheet_bonus' => $sheetBonus,
                'quality_bonus' => $qualityBonus,
                'strategy' => $strategy,
            ];
        }
    }

    private function finalizeMetadata(array $metadataCandidates, array $metadataCandidateLog): array
    {
        $metadata = [];
        $fieldTrace = [];
        $fieldCandidates = [];
        $fieldConflicts = [];
        $warnings = [];

        foreach ($metadataCandidates as $field => $candidate) {
            $metadata[$field] = $candidate['value'];
            $fieldTrace[$field] = [
                'value' => $candidate['value'],
                'sheet' => $candidate['sheet'],
                'row' => $candidate['row'],
                'confidence' => $candidate['score'],
                'base_score' => $candidate['base_score'],
                'sheet_bonus' => $candidate['sheet_bonus'],
                'quality_bonus' => $candidate['quality_bonus'],
                'strategy' => $candidate['strategy'],
            ];
        }

        foreach ($metadataCandidateLog as $field => $candidates) {
            usort($candidates, fn($left, $right) => $right['confidence'] <=> $left['confidence']);
            $fieldCandidates[$field] = $candidates;

            $groupedValues = [];
            foreach ($candidates as $candidate) {
                $key = $this->candidateValueKey($candidate['value']);
                $groupedValues[$key][] = $candidate;
            }

            if (count($groupedValues) > 1 && isset($fieldTrace[$field])) {
                $selectedKey = $this->candidateValueKey($fieldTrace[$field]['value']);
                $alternatives = [];

                foreach ($groupedValues as $key => $valueCandidates) {
                    if ($key === $selectedKey) {
                        continue;
                    }

                    $bestAlternative = $valueCandidates[0];
                    usort($valueCandidates, fn($left, $right) => $right['confidence'] <=> $left['confidence']);
                    $bestAlternative = $valueCandidates[0];

                    $alternatives[] = [
                        'value' => $bestAlternative['value'],
                        'sheet' => $bestAlternative['sheet'],
                        'row' => $bestAlternative['row'],
                        'confidence' => $bestAlternative['confidence'],
                        'base_score' => $bestAlternative['base_score'],
                        'sheet_bonus' => $bestAlternative['sheet_bonus'],
                        'quality_bonus' => $bestAlternative['quality_bonus'],
                        'strategy' => $bestAlternative['strategy'],
                    ];
                }

                usort($alternatives, fn($left, $right) => $right['confidence'] <=> $left['confidence']);

                $fieldConflicts[$field] = [
                    'selected' => $fieldTrace[$field],
                    'alternatives' => $alternatives,
                ];

                $warnings[] = sprintf(
                    'Field "%s" memiliki %d kandidat nilai berbeda. Dipilih nilai dari sheet %s baris %s.',
                    $field,
                    count($groupedValues),
                    $fieldTrace[$field]['sheet'] ?? 'unknown',
                    $fieldTrace[$field]['row'] ?? '-',
                );
            }
        }

        if (!isset($metadata['progress_pct']) && isset($metadata['progress_total_pct'])) {
            $metadata['progress_pct'] = $metadata['progress_total_pct'];
            if (isset($fieldTrace['progress_total_pct'])) {
                $fieldTrace['progress_pct'] = $fieldTrace['progress_total_pct'];
            }
        }

        if (!isset($metadata['owner']) && isset($metadata['client_name'])) {
            $metadata['owner'] = $metadata['client_name'];
            if (isset($fieldTrace['client_name'])) {
                $fieldTrace['owner'] = $fieldTrace['client_name'];
            }
        }

        if (!isset($metadata['total_pagu']) && isset($metadata['contract_value'], $metadata['addendum_value'])) {
            $metadata['total_pagu'] = $metadata['contract_value'] + $metadata['addendum_value'];
            $fieldTrace['total_pagu'] = [
                'value' => $metadata['total_pagu'],
                'sheet' => 'derived',
                'row' => null,
                'confidence' => min(
                    $fieldTrace['contract_value']['confidence'] ?? 0,
                    $fieldTrace['addendum_value']['confidence'] ?? 0,
                ),
                'strategy' => 'derived_sum',
            ];
        }

        return [
            'metadata' => $metadata,
            'field_trace' => $fieldTrace,
            'field_candidates' => $fieldCandidates,
            'field_conflicts' => $fieldConflicts,
            'warnings' => $warnings,
        ];
    }

    private function discoverProjectRows(array $raw, string $sheetName): array
    {
        foreach ($raw as $headerIndex => $headerRow) {
            $resolvedHeaders = $this->mapper()->resolveHeaders($headerRow, 'project');

            if (!$this->isProjectHeader($resolvedHeaders)) {
                continue;
            }

            $this->unrecognized = array_merge(
                $this->unrecognized,
                $this->mapper()->findUnrecognized($headerRow, $resolvedHeaders, 'project')
            );

            return $this->extractRows($raw, $headerIndex, $resolvedHeaders, 'project', $sheetName);
        }

        return [];
    }

    private function discoverTableRows(array $raw, string $sheetName, string $context): array
    {
        foreach ($raw as $headerIndex => $headerRow) {
            $resolvedHeaders = $this->mapper()->resolveHeaders($headerRow, $context);

            if (!$this->matchesStructuredHeader($resolvedHeaders, $context)) {
                continue;
            }

            $this->unrecognized = array_merge(
                $this->unrecognized,
                $this->mapper()->findUnrecognized($headerRow, $resolvedHeaders, $context)
            );

            return $this->extractRows($raw, $headerIndex, $resolvedHeaders, $context, $sheetName);
        }

        return [];
    }

    private function extractRows(
        array $raw,
        int $headerIndex,
        array $headers,
        string $context,
        string $sheetName,
    ): array {
        $rows = [];
        $emptyStreak = 0;

        // Determine which other contexts could start a new table zone
        $otherContexts = array_filter(
            ['work_item', 'material', 'equipment', 's_curve'],
            fn($c) => $c !== $context
        );

        for ($rowIndex = $headerIndex + 1; $rowIndex < count($raw); $rowIndex++) {
            $row = array_pad($raw[$rowIndex], count($headers), null);

            if ($this->mapper()->isEmptyRow($row)) {
                $emptyStreak++;
                if ($emptyStreak >= 2) {
                    break;
                }
                continue;
            }

            // Stop if this row looks like a header for a different table context
            if ($emptyStreak >= 1) {
                foreach ($otherContexts as $otherCtx) {
                    $otherHeaders = $this->mapper()->resolveHeaders($raw[$rowIndex], $otherCtx);
                    if ($this->matchesStructuredHeader($otherHeaders, $otherCtx)) {
                        return $rows;
                    }
                }
            }

            $emptyStreak = 0;
            $mapped = array_combine($headers, array_slice($row, 0, count($headers)));
            $normalized = [];

            foreach ($mapped as $field => $value) {
                if (!in_array($field, $this->mapper()->knownFields($context), true)) {
                    continue;
                }

                $normalized[$field] = $this->mapper()->parseFieldValue($field, $value);
            }

            if (!$this->isMeaningfulStructuredRow($normalized, $context)) {
                continue;
            }

            $normalized['__sheet'] = $sheetName;
            $normalized['__source_row'] = $rowIndex + 1;
            $normalized['__matched_fields'] = array_values(array_keys(
                array_filter($normalized, fn($value, $field) => !str_starts_with((string) $field, '__') && $value !== null && $value !== '', ARRAY_FILTER_USE_BOTH)
            ));
            $rows[] = $normalized;
        }

        return $rows;
    }

    private function persistProjects(array $payload, ?int $ingestionFileId): array
    {
        $projects = [];
        $projectRows = $payload['project_rows'];
        $metadata = $payload['metadata'];
        $seenProjectRows = [];

        if (empty($projectRows) && !empty($metadata)) {
            $projectRows[] = $metadata;
        }

        foreach ($projectRows as $row) {
            $this->total++;

            $data = $this->assembleProjectData($payload, $metadata, $row);
            $validator = $this->makeProjectValidator($data);

            if ($validator->fails()) {
                $line = $row['__source_row'] ?? 'metadata';

                foreach ($validator->errors()->all() as $error) {
                    $this->errors[] = "Baris {$line}: {$error}";
                }

                $this->skipped++;
                continue;
            }

            $this->recordProjectRowConflict($seenProjectRows, $data, $row);

            $numeric = fn($key) => isset($data[$key]) && $data[$key] !== '' ? (float) $data[$key] : null;
            $integer = fn($key) => isset($data[$key]) && $data[$key] !== '' ? (int)   $data[$key] : null;

            $project = Project::updateOrCreate(
                ['project_code' => trim((string) $data['project_code']), 'user_id' => Auth::id()],
                [
                    'ingestion_file_id' => $ingestionFileId,
                    'project_name'      => trim((string) $data['project_name']),
                    'division'          => !empty($data['division']) ? trim((string) $data['division']) : null,
                    'owner'             => !empty($data['owner'])    ? trim((string) $data['owner'])    : null,
                    'contract_value'    => $numeric('contract_value'),
                    'planned_cost'      => $numeric('planned_cost'),
                    'actual_cost'       => $numeric('actual_cost'),
                    'planned_duration'  => $integer('planned_duration'),
                    'actual_duration'   => $integer('actual_duration'),
                    'progress_pct'      => $numeric('progress_pct') ?? 100.0,
                    'project_year'      => $integer('project_year') ?? now()->year,
                ]
            );

            $projects[$project->project_code] = $project;
            $this->audit['project_row_trace'][] = [
                'project_code' => $project->project_code,
                'sheet' => $row['__sheet'] ?? ($this->audit['field_trace']['project_code']['sheet'] ?? 'unknown'),
                'row' => $row['__source_row'] ?? ($this->audit['field_trace']['project_code']['row'] ?? null),
                'matched_fields' => $row['__matched_fields'] ?? array_keys($data),
                'used_metadata_fields' => $this->listInheritedMetadataFields($metadata, $row),
            ];
            $this->imported++;
        }

        if (empty($projects)) {
            throw new ImportValidationException(
                'Adaptive scanner menemukan data, tetapi semua kandidat proyek gagal divalidasi.',
                array_values(array_unique($this->unrecognized)),
                'Pastikan workbook memiliki project_code dan project_name yang dapat terbaca. ' .
                'Cek bagian errors untuk detail baris yang gagal.'
            );
        }

        return $projects;
    }

    private function upsertPeriod(Project $project, array $metadata, ?int $ingestionFileId): ProjectWbs
    {
        // Use explicit WBS name from metadata, or the raw period label, or fallback
        $wbsName = $metadata['name_of_work_phase']
            ?? $metadata['period_label']
            ?? $metadata['period']
            ?? 'PEKERJAAN UMUM';

        $contractValue = $metadata['contract_value'] ?? (float) $project->contract_value;
        $addendumValue = $metadata['addendum_value'] ?? null;
        $totalPagu = $metadata['total_pagu']
            ?? ($contractValue !== null && $addendumValue !== null ? $contractValue + $addendumValue : null);

        return ProjectWbs::updateOrCreate(
            ['project_id' => $project->id, 'name_of_work_phase' => $wbsName],
            [
                'ingestion_file_id' => $ingestionFileId,
                'client_name' => $metadata['client_name'] ?? $metadata['owner'] ?? $project->owner,
                'project_manager' => $metadata['project_manager'] ?? null,
                'report_source' => 'adaptive_scan',
                'progress_prev_pct' => $metadata['progress_prev_pct'] ?? null,
                'progress_this_pct' => $metadata['progress_this_pct'] ?? null,
                'progress_total_pct' => $metadata['progress_total_pct'] ?? $metadata['progress_pct'] ?? null,
                'contract_value' => $contractValue,
                'addendum_value' => $addendumValue,
                'total_pagu' => $totalPagu,
            ]
        );
    }

    private function syncWorkItems(ProjectWbs $wbsPhase, array $rows): void
    {
        if (empty($rows)) {
            return;
        }

        $wbsPhase->workItems()->delete();

        $sortOrder = 0;
        $parentMap = [];

        foreach ($rows as $row) {
            $this->total++;

            $itemName = trim((string) ($row['item_name'] ?? ''));
            if ($itemName === '') {
                $this->errors[] = "Baris {$row['__source_row']}: item work item kosong.";
                $this->skipped++;
                continue;
            }

            $itemNo = trim((string) ($row['item_no'] ?? ''));
            $level = $this->mapper()->detectLevel($itemNo, $itemName);
            $parentId = $level > 0 ? ($parentMap[$level - 1] ?? null) : null;
            $isTotalRow = str_contains(strtolower($itemName), 'total') || str_contains(strtolower($itemName), 'jumlah');

            $item = ProjectWorkItem::create([
                'period_id' => $wbsPhase->id,
                'parent_id' => $parentId,
                'level' => $level,
                'item_no' => $itemNo ?: null,
                'item_name' => $itemName,
                'sort_order' => $sortOrder++,
                'volume' => $row['volume'] ?? null,
                'satuan' => $row['satuan'] ?? null,
                'harsat_internal' => $row['harsat_internal'] ?? null,
                'volume_actual' => $row['volume_actual'] ?? null,
                'harsat_actual' => $row['harsat_actual'] ?? null,
                'cost_category' => $row['cost_category'] ?? null,
                'cost_subcategory' => $row['cost_subcategory'] ?? null,
                'budget_awal' => $row['budget_awal'] ?? null,
                'addendum' => $row['addendum'] ?? 0,
                'total_budget' => $row['total_budget'] ?? null,
                'realisasi' => $row['realisasi'] ?? null,
                'deviasi' => $row['deviasi'] ?? null,
                'deviasi_pct' => $row['deviasi_pct'] ?? null,
                'bobot_pct' => $row['bobot_pct'] ?? null,
                'progress_plan_pct' => $row['progress_plan_pct'] ?? null,
                'progress_actual_pct' => $row['progress_actual_pct'] ?? null,
                'planned_value' => $row['planned_value'] ?? null,
                'earned_value' => $row['earned_value'] ?? null,
                'actual_cost_item' => $row['actual_cost_item'] ?? null,
                'vendor_name' => $row['vendor_name'] ?? null,
                'po_number' => $row['po_number'] ?? null,
                'vendor_contract_value' => $row['vendor_contract_value'] ?? null,
                'termin_paid' => $row['termin_paid'] ?? null,
                'retention' => $row['retention'] ?? null,
                'outstanding_debt' => $row['outstanding_debt'] ?? null,
                'data_source' => $row['data_source'] ?? null,
                'notes' => $row['notes'] ?? null,
                'is_total_row' => $isTotalRow,
            ]);

            $parentMap[$level] = $item->id;
            $this->imported++;
        }
    }

    private function syncMaterialLogs(ProjectWbs $wbsPhase, array $rows): void
    {
        if (empty($rows)) {
            return;
        }

        $wbsPhase->materialLogs()->delete();

        foreach ($rows as $row) {
            $this->total++;

            $supplierName = trim((string) ($row['supplier_name'] ?? ''));
            $materialType = trim((string) ($row['material_type'] ?? ''));

            if ($supplierName === '' && $materialType === '') {
                $this->skipped++;
                continue;
            }

            $isDiscount = str_contains(strtolower($materialType), 'discount')
                || str_contains(strtolower($materialType), 'potongan');

            ProjectMaterialLog::create([
                'period_id' => $wbsPhase->id,
                'work_item_id' => null,
                'supplier_name' => $supplierName ?: 'Unknown',
                'material_type' => $materialType ?: 'Unknown',
                'qty' => $row['qty'] ?? null,
                'satuan' => trim((string) ($row['satuan'] ?? '')),
                'harga_satuan' => $row['harga_satuan'] ?? null,
                'total_tagihan' => $row['total_tagihan'] ?? null,
                'is_discount' => $isDiscount,
                'source_row' => $row['__source_row'] ?? null,
            ]);

            $this->imported++;
        }
    }

    private function syncEquipmentLogs(ProjectWbs $wbsPhase, array $rows): void
    {
        if (empty($rows)) {
            return;
        }

        $wbsPhase->equipmentLogs()->delete();

        $lastVendor = null;

        foreach ($rows as $row) {
            $this->total++;

            $vendorName = trim((string) ($row['vendor_name'] ?? ''));
            if ($vendorName !== '') {
                $lastVendor = $vendorName;
            } else {
                $vendorName = $lastVendor ?? 'Unknown';
            }

            $equipmentName = trim((string) ($row['equipment_name'] ?? ''));

            if ($equipmentName === '') {
                $this->errors[] = "Baris {$row['__source_row']}: equipment_name kosong.";
                $this->skipped++;
                continue;
            }

            ProjectEquipmentLog::create([
                'period_id' => $wbsPhase->id,
                'work_item_id' => null,
                'vendor_name' => $vendorName,
                'equipment_name' => $equipmentName,
                'jam_kerja' => $row['jam_kerja'] ?? null,
                'rate_per_jam' => $row['rate_per_jam'] ?? null,
                'total_biaya' => $row['total_biaya'] ?? null,
                'payment_status' => trim((string) ($row['payment_status'] ?? '')),
                'source_row' => $row['__source_row'] ?? null,
            ]);

            $this->imported++;
        }
    }

    private function syncSCurves(Project $project, array $rows): void
    {
        foreach ($rows as $row) {
            $weekNumber = (int) ($row['week_number'] ?? 0);

            if ($weekNumber <= 0) {
                continue;
            }

            $this->total++;

            $rencana = $row['rencana_pct'] ?? null;
            $realisasi = $row['realisasi_pct'] ?? null;
            $deviasi = $row['deviasi_pct'] ?? (
                $rencana !== null && $realisasi !== null
                    ? $realisasi - $rencana
                    : null
            );

            ProjectProgressCurve::updateOrCreate(
                ['project_id' => $project->id, 'week_number' => $weekNumber],
                [
                    'rencana_pct' => $rencana,
                    'realisasi_pct' => $realisasi,
                    'deviasi_pct' => $deviasi,
                    'keterangan' => trim((string) ($row['keterangan'] ?? '')),
                ]
            );

            $this->imported++;
        }
    }

    private function refreshPeriodTotals(ProjectWbs $wbsPhase): void
    {
        $hppPlan = ProjectWorkItem::where('period_id', $wbsPhase->id)
            ->whereNull('parent_id')
            ->where('is_total_row', false)
            ->sum('total_budget');

        $hppActual = ProjectWorkItem::where('period_id', $wbsPhase->id)
            ->whereNull('parent_id')
            ->where('is_total_row', false)
            ->sum('realisasi');

        $plan = $hppPlan ?: $wbsPhase->hpp_plan_total;
        $actual = $hppActual ?: $wbsPhase->hpp_actual_total;
        $totalPagu = (float) $wbsPhase->total_pagu;

        $wbsPhase->update([
            'hpp_plan_total' => $plan,
            'hpp_actual_total' => $actual,
            'hpp_deviation' => ($plan ?: 0) - ($actual ?: 0),
            'deviasi_pct' => $totalPagu > 0 ? (($totalPagu - ($plan ?: 0)) / $totalPagu) * 100 : 0,
        ]);
    }

    /**
     * If top-level work items use Roman numeral numbering (I, II, III...),
     * split them into separate WBS phases instead of keeping everything
     * under one catch-all phase.
     */
    private function deriveWbsPhasesFromItems(
        Project $project,
        ProjectWbs $catchAllPhase,
        array $metadata,
        ?int $ingestionFileId,
    ): void {
        // Get top-level, non-total work items
        $topItems = ProjectWorkItem::where('period_id', $catchAllPhase->id)
            ->whereNull('parent_id')
            ->where('is_total_row', false)
            ->orderBy('sort_order')
            ->get();

        if ($topItems->count() < 2) {
            // Single item or empty — no splitting needed, just refresh totals
            $this->refreshPeriodTotals($catchAllPhase);
            return;
        }

        // Check if top-level items use Roman numeral numbering
        $romanPattern = '/^[IVXLCDM]+$/';
        $romanCount = $topItems->filter(fn($item) =>
            $item->item_no && preg_match($romanPattern, trim($item->item_no))
        )->count();

        if ($romanCount < 2) {
            // Not a Roman-numeral hierarchy — keep single phase
            $this->refreshPeriodTotals($catchAllPhase);
            return;
        }

        // Split: each Roman-numeral item becomes its own WBS phase
        foreach ($topItems as $topItem) {
            if (!$topItem->item_no || !preg_match($romanPattern, trim($topItem->item_no))) {
                continue;
            }

            $phaseName = $topItem->item_name;

            $newPhase = ProjectWbs::updateOrCreate(
                ['project_id' => $project->id, 'name_of_work_phase' => $phaseName],
                [
                    'ingestion_file_id' => $ingestionFileId,
                    'client_name' => $catchAllPhase->client_name,
                    'project_manager' => $catchAllPhase->project_manager,
                    'report_source' => 'adaptive_scan',
                    'progress_prev_pct' => $catchAllPhase->progress_prev_pct,
                    'progress_this_pct' => $catchAllPhase->progress_this_pct,
                    'progress_total_pct' => $catchAllPhase->progress_total_pct,
                    'contract_value' => $catchAllPhase->contract_value,
                    'addendum_value' => $catchAllPhase->addendum_value,
                ]
            );

            // Clear old items from reused phase (prevents duplicates on re-upload)
            if ($newPhase->id !== $catchAllPhase->id) {
                $newPhase->workItems()->delete();
            }

            // Move children to the new phase
            ProjectWorkItem::where('period_id', $catchAllPhase->id)
                ->where('parent_id', $topItem->id)
                ->update(['period_id' => $newPhase->id]);

            // Move the top item itself (it becomes a summary row in the new phase)
            $topItem->update([
                'period_id' => $newPhase->id,
                'parent_id' => null,
            ]);

            // Calculate totals for this phase from its child items
            $childBudget = ProjectWorkItem::where('period_id', $newPhase->id)
                ->where('parent_id', $topItem->id)
                ->where('is_total_row', false)
                ->sum('total_budget');
            $childActual = ProjectWorkItem::where('period_id', $newPhase->id)
                ->where('parent_id', $topItem->id)
                ->where('is_total_row', false)
                ->sum('realisasi');

            // Use child sums if available, otherwise use the parent row values
            $phaseBudget = $childBudget ?: (float) $topItem->total_budget;
            $phaseActual = $childActual ?: (float) $topItem->realisasi;

            $newPhase->update([
                'total_pagu' => $phaseBudget,
                'hpp_plan_total' => $phaseBudget,
                'hpp_actual_total' => $phaseActual,
                'hpp_deviation' => $phaseBudget - $phaseActual,
                'deviasi_pct' => $phaseBudget > 0
                    ? (($phaseBudget - $phaseActual) / $phaseBudget) * 100
                    : 0,
            ]);
        }

        // Delete the catch-all phase if all meaningful items were moved out
        $remaining = ProjectWorkItem::where('period_id', $catchAllPhase->id)
            ->where('is_total_row', false)
            ->count();
        if ($remaining === 0) {
            // Clean up any leftover total/summary rows
            ProjectWorkItem::where('period_id', $catchAllPhase->id)->delete();
            $catchAllPhase->delete();
        } else {
            $this->refreshPeriodTotals($catchAllPhase);
        }
    }

    /**
     * When metadata doesn't have financial fields, derive them from work item sums.
     */
    private function refreshProjectFinancials(Project $project): void
    {
        // Only fill in missing fields — don't overwrite if already set from metadata
        $updates = [];

        $phases = $project->wbsPhases()->get();

        if ($project->planned_cost === null || (float) $project->planned_cost === 0.0) {
            $totalBudget = $phases->sum(fn($p) => (float) $p->hpp_plan_total);
            if ($totalBudget > 0) {
                $updates['planned_cost'] = $totalBudget;
            }
        }

        if ($project->actual_cost === null || (float) $project->actual_cost === 0.0) {
            $totalActual = $phases->sum(fn($p) => (float) $p->hpp_actual_total);
            if ($totalActual > 0) {
                $updates['actual_cost'] = $totalActual;
            }
        }

        if (!empty($updates)) {
            $project->update($updates);
        }
    }

    private function assembleProjectData(array $payload, array $metadata, array $row): array
    {
        $combined = array_merge(
            array_intersect_key($metadata, array_flip($this->mapper()->knownFields('project'))),
            array_intersect_key($row, array_flip($this->mapper()->knownFields('project')))
        );

        $combined = $this->mapper()->normalizeProjectData($combined);
        $combined = $this->applyDerivedProjectDefaults($combined, $payload);
        $combined['owner'] = $combined['owner'] ?? $combined['client_name'] ?? null;
        $combined['progress_pct'] = $combined['progress_pct'] ?? $combined['progress_total_pct'] ?? 100;
        $combined['project_year'] = $combined['project_year'] ?? now()->year;

        return $combined;
    }

    private function resolvePrimaryProject(array $projects, array $metadata): ?Project
    {
        if (count($projects) === 1) {
            return array_values($projects)[0];
        }

        $projectCode = $metadata['project_code'] ?? null;

        return $projectCode !== null ? ($projects[$projectCode] ?? null) : null;
    }

    private function hasPeriodPayload(array $payload): bool
    {
        return !empty($payload['work_items'])
            || !empty($payload['materials'])
            || !empty($payload['equipments'])
            || !empty($payload['s_curves'])
            || isset($payload['metadata']['period'])
            || isset($payload['metadata']['project_manager'])
            || isset($payload['metadata']['progress_total_pct']);
    }

    private function hasCompleteProjectData(array $data): bool
    {
        // Only project_code and project_name are truly required.
        // Financial/operational fields are nullable — KPI will be null when unavailable.
        return !empty($data['project_code']) && !empty($data['project_name']);
    }

    private function canAssembleProjectData(array $payload): bool
    {
        $metadata = $payload['metadata'];

        return !empty($metadata['project_code']) && !empty($metadata['project_name']);
    }

    private function isProjectHeader(array $resolvedHeaders): bool
    {
        // A project table header must have project_code + at least 3 other known project fields.
        $knownMatches = count(array_intersect($resolvedHeaders, $this->mapper()->knownFields('project')));

        return $knownMatches >= 4
            && in_array('project_code', $resolvedHeaders, true)
            && in_array('project_name', $resolvedHeaders, true);
    }

    private function matchesStructuredHeader(array $resolvedHeaders, string $context): bool
    {
        $knownMatches = count(array_intersect($resolvedHeaders, $this->mapper()->knownFields($context)));

        return match ($context) {
            'work_item' => $knownMatches >= 3
                && in_array('item_name', $resolvedHeaders, true)
                && (
                    in_array('budget_awal', $resolvedHeaders, true)
                    || in_array('total_budget', $resolvedHeaders, true)
                    || in_array('realisasi', $resolvedHeaders, true)
                ),
            'material' => $knownMatches >= 3
                && in_array('material_type', $resolvedHeaders, true)
                && (
                    in_array('supplier_name', $resolvedHeaders, true)
                    || in_array('qty', $resolvedHeaders, true)
                ),
            'equipment' => $knownMatches >= 3
                && in_array('equipment_name', $resolvedHeaders, true),
            's_curve' => $knownMatches >= 3
                && in_array('week_number', $resolvedHeaders, true)
                && (
                    in_array('rencana_pct', $resolvedHeaders, true)
                    || in_array('realisasi_pct', $resolvedHeaders, true)
                ),
            default => false,
        };
    }

    private function isMeaningfulStructuredRow(array $row, string $context): bool
    {
        return match ($context) {
            'project' => !empty($row['project_code'] ?? null) || !empty($row['project_name'] ?? null),
            'work_item' => !empty(trim((string) ($row['item_name'] ?? ''))),
            'material' => !empty(trim((string) ($row['supplier_name'] ?? '')))
                || !empty(trim((string) ($row['material_type'] ?? ''))),
            'equipment' => !empty(trim((string) ($row['equipment_name'] ?? ''))),
            's_curve' => (int) ($row['week_number'] ?? 0) > 0,
            default => false,
        };
    }

    private function makeProjectValidator(array $data): \Illuminate\Validation\Validator
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

    private function sheetScoreBonus(string $sheetName): int
    {
        $normalized = strtolower($sheetName);

        if (
            str_contains($normalized, 'cover')
            || str_contains($normalized, 'summary')
            || str_contains($normalized, 'info')
            || str_contains($normalized, 'meta')
        ) {
            return 5;
        }

        return 0;
    }

    private function listInheritedMetadataFields(array $metadata, array $row): array
    {
        $knownFields = array_flip($this->mapper()->knownFields('project'));
        $rowFields = array_flip(array_filter(
            array_keys($row),
            fn($field) => isset($knownFields[$field]) && ($row[$field] ?? null) !== null && ($row[$field] ?? null) !== ''
        ));

        return array_values(array_filter(
            array_keys($metadata),
            fn($field) => isset($knownFields[$field]) && !isset($rowFields[$field])
        ));
    }

    private function applyDerivedProjectDefaults(array $data, array $payload): array
    {
        if (!isset($data['contract_value']) && isset($data['total_pagu'])) {
            $data['contract_value'] = $data['total_pagu'];
            $this->addWarningOnce('contract_value diturunkan dari total_pagu.');
        }

        [$plannedCost, $actualCost] = $this->deriveCostsFromWorkItems($payload['work_items'] ?? []);

        if (!isset($data['planned_cost']) && $plannedCost !== null) {
            $data['planned_cost'] = $plannedCost;
            $this->addWarningOnce('planned_cost diturunkan dari total HPP/work items.');
        }

        if (!isset($data['actual_cost']) && $actualCost !== null) {
            $data['actual_cost'] = $actualCost;
            $this->addWarningOnce('actual_cost diturunkan dari realisasi HPP/work items.');
        }

        if (!isset($data['contract_value']) && isset($data['planned_cost'])) {
            $data['contract_value'] = $data['planned_cost'];
            $this->addWarningOnce('contract_value diturunkan dari planned_cost karena nilai kontrak tidak tersedia.');
        }

        [$plannedDuration, $actualDuration] = $this->deriveDurations($payload['s_curves'] ?? []);

        if (!isset($data['planned_duration']) && $plannedDuration !== null) {
            $data['planned_duration'] = $plannedDuration;
            $this->addWarningOnce('planned_duration diturunkan dari data S-curve.');
        }

        if (!isset($data['actual_duration']) && $actualDuration !== null) {
            $data['actual_duration'] = $actualDuration;
            $this->addWarningOnce('actual_duration diturunkan dari data S-curve.');
        }

        if (!isset($data['planned_duration']) && $this->hasPeriodPayload($payload)) {
            $data['planned_duration'] = 1;
            $this->addWarningOnce('planned_duration diisi fallback 1 bulan karena workbook tidak memuat data durasi/S-curve.');
        }

        if (!isset($data['actual_duration']) && $this->hasPeriodPayload($payload)) {
            $data['actual_duration'] = 1;
            $this->addWarningOnce('actual_duration diisi fallback 1 bulan karena workbook tidak memuat data durasi/S-curve.');
        }

        if (!isset($data['progress_pct'])) {
            $progressPct = $this->deriveProgressPct($payload['s_curves'] ?? []);
            if ($progressPct !== null) {
                $data['progress_pct'] = $progressPct;
                $this->addWarningOnce('progress_pct diturunkan dari data S-curve.');
            }
        }

        if (!isset($data['progress_pct']) && isset($data['progress_total_pct'])) {
            $data['progress_pct'] = $data['progress_total_pct'];
            $this->addWarningOnce('progress_pct diturunkan dari progress_total_pct.');
        }

        $validDivisions = \App\Enums\Division::values();
        $hasValidDivision = isset($data['division']) && in_array($data['division'], $validDivisions, true);

        if (!$hasValidDivision) {
            $division = $this->inferDivision($data, $payload);
            if ($division !== null) {
                $data['division'] = $division;
                $this->addWarningOnce("division diinferensikan sebagai {$division}.");
            } else {
                unset($data['division']); // Ensure invalid value is cleared, not passed to validator
            }
        }

        return $data;
    }

    private function deriveCostsFromWorkItems(array $workItems): array
    {
        if (empty($workItems)) {
            return [null, null];
        }

        $totalRow = null;
        foreach ($workItems as $row) {
            $itemName = strtolower(trim((string) ($row['item_name'] ?? '')));
            if ($itemName !== '' && (str_contains($itemName, 'total') || str_contains($itemName, 'jumlah'))) {
                $totalRow = $row;
            }
        }

        if ($totalRow !== null) {
            return [
                $totalRow['total_budget'] ?? $totalRow['budget_awal'] ?? null,
                $totalRow['realisasi'] ?? null,
            ];
        }

        $planned = 0.0;
        $actual = 0.0;
        $hasPlanned = false;
        $hasActual = false;

        foreach ($workItems as $row) {
            $level = $this->mapper()->detectLevel(
                trim((string) ($row['item_no'] ?? '')),
                trim((string) ($row['item_name'] ?? ''))
            );

            if ($level !== 0) {
                continue;
            }

            if (isset($row['total_budget']) && is_numeric($row['total_budget'])) {
                $planned += (float) $row['total_budget'];
                $hasPlanned = true;
            } elseif (isset($row['budget_awal']) && is_numeric($row['budget_awal'])) {
                $planned += (float) $row['budget_awal'];
                $hasPlanned = true;
            }

            if (isset($row['realisasi']) && is_numeric($row['realisasi'])) {
                $actual += (float) $row['realisasi'];
                $hasActual = true;
            }
        }

        return [
            $hasPlanned ? $planned : null,
            $hasActual ? $actual : null,
        ];
    }

    private function deriveDurations(array $sCurves): array
    {
        if (empty($sCurves)) {
            return [null, null];
        }

        $maxWeek = 0;
        foreach ($sCurves as $row) {
            $maxWeek = max($maxWeek, (int) ($row['week_number'] ?? 0));
        }

        if ($maxWeek <= 0) {
            return [null, null];
        }

        $months = max(1, (int) ceil($maxWeek / 4));

        return [$months, $months];
    }

    private function deriveProgressPct(array $sCurves): ?float
    {
        if (empty($sCurves)) {
            return null;
        }

        $latestWeek = null;
        foreach ($sCurves as $row) {
            $week = (int) ($row['week_number'] ?? 0);
            if ($week <= 0) {
                continue;
            }

            if ($latestWeek === null || $week > (int) ($latestWeek['week_number'] ?? 0)) {
                $latestWeek = $row;
            }
        }

        if ($latestWeek === null) {
            return null;
        }

        return $latestWeek['realisasi_pct'] ?? $latestWeek['rencana_pct'] ?? null;
    }

    private function inferDivision(array $data, array $payload): ?string
    {
        $haystacks = [];

        foreach (['project_name', 'project_code', 'owner', 'client_name'] as $field) {
            if (!empty($data[$field])) {
                $haystacks[] = strtolower((string) $data[$field]);
            }
        }

        foreach (($payload['work_items'] ?? []) as $row) {
            if (!empty($row['item_name'])) {
                $haystacks[] = strtolower((string) $row['item_name']);
            }
        }

        $combined = implode(' ', $haystacks);

        $buildingKeywords = ['gedung', 'rsud', 'rumah sakit', 'tower', 'apartemen', 'hotel', 'mall'];
        foreach ($buildingKeywords as $keyword) {
            if (str_contains($combined, $keyword)) {
                return 'Building';
            }
        }

        $infrastructureKeywords = ['jalan', 'tol', 'jembatan', 'bendungan', 'drainase', 'pelabuhan', 'irigasi'];
        foreach ($infrastructureKeywords as $keyword) {
            if (str_contains($combined, $keyword)) {
                return 'Infrastructure';
            }
        }

        return !empty($payload['work_items']) || !empty($payload['materials']) || !empty($payload['equipments'])
            ? 'Building'
            : null;
    }

    private function addWarningOnce(string $message): void
    {
        if (!in_array($message, $this->warnings, true)) {
            $this->warnings[] = $message;
        }
    }

    private function recordProjectRowConflict(array &$seenProjectRows, array $data, array $row): void
    {
        $projectCode = trim((string) ($data['project_code'] ?? ''));

        if ($projectCode === '') {
            return;
        }

        $currentSnapshot = [
            'project_name' => $data['project_name'] ?? null,
            'division' => $data['division'] ?? null,
            'contract_value' => $data['contract_value'] ?? null,
            'planned_cost' => $data['planned_cost'] ?? null,
            'actual_cost' => $data['actual_cost'] ?? null,
            'planned_duration' => $data['planned_duration'] ?? null,
            'actual_duration' => $data['actual_duration'] ?? null,
        ];

        if (!isset($seenProjectRows[$projectCode])) {
            $seenProjectRows[$projectCode] = [
                'data' => $currentSnapshot,
                'sheet' => $row['__sheet'] ?? 'unknown',
                'row' => $row['__source_row'] ?? null,
            ];
            return;
        }

        $previous = $seenProjectRows[$projectCode];
        $changedFields = [];

        foreach ($currentSnapshot as $field => $value) {
            if (($previous['data'][$field] ?? null) != $value) {
                $changedFields[] = $field;
            }
        }

        if (empty($changedFields)) {
            return;
        }

        $warning = sprintf(
            'Project code "%s" muncul lebih dari sekali dengan data berbeda antara sheet %s baris %s dan sheet %s baris %s.',
            $projectCode,
            $previous['sheet'],
            $previous['row'] ?? '-',
            $row['__sheet'] ?? 'unknown',
            $row['__source_row'] ?? '-',
        );

        if (!in_array($warning, $this->warnings, true)) {
            $this->warnings[] = $warning;
        }

        $this->audit['project_row_conflicts'][$projectCode] = [
            'changed_fields' => $changedFields,
            'first' => $previous,
            'latest' => [
                'data' => $currentSnapshot,
                'sheet' => $row['__sheet'] ?? 'unknown',
                'row' => $row['__source_row'] ?? null,
            ],
        ];
    }



    private function candidateValueKey(mixed $value): string
    {
        return match (true) {
            is_bool($value) => $value ? 'true' : 'false',
            is_array($value) => json_encode($value),
            is_float($value) => number_format($value, 8, '.', ''),
            default => (string) $value,
        };
    }

    private function mapper(): WorkbookFieldMapper
    {
        return $this->mapper ?? new WorkbookFieldMapper();
    }

    private function resetState(): void
    {
        $this->errors = [];
        $this->unrecognized = [];
        $this->audit = [];
        $this->warnings = [];
        $this->imported = 0;
        $this->skipped = 0;
        $this->total = 0;
    }

    /**
     * Generate sample construction risks for the project (skip if risks already exist).
     */
    private function generateSampleRisks(Project $project): void
    {
        if ($project->risks()->count() > 0) {
            return;
        }

        $risks = [
            [
                'risk_code'           => 'R-001',
                'risk_title'          => 'Keterlambatan pengiriman material baja',
                'risk_description'    => 'Supplier material baja mengalami keterlambatan produksi yang berdampak pada jadwal pekerjaan struktur.',
                'category'            => 'Material',
                'financial_impact_idr' => 50,
                'probability'         => 3,
                'impact'              => 4,
                'mitigation'          => 'Diversifikasi supplier, PO lebih awal 2 minggu dari jadwal.',
                'status'              => 'monitoring',
                'owner'               => 'Procurement Manager',
            ],
            [
                'risk_code'           => 'R-002',
                'risk_title'          => 'Cuaca ekstrem (hujan lebat berkepanjangan)',
                'risk_description'    => 'Musim hujan berkepanjangan menghambat pekerjaan outdoor terutama pondasi dan abutment.',
                'category'            => 'Cuaca',
                'financial_impact_idr' => 30,
                'probability'         => 4,
                'impact'              => 3,
                'mitigation'          => 'Penyesuaian jadwal kerja, penggunaan tenda pelindung, percepatan saat cuaca baik.',
                'status'              => 'open',
                'owner'               => 'Site Manager',
            ],
            [
                'risk_code'           => 'R-003',
                'risk_title'          => 'Kekurangan tenaga kerja las bersertifikat',
                'risk_description'    => 'Ketersediaan tukang las bersertifikat terbatas di lokasi proyek.',
                'category'            => 'Tenaga Kerja',
                'financial_impact_idr' => 25,
                'probability'         => 2,
                'impact'              => 3,
                'mitigation'          => 'Rekrutmen dari luar daerah, program sertifikasi internal.',
                'status'              => 'mitigated',
                'owner'               => 'HR Manager',
            ],
            [
                'risk_code'           => 'R-004',
                'risk_title'          => 'Perubahan desain oleh konsultan',
                'risk_description'    => 'Revisi gambar struktur menyebabkan rework dan penambahan volume pekerjaan.',
                'category'            => 'Desain',
                'financial_impact_idr' => 80,
                'probability'         => 2,
                'impact'              => 5,
                'mitigation'          => 'Review desain lebih ketat di awal, klausul change order dalam kontrak.',
                'status'              => 'open',
                'owner'               => 'Project Manager',
            ],
            [
                'risk_code'           => 'R-005',
                'risk_title'          => 'Keterlambatan perizinan IMB',
                'risk_description'    => 'Proses IMB lebih lama dari estimasi sehingga menunda mobilisasi alat berat.',
                'category'            => 'Perizinan',
                'financial_impact_idr' => 40,
                'probability'         => 2,
                'impact'              => 4,
                'mitigation'          => 'Pengurusan paralel dengan pekerjaan persiapan, koordinasi rutin dengan dinas terkait.',
                'status'              => 'closed',
                'owner'               => 'Legal & Permit',
            ],
            [
                'risk_code'           => 'R-006',
                'risk_title'          => 'Kenaikan harga BBM dan material',
                'risk_description'    => 'Eskalasi harga bahan bakar dan material bangunan melebihi asumsi RAB.',
                'category'            => 'Finansial',
                'financial_impact_idr' => 120,
                'probability'         => 3,
                'impact'              => 4,
                'mitigation'          => 'Klausul eskalasi harga dalam kontrak, pembelian material di awal proyek.',
                'status'              => 'monitoring',
                'owner'               => 'Cost Controller',
            ],
        ];

        foreach ($risks as $risk) {
            $score = $risk['probability'] * $risk['impact'];
            $severity = $score >= 12 ? 'critical' : ($score >= 6 ? 'high' : ($score >= 3 ? 'medium' : 'low'));

            ProjectRisk::create(array_merge($risk, [
                'project_id'         => $project->id,
                'severity'           => $severity,
                'identified_at'      => now()->subDays(rand(10, 60)),
                'target_resolved_at' => now()->addDays(rand(30, 90)),
            ]));
        }
    }

    /**
     * Generate an S-curve progress curve for the project (skip if data already exists).
     */
    private function generateProgressCurve(Project $project): void
    {
        if ($project->progressCurves()->count() > 0) {
            return;
        }

        $weeks = (int) ($project->planned_duration ?? 24);
        if ($weeks < 4) $weeks = 24;

        $startDate = $project->start_date ? \Carbon\Carbon::parse($project->start_date) : now()->subMonths(6);

        // Generate S-curve (logistic function) for plan
        for ($w = 1; $w <= $weeks; $w++) {
            $t = ($w - 1) / max($weeks - 1, 1);
            // S-curve: slow start, fast middle, slow end
            $planPct = 100 / (1 + exp(-10 * ($t - 0.5)));
            $planPct = round(min($planPct, 100), 2);

            // Actual: slightly behind plan with some variance
            $lag = $t < 0.3 ? rand(0, 3) : ($t < 0.7 ? rand(1, 5) : rand(0, 3));
            $actualPct = round(max(0, min(100, $planPct - $lag + (rand(-10, 10) / 10))), 2);

            // Last week: actual should be close to plan
            if ($w === $weeks) {
                $actualPct = round(min(100, $planPct - rand(0, 2)), 2);
            }

            ProjectProgressCurve::create([
                'project_id'    => $project->id,
                'week_number'   => $w,
                'week_date'     => $startDate->copy()->addWeeks($w - 1)->toDateString(),
                'rencana_pct'   => $planPct,
                'realisasi_pct' => $actualPct,
                'deviasi_pct'   => round($actualPct - $planPct, 2),
            ]);
        }
    }
}
