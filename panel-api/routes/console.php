<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Setting;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Scheduled Backups - Run daily at configured time
Schedule::command('backups:run')->dailyAt(
    Setting::where('key', 'backup_time')->where('group', 'server_defaults')->value('value') ?? '02:00'
)->when(function () {
    return Setting::where('key', 'backup_auto_enabled')->where('group', 'backup_remote')->value('value') === '1';
});

// Cleanup old backups - Run daily at 04:00
Schedule::command('backups:cleanup')->dailyAt('04:00');
