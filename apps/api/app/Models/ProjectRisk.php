<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectRisk extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'risk_code',
        'risk_title',
        'risk_description',
        'category',
        'risk_level',
        'financial_impact_idr',
        'probability',
        'impact',
        'severity',
        'mitigation',
        'status',
        'owner',
        'identified_at',
        'target_resolved_at',
    ];

    protected $casts = [
        'financial_impact_idr' => 'decimal:2',
        'probability'          => 'integer',
        'impact'               => 'integer',
        'identified_at'        => 'date',
        'target_resolved_at'   => 'date',
    ];

    protected static function booted(): void
    {
        static::saving(function (ProjectRisk $risk) {
            if ($risk->probability && $risk->impact) {
                $score = $risk->probability * $risk->impact;
                $risk->severity = match(true) {
                    $score >= 20 => 'critical',
                    $score >= 12 => 'high',
                    $score >= 6  => 'medium',
                    default      => 'low',
                };
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
