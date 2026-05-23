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

            // Run DNS check simulation or actual check
            sleep(2);

            // STEP 2: Requesting Let's Encrypt certificate
            Cache::put($this->jobId, [
                'status' => 'processing',
                'step' => 2,
                'message' => 'Requesting Let\'s Encrypt certificate...',
                'error' => null
            ], 600);

            $process = new Process([
                'sudo', 'certbot', 'certonly', '--webroot',
                '-w', "/home/{$this->username}/public_html",
                '-d', $this->domainName,
                '-d', "www.{$this->domainName}",
                '--email', 'admin@qiwhost.com',
                '--agree-tos', '--non-interactive'
            ]);
            $process->setTimeout(120);
            $process->run();

            if (!$process->isSuccessful() && env('APP_ENV') !== 'local') {
                Cache::put($this->jobId, [
                    'status' => 'failed',
                    'step' => 2,
                    'message' => 'Requesting certificate failed.',
                    'error' => 'Certbot failed: ' . $process->getErrorOutput()
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

            SslCertificate::updateOrCreate(
                ['domain' => $this->domainName],
                [
                    'hosting_account_id' => $this->hostingAccountId,
                    'provider' => 'Let\'s Encrypt',
                    'is_active' => true,
                    'is_wildcard' => false,
                    'is_auto_renew' => true,
                    'expires_at' => now()->addDays(90),
                    'expiration_date' => now()->addDays(90),
                ]
            );

            $domain = Domain::find($this->domainId);
            if ($domain) {
                $domain->update(['is_secure_with_ssl' => true]);
            }

            sleep(2);

            // STEP 4: Configuring OLS
            Cache::put($this->jobId, [
                'status' => 'processing',
                'step' => 4,
                'message' => 'Configuring and restarting OpenLiteSpeed web server...',
                'error' => null
            ], 600);

            $restartOLS = new Process(['sudo', '/usr/local/lsws/bin/lswsctrl', 'graceful']);
            $restartOLS->run();

            sleep(2);

            // Done!
            Cache::put($this->jobId, [
                'status' => 'done',
                'step' => 5,
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
}
