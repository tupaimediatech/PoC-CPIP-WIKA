<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectWorkItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_id',
        'parent_id',
        'level',
        'item_no',
        'item_name',
        'sort_order',
        'volume',
        'satuan',
        'harsat_internal',
        'volume_actual',
        'harsat_actual',
        'cost_category',
        'cost_subcategory',
        'budget_awal',
        'addendum',
        'total_budget',
        'realisasi',
        'deviasi',
        'deviasi_pct',
        'bobot_pct',
        'progress_plan_pct',
        'progress_actual_pct',
        'planned_value',
        'earned_value',
        'actual_cost_item',
        'vendor_name',
        'po_number',
        'vendor_contract_value',
        'termin_paid',
        'retention',
        'outstanding_debt',
        'data_source',
        'notes',
        'is_total_row',
    ];

    protected $casts = [
        'level'                 => 'integer',
        'sort_order'            => 'integer',
        'volume'                => 'decimal:4',
        'harsat_internal'       => 'decimal:4',
        'volume_actual'         => 'decimal:4',
        'harsat_actual'         => 'decimal:4',
        'budget_awal'           => 'decimal:2',
        'addendum'              => 'decimal:2',
        'total_budget'          => 'decimal:2',
        'realisasi'             => 'decimal:2',
        'deviasi'               => 'decimal:2',
        'deviasi_pct'           => 'decimal:4',
        'bobot_pct'             => 'decimal:4',
        'progress_plan_pct'     => 'decimal:4',
        'progress_actual_pct'   => 'decimal:4',
        'planned_value'         => 'decimal:2',
        'earned_value'          => 'decimal:2',
        'actual_cost_item'      => 'decimal:2',
        'vendor_contract_value' => 'decimal:2',
        'termin_paid'           => 'decimal:2',
        'retention'             => 'decimal:2',
        'outstanding_debt'      => 'decimal:2',
        'is_total_row'          => 'boolean',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(ProjectWbs::class, 'period_id');
    }

    /**
     * Alias for clarity - this belongs to a WBS phase
     */
    public function wbsPhase(): BelongsTo
    {
        return $this->belongsTo(ProjectWbs::class, 'period_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProjectWorkItem::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ProjectWorkItem::class, 'parent_id');
    }

    public function materialLogs(): HasMany
    {
        return $this->hasMany(ProjectMaterialLog::class, 'work_item_id');
    }

    public function equipmentLogs(): HasMany
    {
        return $this->hasMany(ProjectEquipmentLog::class, 'work_item_id');
    }
}
