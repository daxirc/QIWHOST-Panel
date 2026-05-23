<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\HostingAccount;
use App\Services\SecurityScanner;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SecurityScan extends Command
{
    protected $signature = 'security:scan {--quarantine}';
    protected $description = 'Scan all customer home directories for malicious scripts and web shells.';

    public function handle()
    {
        $this->info('Starting global security malware scan...');
        $accounts = HostingAccount::where('status', 'active')->get();
        $scanner = new SecurityScanner();
        $totalThreats = 0;

        foreach ($accounts as $account) {
            $this->info("Scanning account: {$account->system_username}");
            $threats = $scanner->scanDirectory("/home/{$account->system_username}");

            if (!empty($threats)) {
                $this->warn("Threats found in account: {$account->system_username}");
                foreach ($threats as $threat) {
                    $totalThreats++;

                    // Log threat to database security_events
                    DB::table('security_events')->insert([
                        'hosting_account_id' => $account->id,
                        'event_type' => 'malicious_file_detected',
                        'description' => "Shell pattern '{$threat['threat']}' found during scheduled audit.",
                        'ip_address' => '127.0.0.1',
                        'file_path' => $threat['file'],
                        'blocked' => false,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    // Quarantine file if option is set
                    if ($this->option('quarantine')) {
                        $quarantineDir = "/home/quarantine/{$account->system_username}";
                        if (!is_dir($quarantineDir)) {
                            mkdir($quarantineDir, 0700, true);
                        }

                        $originalPath = $threat['file'];
                        $filename = basename($originalPath);
                        $quarantinePath = "{$quarantineDir}/{$filename}.quarantine";

                        if (file_exists($originalPath)) {
                            // Move file to quarantine
                            rename($originalPath, $quarantinePath);

                            // Save to quarantine table
                            DB::table('quarantine')->insert([
                                'hosting_account_id' => $account->id,
                                'original_path' => $originalPath,
                                'quarantine_path' => $quarantinePath,
                                'threat_type' => $threat['threat'],
                                'reviewed' => false,
                                'created_at' => now(),
                                'updated_at' => now()
                            ]);

                            $this->line("Quarantined: {$filename} -> {$quarantinePath}");
                        }
                    }
                }
            }
        }

        $this->info("Security scan complete. Total threats cataloged: {$totalThreats}");
        return 0;
    }
}
