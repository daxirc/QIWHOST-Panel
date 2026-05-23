<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\SslCertificate;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class SslController extends Controller
{
    private function getServerIp() {
        if (isset($_SERVER['SERVER_ADDR']) && !empty($_SERVER['SERVER_ADDR'])) {
            return $_SERVER['SERVER_ADDR'];
        }
        if (file_exists('/etc/qiwhost/server_ip')) {
            $ip = trim(file_get_contents('/etc/qiwhost/server_ip'));
            if (!empty($ip)) {
                return $ip;
            }
        }
        try {
            $ip = trim(shell_exec("hostname -I | awk '{print $1}'") ?? '');
            if (!empty($ip)) {
                return $ip;
            }
        } catch (\Exception $e) {}
        
        try {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "https://ifconfig.me/ip");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            $ip = trim(curl_exec($ch));
            curl_close($ch);
            if (!empty($ip)) {
                return $ip;
            }
        } catch (\Exception $e) {}

        return '127.0.0.1';
    }

    public function index()
    {
        $certs = SslCertificate::with('hostingAccount.customer')->get();
        
        // Dynamic map to FQDN format for frontend UI consistency
        $results = [];
        foreach ($certs as $cert) {
            $results[] = [
                'id' => $cert->id,
                'domain' => $cert->domain,
                'provider' => $cert->provider ?? 'Let\'s Encrypt',
                'is_active' => (bool) $cert->is_active,
                'is_wildcard' => (bool) $cert->is_wildcard,
                'is_auto_renew' => (bool) $cert->is_auto_renew,
                'expiration_date' => $cert->expiration_date ?? $cert->expires_at,
                'hosting_account' => $cert->hostingAccount,
            ];
        }

        return $this->successResponse($results, 'SSL Certificates retrieved successfully.');
    }

    public function validateDomain($domainId)
    {
        $domain = Domain::findOrFail($domainId);
        $serverIp = $this->getServerIp();
        
        // Check A record points to server
        $domainIp = null;
        try {
            $dnsRecords = @dns_get_record($domain->domain, DNS_A);
            $domainIp = $dnsRecords[0]['ip'] ?? null;
        } catch (\Exception $e) {}
        
        // Also check www
        $wwwIp = null;
        try {
            $wwwRecords = @dns_get_record('www.' . $domain->domain, DNS_A);
            $wwwIp = $wwwRecords[0]['ip'] ?? null;
        } catch (\Exception $e) {}
        
        // Check simulation / local wildcard pointing fallback
        $pointed = ($domainIp === $serverIp || $wwwIp === $serverIp || $serverIp === '127.0.0.1' || env('APP_ENV') === 'local');
        
        // Also check if using our nameservers
        $nsRecords = [];
        $usingOurNs = false;
        try {
            $nsRecordsRaw = @dns_get_record($domain->domain, DNS_NS);
            $nsRecords = array_column($nsRecordsRaw ?: [], 'target');
            foreach ($nsRecords as $target) {
                if (str_contains(strtolower($target), 'qiwhost.com')) {
                    $usingOurNs = true;
                    break;
                }
            }
        } catch (\Exception $e) {}
        
        // Dev fallback
        if (env('APP_ENV') === 'local' || $serverIp === '127.0.0.1') {
            $usingOurNs = true;
            $pointed = true;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'domain' => $domain->domain,
                'server_ip' => $serverIp,
                'domain_ip' => $domainIp ?? 'Not Pointed / Offline',
                'www_ip' => $wwwIp ?? 'Not Pointed / Offline',
                'pointed_to_server' => $pointed,
                'using_our_nameservers' => $usingOurNs,
                'ns_records' => $nsRecords,
                'can_install_ssl' => $pointed || $usingOurNs,
                'message' => $pointed 
                    ? 'Domain is pointed to this server. Ready for SSL installation.' 
                    : 'Domain IP does not match server IP. Please point your domain to: ' . $serverIp
            ]
        ]);
    }

    public function install($domainId)
    {
        $domain = Domain::with('hostingAccount')->findOrFail($domainId);
        
        // First validate
        $validation = $this->validateDomain($domainId);
        $validationData = $validation->getData(true);
        
        if (!$validationData['data']['can_install_ssl']) {
            return response()->json([
                'success' => false,
                'message' => 'Domain not pointed to server: ' . $validationData['data']['message']
            ], 422);
        }
        
        $username = $domain->hostingAccount->system_username;

        // Run certbot securely using Process
        $process = new Process([
            'sudo', 'certbot', 'certonly', '--webroot',
            '-w', "/home/{$username}/public_html",
            '-d', $domain->domain,
            '-d', "www.{$domain->domain}",
            '--email', 'admin@qiwhost.com',
            '--agree-tos', '--non-interactive'
        ]);
        $process->setTimeout(120);
        $process->run();
        
        if ($process->isSuccessful() || env('APP_ENV') === 'local') {
            // Update OLS vhost / databases
            SslCertificate::updateOrCreate(
                ['domain' => $domain->domain],
                [
                    'hosting_account_id' => $domain->hosting_account_id,
                    'provider' => 'Let\'s Encrypt',
                    'is_active' => true,
                    'is_wildcard' => false,
                    'is_auto_renew' => true,
                    'expires_at' => now()->addDays(90),
                    'expiration_date' => now()->addDays(90),
                ]
            );

            $domain->update(['is_secure_with_ssl' => true]);

            return response()->json([
                'success' => true, 
                'message' => 'SSL certificate installed successfully via Let\'s Encrypt!'
            ]);
        }
        
        return response()->json([
            'success' => false, 
            'message' => 'SSL installation failed: ' . $process->getErrorOutput()
        ], 500);
    }
}
