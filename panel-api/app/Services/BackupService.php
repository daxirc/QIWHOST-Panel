<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\Backup;
use App\Models\HostingAccount;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;
use phpseclib3\Net\SFTP;
use phpseclib3\Net\SSH2;

class BackupService
{
    private function getRemoteConfig(): array
    {
        $settings = Setting::where('group', 'backup_remote')->get()->pluck('value', 'key')->toArray();
        return [
            'host' => $settings['backup_remote_host'] ?? '',
            'port' => (int) ($settings['backup_remote_port'] ?? 22),
            'user' => $settings['backup_remote_user'] ?? 'root',
            'password' => $settings['backup_remote_password'] ?? '',
            'path' => rtrim($settings['backup_remote_path'] ?? '/backups', '/'),
            'enabled' => ($settings['backup_remote_enabled'] ?? '0') === '1',
        ];
    }

    private function getSftp(): SFTP
    {
        $config = $this->getRemoteConfig();
        if (!$config['enabled'] || empty($config['host'])) {
            throw new \RuntimeException('Remote backup server is not configured. Go to Admin → Settings → Backup to configure.');
        }

        $sftp = new SFTP($config['host'], $config['port'], 30);
        if (!$sftp->login($config['user'], $config['password'])) {
            throw new \RuntimeException('Failed to connect to remote backup server. Check credentials.');
        }

        return $sftp;
    }

    public function createBackup(HostingAccount $account, string $type): Backup
    {
        $timestamp = date('Ymd_His');
        $filename = "backup_{$account->system_username}_{$type}_{$timestamp}.tar.gz";
        $homeRoot = "/home/{$account->system_username}";
        $tempDir = "/tmp/qiwhost_backups/{$account->system_username}";
        
        if (!File::exists($tempDir)) {
            File::makeDirectory($tempDir, 0750, true);
        }

        $tempFilePath = "{$tempDir}/{$filename}";
        $remotePath = "{$account->system_username}/{$filename}";

        $backup = Backup::create([
            'hosting_account_id' => $account->id,
            'backup_type' => $type,
            'file_name' => $filename,
            'file_path' => $remotePath,
            'size' => 0,
            'status' => 'pending',
            'storage_type' => 'remote',
            'backup_log' => "Backup started at " . now()->toDateTimeString() . "\n",
        ]);

        try {
            $log = '';
            $dbDumpFiles = [];

            // Step 1: Database dump
            if ($type === 'database' || $type === 'full') {
                $databases = $account->databases()->get();
                foreach ($databases as $db) {
                    $fullDbName = $db->database_name_prefix . '_' . $db->database_name;
                    $dumpFile = "{$tempDir}/db_{$fullDbName}_{$timestamp}.sql";
                    
                    $dumpProc = new Process([
                        'mysqldump', '-u', 'root', $fullDbName,
                        '--result-file=' . $dumpFile,
                        '--single-transaction', '--quick', '--lock-tables=false'
                    ]);
                    $dumpProc->setTimeout(300);
                    $dumpProc->run();

                    if ($dumpProc->isSuccessful() && File::exists($dumpFile)) {
                        $dbDumpFiles[] = $dumpFile;
                        $log .= "Dumped database: {$fullDbName}\n";
                    } else {
                        $log .= "WARNING: Failed to dump {$fullDbName}: {$dumpProc->getErrorOutput()}\n";
                    }
                }
            }

            // Step 2: Create tar.gz
            if ($type === 'files') {
                $tarProc = new Process(['tar', '-czf', $tempFilePath, '-C', $homeRoot, 'public_html']);
            } elseif ($type === 'database') {
                $tarArgs = ['tar', '-czf', $tempFilePath, '-C', $tempDir];
                foreach ($dbDumpFiles as $df) { $tarArgs[] = basename($df); }
                $tarProc = new Process($tarArgs);
            } else {
                // Full: public_html + SQL dumps
                foreach ($dbDumpFiles as $df) { copy($df, "{$homeRoot}/" . basename($df)); }
                $tarArgs = ['tar', '-czf', $tempFilePath, '-C', $homeRoot, 'public_html'];
                foreach ($dbDumpFiles as $df) { $tarArgs[] = basename($df); }
                $tarProc = new Process($tarArgs);
            }

            $tarProc->setTimeout(600);
            $tarProc->run();
            if (!$tarProc->isSuccessful()) {
                throw new \RuntimeException('Tar failed: ' . $tarProc->getErrorOutput());
            }
            $log .= "Archive created: {$filename}\n";

            // Cleanup temp SQL files
            if ($type === 'full') {
                foreach ($dbDumpFiles as $df) {
                    $dest = "{$homeRoot}/" . basename($df);
                    if (File::exists($dest)) File::delete($dest);
                }
            }
            foreach ($dbDumpFiles as $df) {
                if (File::exists($df)) File::delete($df);
            }

            $fileSize = File::exists($tempFilePath) ? File::size($tempFilePath) : 0;

            // Step 3: Transfer to remote
            $config = $this->getRemoteConfig();
            if ($config['enabled'] && !empty($config['host'])) {
                $this->transferToRemote($tempFilePath, $remotePath);
                $log .= "Transferred to remote: {$config['host']}\n";
                if (File::exists($tempFilePath)) File::delete($tempFilePath);
            } else {
                $localDir = "{$homeRoot}/backups";
                if (!File::exists($localDir)) File::makeDirectory($localDir, 0750, true);
                rename($tempFilePath, "{$localDir}/{$filename}");
                $backup->storage_type = 'local';
                $backup->file_path = "backups/{$filename}";
                $log .= "Stored locally (remote not configured).\n";
            }

            $backup->update([
                'size' => $fileSize,
                'status' => 'completed',
                'storage_type' => $backup->storage_type,
                'file_path' => $backup->file_path,
                'completed_at' => now(),
                'backup_log' => $backup->backup_log . $log,
            ]);

            return $backup->fresh();

        } catch (\Exception $e) {
            $backup->update([
                'status' => 'failed',
                'failed_at' => now(),
                'backup_log' => $backup->backup_log . "ERROR: {$e->getMessage()}\n",
            ]);
            if (File::exists($tempFilePath)) File::delete($tempFilePath);
            throw $e;
        }
    }

