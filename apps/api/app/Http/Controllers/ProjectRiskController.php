<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectRisk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectRiskController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $risks = $project->risks()
            ->orderByRaw("CASE status WHEN 'open' THEN 0 WHEN 'monitoring' THEN 1 WHEN 'mitigated' THEN 2 ELSE 3 END")
            ->orderByRaw("CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->get();

        return response()->json([
            'data' => $risks,
            'meta' => [
                'total'                => $risks->count(),
                'open_count'           => $risks->where('status', 'open')->count(),
                'critical_count'       => $risks->where('severity', 'critical')->count(),
                'total_financial_impact' => $risks->where('status', '!=', 'closed')
                    ->sum(fn($r) => (float) $r->financial_impact_idr),
            ],
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'risk_code'            => 'nullable|string|max:20',
            'risk_title'           => 'required|string|max:255',
            'risk_description'     => 'nullable|string',
            'category'             => 'nullable|in:cost,schedule,quality,safety,scope,external',
            'risk_level'           => 'nullable|string|max:50',
            'financial_impact_idr' => 'nullable|numeric|min:0',
            'probability'          => 'nullable|integer|min:1|max:5',
            'impact'               => 'nullable|integer|min:1|max:5',
            'mitigation'           => 'nullable|string',
            'status'               => 'nullable|in:open,mitigated,closed,monitoring',
            'owner'                => 'nullable|string|max:100',
            'identified_at'        => 'nullable|date',
            'target_resolved_at'   => 'nullable|date',
        ]);

        $risk = $project->risks()->create($validated);

        return response()->json(['data' => $risk], 201);
    }

    public function update(Request $request, Project $project, ProjectRisk $risk): JsonResponse
    {
        abort_unless($risk->project_id === $project->id, 404);

        $validated = $request->validate([
            'risk_code'            => 'nullable|string|max:20',
            'risk_title'           => 'sometimes|required|string|max:255',
            'risk_description'     => 'nullable|string',
            'category'             => 'nullable|in:cost,schedule,quality,safety,scope,external',
            'risk_level'           => 'nullable|string|max:50',
            'financial_impact_idr' => 'nullable|numeric|min:0',
            'probability'          => 'nullable|integer|min:1|max:5',
            'impact'               => 'nullable|integer|min:1|max:5',
            'mitigation'           => 'nullable|string',
            'status'               => 'nullable|in:open,mitigated,closed,monitoring',
            'owner'                => 'nullable|string|max:100',
            'identified_at'        => 'nullable|date',
            'target_resolved_at'   => 'nullable|date',
        ]);

        $risk->update($validated);

        return response()->json(['data' => $risk->fresh()]);
    }

    public function destroy(Project $project, ProjectRisk $risk): JsonResponse
    {
        abort_unless($risk->project_id === $project->id, 404);
        $risk->delete();

        return response()->json(['message' => 'Risk berhasil dihapus.']);
    }
}
