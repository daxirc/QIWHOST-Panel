<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'hosting_account_id',
        'username',
        'password',
        'name',
        'quota',
        'local_part',
        'domain',
        'active',
        'smtp_active',
    ];

    protected $casts = [
        'quota' => 'integer',
        'active' => 'boolean',
        'smtp_active' => 'boolean',
    ];

    protected $hidden = [
        'password',
    ];

    public function hostingAccount(): BelongsTo
    {
        return $this->belongsTo(HostingAccount::class);
    }
}