    public function transferToRemote(string $localPath, string $remotePath): void
    {
        $config = $this->getRemoteConfig();
        $sftp = $this->getSftp();
        
        $fullRemotePath = $config['path'] . '/' . $remotePath;
        $sftp->mkdir(dirname($fullRemotePath), 0755, true);

        if (!$sftp->put($fullRemotePath, $localPath, SFTP::SOURCE_LOCAL_FILE)) {
            throw new \RuntimeException('Failed to transfer backup to remote server.');
        }

        $remoteSize = $sftp->size($fullRemotePath);
        $localSize = filesize($localPath);
        if ($remoteSize !== $localSize) {
            throw new \RuntimeException("Transfer verify failed. Local: {$localSize}, Remote: {$remoteSize}");
        }
    }

    public function downloadFromRemote(Backup $backup): string
    {
        $account = $backup->hostingAccount;
        
        if ($backup->storage_type === 'local') {
            $localPath = "/home/{$account->system_username}/{$backup->file_path}";
            if (!File::exists($localPath)) {
                throw new \RuntimeException('Backup file not found on local storage.');
            }
            return $localPath;
        }

        $config = $this->getRemoteConfig();
        $sftp = $this->getSftp();
        
        $fullRemotePath = $config['path'] . '/' . $backup->file_path;
        $tempPath = "/tmp/qiwhost_downloads/{$backup->file_name}";
        
        if (!File::exists(dirname($tempPath))) {
            File::makeDirectory(dirname($tempPath), 0750, true);
        }

        if (!$sftp->get($fullRemotePath, $tempPath)) {
            throw new \RuntimeException('Failed to download backup from remote server.');
        }

        return $tempPath;
    }

    public function deleteFromRemote(Backup $backup): void
    {
        if ($backup->storage_type === 'local') {
            $account = $backup->hostingAccount;
            $localPath = "/home/{$account->system_username}/{$backup->file_path}";
            if (File::exists($localPath)) File::delete($localPath);
            return;
        }

        try {
            $config = $this->getRemoteConfig();
            $sftp = $this->getSftp();
            $sftp->delete($config['path'] . '/' . $backup->file_path);
        } catch (\Exception $e) {
            Log::warning('Failed to delete remote backup: ' . $e->getMessage());
        }
    }

