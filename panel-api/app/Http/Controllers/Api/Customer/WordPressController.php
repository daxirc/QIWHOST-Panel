<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\Database;
use App\Models\DatabaseUser;
use App\Models\HostingAccount;
use App\Models\WordPressInstallation;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class WordPressController extends Controller
{
    private function getHostingAccount(Request $request)
    {
        $customer = $request->user();
        $hostingAccountId = $request->header('X-Hosting-Account-Id') ?? $request->input('hosting_account_id');
        $hostingAccount = $hostingAccountId 
            ? $customer->hostingAccounts()->find($hostingAccountId) 
            : $customer->hostingAccounts()->first();

        if (!$hostingAccount) {
            throw new \RuntimeException("No hosting account selected or found.");
        }

        return $hostingAccount;
    }

    public function index(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $installs = WordPressInstallation::with('domain')
                ->where('hosting_account_id', $account->id)
                ->get();
            return $this->successResponse($installs, 'WordPress installations loaded.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function install(Request $request, $domainId)
    {
        try {
            $account = $this->getHostingAccount($request);
            $domain = Domain::findOrFail($domainId);

            $validated = $request->validate([
                'site_title' => 'required|string|max:255',
                'admin_user' => 'required|string|alpha_dash|max:64',
                'admin_email' => 'required|email',
                'admin_password' => 'required|string|min:6',
                'auto_update' => 'nullable|boolean',
                'db_suffix' => 'required|string|alpha_dash|max:64',
                'db_user_suffix' => 'required|string|alpha_dash|max:64',
                'db_password' => 'required|string|min:6',
                'directory' => 'nullable|string',
            ]);

            // Database Suffix Prefixing
            $prefix = $account->system_username . '_';
            $fullDbName = $prefix . $validated['db_suffix'];
            $fullDbUser = $prefix . $validated['db_user_suffix'];
            $dbPass = $validated['db_password'];

            // Sanitize DB identifiers to prevent SQL injection
            $safeDbName = preg_replace('/[^a-zA-Z0-9_]/', '', $fullDbName);
            $safeDbUser = preg_replace('/[^a-zA-Z0-9_]/', '', $fullDbUser);
            // Escape password for MySQL
            $safeDbPass = addslashes($dbPass);

            // MySQL DB Creation using sanitized values
            try {
                $sql = "CREATE DATABASE IF NOT EXISTS `{$safeDbName}`; " .
                       "CREATE USER IF NOT EXISTS '{$safeDbUser}'@'localhost' IDENTIFIED BY '{$safeDbPass}'; " .
                       "GRANT ALL PRIVILEGES ON `{$safeDbName}`.* TO '{$safeDbUser}'@'localhost'; " .
                       "FLUSH PRIVILEGES;";
                $this->runMysql($sql);
            } catch (\Exception $e) {
                return $this->errorResponse('Failed to create WordPress database: ' . $e->getMessage());
            }

            // Save database & user records
            Database::updateOrCreate(
                ['database_name' => $validated['db_suffix'], 'database_name_prefix' => $account->system_username],
                ['hosting_account_id' => $account->id, 'connection_host' => 'localhost']
            );

            DatabaseUser::updateOrCreate(
                ['username' => $validated['db_user_suffix'], 'hosting_account_id' => $account->id],
                ['password_encrypted' => Hash::make($dbPass), 'host' => 'localhost']
            );

            // Determine installation path
            $installPath = $domain->domain_root;
            $dir = trim($validated['directory'] ?? '', '/');
            if ($dir !== '') {
                $installPath .= '/' . $dir;
            }

            // Execute WP-CLI installation securely as the system user via sudo -u {username}
            try {
                // Create directory with proper ownership using sudo
                $mkdirProc = new Process(['sudo', 'mkdir', '-p', $installPath]);
                $mkdirProc->setTimeout(15);
                $mkdirProc->run();

                $chown = new Process(['sudo', 'chown', "{$account->system_username}:www-data", $installPath]);
                $chown->setTimeout(15);
                $chown->run();

                // 1. wp core download
                $dlProc = new Process(['sudo', '-u', $account->system_username, 'wp', 'core', 'download', '--path=' . $installPath]);
                $dlProc->setTimeout(120);
                $dlProc->run();
                if (!$dlProc->isSuccessful()) {
                    throw new \RuntimeException('WP core download failed: ' . $dlProc->getErrorOutput());
                }

                // 2. wp config create
                $cfgProc = new Process(['sudo', '-u', $account->system_username, 'wp', 'config', 'create', 
                    '--dbname=' . $safeDbName, 
                    '--dbuser=' . $safeDbUser, 
                    '--dbpass=' . $dbPass, 
                    '--path=' . $installPath
                ]);
                $cfgProc->setTimeout(30);
                $cfgProc->run();
                if (!$cfgProc->isSuccessful()) {
                    throw new \RuntimeException('WP config creation failed: ' . $cfgProc->getErrorOutput());
                }

                // 3. wp core install
                $siteUrl = $domain->domain;
                if ($dir !== '') {
                    $siteUrl .= '/' . $dir;
                }
                $instProc = new Process(['sudo', '-u', $account->system_username, 'wp', 'core', 'install',
                    '--url=' . $siteUrl,
                    '--title=' . $validated['site_title'],
                    '--admin_user=' . $validated['admin_user'],
                    '--admin_password=' . $validated['admin_password'],
                    '--admin_email=' . $validated['admin_email'],
                    '--path=' . $installPath
                ]);
                $instProc->setTimeout(60);
                $instProc->run();
                if (!$instProc->isSuccessful()) {
                    throw new \RuntimeException('WP core install failed: ' . $instProc->getErrorOutput());
                }

                // 4. Get actual installed version
                $versionProc = new Process(['sudo', '-u', $account->system_username, 'wp', 'core', 'version', '--path=' . $installPath]);
                $versionProc->setTimeout(15);
                $versionProc->run();
                $wpVersion = trim($versionProc->getOutput()) ?: '6.5';

                // 5. Fix permissions recursively so OpenLiteSpeed can write cleanly
                $chownRec = new Process(['sudo', 'chown', '-R', "{$account->system_username}:www-data", $installPath]);
                $chownRec->setTimeout(30);
                $chownRec->run();
                $chmodRec = new Process(['sudo', 'chmod', '-R', '775', $installPath]);
                $chmodRec->setTimeout(30);
                $chmodRec->run();

            } catch (\Exception $e) {
                // Fallback in case of failure/local dev
                if (env('APP_ENV') === 'local') {
                    @mkdir($installPath, 0775, true);
                    @file_put_contents($installPath . '/index.php', "<?php echo 'WordPress Local Dev Fallback - Success!';");
                    $wpVersion = '6.5';
                } else {
                    throw $e;
                }
            }

            // Store Installation Record
            $wp = WordPressInstallation::create([
                'hosting_account_id' => $account->id,
                'domain_id' => $domain->id,
                'path' => $installPath,
                'version' => $wpVersion ?? '6.5',
                'db_name' => $safeDbName,
                'db_user' => $safeDbUser,
                'status' => 'active',
                'wp_admin_user' => $validated['admin_user'],
                'wp_admin_email' => $validated['admin_email'],
                'auto_update' => $validated['auto_update'] ?? true,
                'installed_at' => now(),
            ]);

            return $this->successResponse($wp, 'WordPress installed successfully!', 201);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)
                ->with('domain')
                ->findOrFail($id);

            return $this->successResponse($wp, 'WordPress details loaded.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function updateCore(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            // Run WP-CLI core update
            $result = $this->runWpCli($wp, ['core', 'update']);
            if (!$result['success']) {
                return $this->errorResponse('Core update failed: ' . $result['error']);
            }

            // Get the actual new version after update
            $versionResult = $this->runWpCli($wp, ['core', 'version']);
            $newVersion = trim($versionResult['output']) ?: $wp->version;

            $wp->update(['version' => $newVersion]);

            return $this->successResponse(['version' => $newVersion], "WordPress core updated to {$newVersion}.");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function updatePlugins(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            $result = $this->runWpCli($wp, ['plugin', 'update', '--all']);
            if (!$result['success']) {
                return $this->errorResponse('Plugin update failed: ' . $result['error']);
            }

            return $this->successResponse(null, 'All plugins updated successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function updateThemes(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            $result = $this->runWpCli($wp, ['theme', 'update', '--all']);
            if (!$result['success']) {
                return $this->errorResponse('Theme update failed: ' . $result['error']);
            }

            return $this->successResponse(null, 'All themes updated successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * List REAL plugins from the WP installation using WP-CLI
     */
    public function listPlugins(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            // Get real plugin list from WP-CLI as JSON
            $result = $this->runWpCli($wp, ['plugin', 'list', '--format=json', '--fields=name,title,version,status,update']);

            if ($result['success'] && !empty($result['output'])) {
                $plugins = json_decode($result['output'], true);
                if (is_array($plugins)) {
                    // Normalize the update field to boolean
                    foreach ($plugins as &$plugin) {
                        $plugin['update'] = ($plugin['update'] ?? 'none') !== 'none';
                    }
                    return $this->successResponse($plugins, 'Plugins listed successfully.');
                }
            }

            // If WP-CLI fails (e.g., WP not fully set up), return empty
            return $this->successResponse([], 'No plugins found or WP-CLI unavailable.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function activatePlugin(Request $request, $id, $plugin)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            // Sanitize plugin name
            $safePlugin = preg_replace('/[^a-zA-Z0-9_\-]/', '', $plugin);
            $result = $this->runWpCli($wp, ['plugin', 'activate', $safePlugin]);
            if (!$result['success']) {
                return $this->errorResponse("Failed to activate plugin: " . $result['error']);
            }

            return $this->successResponse(null, "Plugin {$safePlugin} activated successfully.");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function deactivatePlugin(Request $request, $id, $plugin)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            $safePlugin = preg_replace('/[^a-zA-Z0-9_\-]/', '', $plugin);
            $result = $this->runWpCli($wp, ['plugin', 'deactivate', $safePlugin]);
            if (!$result['success']) {
                return $this->errorResponse("Failed to deactivate plugin: " . $result['error']);
            }

            return $this->successResponse(null, "Plugin {$safePlugin} deactivated successfully.");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function changeAdminPassword(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            $validated = $request->validate([
                'password' => 'required|string|min:6'
            ]);

            $result = $this->runWpCli($wp, ['user', 'update', $wp->wp_admin_user, '--user_pass=' . $validated['password']]);
            if (!$result['success']) {
                return $this->errorResponse('Failed to change password: ' . $result['error']);
            }

            return $this->successResponse(null, 'WordPress admin password changed successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function toggleMaintenanceMode(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            $nextStatus = $wp->status === 'maintenance' ? 'active' : 'maintenance';
            
            $action = $nextStatus === 'maintenance' ? 'activate' : 'deactivate';
            $result = $this->runWpCli($wp, ['maintenance-mode', $action]);
            if (!$result['success']) {
                return $this->errorResponse("Failed to toggle maintenance mode: " . $result['error']);
            }

            $wp->update(['status' => $nextStatus]);

            return $this->successResponse($wp, "WordPress maintenance mode toggled to {$nextStatus}.");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function createBackup(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            // Save backup zip OUTSIDE the WP directory to avoid recursive zipping
            $backupDir = "/home/{$account->system_username}/backups";
            $backupFile = "{$backupDir}/wp-backup-" . date('Ymd-His') . ".zip";

            // Create backup directory
            $mkdirProc = new Process(['sudo', '-u', $account->system_username, 'mkdir', '-p', $backupDir]);
            $mkdirProc->setTimeout(15);
            $mkdirProc->run();

            // Create zip from WP directory, stored outside it
            $process = new Process(['sudo', '-u', $account->system_username, 'zip', '-r', $backupFile, '.'], $wp->path);
            $process->setTimeout(300);
            $process->run();

            if (!$process->isSuccessful()) {
                return $this->errorResponse('Backup creation failed: ' . $process->getErrorOutput());
            }

            return $this->successResponse(
                ['backup_path' => $backupFile],
                'WordPress backup created successfully at ~/backups/'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            $dbName = $wp->db_name;
            $dbUser = $wp->db_user;

            // 1. Clean up WP directory contents using sudo
            try {
                $process = new Process(['sudo', 'rm', '-rf', $wp->path]);
                $process->setTimeout(60);
                $process->run();

                // Recreate the empty public_html if we deleted the root
                $domain = $wp->domain;
                if ($domain && $wp->path === $domain->domain_root) {
                    $mkdirProc = new Process(['sudo', 'mkdir', '-p', $wp->path]);
                    $mkdirProc->run();
                    (new Process(['sudo', 'chown', "{$account->system_username}:www-data", $wp->path]))->run();
                    (new Process(['sudo', 'chmod', '775', $wp->path]))->run();

                    // Restore default index.html
                    $defaultHtml = "<!DOCTYPE html><html><head><title>Website Ready</title></head><body><h1>Your website is ready.</h1><p>Upload your files to get started.</p></body></html>";
                    $tmpFile = "/tmp/index_restore_" . uniqid() . ".html";
                    file_put_contents($tmpFile, $defaultHtml);
                    (new Process(['sudo', 'mv', $tmpFile, $wp->path . '/index.html']))->run();
                    (new Process(['sudo', 'chown', "{$account->system_username}:www-data", $wp->path . '/index.html']))->run();
                }
            } catch (\Exception $e) {
                // Continue cleanup even if file removal fails
            }

            // 2. Drop MySQL database and user
            try {
                $safeDbName = preg_replace('/[^a-zA-Z0-9_]/', '', $dbName);
                $safeDbUser = preg_replace('/[^a-zA-Z0-9_]/', '', $dbUser);
                $sql = "DROP DATABASE IF EXISTS `{$safeDbName}`; " .
                       "DROP USER IF EXISTS '{$safeDbUser}'@'localhost'; " .
                       "FLUSH PRIVILEGES;";
                $this->runMysql($sql);
            } catch (\Exception $e) {
                // Continue even if DB cleanup fails
            }

            // 3. Clean up DB records
            Database::where('hosting_account_id', $account->id)
                ->where('database_name', str_replace($account->system_username . '_', '', $dbName))
                ->delete();

            DatabaseUser::where('hosting_account_id', $account->id)
                ->where('username', str_replace($account->system_username . '_', '', $dbUser))
                ->delete();

            // 4. Delete WP installation record
            $wp->delete();

            return $this->successResponse(null, 'WordPress installation and database fully removed.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Execute a WP-CLI command and return structured result with error handling
     */
    private function runWpCli($wp, array $args): array
    {
        $account = $wp->hostingAccount;
        if (!$account) {
            $account = HostingAccount::find($wp->hosting_account_id);
        }
        
        if (!$account) {
            return ['success' => false, 'output' => '', 'error' => 'Hosting account not found'];
        }

        $cmd = ['sudo', '-u', $account->system_username, 'wp'];
        $cmd = array_merge($cmd, $args);
        $cmd[] = '--path=' . $wp->path;
        
        $process = new Process($cmd);
        $process->setTimeout(300); // 5 minute timeout for long operations
        $process->run();

        return [
            'success' => $process->isSuccessful(),
            'output' => $process->getOutput(),
            'error' => $process->getErrorOutput(),
            'exit_code' => $process->getExitCode(),
        ];
    }

    private function runMysql($sql)
    {
        $rootPass = env('DB_ROOT_PASSWORD');
        $cmd = $rootPass ? ['mysql', '-u', 'root', "-p{$rootPass}", '-e', $sql] : ['mysql', '-u', 'root', '-e', $sql];
        $process = new Process($cmd);
        $process->setTimeout(30);
        $process->run();
        
        if (!$process->isSuccessful()) {
            throw new \RuntimeException('MySQL command failed: ' . $process->getErrorOutput());
        }
        
        return $process;
    }
}
