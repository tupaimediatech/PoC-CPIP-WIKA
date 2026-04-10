<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMaterialLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_id',
        'work_item_id',
        'supplier_name',
        'tahun_perolehan',
        'lokasi_vendor',
        'rating_performa',
        'material_type',
        'qty',
        'satuan',
        'harga_satuan',
        'total_tagihan',
        'realisasi_pengiriman',
        'deviasi_harga_market',
        'catatan_monitoring',
        'is_discount',
        'source_row',
    ];

    protected $casts = [
        'qty'           => 'decimal:4',
        'harga_satuan'  => 'decimal:2',
        'total_tagihan' => 'decimal:2',
        'is_discount'   => 'boolean',
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
