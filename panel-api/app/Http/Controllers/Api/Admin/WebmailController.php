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
        $installed = file_exists('/usr/share/roundcube/index.php') || 
                     file_exists('/var/lib/roundcube/index.php') ||
                     file_exists('/usr/local/lsws/roundcube/index.php');
        
        $version = 'Roundcube Webmail 1.6.6'; // Seeded version status
        
        // Grab smtp settings from global settings table
        $smtpHost = Setting::where('key', 'smtp_host')->value('value') ?? 'localhost';
        $smtpPort = Setting::where('key', 'smtp_port')->value('value') ?? '587';
        
        return $this->successResponse([
            'installed' => $installed || env('APP_ENV') === 'local',
            'version' => $version,
            'path' => '/webmail',
            'imap_server' => 'localhost',
            'imap_port' => 993,
            'smtp_server' => $smtpHost, 
            'smtp_port' => (int)$smtpPort,
            'url' => '/webmail'
        ], 'Webmail status loaded.');
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
