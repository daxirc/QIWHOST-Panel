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
            
            // Get actual usage counts from DB
            $diskUsedMb = $this->getCustomerDiskUsage($account->system_username);
            $bandwidthUsedMb = $account->bandwidth_used_mb ?? 1228.8; // e.g. 1.2 GB mock usage as requested in mockup
            
            $diskLimit = $package->disk_space ?? 2048;
            $bandwidthLimitGb = $package->bandwidth ?? 10;
            $bandwidthLimitMb = $bandwidthLimitGb * 1024;
            
            $addonsCount = $account->domains()->where('is_main', false)->count();
            $subdomainsCount = 0; // fallback count
            $emailsCount = $account->emailAccounts()->count();
            $databasesCount = $account->databases()->count();
            
            $ipAddress = \App\Models\Setting::where('key', 'server_ip')->value('value') ?? '127.0.0.1';
            
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
                    ],
                    
                    // ONLY allocated resources - NO real server info
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
                            'used' => 0,
                            'limit' => $package->ftp_accounts ?? 10,
                            'label' => '0 / ' . ($package->ftp_accounts ?? 10),
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
        return $mb . ' MB';
    }

    private function getCustomerDiskUsage($username)
    {
        try {
            $process = new \Symfony\Component\Process\Process(['sudo', 'du', '-sm', "/home/{$username}"]);
            $process->setTimeout(10);
            $process->run();
            if ($process->isSuccessful()) {
                return (int) explode("\t", trim($process->getOutput()))[0];
            }
        } catch (\Exception $e) {}
        return 50; // safe dev mock fallback
    }
}

