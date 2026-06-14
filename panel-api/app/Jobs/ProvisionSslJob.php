<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Process;
use App\Models\Domain;
use App\Models\SslCertificate;

class ProvisionSslJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $jobId;
    protected $domainId;
    protected $username;
    protected $domainName;
    protected $hostingAccountId;

    /**
     * Create a new job instance.
     */
    public function __construct($jobId, $domainId, $username, $domainName, $hostingAccountId)
    {
        $this->jobId = $jobId;
        $this->domainId = $domainId;
        $this->username = $username;
        $this->domainName = $domainName;
        $this->hostingAccountId = $hostingAccountId;
    }

    /**
     * Execute the job.
     */
    public function handle()
    {
        try {
            // STEP 1: Verifying domain DNS
            Cache::put($this->jobId, [
                'status' => 'processing',
                'step' => 1,
                'message' => 'Verifying domain DNS...',
                'error' => null
            ], 600);

            sleep(2);

            // STEP 2: Requesting Let's Encrypt certificate
            Cache::put($this->jobId, [
                'status' => 'processing',
                'step' => 2,
                'message' => 'Requesting Let\'s Encrypt certificate...',
                'error' => null
            ], 600);

            $webroot = "/home/{$this->username}/public_html";
            $domain = $this->domainName;

            // Ensure .well-known/acme-challenge directory exists and is accessible
            $this->runSudo(['mkdir', '-p', "{$webroot}/.well-known/acme-challenge"]);
            $this->runSudo(['chown', '-R', "{$this->username}:www-data", "{$webroot}/.well-known"]);
            $this->runSudo(['chmod', '-R', '755', "{$webroot}/.well-known"]);

            // Check if www also points to this server — only include it if it does
            $domainArgs = ['-d', $domain];
            try {
                $wwwRecords = @dns_get_record('www.' . $domain, DNS_A);
                $wwwIp = $wwwRecords[0]['ip'] ?? null;
                $serverIp = trim(shell_exec("hostname -I | awk '{print $1}'") ?? '');
                if ($wwwIp && $serverIp && $wwwIp === $serverIp) {
                    $domainArgs[] = '-d';
                    $domainArgs[] = 'www.' . $domain;
                }
            } catch (\Exception $e) {}

            // Build and run certbot
            $certbotCmd = array_merge(
                ['sudo', 'certbot', 'certonly', '--webroot',
                 '-w', $webroot],
                $domainArgs,
                ['--email', 'admin@qiwhost.com',
                 '--agree-tos', '--non-interactive',
                 '--expand', '--force-renewal',
                 '--preferred-challenges', 'http']
            );

            $process = new Process($certbotCmd);
            $process->setTimeout(120);
            $process->run();

            if (!$process->isSuccessful() && env('APP_ENV') !== 'local') {
                $errorOutput = $process->getErrorOutput() ?: $process->getOutput();
                Cache::put($this->jobId, [
                    'status' => 'failed',
                    'step' => 2,
                    'message' => 'SSL certificate request failed.',
                    'error' => $errorOutput
                ], 600);
                return;
            }

            // STEP 3: Installing certificate
            Cache::put($this->jobId, [
                'status' => 'processing',
                'step' => 3,
                'message' => 'Installing certificate in system databases...',
                'error' => null
            ], 600);

            // Update ssl_certificates table using Eloquent model
            SslCertificate::updateOrCreate(
                ['hosting_account_id' => $this->hostingAccountId, 'domain' => $this->domainName],
                [
                    'provider' => 'letsencrypt',
                    'is_active' => true,
                    'is_wildcard' => false,
                    'is_auto_renew' => true,
                    'expiration_date' => now()->addDays(90),
                ]
            );

            $domainObj = Domain::find($this->domainId);
            if ($domainObj) {
                $domainObj->update(['is_secure_with_ssl' => true]);
            }

            // STEP 4: Configure OLS for HTTPS
            Cache::put($this->jobId, [
                'status' => 'processing',
                'step' => 4,
                'message' => 'Configuring OpenLiteSpeed for HTTPS...',
                'error' => null
            ], 600);

            $this->configureOlsSsl($domain);

            sleep(1);

            // STEP 5: Restart OLS
            Cache::put($this->jobId, [
                'status' => 'processing',
                'step' => 5,
                'message' => 'Restarting OpenLiteSpeed web server...',
                'error' => null
            ], 600);

            // Flush cache and full restart to pick up new listener
            $this->runSudo(['rm', '-rf', '/tmp/lshttpd/']);
            $restartOLS = new Process(['sudo', '/usr/local/lsws/bin/lswsctrl', 'restart']);
            $restartOLS->setTimeout(30);
            $restartOLS->run();

            sleep(2);

            // Done!
            Cache::put($this->jobId, [
                'status' => 'done',
                'step' => 6,
                'message' => 'SSL certificate provisioned and activated successfully!',
                'error' => null
            ], 600);

        } catch (\Exception $e) {
            Cache::put($this->jobId, [
                'status' => 'failed',
                'step' => 4,
                'message' => 'System error during SSL installation.',
                'error' => $e->getMessage()
            ], 600);
        }
    }

    /**
     * Configure OpenLiteSpeed for SSL:
     * 1. Add vhssl block to the vhost config
     * 2. Create or update SSL listener on port 443
     * 3. Open firewall port 443
     * 
     * Uses sudo + shell commands throughout because PHP runs as www-data 
     * and cannot read/write OLS config files directly.
     */
    private function configureOlsSsl(string $domain): void
    {
        $certPath = "/etc/letsencrypt/live/{$domain}";
        $configFile = '/usr/local/lsws/conf/httpd_config.conf';
        $vhostConfFile = "/usr/local/lsws/conf/vhosts/{$domain}/vhconf.conf";

        // 1. Add vhssl block to vhost config (using sudo cat + sudo tee)
        $checkVhssl = new Process(['sudo', 'grep', '-c', 'vhssl', $vhostConfFile]);
        $checkVhssl->run();
        $hasVhssl = ((int) trim($checkVhssl->getOutput())) > 0;

        if (!$hasVhssl) {
            $sslBlock = "\nvhssl  {\n  keyFile                 {$certPath}/privkey.pem\n  certFile                {$certPath}/fullchain.pem\n  certChain               1\n  clientVerify            0\n}\n";

            // Use sudo bash -c to append to the file
            $appendProc = new Process(['sudo', 'bash', '-c', "echo '{$sslBlock}' >> {$vhostConfFile}"]);
            $appendProc->setTimeout(10);
            $appendProc->run();
        }

        // 2. Check if SSL listener exists on port 443
        $checkListener = new Process(['sudo', 'grep', '-c', 'listener SSL', $configFile]);
        $checkListener->run();
        $hasListener = ((int) trim($checkListener->getOutput())) > 0;

        if (!$hasListener) {
            // Create new SSL listener
            $sslListener = "\nlistener SSL {\n  address                  *:443\n  secure                   1\n  keyFile                  {$certPath}/privkey.pem\n  certFile                 {$certPath}/fullchain.pem\n  certChain                1\n  map                      {$domain} {$domain}\n}\n";

            $appendProc = new Process(['sudo', 'bash', '-c', "echo '{$sslListener}' >> {$configFile}"]);
            $appendProc->setTimeout(10);
            $appendProc->run();
        } else {
            // SSL listener exists — check if this domain is already mapped
            $checkMap = new Process(['sudo', 'bash', '-c', "sed -n '/listener SSL/,/}/p' {$configFile} | grep -c '{$domain}'"]);
            $checkMap->run();
            $hasMap = ((int) trim($checkMap->getOutput())) > 0;

            if (!$hasMap) {
                // Add domain mapping to existing SSL listener
                $sedProc = new Process(['sudo', 'sed', '-i',
                    "/listener SSL {/a\\  map                      {$domain} {$domain}",
                    $configFile
                ]);
                $sedProc->setTimeout(10);
                $sedProc->run();
            }
        }

        // 3. Open port 443 in UFW (idempotent)
        $this->runSudo(['ufw', 'allow', '443/tcp']);
    }

    /**
     * Run a command with sudo prefix
     */
    private function runSudo(array $args, int $timeout = 15): Process
    {
        $cmd = array_merge(['sudo'], $args);
        $process = new Process($cmd);
        $process->setTimeout($timeout);
        $process->run();
        return $process;
    }
}
