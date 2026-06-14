<?php

namespace App\Jobs;

use App\Models\HostingAccount;
use App\Services\BackupService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CreateBackupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 900;
    public int $tries = 1;

    public function __construct(
        public HostingAccount $account,
        public string $backupType
    ) {}

    public function handle(BackupService $service): void
    {
        try {
            $service->createBackup($this->account, $this->backupType);
            Log::info("Backup completed for {$this->account->system_username} ({$this->backupType})");
        } catch (\Exception $e) {
            Log::error("Backup failed for {$this->account->system_username}: {$e->getMessage()}");
        }
    }
}
