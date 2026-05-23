<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CronJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'hosting_account_id',
        'command',
        'schedule',
        'user',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function hostingAccount(): BelongsTo
    {
        return $this->belongsTo(HostingAccount::class);
    }
}
