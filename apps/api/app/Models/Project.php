<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Services\KpiCalculatorService;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_code',
        'project_name',
        'division',
        'sbu',
        'owner',
        'profit_center',
        'type_of_contract',
        'contract_type',
        'payment_method',
        'partnership',
        'partner_name',
        'consultant_name',
        'funding_source',
        'location',
        'contract_value',
        'planned_cost',
        'actual_cost',
        'planned_duration',
        'actual_duration',
        'progress_pct',
        'gross_profit_pct',
        'project_year',
        'start_date',
        'cpi',
        'spi',
        'status',
        'ingestion_file_id',
    ];

    protected $casts = [
        'contract_value'   => 'decimal:2',
        'planned_cost'     => 'decimal:2',
        'actual_cost'      => 'decimal:2',
        'progress_pct'     => 'decimal:2',
        'project_year'     => 'integer',
        'start_date'       => 'date',
        'cpi'              => 'decimal:4',
        'spi'              => 'decimal:4',
        'planned_duration' => 'integer',
        'actual_duration'  => 'integer',
    ];

    
    protected static function booted(): void
    {
        static::saving(function (Project $project) {
            if (empty($project->project_year)) {
                $project->project_year = (int) now()->format('Y');
            }

            $kpi = (new KpiCalculatorService())->calculate(
                $project->planned_cost  !== null ? (float) $project->planned_cost  : null,
                $project->actual_cost   !== null ? (float) $project->actual_cost   : null,
                $project->planned_duration !== null ? (int) $project->planned_duration : null,
                $project->actual_duration  !== null ? (int) $project->actual_duration  : null,
                $project->progress_pct  !== null ? (float) $project->progress_pct  : 100.0,
            );

            $project->cpi    = $kpi['cpi'];
            $project->spi    = $kpi['spi'];
            $project->status = $kpi['status'];
        });
    }

    
    public function scopeByDivision($query, ?string $division)
    {
        if ($division) {
            return $query->where('division', $division);
        }
        return $query;
    }

    public function scopeBySbu($query, ?string $sbu)
    {
        if ($sbu) {
            return $query->where('sbu', $sbu);
        }
        return $query;
    }

    public function scopeByLocation($query, ?string $location)
    {
        if ($location) {
            return $query->where('location', $location);
        }
        return $query;
    }

    public function scopeByPartnership($query, ?string $partnership)
    {
        if ($partnership) {
            return $query->where('partnership', $partnership);
        }
        return $query;
    }

    public function scopeByContractRange($query, ?float $min, ?float $max)
    {
        if ($min !== null) $query->where('contract_value', '>=', $min);
        if ($max !== null) $query->where('contract_value', '<=', $max);
        return $query;
    }

    public function scopeByStatus($query, ?string $status)
    {
        if ($status) {
            return $query->where('status', $status);
        }
        return $query;
    }
    
    public function scopeByYear($query, ?int $year)
    {
        if ($year) {
            return $query->where('project_year', $year);
        }
        return $query;
    }

   
    public function getIsOverbudgetAttribute(): bool
    {
        return $this->cpi < 1;
    }

    public function getIsDelayAttribute(): bool
    {
        return $this->spi < 1;
    }

    /**
     * Gross profit = (contract_value - actual_cost) / contract_value * 100
     * Uses stored value if explicitly set, otherwise calculates on-the-fly.
     */
    public function getGrossProfitPctAttribute(): ?string
    {
        // If manually stored, use it
        $stored = $this->attributes['gross_profit_pct'] ?? null;
        if ($stored !== null) {
            return number_format((float) $stored, 2, '.', '');
        }

        $contract = (float) ($this->attributes['contract_value'] ?? 0);
        $actual   = (float) ($this->attributes['actual_cost'] ?? 0);

        if ($contract <= 0) return null;

        return number_format((($contract - $actual) / $contract) * 100, 2, '.', '');
    }

    /**
     * Returns formatted timeline for level-7 view.
     * Derives end dates from start_date + duration (months).
     */
    public function getTimelineAttribute(): array
    {
        $fmt = fn($date) => $date ? $date->translatedFormat('d M Y') : null;

        $plannedEnd = $this->start_date
            ? $this->start_date->copy()->addMonths((int) $this->planned_duration - 1)->endOfMonth()
            : null;

        $actualEnd = $this->start_date
            ? $this->start_date->copy()->addMonths((int) $this->actual_duration - 1)->endOfMonth()
            : null;

        $delay = (int) $this->actual_duration - (int) $this->planned_duration;

        return [
            'start_date'   => $fmt($this->start_date),
            'planned_end'  => $fmt($plannedEnd),
            'actual_end'   => $fmt($actualEnd),
            'planned'      => $this->start_date
                ? $fmt($this->start_date) . ' - ' . $fmt($plannedEnd)
                : null,
            'actual'       => $this->start_date
                ? $fmt($this->start_date) . ' - ' . $fmt($actualEnd)
                : null,
            'delay_months' => $delay,
            'delay_note'   => $delay > 0 ? "Delay {$delay} bulan" : ($delay < 0 ? "Lebih cepat " . abs($delay) . " bulan" : "On time"),
        ];
    }

    public function ingestionFile(): BelongsTo
    {
        return $this->belongsTo(IngestionFile::class);
    }

    public function wbsPhases(): HasMany
    {
        return $this->hasMany(ProjectWbs::class);
    }

    /**
     * Alias for backward compatibility
     * @deprecated Use wbsPhases() instead
     */
    public function periods(): HasMany
    {
        return $this->wbsPhases();
    }

    public function progressCurves(): HasMany
    {
        return $this->hasMany(ProjectProgressCurve::class);
    }

    public function risks(): HasMany
    {
        return $this->hasMany(ProjectRisk::class);
    }
}