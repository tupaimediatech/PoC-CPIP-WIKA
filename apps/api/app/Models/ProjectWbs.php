<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectWbs extends Model
{
    use HasFactory;

    private const MAX_MONEY_ABS_VALUE = 1.0E28;

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
        'bq_external',
        'actual_costs',
        'realized_costs',
        'hpp_deviation',
        'deviasi_pct',
    ];

    protected $casts = [
        'progress_prev_pct'  => 'decimal:2',
        'progress_this_pct'  => 'decimal:2',
        'progress_total_pct' => 'decimal:2',
        'contract_value'     => 'decimal:2',
        'addendum_value'     => 'decimal:2',
        'bq_external'        => 'decimal:2',
        'actual_costs'       => 'decimal:2',
        'realized_costs'     => 'decimal:2',
        'hpp_deviation'      => 'decimal:2',
        'deviasi_pct'        => 'decimal:4',
    ];

    protected static function booted(): void
    {
        static::saving(function (ProjectWbs $wbs): void {
            foreach ([
                'contract_value' => 'Nilai kontrak',
                'addendum_value' => 'Nilai addendum',
                'bq_external' => 'BQ external',
                'actual_costs' => 'Actual costs',
                'realized_costs' => 'Realized costs',
                'hpp_deviation' => 'HPP deviation',
            ] as $column => $label) {
                $wbs->assertMoneyValueIsStorable($column, $label);
            }
        });
    }

    private function assertMoneyValueIsStorable(string $column, string $label): void
    {
        $value = $this->getAttribute($column);

        if ($value === null || $value === '') {
            return;
        }

        $numeric = (float) $value;

        if (!is_finite($numeric) || abs($numeric) >= self::MAX_MONEY_ABS_VALUE) {
            $phase = trim((string) ($this->name_of_work_phase ?? ''));
            $suffix = $phase !== '' ? " pada WBS \"{$phase}\"" : '';

            throw new \RuntimeException(
                "{$label}{$suffix} terlalu besar atau format Excel tidak valid."
            );
        }
    }

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
