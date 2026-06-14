<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Backup extends Model
{
    use HasFactory;

    protected $fillable = [
        'hosting_account_id',
        'backup_type',
        'status',
        'backup_log',
        'file_path',
        'file_name',
        'size',
        'storage_type',
        'completed_at',
        'failed_at',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
        'failed_at' => 'datetime',
        'size' => 'integer',
    ];

    public function hostingAccount(): BelongsTo
    {
        return $this->belongsTo(HostingAccount::class);
    }
}
