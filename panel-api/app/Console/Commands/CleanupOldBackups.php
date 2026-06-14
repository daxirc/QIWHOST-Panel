<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;

class CleanupOldBackups extends Command
{
    protected $signature = 'backups:cleanup';
    protected $description = 'Delete backups older than the configured retention period';

    public function handle(BackupService $service): int
    {
        $this->info('Starting backup cleanup...');
        $count = $service->cleanupOldBackups();
        $this->info("Cleanup complete. Removed {$count} old backups.");
        return 0;
    }
}
