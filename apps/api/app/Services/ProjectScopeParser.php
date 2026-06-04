<?php

namespace App\Services;

class ProjectScopeParser
{
    public function normalize(?string $projectName, mixed $scopeOfWork = null): array
    {
        $name = $this->clean($projectName);
        $scope = $this->clean($scopeOfWork);

        if ($name === null) {
            return ['project_name' => null, 'scope_of_work' => $scope];
        }

        if ($scope !== null) {
            return ['project_name' => $name, 'scope_of_work' => $scope];
        }

        if (!preg_match('/^(.*?)\s*\(([^()]*)\)\s*$/u', $name, $matches)) {
            return ['project_name' => $name, 'scope_of_work' => null];
        }

        $cleanName = $this->clean($matches[1] ?? null);
        $parsedScope = $this->clean($matches[2] ?? null);

        if ($cleanName === null || $parsedScope === null) {
            return ['project_name' => $name, 'scope_of_work' => null];
        }

        return ['project_name' => $cleanName, 'scope_of_work' => $parsedScope];
    }

    private function clean(mixed $value): ?string
    {
        $value = preg_replace('/\s+/', ' ', trim((string) $value));

        return $value === '' ? null : $value;
    }
}
