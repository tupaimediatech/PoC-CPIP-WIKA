<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectWbs extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'ingestion_file_id',
        'name_of_work_phase',
        'client_name',
        'project_manager',
        'report_source',
        'progress_prev_pct',
        'progress_this_pct',
        'progress_total_pct',
        'contract_value',
        'addendum_value',
        'total_pagu',
        'hpp_plan_total',
        'hpp_actual_total',
        'hpp_deviation',
        'deviasi_pct',
    ];

    protected $casts = [
        'progress_prev_pct'  => 'decimal:2',
        'progress_this_pct'  => 'decimal:2',
        'progress_total_pct' => 'decimal:2',
        'contract_value'     => 'decimal:2',
        'addendum_value'     => 'decimal:2',
        'total_pagu'         => 'decimal:2',
        'hpp_plan_total'     => 'decimal:2',
        'hpp_actual_total'   => 'decimal:2',
        'hpp_deviation'      => 'decimal:2',
        'deviasi_pct'        => 'decimal:4',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function ingestionFile(): BelongsTo
    {
        return $this->belongsTo(IngestionFile::class);
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(ProjectWorkItem::class, 'period_id');
    }

    public function materialLogs(): HasMany
    {
        return $this->hasMany(ProjectMaterialLog::class, 'period_id');
    }

    public function equipmentLogs(): HasMany
    {
        return $this->hasMany(ProjectEquipmentLog::class, 'period_id');
    }
}
