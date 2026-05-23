<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhpSetting extends Model
{
    use HasFactory;

    protected $table = 'php_settings';

    protected $fillable = [
        'hosting_account_id',
        'setting_key',
        'setting_value',
    ];

    public function hostingAccount(): BelongsTo
    {
        return $this->belongsTo(HostingAccount::class);
    }
}
