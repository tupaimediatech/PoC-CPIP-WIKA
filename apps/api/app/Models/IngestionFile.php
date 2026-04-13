<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class IngestionFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'original_name',
        'stored_path',
        'disk',
        'status',
        'total_rows',
        'imported_rows',
        'skipped_rows',
        'errors',
        'processed_at',
        'user_id',
    ];

    protected $casts = [
        'errors'       => 'array',
        'processed_at' => 'datetime',
    ];


    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }


    public function fileExists(): bool
    {
        return Storage::disk($this->disk)->exists($this->stored_path);
    }

    public function getAbsolutePath(): string
    {
        return Storage::disk($this->disk)->path($this->stored_path);
    }

    public function markProcessing(): void
    {
        $this->update(['status' => 'processing']);
    }

    public function markDone(int $totalRows, int $imported, int $skipped, array $errors): void
    {
        $status = match(true) {
            $imported === 0 && $skipped > 0 => 'failed',
            $skipped > 0                    => 'partial',
            default                         => 'success',
        };

        $this->update([
            'status'        => $status,
            'total_rows'    => $totalRows,
            'imported_rows' => $imported,
            'skipped_rows'  => $skipped,
            'errors'        => $errors,
            'processed_at'  => now(),
        ]);
    }

    public function markFailed(string $reason): void
    {
        $this->update([
            'status'       => 'failed',
            'errors'       => [$reason],
            'processed_at' => now(),
        ]);
    }
}