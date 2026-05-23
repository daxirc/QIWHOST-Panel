<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HostingAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'hosting_package_id',
        'domain',
        'system_username',
        'system_password',
        'status',
        'php_version',
        'setup_date',
        'expiry_date',
        'renewal_date',
        'description',
    ];

    protected $casts = [
        'setup_date' => 'datetime',
        'expiry_date' => 'datetime',
        'renewal_date' => 'datetime',
    ];

    protected $hidden = [
        'system_password',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function hostingPackage(): BelongsTo
    {
        return $this->belongsTo(HostingPackage::class);
    }

    public function domains(): HasMany
    {
        return $this->hasMany(Domain::class);
    }

    public function emailAccounts(): HasMany
    {
        return $this->hasMany(EmailAccount::class);
    }

    public function databases(): HasMany
    {
        return $this->hasMany(Database::class);
    }

    public function sslCertificates(): HasMany
    {
        return $this->hasMany(SslCertificate::class);
    }

    public function backups(): HasMany
    {
        return $this->hasMany(Backup::class);
    }

    public function cronJobs(): HasMany
    {
        return $this->hasMany(CronJob::class);
    }

    public function wordpressInstallations(): HasMany
    {
        return $this->hasMany(WordPressInstallation::class);
    }

    public function databaseUsers(): HasMany
    {
        return $this->hasMany(DatabaseUser::class);
    }

    public function phpSettings(): HasMany
    {
        return $this->hasMany(PhpSetting::class);
    }
}
