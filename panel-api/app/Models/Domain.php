<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Domain extends Model
{
    use HasFactory;

    protected $fillable = [
        'hosting_account_id',
        'domain',
        'ip',
        'home_root',
        'domain_root',
        'domain_public',
        'is_secure_with_ssl',
        'is_main',
        'status',
    ];

    protected $casts = [
        'is_secure_with_ssl' => 'boolean',
        'is_main' => 'boolean',
    ];

    public function hostingAccount(): BelongsTo
    {
        return $this->belongsTo(HostingAccount::class);
    }

    public function dnsRecords(): HasMany
    {
        return $this->hasMany(DnsRecord::class);
    }
}
