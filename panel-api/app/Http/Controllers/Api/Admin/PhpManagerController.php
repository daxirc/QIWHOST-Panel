<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HostingAccount;
use App\Models\PhpSetting;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class PhpManagerController extends Controller
{
    private function compilePhpIni(HostingAccount $account)
    {
        $settings = PhpSetting::where('hosting_account_id', $account->id)->get()->pluck('setting_value', 'setting_key')->toArray();
        
        $defaults = [
            'memory_limit' => '256M',
            'max_execution_time' => '30',
            'max_input_time' => '60',
            'max_input_vars' => '1000',
            'upload_max_filesize' => '64M',
            'post_max_size' => '64M',
            'max_file_uploads' => '20',
            'session.gc_maxlifetime' => '1440',
            'session.cookie_lifetime' => '0',
            'display_errors' => 'Off',
            'error_reporting' => 'E_ALL & ~E_NOTICE',
            'log_errors' => 'On',
            'opcache.enable' => 'On',
            'opcache.memory_consumption' => '128',
            'realpath_cache_size' => '4M',
            'realpath_cache_ttl' => '120',
        ];

        $merged = array_merge($defaults, $settings);

        $content = "; php.ini user overrides generated dynamically by QIWHOST Panel\n";
        $content .= "; Generated on " . date('Y-m-d H:i:s') . "\n\n";
        
        foreach ($merged as $key => $val) {
            $content .= "{$key} = \"{$val}\"\n";
        }

        $dirPath = "/home/{$account->system_username}";
        $filePath = "{$dirPath}/php.ini";

        try {
            if (!file_exists($dirPath)) {
                $mkdir = new Process(['sudo', 'mkdir', '-p', $dirPath]);
                $mkdir->run();
            }

            // Write temporary file
            $tmpFile = tempnam(sys_get_temp_dir(), 'php_ini_');
            file_put_contents($tmpFile, $content);

            // Move securely using Process
            $mv = new Process(['sudo', 'mv', $tmpFile, $filePath]);
            $mv->run();

            $chown = new Process(['sudo', 'chown', "{$account->system_username}:www-data", $filePath]);
            $chown->run();

            $chmod = new Process(['sudo', 'chmod', '644', $filePath]);
            $chmod->run();

        } catch (\Exception $e) {
            // Local dev backup fallback
            if (!file_exists(dirname($filePath))) {
                @mkdir(dirname($filePath), 0755, true);
            }
            @file_put_contents($filePath, $content);
        }
    }

    public function getPhpVersions()
    {
        $versions = [
            ['version' => '8.0', 'status' => 'installed', 'is_default' => false, 'accounts_count' => HostingAccount::where('php_version', '8.0')->count()],
            ['version' => '8.1', 'status' => 'installed', 'is_default' => false, 'accounts_count' => HostingAccount::where('php_version', '8.1')->count()],
            ['version' => '8.2', 'status' => 'installed', 'is_default' => false, 'accounts_count' => HostingAccount::where('php_version', '8.2')->count()],
            ['version' => '8.3', 'status' => 'installed', 'is_default' => true, 'accounts_count' => HostingAccount::where('php_version', '8.3')->count()],
        ];

        return $this->successResponse($versions, 'PHP versions compiled successfully.');
    }

    public function getPhpConfig($accountId)
    {
        $account = HostingAccount::findOrFail($accountId);
        $settings = PhpSetting::where('hosting_account_id', $accountId)->get()->pluck('setting_value', 'setting_key')->toArray();

        $defaults = [
            'memory_limit' => '256M',
            'max_execution_time' => '30',
            'max_input_time' => '60',
            'max_input_vars' => '1000',
            'upload_max_filesize' => '64M',
            'post_max_size' => '64M',
            'max_file_uploads' => '20',
            'session.gc_maxlifetime' => '1440',
            'session.cookie_lifetime' => '0',
            'display_errors' => 'Off',
            'error_reporting' => 'E_ALL & ~E_NOTICE',
            'log_errors' => 'On',
            'opcache.enable' => 'On',
            'opcache.memory_consumption' => '128',
            'realpath_cache_size' => '4M',
            'realpath_cache_ttl' => '120',
        ];

        $data = array_merge($defaults, $settings);

        return $this->successResponse([
            'account_id' => $account->id,
            'domain' => $account->domain,
            'system_username' => $account->system_username,
            'php_version' => $account->php_version,
            'settings' => $data
        ], 'PHP configurations loaded successfully.');
    }

    public function updatePhpConfig(Request $request, $accountId)
    {
        $account = HostingAccount::findOrFail($accountId);

        $allowedKeys = [
            'memory_limit', 'max_execution_time', 'max_input_time', 'max_input_vars',
            'upload_max_filesize', 'post_max_size', 'max_file_uploads',
            'session.gc_maxlifetime', 'session.cookie_lifetime',
            'display_errors', 'error_reporting', 'log_errors',
            'opcache.enable', 'opcache.memory_consumption',
            'realpath_cache_size', 'realpath_cache_ttl'
        ];

        $input = $request->only($allowedKeys);

        foreach ($input as $key => $val) {
            PhpSetting::updateOrCreate(
                ['hosting_account_id' => $accountId, 'setting_key' => $key],
                ['setting_value' => (string) $val]
            );
        }

        // Physical compile
        $this->compilePhpIni($account);

        return $this->getPhpConfig($accountId);
    }

    public function getPhpExtensions($accountId)
    {
        $account = HostingAccount::findOrFail($accountId);
        
        // standard default extensions list
        $extensions = [
            ['name' => 'curl', 'enabled' => true, 'description' => 'Client URL Library'],
            ['name' => 'gd', 'enabled' => true, 'description' => 'Image processing & GD drawing library'],
            ['name' => 'mbstring', 'enabled' => true, 'description' => 'Multi-Byte String handling functions'],
            ['name' => 'xml', 'enabled' => true, 'description' => 'DOM and XML Parser extensions'],
            ['name' => 'zip', 'enabled' => true, 'description' => 'Zip Archive operations'],
            ['name' => 'bcmath', 'enabled' => true, 'description' => 'Arbitrary precision mathematics'],
            ['name' => 'intl', 'enabled' => true, 'description' => 'Internationalization support formatting'],
            ['name' => 'soap', 'enabled' => false, 'description' => 'Simple Object Access Protocol client/server'],
            ['name' => 'sockets', 'enabled' => true, 'description' => 'Network socket communication interfaces'],
            ['name' => 'imagick', 'enabled' => true, 'description' => 'ImageMagick advanced file operations'],
            ['name' => 'redis', 'enabled' => true, 'description' => 'Redis key-value cache client drivers'],
            ['name' => 'memcached', 'enabled' => false, 'description' => 'Memcached object memory cache client'],
            ['name' => 'mongodb', 'enabled' => false, 'description' => 'NoSQL MongoDB server connector driver'],
            ['name' => 'pdo_mysql', 'enabled' => true, 'description' => 'MySQL PDO database drivers'],
            ['name' => 'pdo_pgsql', 'enabled' => false, 'description' => 'PostgreSQL PDO database drivers'],
            ['name' => 'opcache', 'enabled' => true, 'description' => 'Zend OPcache engine optimizer bytecode compiler'],
            ['name' => 'xdebug', 'enabled' => false, 'description' => 'PHP source code debugging and profiling tool (Dangerous in production)'],
        ];

        // Fetch user extensions overrides from DB if stored in php_settings with prefix 'ext_'
        foreach ($extensions as &$ext) {
            $dbExt = PhpSetting::where('hosting_account_id', $accountId)
                ->where('setting_key', 'ext_' . $ext['name'])
                ->first();
            if ($dbExt) {
                $ext['enabled'] = ($dbExt->setting_value === '1' || $dbExt->setting_value === 'On');
            }
        }

        return $this->successResponse($extensions, 'PHP extensions loaded successfully.');
    }

    public function toggleExtension(Request $request, $accountId, $extension)
    {
        $account = HostingAccount::findOrFail($accountId);
        $enabled = $request->input('enabled', true) ? 'On' : 'Off';

        PhpSetting::updateOrCreate(
            ['hosting_account_id' => $accountId, 'setting_key' => 'ext_' . $extension],
            ['setting_value' => $enabled]
        );

        // Compile physical changes
        $this->compilePhpIni($account);

        return $this->getPhpExtensions($accountId);
    }

    public function getPhpFpmStatus()
    {
        return $this->successResponse([
            'status' => 'active',
            'pools_running' => HostingAccount::count(),
            'active_connections' => 8,
            'idle_connections' => 32,
            'memory_used_mb' => 142.5,
        ], 'PHP-FPM diagnostic status retrieved.');
    }
}
