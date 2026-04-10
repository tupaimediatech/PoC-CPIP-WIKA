<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectEquipmentLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_id',
        'work_item_id',
        'vendor_name',
        'equipment_name',
        'jam_kerja',
        'rate_per_jam',
        'total_biaya',
        'payment_status',
        'source_row',
    ];

    protected $casts = [
        'jam_kerja'    => 'decimal:2',
        'rate_per_jam' => 'decimal:2',
        'total_biaya'  => 'decimal:2',
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

    public function workItem(): BelongsTo
    {
        return $this->belongsTo(ProjectWorkItem::class, 'work_item_id');
    }
}
