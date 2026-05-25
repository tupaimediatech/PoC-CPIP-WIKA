<?php

namespace App\Http\Requests;

use App\Enums\Division;
use App\Services\ProjectScopeParser;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = $this->route('project')?->id;

        return [
            'project_code'     => 'required|string|max:20|unique:projects,project_code,' . $projectId,
            'project_name'     => 'required|string|max:255',
            'scope_of_work'    => 'nullable|string|max:255',
            'division'         => ['required', Rule::enum(Division::class)],
            'sbu'              => 'nullable|string|max:100',
            'owner'            => 'nullable|string|max:100',
            'contract_type'    => 'nullable|string|max:100',
            'payment_method'   => 'nullable|string|max:100',
            'partnership'      => 'nullable|string|max:50',
            'funding_source'   => 'nullable|string|max:100',
            'location'         => 'nullable|string|max:255',
            'unit'             => 'nullable|string|max:30',
            'volume'           => 'nullable|numeric|min:0',
            'harsat'           => 'nullable|numeric|min:0',
            'contract_value'   => 'required|numeric|min:0',
            'planned_cost'     => 'required|numeric|min:0',
            'actual_cost'      => 'required|numeric|min:0',
            'planned_duration' => 'required|integer|min:1',
            'actual_duration'  => 'required|integer|min:1',
            'progress_pct'     => 'nullable|numeric|min:0|max:100',
            'gross_profit_pct' => 'nullable|numeric|min:-100|max:100',
            'project_year'     => 'nullable|integer|min:2000|max:2099',
            'start_date'       => 'nullable|date',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (!$this->has('project_name')) {
            return;
        }

        $identity = app(ProjectScopeParser::class)->normalize(
            $this->input('project_name'),
            $this->input('scope_of_work'),
        );

        $this->merge([
            'project_name' => $identity['project_name'],
            'scope_of_work' => $identity['scope_of_work'],
        ]);
    }

    public function messages(): array
    {
        return [
            'division.in'          => 'Division harus Infrastructure atau Building.',
            'project_year.integer'  => 'Project year harus berupa angka.',
            'project_year.min'      => 'Project year minimal 2000.',
            'project_year.max'      => 'Project year maksimal 2099.',
        ];
    }
}
