<?php

namespace App\Console\Commands;

use App\Models\HostingAccount;
use App\Services\BackupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RunScheduledBackups extends Command
{
    protected $signature = 'backups:run {--dry-run : Show what would be backed up}';
    protected $description = 'Run scheduled backups for all active hosting accounts';

    public function handle(BackupService $service): int
    {
        $this->info('Starting scheduled backup run...');
        
        $accounts = HostingAccount::where('status', 'active')
            ->whereHas('hostingPackage', function ($q) {
                $q->where('daily_backups', '>', 0);
            })
            ->with('hostingPackage')
            ->get();

        if ($accounts->isEmpty()) {
            $this->warn('No accounts with backup-enabled packages found.');
            return 0;
        }

        $this->info("Found {$accounts->count()} accounts to backup.");

        if ($this->option('dry-run')) {
            foreach ($accounts as $acc) {
                $this->line("  Would backup: {$acc->domain} ({$acc->system_username})");
            }
            return 0;
        }

        $success = 0;
        $failed = 0;

        foreach ($accounts as $account) {
            try {
                $this->info("Backing up: {$account->domain}...");
                $service->createBackup($account, 'full');
                $success++;
                $this->info("  ✓ Completed.");
            } catch (\Exception $e) {
                $failed++;
                $this->error("  ✗ Failed: {$e->getMessage()}");
                Log::error("Scheduled backup failed for {$account->system_username}: {$e->getMessage()}");
            }
        }

        $this->info("Done. Success: {$success}, Failed: {$failed}");
        return 0;
    }
}
