<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HostingPackage extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'disk_space',
        'bandwidth',
        'databases',
        'ftp_accounts',
        'email_accounts',
        'subdomains',
        'parked_domains',
        'addon_domains',
        'ssl_certificates',
        'daily_backups',
        'free_domain',
    ];

    protected $casts = [
        'free_domain' => 'boolean',
        'disk_space' => 'integer',
        'bandwidth' => 'integer',
        'databases' => 'integer',
        'ftp_accounts' => 'integer',
        'email_accounts' => 'integer',
        'subdomains' => 'integer',
        'parked_domains' => 'integer',
        'addon_domains' => 'integer',
        'ssl_certificates' => 'integer',
        'daily_backups' => 'integer',
    ];

    public function hostingAccounts(): HasMany
    {
        return $this->hasMany(HostingAccount::class);
    }
}
