<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class SettingsController extends Controller
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

    public function getSettings($group)
    {
        $settings = Setting::where('group', $group)->get()->pluck('value', 'key')->toArray();

        // Standard Group Defaults
        $defaults = [
            'general' => [
                'panel_name' => 'QIWHOST Panel',
                'panel_logo_url' => '',
                'support_email' => 'support@qiwhost.com',
                'default_php_version' => '8.3',
                'timezone' => 'UTC',
            ],
            'nameservers' => [
                'node' => 'node1',
                'ns1' => 'ns1.node1.qiwhost.com',
                'ns2' => 'ns2.node1.qiwhost.com',
                'ns_ip' => $this->getServerIp(),
                'dns_ttl' => '3600',
            ],
            'email' => [
                'smtp_host' => 'localhost',
                'smtp_port' => '587',
                'mail_from_address' => 'noreply@qiwhost.com',
                'mail_from_name' => 'QIWHOST Panel',
                'roundcube_path' => '/webmail',
            ],
            'ssl' => [
                'letsencrypt_email' => 'admin@qiwhost.com',
                'ssl_auto_renew' => '1',
                'ssl_check_interval' => '24',
                'default_ssl_provider' => 'Let\'s Encrypt',
            ]
        ];

        $groupDefaults = $defaults[$group] ?? [];
        $data = array_merge($groupDefaults, $settings);

        return $this->successResponse($data, "Settings retrieved for group: {$group}.");
    }

    public function saveSettings(Request $request, $group)
    {
        $keys = [
            'general' => ['panel_name', 'panel_logo_url', 'support_email', 'default_php_version', 'timezone'],
            'nameservers' => ['node', 'ns1', 'ns2', 'ns_ip', 'dns_ttl'],
            'email' => ['smtp_host', 'smtp_port', 'mail_from_address', 'mail_from_name', 'roundcube_path'],
            'ssl' => ['letsencrypt_email', 'ssl_auto_renew', 'ssl_check_interval', 'default_ssl_provider']
        ];

        $allowedKeys = $keys[$group] ?? [];
        if (empty($allowedKeys)) {
            return $this->errorResponse('Invalid settings group specified.');
        }

        $input = $request->only($allowedKeys);

        // Customize Nameserver logic if saving NS group
        if ($group === 'nameservers' && isset($input['node'])) {
            $node = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['node']);
            $input['ns1'] = "ns1.{$node}.qiwhost.com";
            $input['ns2'] = "ns2.{$node}.qiwhost.com";
        }

        foreach ($input as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['group' => $group, 'value' => (string) $value]
            );
        }

        return $this->successResponse(Setting::where('group', $group)->get()->pluck('value', 'key'), 'Settings updated successfully.');
    }

    public function getServerInfo()
    {
        // OS version
        $os = 'Ubuntu 22.04 LTS';
        try {
            if (file_exists('/etc/os-release')) {
                $osInfo = parse_ini_file('/etc/os-release');
                $os = $osInfo['PRETTY_NAME'] ?? $os;
            }
        } catch (\Exception $e) {}

        // OLS version
        $olsVersion = 'OpenLiteSpeed 1.7.19';
        try {
            $process = new Process(['/usr/local/lsws/bin/lshttpd', '-v']);
            $process->run();
            if ($process->isSuccessful()) {
                $olsVersion = trim($process->getOutput());
            }
        } catch (\Exception $e) {}

        // MySQL version
        $mysqlVersion = 'MySQL 8.0.35';
        try {
            $process = new Process(['mysql', '-V']);
            $process->run();
            if ($process->isSuccessful()) {
                $mysqlVersion = trim($process->getOutput());
            }
        } catch (\Exception $e) {}

        // PHP installed versions
        $phpVersions = ['8.0', '8.1', '8.2', '8.3'];

        // Disk stats
        $diskTotal = disk_total_space('/') / (1024 * 1024 * 1024); // GB
        $diskFree = disk_free_space('/') / (1024 * 1024 * 1024); // GB
        $diskUsed = $diskTotal - $diskFree;

        // CPU / RAM load
        $load = sys_getloadavg();
        $cpu = $load ? round($load[0] * 10, 1) : 2.5;
        $ramUsed = 512;
        $ramTotal = 2048;
        try {
            if (file_exists('/proc/meminfo')) {
                $meminfo = file_get_contents('/proc/meminfo');
                preg_match('/MemTotal:\s+(\d+) kB/', $meminfo, $totalMatches);
                preg_match('/MemAvailable:\s+(\d+) kB/', $meminfo, $availMatches);
                if (!empty($totalMatches) && !empty($availMatches)) {
                    $ramTotal = round($totalMatches[1] / 1024);
                    $ramAvail = round($availMatches[1] / 1024);
                    $ramUsed = $ramTotal - $ramAvail;
                }
            }
        } catch (\Exception $e) {}

        return $this->successResponse([
            'server_ip' => $this->getServerIp(),
            'hostname' => gethostname(),
            'os_version' => $os,
            'ols_version' => $olsVersion,
            'mysql_version' => $mysqlVersion,
            'php_versions' => $phpVersions,
            'disk_total_gb' => round($diskTotal, 1),
            'disk_used_gb' => round($diskUsed, 1),
            'cpu_usage' => $cpu,
            'ram_total_mb' => $ramTotal,
            'ram_used_mb' => $ramUsed,
        ], 'Server information retrieved successfully.');
    }

    public function getHostname()
    {
        $settings = Setting::where('group', 'hostname')->get()->pluck('value', 'key')->toArray();

        $defaults = [
            'server_hostname' => gethostname(),
            'server_ip' => $this->getServerIp(),
            'server_node_name' => 'node1',
            'panel_domain' => 'panel.qiwhost.com',
            'nameserver_1' => 'ns1.node1.qiwhost.com',
            'nameserver_2' => 'ns2.node1.qiwhost.com',
            'nameserver_ip_1' => $this->getServerIp(),
            'nameserver_ip_2' => $this->getServerIp(),
            'rdns_hostname' => '',
            'server_location' => 'Germany',
            'server_datacenter' => 'Hetzner',
        ];

        $data = array_merge($defaults, $settings);
        if (empty($data['server_ip'])) {
            $data['server_ip'] = $this->getServerIp();
        }

        return $this->successResponse($data, 'Hostname settings loaded.');
    }

    public function saveHostname(Request $request)
    {
        $keys = [
            'server_hostname', 'server_node_name', 'panel_domain',
            'nameserver_1', 'nameserver_2', 'nameserver_ip_1', 'nameserver_ip_2',
            'rdns_hostname', 'server_location', 'server_datacenter'
        ];

        $input = $request->only($keys);
        $input['server_ip'] = $this->getServerIp();

        if (!empty($input['server_node_name'])) {
            $node = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['server_node_name']);
            $input['nameserver_1'] = "ns1.{$node}.qiwhost.com";
            $input['nameserver_2'] = "ns2.{$node}.qiwhost.com";
        }

        foreach ($input as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['group' => 'hostname', 'value' => (string) $value]
            );
        }

        return $this->getHostname();
    }

    public function getServerDefaults()
    {
        $settings = Setting::where('group', 'server_defaults')->get()->pluck('value', 'key')->toArray();

        $defaults = [
            'default_php_version' => '8.3',
            'default_memory_limit' => '256M',
            'default_max_execution_time' => '30',
            'default_upload_max_filesize' => '64M',
            'default_post_max_size' => '64M',
            'default_email_quota_mb' => '1024',
            'mail_server_hostname' => 'mail.qiwhost.com',
            'dkim_key_bits' => '2048',
            'php_disable_functions' => 'exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,show_source,eval',
            'open_basedir_enabled' => '1',
            'mod_security_enabled' => '1',
            'shell_upload_scan_enabled' => '1',
            'default_cpu_limit_percent' => '25',
            'default_io_limit_mbps' => '10',
            'default_process_limit' => '20',
            'backup_retention_days' => '7',
            'backup_time' => '02:00',
            'backup_location' => '/home/backups',
            'wordpress_auto_update' => '1',
            'wordpress_auto_update_plugins' => '1',
        ];

        $data = array_merge($defaults, $settings);
        return $this->successResponse($data, 'Server defaults retrieved.');
    }

    public function saveServerDefaults(Request $request)
    {
        $keys = [
            'default_php_version', 'default_memory_limit', 'default_max_execution_time',
            'default_upload_max_filesize', 'default_post_max_size', 'default_email_quota_mb',
            'mail_server_hostname', 'dkim_key_bits', 'php_disable_functions',
            'open_basedir_enabled', 'mod_security_enabled', 'shell_upload_scan_enabled',
            'default_cpu_limit_percent', 'default_io_limit_mbps', 'default_process_limit',
            'backup_retention_days', 'backup_time', 'backup_location',
            'wordpress_auto_update', 'wordpress_auto_update_plugins'
        ];

        $input = $request->only($keys);

        foreach ($input as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['group' => 'server_defaults', 'value' => (string) $value]
            );
        }

        return $this->getServerDefaults();
    }
}
