<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectHppItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_item_id',
        'resource_type',
        'resource_name',
        'volume',
        'satuan',
        'hpp_tender',
        'hpp_rkp',
        'realisasi',
        'total_tender',
        'total_rkp',
        'total_realisasi',
        'deviasi_rkp_realisasi',
        'deviasi_pct',
    ];

    protected $casts = [
        'volume'                => 'decimal:2',
        'hpp_tender'            => 'decimal:2',
        'hpp_rkp'               => 'decimal:2',
        'realisasi'             => 'decimal:2',
        'total_tender'          => 'decimal:2',
        'total_rkp'             => 'decimal:2',
        'total_realisasi'       => 'decimal:2',
        'deviasi_rkp_realisasi' => 'decimal:2',
        'deviasi_pct'           => 'decimal:4',
    ];

    public function workItem(): BelongsTo
    {
        return $this->belongsTo(ProjectWorkItem::class, 'work_item_id');
    }
}
