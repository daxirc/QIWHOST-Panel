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
        $webroot = "/home/{$username}/public_html";

        // Pre-create .well-known/acme-challenge directory with proper permissions
        $acmeDir = "{$webroot}/.well-known/acme-challenge";
        (new Process(['sudo', 'mkdir', '-p', $acmeDir]))->run();
        (new Process(['sudo', 'chown', '-R', "{$username}:www-data", "{$webroot}/.well-known"]))->run();
        (new Process(['sudo', 'chmod', '-R', '755', "{$webroot}/.well-known"]))->run();

        // Build domain args — only include www if it points to this server
        $domainArgs = ['-d', $domain->domain];
        $serverIp = $this->getServerIp();
        $wwwIp = $validationData['data']['www_ip'] ?? null;
        if ($wwwIp && $wwwIp === $serverIp) {
            $domainArgs[] = '-d';
            $domainArgs[] = 'www.' . $domain->domain;
        }

        // Run certbot securely using Process
        $certbotCmd = array_merge(
            ['sudo', 'certbot', 'certonly', '--webroot',
             '-w', $webroot],
            $domainArgs,
            ['--email', 'admin@qiwhost.com',
             '--agree-tos', '--non-interactive',
             '--preferred-challenges', 'http']
        );

        $process = new Process($certbotCmd);
        $process->setTimeout(120);
        $process->run();
        
        if ($process->isSuccessful() || env('APP_ENV') === 'local') {
            // Update database records
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

            // Configure OLS for HTTPS
            $this->configureOlsSsl($domain->domain);

            return response()->json([
                'success' => true, 
                'message' => 'SSL certificate installed successfully via Let\'s Encrypt!'
            ]);
        }
        
        $errorOutput = $process->getErrorOutput() ?: $process->getOutput();
        return response()->json([
            'success' => false, 
            'message' => 'SSL installation failed: ' . $errorOutput
        ], 500);
    }

    /**
     * Configure OpenLiteSpeed for SSL:
     * 1. Add vhssl block to the vhost config
     * 2. Create or update SSL listener on port 443  
     * 3. Open firewall port 443
     * 4. Restart OLS to apply changes
     */
    private function configureOlsSsl(string $domain): void
    {
        $certPath = "/etc/letsencrypt/live/{$domain}";
        $configFile = '/usr/local/lsws/conf/httpd_config.conf';
        $vhostConfFile = "/usr/local/lsws/conf/vhosts/{$domain}/vhconf.conf";

        // 1. Add vhssl block to vhost config
        $checkVhssl = new Process(['sudo', 'grep', '-c', 'vhssl', $vhostConfFile]);
        $checkVhssl->run();
        if (((int) trim($checkVhssl->getOutput())) === 0) {
            $sslBlock = "\nvhssl  {\n  keyFile                 {$certPath}/privkey.pem\n  certFile                {$certPath}/fullchain.pem\n  certChain               1\n  clientVerify            0\n}\n";
            (new Process(['sudo', 'bash', '-c', "echo '{$sslBlock}' >> {$vhostConfFile}"]))->run();
        }

        // 2. Check if SSL listener exists on port 443
        $checkListener = new Process(['sudo', 'grep', '-c', 'listener SSL', $configFile]);
        $checkListener->run();
        if (((int) trim($checkListener->getOutput())) === 0) {
            $sslListener = "\nlistener SSL {\n  address                  *:443\n  secure                   1\n  keyFile                  {$certPath}/privkey.pem\n  certFile                 {$certPath}/fullchain.pem\n  certChain                1\n  map                      {$domain} {$domain}\n}\n";
            (new Process(['sudo', 'bash', '-c', "echo '{$sslListener}' >> {$configFile}"]))->run();
        } else {
            // Check if this domain is mapped in the existing SSL listener
            $checkMap = new Process(['sudo', 'bash', '-c', "sed -n '/listener SSL/,/}/p' {$configFile} | grep -c '{$domain}'"]);
            $checkMap->run();
            if (((int) trim($checkMap->getOutput())) === 0) {
                (new Process(['sudo', 'sed', '-i', "/listener SSL {/a\\  map                      {$domain} {$domain}", $configFile]))->run();
            }
        }

        // 3. Open port 443 in UFW (idempotent)
        (new Process(['sudo', 'ufw', 'allow', '443/tcp']))->run();

        // 4. Flush OLS cache and full restart
        (new Process(['sudo', 'rm', '-rf', '/tmp/lshttpd/']))->run();
        $restart = new Process(['sudo', '/usr/local/lsws/bin/lswsctrl', 'restart']);
        $restart->setTimeout(30);
        $restart->run();
    }
}
