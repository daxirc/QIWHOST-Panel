<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SslCertificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain',
        'provider',
        'hosting_account_id',
        'is_active',
        'is_wildcard',
        'is_auto_renew',
        'expiration_date',
        'certificate',
        'private_key',
        'certificate_chain',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_wildcard' => 'boolean',
        'is_auto_renew' => 'boolean',
        'expiration_date' => 'datetime',
    ];

    protected $hidden = [
        'private_key',
    ];

    public function hostingAccount(): BelongsTo
    {
        return $this->belongsTo(HostingAccount::class);
    }
}
