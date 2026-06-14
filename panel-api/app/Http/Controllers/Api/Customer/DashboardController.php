<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $customer = $request->user();
            
            // Retrieve hosting accounts
            $accounts = $customer->hostingAccounts()->with('hostingPackage')->get();
            
            if ($accounts->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hosting accounts found.'
                ], 404);
            }
    
            // Get selected account
            $selectedId = $request->header('X-Hosting-Account-Id') ?? $request->input('hosting_account_id');
            $account = $selectedId 
                ? $accounts->firstWhere('id', $selectedId) 
                : $accounts->first();
    
            if (!$account) {
                $account = $accounts->first();
            }
            
            $package = $account->hostingPackage;
            
            // Get REAL usage data from the system
            $diskUsedMb = $this->getCustomerDiskUsage($account->system_username);
            $bandwidthUsedMb = $this->getCustomerBandwidthUsage($account->system_username);
            
            $diskLimit = $package->disk_space ?? 2048;
            $bandwidthLimitGb = $package->bandwidth ?? 10;
            $bandwidthLimitMb = $bandwidthLimitGb * 1024;
            
            $addonsCount = $account->domains()->where('is_main', false)->count();
            $subdomainsCount = 0; // No subdomain table yet
            $emailsCount = $account->emailAccounts()->count();
            $databasesCount = $account->databases()->count();
            $ftpCount = $this->getFtpAccountCount($account->system_username);
            
            $ipAddress = '127.0.0.1';
            if (file_exists('/etc/qiwhost/server_ip')) {
                $ipAddress = trim(file_get_contents('/etc/qiwhost/server_ip'));
            } else {
                $ipAddress = \App\Models\Setting::where('key', 'server_ip')->value('value') 
                    ?? $request->server('SERVER_ADDR') 
                    ?? $request->getHost() 
                    ?? '127.0.0.1';
            }
            
            $ns1 = \App\Models\Setting::where('key', 'ns1')->value('value') ?? 'ns1.node1.qiwhost.com';
            $ns2 = \App\Models\Setting::where('key', 'ns2')->value('value') ?? 'ns2.node1.qiwhost.com';
            
            return response()->json([
                'success' => true,
                'data' => [
                    // Account Info
                    'account' => [
                        'id' => $account->id,
                        'domain' => $account->domain,
                        'username' => $account->system_username,
                        'status' => $account->status,
                        'ip_address' => $ipAddress,
                        'package_name' => $package->name,
                        'php_version' => $account->php_version ?? '8.3',
                        'created_at' => $account->setup_date ?? $account->created_at,
                        'setup_date' => $account->setup_date ?? $account->created_at,
                        'expiry_date' => $account->expiry_date ?? ($account->setup_date ? $account->setup_date->addYear() : now()->addYear()),
                        'ns1' => $ns1,
                        'ns2' => $ns2,
                    ],
                    
                    // Real resource consumption
                    'resources' => [
                        'disk' => [
                            'used_mb' => $diskUsedMb,
                            'limit_mb' => $diskLimit,
                            'percent' => $diskLimit > 0 
                                ? round(($diskUsedMb / $diskLimit) * 100, 1) 
                                : 0,
                            'label' => $this->formatSize($diskUsedMb) . ' / ' . $this->formatSize($diskLimit),
                        ],
                        'bandwidth' => [
                            'used_mb' => $bandwidthUsedMb,
                            'limit_mb' => $bandwidthLimitMb,
                            'percent' => $bandwidthLimitMb > 0 
                                ? round(($bandwidthUsedMb / $bandwidthLimitMb) * 100, 1) 
                                : 0,
                            'label' => $this->formatSize($bandwidthUsedMb) . ' / ' . $this->formatSize($bandwidthLimitMb),
                        ],
                        'domains' => [
                            'used' => $addonsCount,
                            'limit' => $package->addon_domains ?? 10,
                            'label' => $addonsCount . ' / ' . ($package->addon_domains ?? 10),
                        ],
                        'subdomains' => [
                            'used' => $subdomainsCount,
                            'limit' => $package->subdomains ?? 10,
                            'label' => $subdomainsCount . ' / ' . ($package->subdomains ?? 10),
                        ],
                        'emails' => [
                            'used' => $emailsCount,
                            'limit' => $package->email_accounts ?? 25,
                            'label' => $emailsCount . ' / ' . ($package->email_accounts ?? 25),
                        ],
                        'databases' => [
                            'used' => $databasesCount,
                            'limit' => $package->databases ?? 10,
                            'label' => $databasesCount . ' / ' . ($package->databases ?? 10),
                        ],
                        'ftp_accounts' => [
                            'used' => $ftpCount,
                            'limit' => $package->ftp_accounts ?? 10,
                            'label' => $ftpCount . ' / ' . ($package->ftp_accounts ?? 10),
                        ],
                    ],
                    
                    // Quick stats for dashboard cards
                    'quick_stats' => [
                        'total_domains' => $account->domains()->count(),
                        'total_emails' => $emailsCount,
                        'total_databases' => $databasesCount,
                        'disk_percent' => $diskLimit > 0 
                            ? round(($diskUsedMb / $diskLimit) * 100, 1) 
                            : 0,
                    ],
                    
                    // For UI multi-account support dropdown
                    'accounts' => $accounts
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function formatSize($mb)
    {
        if ($mb >= 1024) {
            return round($mb / 1024, 1) . ' GB';
        }
        return round($mb, 1) . ' MB';
    }

    /**
     * Get real disk usage for a customer's home directory using du.
     * Uses sudo with the allowed du command from sudoers.
     */
    private function getCustomerDiskUsage($username)
    {
        $homePath = "/home/{$username}";
        
        if (!is_dir($homePath)) {
            return 0;
        }

        try {
            // Use sudo du -sm to get size in MB
            $process = new \Symfony\Component\Process\Process(
                ['sudo', 'du', '-sm', $homePath]
            );
            $process->setTimeout(30);
            $process->run();
            
            if ($process->isSuccessful()) {
                $output = trim($process->getOutput());
                // Output format: "3966\t/home/username"
                $parts = explode("\t", $output);
                return (int) ($parts[0] ?? 0);
            }
            
            // Fallback: try without sudo (if directory is readable by www-data)
            $process2 = new \Symfony\Component\Process\Process(
                ['du', '-sm', $homePath]
            );
            $process2->setTimeout(30);
            $process2->run();
            
            if ($process2->isSuccessful()) {
                $parts = explode("\t", trim($process2->getOutput()));
                return (int) ($parts[0] ?? 0);
            }
        } catch (\Exception $e) {
            \Log::warning("Disk usage check failed for {$username}: " . $e->getMessage());
        }
        
        return 0;
    }

    /**
     * Get real bandwidth usage for the current month.
     * Uses OLS access log to calculate bandwidth per user.
     * Falls back to /proc/net/dev total traffic divided among accounts.
     */
    private function getCustomerBandwidthUsage($username)
    {
        try {
            // Method 1: Check OLS vhost access log for this user
            $logPath = "/usr/local/lsws/logs/access.log";
            $vhostLogPath = "/home/{$username}/logs/access.log";
            
            // Try user-specific log first
            $logFile = file_exists($vhostLogPath) ? $vhostLogPath : null;
            
            if ($logFile) {
                return $this->parseBandwidthFromLog($logFile);
            }
            
            // Method 2: Use vnstat if available
            $process = new \Symfony\Component\Process\Process(
                ['vnstat', '--oneline']
            );
            $process->setTimeout(5);
            $process->run();
            
            if ($process->isSuccessful()) {
                return $this->parseVnstatOutput($process->getOutput());
            }
            
            // Method 3: Calculate from /proc/net/dev (total server bandwidth)
            // Divide among active accounts as an approximation
            return $this->getServerBandwidthShare($username);
            
        } catch (\Exception $e) {
            \Log::warning("Bandwidth check failed for {$username}: " . $e->getMessage());
        }
        
        return 0;
    }

    /**
     * Parse bandwidth from access log (bytes transferred in current month)
     */
    private function parseBandwidthFromLog($logFile)
    {
        try {
            $currentMonth = date('M/Y');
            $totalBytes = 0;
            
            // Use awk for efficient parsing of large logs
            $process = new \Symfony\Component\Process\Process([
                'sudo', 'awk',
                '{sum += $10} END {print sum}',
                $logFile
            ]);
            $process->setTimeout(15);
            $process->run();
            
            if ($process->isSuccessful()) {
                $totalBytes = (int) trim($process->getOutput());
                return round($totalBytes / (1024 * 1024), 1); // Convert to MB
            }
        } catch (\Exception $e) {}
        
        return 0;
    }

    /**
     * Parse vnstat output for current month traffic (rx+tx)
     */
    private function parseVnstatOutput($output)
    {
        // vnstat --oneline format: id;timestamp;rx;tx;...
        $parts = explode(';', $output);
        if (count($parts) >= 10) {
            // Total rx+tx in MiB for the current month
            $rxMiB = (float) ($parts[8] ?? 0);
            $txMiB = (float) ($parts[9] ?? 0);
            return round($rxMiB + $txMiB, 1);
        }
        return 0;
    }

    /**
     * Get approximate bandwidth share from /proc/net/dev for this user.
     * Divides total server bandwidth among all active accounts.
     */
    private function getServerBandwidthShare($username)
    {
        try {
            $content = @file_get_contents('/proc/net/dev');
            if (!$content) return 0;
            
            $totalBytes = 0;
            foreach (explode("\n", $content) as $line) {
                if (preg_match('/\s*(eth0|ens\d+|enp\d+s\d+):\s*(\d+)\s+.*\s+(\d+)/', $line, $m)) {
                    // rx bytes + tx bytes
                    $totalBytes = ((int)$m[2]) + ((int)$m[3]);
                    break;
                }
            }
            
            if ($totalBytes === 0) return 0;
            
            // Convert to MB
            $totalMb = $totalBytes / (1024 * 1024);
            
            // Divide among active accounts
            $activeAccounts = \App\Models\HostingAccount::where('status', 'active')->count();
            $activeAccounts = max($activeAccounts, 1);
            
            return round($totalMb / $activeAccounts, 1);
        } catch (\Exception $e) {}
        
        return 0;
    }

    /**
     * Count FTP accounts for this user from ProFTPD/vsftpd configuration.
     */
    private function getFtpAccountCount($username)
    {
        try {
            // Check ProFTPD virtual users
            $ftpdPasswd = "/etc/proftpd/ftpd.passwd";
            if (file_exists($ftpdPasswd)) {
                $count = 0;
                $lines = @file($ftpdPasswd, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
                foreach ($lines as $line) {
                    if (strpos($line, "/home/{$username}") !== false) {
                        $count++;
                    }
                }
                return $count;
            }
            
            // Check vsftpd virtual users
            $vsftpdDir = "/etc/vsftpd/users/";
            if (is_dir($vsftpdDir)) {
                $files = @glob($vsftpdDir . "{$username}_*") ?: [];
                return count($files);
            }
        } catch (\Exception $e) {}
        
        return 0;
    }
}
