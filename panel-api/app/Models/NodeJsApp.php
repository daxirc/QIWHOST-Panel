<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NodeJsApp extends Model
{
    use HasFactory;

    protected $table = 'nodejs_apps';

    protected $fillable = [
        'hosting_account_id',
        'domain_id',
        'name',
        'node_version',
        'port',
        'startup_file',
        'environment',
        'status',
        'git_repo',
        'git_branch',
        'pm2_name',
        'auto_restart',
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
