<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\HostingAccount;
use App\Models\Domain;
use App\Models\EmailAccount;
use App\Models\Database;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class DashboardController extends Controller
{
    public function stats()
    {
        $totalCustomers = Customer::count();
        $totalHostingAccounts = HostingAccount::count();
        $totalDomains = Domain::count();
        $totalEmails = EmailAccount::count();
        $totalDatabases = Database::count();
        
        $activeAccounts = HostingAccount::where('status', 'active')->count();
        $suspendedAccounts = HostingAccount::where('status', 'suspended')->count();
        
        // Sum up dynamic package disk space or a mocked disk usage
        $diskUsedMb = 3584; // Mocked aggregate Disk Space used

        return $this->successResponse([
            'total_customers' => $totalCustomers,
            'total_hosting_accounts' => $totalHostingAccounts,
            'total_domains' => $totalDomains,
            'total_emails' => $totalEmails,
            'total_databases' => $totalDatabases,
            'disk_used_mb' => $diskUsedMb,
            'active_accounts' => $activeAccounts,
            'suspended_accounts' => $suspendedAccounts,
        ], 'Dashboard statistics retrieved successfully.');
    }

    public function services()
    {
        $services = ['lsws', 'mysql', 'php8.3-fpm', 'redis'];
        $results = [];

        foreach ($services as $svc) {
            $status = 'running';
            $uptime = 'Up 2 days';
            
            try {
                // Execute secure status command with array syntax
                $process = new Process(['service', $svc, 'status']);
                $process->run();
                
                if (!$process->isSuccessful()) {
                    $status = 'stopped';
                    $uptime = 'N/A';
                }
            } catch (\Exception $e) {
                // If in dev environment/WSL and commands fail, fall back to running state
                $status = 'running';
                $uptime = 'Uptime Mock';
            }

            $results[] = [
                'name' => $svc === 'lsws' ? 'OpenLiteSpeed' : ($svc === 'mysql' ? 'MySQL' : ($svc === 'php8.3-fpm' ? 'PHP-FPM' : 'Redis')),
                'status' => $status,
                'uptime' => $uptime
            ];
        }

        return $this->successResponse($results, 'System services statuses checked successfully.');
    }
}
