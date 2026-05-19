<?php

namespace App\Services;

use App\Models\Project;

class ProjectReplacementService
{
    public function replaceExistingProject(?string $projectCode, ?string $projectName, ?int $ingestionFileId): void
    {
        $projectCode = $this->clean($projectCode);
        $projectName = $this->clean($projectName);

        $existing = null;

        if ($projectCode !== null) {
            $existing = Project::where('project_code', $projectCode)->first();
        }

        if ($existing === null && $projectName !== null) {
            $matches = Project::query()
                ->whereNotNull('project_name')
                ->get()
                ->filter(fn(Project $project) => $this->normalizeName($project->project_name) === $this->normalizeName($projectName))
                ->values();

            if ($matches->count() > 1) {
                throw new \RuntimeException('Project name matches multiple existing projects; replacement aborted.');
            }

            $existing = $matches->first();
        }

        if ($existing === null) {
            return;
        }

        if ($ingestionFileId !== null && (int) $existing->ingestion_file_id === $ingestionFileId) {
            return;
        }

        $existing->delete();
    }

    private function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function normalizeName(?string $value): string
    {
        return strtolower(preg_replace('/\s+/', ' ', trim((string) $value)) ?? '');
    }
}
