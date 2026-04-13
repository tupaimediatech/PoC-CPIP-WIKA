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
        'report_source',
        'bq_external',
        'rab_internal',
    ];

    protected $casts = [
        'bq_external'  => 'decimal:2',
        'rab_internal' => 'decimal:2',
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
        return $this->hasMany(ProjectWorkItem::class, 'wbs_id');
    }

    public function materialLogs(): HasMany
    {
        return $this->hasMany(ProjectMaterialLog::class, 'wbs_id');
    }

    public function equipmentLogs(): HasMany
    {
        return $this->hasMany(ProjectEquipmentLog::class, 'wbs_id');
    }
}
