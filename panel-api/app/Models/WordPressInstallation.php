<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WordPressInstallation extends Model
{
    use HasFactory;

    protected $table = 'wordpress_installations';

    protected $fillable = [
        'hosting_account_id',
        'domain_id',
        'path',
        'version',
        'db_name',
        'db_user',
        'status',
        'wp_admin_user',
        'wp_admin_email',
        'auto_update',
        'installed_at',
    ];

    protected $casts = [
        'auto_update' => 'boolean',
        'installed_at' => 'datetime',
    ];

    public function hostingAccount(): BelongsTo
    {
        return $this->belongsTo(HostingAccount::class);
    }

    public function domain(): BelongsTo
    {
        return $this->belongsTo(Domain::class);
    }
}
