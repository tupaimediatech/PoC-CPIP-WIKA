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
        'budget_awal',
        'addendum',
        'total_budget',
        'realisasi',
        'deviasi',
        'deviasi_pct',
        'is_total_row',
    ];

    protected $casts = [
        'level'        => 'integer',
        'sort_order'   => 'integer',
        'budget_awal'  => 'decimal:2',
        'addendum'     => 'decimal:2',
        'total_budget' => 'decimal:2',
        'realisasi'    => 'decimal:2',
        'deviasi'      => 'decimal:2',
        'deviasi_pct'  => 'decimal:4',
        'is_total_row' => 'boolean',
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