    public function restoreBackup(Backup $backup, string $restoreType = 'all'): string
    {
        $account = $backup->hostingAccount;
        $homeRoot = "/home/{$account->system_username}";
        $tempDir = "/tmp/qiwhost_restore/{$account->system_username}";
        $log = "Restore started at " . now()->toDateTimeString() . "\n";

        try {
            $localFile = $this->downloadFromRemote($backup);
            $log .= "Downloaded backup archive.\n";

            if (File::exists($tempDir)) File::deleteDirectory($tempDir);
            File::makeDirectory($tempDir, 0750, true);

            $extractProc = new Process(['tar', '-xzf', $localFile, '-C', $tempDir]);
            $extractProc->setTimeout(600);
            $extractProc->run();
            if (!$extractProc->isSuccessful()) {
                throw new \RuntimeException('Extract failed: ' . $extractProc->getErrorOutput());
            }
            $log .= "Archive extracted.\n";

            // Restore files
            if (($restoreType === 'all' || $restoreType === 'files') && File::exists("{$tempDir}/public_html")) {
                $preRestore = "{$homeRoot}/public_html_pre_restore_" . date('Ymd_His');
                if (File::exists("{$homeRoot}/public_html")) {
                    (new Process(['mv', "{$homeRoot}/public_html", $preRestore]))->run();
                    $log .= "Current files backed up to: " . basename($preRestore) . "\n";
                }
                (new Process(['cp', '-a', "{$tempDir}/public_html", "{$homeRoot}/public_html"]))->run();
                (new Process(['chown', '-R', "{$account->system_username}:{$account->system_username}", "{$homeRoot}/public_html"]))->run();
                $log .= "Files restored.\n";
            }

            // Restore databases
            if ($restoreType === 'all' || $restoreType === 'database') {
                $sqlFiles = glob("{$tempDir}/db_*.sql") ?: [];
                foreach ($sqlFiles as $sqlFile) {
                    $baseName = basename($sqlFile, '.sql');
                    $parts = explode('_', $baseName);
                    array_shift($parts); // remove 'db'
                    array_pop($parts); // remove timestamp His
                    array_pop($parts); // remove timestamp Ymd
                    $dbName = implode('_', $parts);

                    if (!empty($dbName)) {
                        $importProc = new Process(['mysql', '-u', 'root', $dbName]);
                        $importProc->setInput(File::get($sqlFile));
                        $importProc->setTimeout(300);
                        $importProc->run();
                        $log .= $importProc->isSuccessful() 
                            ? "Restored database: {$dbName}\n" 
                            : "WARNING: Failed to restore {$dbName}\n";
                    }
                }
            }

            File::deleteDirectory($tempDir);
            if ($backup->storage_type === 'remote' && File::exists($localFile)) {
                File::delete($localFile);
            }
            $log .= "Restore completed at " . now()->toDateTimeString() . "\n";
            return $log;

        } catch (\Exception $e) {
            if (File::exists($tempDir)) File::deleteDirectory($tempDir);
            throw $e;
        }
    }

    public function getRemoteStorageStats(): array
    {
        try {
            $config = $this->getRemoteConfig();
            if (!$config['enabled'] || empty($config['host'])) {
                return ['connected' => false, 'message' => 'Remote backup server not configured.'];
            }

            $ssh = new SSH2($config['host'], $config['port'], 30);
            if (!$ssh->login($config['user'], $config['password'])) {
                return ['connected' => false, 'message' => 'Failed to connect.'];
            }

            $dfOutput = $ssh->exec("df -B1 {$config['path']} 2>/dev/null | tail -1");
            $parts = preg_split('/\s+/', trim($dfOutput));
            
            $totalBytes = isset($parts[1]) ? (int)$parts[1] : 0;
            $usedBytes = isset($parts[2]) ? (int)$parts[2] : 0;
            $freeBytes = isset($parts[3]) ? (int)$parts[3] : 0;

            $countOutput = $ssh->exec("find {$config['path']} -name '*.tar.gz' 2>/dev/null | wc -l");
            $duOutput = $ssh->exec("du -sb {$config['path']} 2>/dev/null | cut -f1");

            return [
                'connected' => true,
                'host' => $config['host'],
                'total_bytes' => $totalBytes,
                'used_bytes' => $usedBytes,
                'free_bytes' => $freeBytes,
                'backup_count' => (int) trim($countOutput),
                'backup_used_bytes' => (int) trim($duOutput),
                'path' => $config['path'],
            ];
        } catch (\Exception $e) {
            return ['connected' => false, 'message' => 'Error: ' . $e->getMessage()];
        }
    }

    public function testConnection(string $host, int $port, string $user, string $password, string $path): array
    {
        try {
            $sftp = new SFTP($host, $port, 15);
            if (!$sftp->login($user, $password)) {
                return ['success' => false, 'message' => 'Authentication failed.'];
            }
            if (!$sftp->is_dir($path)) {
                $sftp->mkdir($path, 0755, true);
            }

            $ssh = new SSH2($host, $port, 15);
            $ssh->login($user, $password);
            $dfOutput = $ssh->exec("df -h {$path} 2>/dev/null | tail -1");

            return ['success' => true, 'message' => 'Connected successfully.', 'disk_info' => trim($dfOutput)];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Connection failed: ' . $e->getMessage()];
        }
    }

    public function cleanupOldBackups(): int
    {
        $serverDefaults = Setting::where('group', 'server_defaults')->get()->pluck('value', 'key')->toArray();
        $retentionDays = (int) ($serverDefaults['backup_retention_days'] ?? 3);
        $cutoffDate = now()->subDays($retentionDays);

        $oldBackups = Backup::where('created_at', '<', $cutoffDate)->where('status', 'completed')->get();
        $count = 0;
        foreach ($oldBackups as $backup) {
            try {
                $this->deleteFromRemote($backup);
                $backup->delete();
                $count++;
            } catch (\Exception $e) {
                Log::warning("Cleanup failed for backup {$backup->id}: {$e->getMessage()}");
            }
        }
        return $count;
    }
}
