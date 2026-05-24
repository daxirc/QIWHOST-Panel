<?php
namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Process;
use App\Models\Setting;

class ProvisionHostnameSslJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $jobId;
    public string $hostname;
    public string $email;
    public int $frontendPort;
    public int $apiPort;

    public function __construct(
        string $jobId,
        string $hostname,
        string $email,
        int $frontendPort = 8443,
        int $apiPort = 8080
    ) {
        $this->jobId = $jobId;
        $this->hostname = $hostname;
        $this->email = $email;
        $this->frontendPort = $frontendPort;
        $this->apiPort = $apiPort;
    }

    public function handle()
    {
        // STEP 1: Verify DNS
        $this->updateStatus(1, 'processing', 'Verifying hostname DNS...');

        $resolvedIp = gethostbyname($this->hostname);
        $serverIp = trim(shell_exec("hostname -I | awk '{print $1}'"));

        if ($resolvedIp !== $serverIp) {
            $this->updateStatus(1, 'failed', null,
                "DNS mismatch: {$this->hostname} resolves to {$resolvedIp} but server IP is {$serverIp}"
            );
            return;
        }
        $this->updateStatus(1, 'done', 'DNS verified successfully.');

        // STEP 2: Request Let's Encrypt Certificate (standalone mode)
        $this->updateStatus(2, 'processing', 'Requesting Let\'s Encrypt certificate...');

        // Stop OLS temporarily for standalone challenge
        $stopOls = new Process(['sudo', '/usr/local/lsws/bin/lswsctrl', 'stop']);
        $stopOls->run();
        sleep(2);

        $certbotProcess = new Process([
            'sudo', '/snap/bin/certbot', 'certonly',
            '--standalone',
            '--non-interactive',
            '--agree-tos',
            '--email', $this->email,
            '-d', $this->hostname,
            '--preferred-challenges', 'http',
        ]);
        $certbotProcess->setTimeout(120);
        $certbotProcess->run();

        // Restart OLS
        $startOls = new Process(['sudo', '/usr/local/lsws/bin/lswsctrl', 'start']);
        $startOls->run();
        sleep(3);

        if (!$certbotProcess->isSuccessful()) {
            $this->updateStatus(2, 'failed', null,
                'Certbot failed: ' . $certbotProcess->getErrorOutput()
            );
            return;
        }
        $this->updateStatus(2, 'done', 'Certificate issued successfully.');

        // STEP 3: Configure OLS SSL Listener for panel ports
        $this->updateStatus(3, 'processing', 'Configuring OpenLiteSpeed SSL...');

        // Configure OLS SSL listener
        $certPath = "/etc/letsencrypt/live/{$this->hostname}";
        $olsConf = '/usr/local/lsws/conf/httpd_config.conf';

        $cat = new Process(['sudo', 'cat', $olsConf]);
        $cat->run();
        $config = $cat->getOutput();
        // Remove old PanelFrontend listener
        $config = preg_replace('/\nlistener PanelFrontend \{[^}]*\}/', '', $config);

        // Add new one with cert
        $sslListener = "\nlistener PanelFrontend {\n" .
            "  address                  *:8443\n" .
            "  secure                   1\n" .
            "  keyFile                  {$certPath}/privkey.pem\n" .
            "  certFile                 {$certPath}/fullchain.pem\n" .
            "  certChain                1\n" .
            "  map                      Example *\n" .
            "}\n";

        $config = rtrim($config) . "\n" . $sslListener;
        file_put_contents("/tmp/httpd_ssl_update.conf", $config);

        $mv = new Process(['sudo', 'mv', '/tmp/httpd_ssl_update.conf', $olsConf]);
        $mv->run();

        // Open port 8443
        $ufw = new Process(['sudo', 'ufw', 'allow', '8443/tcp']);
        $ufw->run();

        // Restart OLS
        $restart = new Process(['sudo', '/usr/local/lsws/bin/lswsctrl', 'restart']);
        $restart->run();
        sleep(3);

        // Update /etc/hosts to use real IP
        $serverIp = trim(shell_exec("hostname -I | awk '{print $1}'"));
        $hostsContent = file_get_contents('/etc/hosts');
        $hostsContent = preg_replace('/.*' . preg_quote($this->hostname, '/') . '.*\n/', '', $hostsContent);
        $hostsContent .= "\n{$serverIp} {$this->hostname}\n";
        file_put_contents('/tmp/hosts_update', $hostsContent);
        $hostsProc = new Process(['sudo', 'mv', '/tmp/hosts_update', '/etc/hosts']);
        $hostsProc->run();

        $this->updateStatus(3, 'done', 'OLS SSL configured.');

        // STEP 4: Update Panel URLs to HTTPS
        $this->updateStatus(4, 'processing', 'Updating panel configuration to HTTPS...');

        // Update Laravel .env APP_URL and FRONTEND_URL
        $envFile = base_path('.env');
        $envContent = file_get_contents($envFile);
        $envContent = preg_replace(
            '/^APP_URL=.*/m',
            "APP_URL=https://{$this->hostname}:{$this->apiPort}",
            $envContent
        );
        $envContent = preg_replace(
            '/^FRONTEND_URL=.*/m',
            "FRONTEND_URL=https://{$this->hostname}:{$this->frontendPort}",
            $envContent
        );
        file_put_contents($envFile, $envContent);

        // Update frontend .env.local
        $frontendEnv = '/opt/qiwhost/panel-frontend/.env.local';
        $frontendContent = "NEXT_PUBLIC_SERVER_IP={$serverIp}\n";
        $frontendContent .= "NEXT_PUBLIC_HOSTNAME={$this->hostname}\n";
        file_put_contents($frontendEnv, $frontendContent);

        // Update settings table
        Setting::updateOrCreate(
            ['group' => 'ssl', 'key' => 'hostname_ssl_status'],
            ['value' => 'active']
        );
        Setting::updateOrCreate(
            ['group' => 'ssl', 'key' => 'hostname_ssl_domain'],
            ['value' => $this->hostname]
        );
        Setting::updateOrCreate(
            ['group' => 'ssl', 'key' => 'hostname_ssl_expires'],
            ['value' => now()->addDays(90)->toDateString()]
        );
        Setting::updateOrCreate(
            ['group' => 'general', 'key' => 'panel_url'],
            ['value' => "https://{$this->hostname}:{$this->frontendPort}"]
        );

        // Rebuild Next.js frontend with new env
        $buildProc = new Process(['npm', 'run', 'build']);
        $buildProc->setWorkingDirectory('/opt/qiwhost/panel-frontend');
        $buildProc->setTimeout(300);
        $buildProc->run();

        // Restart services
        $restartApi = new Process(['sudo', 'systemctl', 'restart', 'qiwhost-api', 'qiwhost-frontend', 'qiwhost-queue']);
        $restartApi->run();

        $this->updateStatus(4, 'done', 'Panel URLs updated to HTTPS.');

        // DONE
        Cache::put($this->jobId, [
            'status' => 'complete',
            'step' => 4,
            'message' => 'Hostname SSL provisioned successfully!',
            'panel_url' => "https://{$this->hostname}:{$this->frontendPort}",
            'error' => null,
        ], 600);
    }

    private function updateStatus(int $step, string $status, ?string $message, ?string $error = null)
    {
        Cache::put($this->jobId, [
            'status' => $status,
            'step' => $step,
            'message' => $message,
            'error' => $error,
        ], 600);
    }
}
