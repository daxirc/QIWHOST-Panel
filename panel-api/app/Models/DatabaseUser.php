<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DatabaseUser extends Model
{
    use HasFactory;

    protected $table = 'database_users';

    protected $fillable = [
        'hosting_account_id',
        'username',
        'password_encrypted',
        'host',
    ];

    protected $hidden = [
        'password_encrypted',
    ];

    public function hostingAccount(): BelongsTo
    {
        return $this->belongsTo(HostingAccount::class);
    }
}
