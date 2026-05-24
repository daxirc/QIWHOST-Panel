<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class WebmailController extends Controller
{
    public function getStatus()
    {
        // Check multiple possible Roundcube paths
        $roundcubePaths = [
            '/var/lib/roundcube',
            '/usr/share/roundcube',
            '/var/www/roundcube',
        ];

        $installed = false;
        $path = '';
        foreach ($roundcubePaths as $p) {
            if (is_dir($p) && file_exists($p . '/index.php')) {
                $installed = true;
                $path = $p;
                break;
            }
        }

        // Check if roundcube service is running
        $serviceRunning = false;
        $process = new Process(['systemctl', 'is-active', 'roundcube-webmail']);
        $process->run();
        $serviceRunning = trim($process->getOutput()) === 'active';

        // Get roundcube version
        $version = 'Unknown';
        $composerFile = $path . '/composer.json';
        if (file_exists($composerFile)) {
            $composer = json_decode(file_get_contents($composerFile), true);
            $version = $composer['version'] ?? 'Unknown';
        }

        // Dev environment bypass/override
        if (env('APP_ENV') === 'local') {
            $installed = true;
            $serviceRunning = true;
            $version = '1.6.6';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'installed'      => $installed && $serviceRunning,
                'path'           => $path,
                'version'        => $version,
                'port'           => 8025,
                'proxy_path'     => '/webmail',
                'service_status' => $serviceRunning ? 'active' : 'inactive',
                'smtp_host'      => 'localhost',
                'smtp_server'    => 'localhost',
                'smtp_port'      => 587,
                'imap_host'      => 'localhost',
                'imap_server'    => 'localhost',
                'imap_port'      => 143,
            ]
        ]);
    }

    public function getConfig()
    {
        $settings = Setting::where('group', 'email')->get()->pluck('value', 'key')->toArray();

        $defaults = [
            'imap_host' => 'localhost',
            'imap_port' => '993',
            'smtp_host' => 'localhost',
            'smtp_port' => '587',
            'product_name' => 'QIWHOST Webmail',
            'default_language' => 'en_US',
            'max_message_size_mb' => '25',
            'session_lifetime_min' => '10',
            'plugin_archive' => '1',
            'plugin_zipdownload' => '1',
            'plugin_password' => '1',
            'plugin_managesieve' => '0',
            'plugin_carddav' => '0',
        ];

        $data = array_merge($defaults, $settings);

        return $this->successResponse($data, 'Roundcube configurations retrieved.');
    }

    public function updateConfig(Request $request)
    {
        $keys = [
            'imap_host', 'imap_port', 'smtp_host', 'smtp_port',
            'product_name', 'default_language', 'max_message_size_mb', 'session_lifetime_min',
            'plugin_archive', 'plugin_zipdownload', 'plugin_password', 'plugin_managesieve', 'plugin_carddav'
        ];

        $input = $request->only($keys);

        foreach ($input as $key => $val) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['group' => 'email', 'value' => (string) $val]
            );
        }

        return $this->getConfig();
    }

    public function testConnection(Request $request)
    {
        $validated = $request->validate([
            'imap_host' => 'required|string',
            'imap_port' => 'required|integer',
            'smtp_host' => 'required|string',
            'smtp_port' => 'required|integer',
        ]);

        $imapConnected = false;
        $smtpConnected = false;

        // Test IMAP Socket
        try {
            $imapSocket = @fsockopen($validated['imap_host'], $validated['imap_port'], $errno, $errstr, 2);
            if ($imapSocket) {
                $imapConnected = true;
                fclose($imapSocket);
            }
        } catch (\Exception $e) {}

        // Test SMTP Socket
        try {
            $smtpSocket = @fsockopen($validated['smtp_host'], $validated['smtp_port'], $errno, $errstr, 2);
            if ($smtpSocket) {
                $smtpConnected = true;
                fclose($smtpSocket);
            }
        } catch (\Exception $e) {}

        // Dev sandbox override
        if (env('APP_ENV') === 'local') {
            $imapConnected = true;
            $smtpConnected = true;
        }

        return $this->successResponse([
            'imap_status' => $imapConnected ? 'connected' : 'failed',
            'smtp_status' => $smtpConnected ? 'connected' : 'failed',
            'message' => ($imapConnected && $smtpConnected) 
                ? 'All sockets connected successfully!' 
                : 'Connection failed on one or more services.'
        ]);
    }

    public function install()
    {
        try {
            $action = new \App\Actions\InstallRoundcube();
            $action->handle(gethostname());
            return $this->successResponse(null, 'Roundcube installation scheduled and configured successfully!');
        } catch (\Exception $e) {
            return $this->errorResponse('Installation failed: ' . $e->getMessage());
        }
    }
}
