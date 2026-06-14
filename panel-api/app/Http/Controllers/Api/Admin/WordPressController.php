<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WordPressInstallation;
use App\Models\HostingAccount;
use App\Models\Database;
use App\Models\DatabaseUser;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class WordPressController extends Controller
{
    public function index()
    {
        $installs = WordPressInstallation::with(['hostingAccount.customer', 'domain'])->get();
        return $this->successResponse($installs, 'All WordPress installations retrieved successfully.');
    }

    public function getStats()
    {
        $total = WordPressInstallation::count();
        $maintenance = WordPressInstallation::where('status', 'maintenance')->count();

        // Get the latest known WP version from the most recently installed site
        $latestVersion = WordPressInstallation::orderBy('installed_at', 'desc')->value('version') ?? '6.5';
        $outdated = WordPressInstallation::where('version', '!=', $latestVersion)->count();
        $autoUpdateEnabled = WordPressInstallation::where('auto_update', true)->count();

        return $this->successResponse([
            'total_wp_installations' => $total,
            'outdated_wp_installations' => $outdated,
            'maintenance_wp_installations' => $maintenance,
            'auto_update_enabled' => $autoUpdateEnabled,
            'latest_version' => $latestVersion,
        ], 'WordPress toolkit central stats retrieved successfully.');
    }

    /**
     * Force update a WordPress installation's core from admin side
     */
    public function forceUpdateCore($id)
    {
        $wp = WordPressInstallation::with('hostingAccount')->findOrFail($id);
        $account = $wp->hostingAccount;

        if (!$account) {
            return $this->errorResponse('Associated hosting account not found.');
        }

        // Run WP-CLI core update
        $result = $this->runWpCli($wp, $account, ['core', 'update']);
        if (!$result['success']) {
            return $this->errorResponse('Core update failed: ' . $result['error']);
        }

        // Get new version
        $versionResult = $this->runWpCli($wp, $account, ['core', 'version']);
        $newVersion = trim($versionResult['output']) ?: $wp->version;
        $wp->update(['version' => $newVersion]);

        return $this->successResponse(['version' => $newVersion], "WordPress core force-updated to {$newVersion}.");
    }

    /**
     * Toggle auto-update setting for a WP installation
     */
    public function toggleAutoUpdate($id)
    {
        $wp = WordPressInstallation::findOrFail($id);
        $wp->update(['auto_update' => !$wp->auto_update]);

        $status = $wp->auto_update ? 'enabled' : 'disabled';
        return $this->successResponse($wp, "Auto-update {$status} for this WordPress installation.");
    }

    /**
     * Force delete a WordPress installation from admin side
     */
    public function forceDelete($id)
    {
        $wp = WordPressInstallation::with('hostingAccount')->findOrFail($id);
        $account = $wp->hostingAccount;

        $dbName = $wp->db_name;
        $dbUser = $wp->db_user;

        // 1. Remove WP files
        if ($account) {
            try {
                $process = new Process(['sudo', 'rm', '-rf', $wp->path]);
                $process->setTimeout(60);
                $process->run();

                // Recreate empty public_html if needed
                $domain = $wp->domain;
                if ($domain && $wp->path === $domain->domain_root) {
                    (new Process(['sudo', 'mkdir', '-p', $wp->path]))->run();
                    (new Process(['sudo', 'chown', "{$account->system_username}:www-data", $wp->path]))->run();
                    (new Process(['sudo', 'chmod', '775', $wp->path]))->run();
                }
            } catch (\Exception $e) {}
        }

        // 2. Drop MySQL database and user
        try {
            $safeDbName = preg_replace('/[^a-zA-Z0-9_]/', '', $dbName);
            $safeDbUser = preg_replace('/[^a-zA-Z0-9_]/', '', $dbUser);
            $sql = "DROP DATABASE IF EXISTS `{$safeDbName}`; " .
                   "DROP USER IF EXISTS '{$safeDbUser}'@'localhost'; " .
                   "FLUSH PRIVILEGES;";

            $rootPass = env('DB_ROOT_PASSWORD');
            $cmd = $rootPass ? ['mysql', '-u', 'root', "-p{$rootPass}", '-e', $sql] : ['mysql', '-u', 'root', '-e', $sql];
            $process = new Process($cmd);
            $process->setTimeout(30);
            $process->run();
        } catch (\Exception $e) {}

        // 3. Clean DB records
        if ($account) {
            Database::where('hosting_account_id', $account->id)
                ->where('database_name', str_replace($account->system_username . '_', '', $dbName))
                ->delete();
            DatabaseUser::where('hosting_account_id', $account->id)
                ->where('username', str_replace($account->system_username . '_', '', $dbUser))
                ->delete();
        }

        $wp->delete();

        return $this->successResponse(null, 'WordPress installation force-deleted successfully.');
    }

    /**
     * Scan and refresh version info for all WP installations
     */
    public function refreshVersions()
    {
        $installations = WordPressInstallation::with('hostingAccount')->get();
        $updated = 0;

        foreach ($installations as $wp) {
            $account = $wp->hostingAccount;
            if (!$account) continue;

            $result = $this->runWpCli($wp, $account, ['core', 'version']);
            if ($result['success'] && !empty(trim($result['output']))) {
                $wp->update(['version' => trim($result['output'])]);
                $updated++;
            }
        }

        return $this->successResponse(
            ['updated_count' => $updated, 'total' => $installations->count()],
            "Refreshed version info for {$updated} WordPress installations."
        );
    }

    private function runWpCli($wp, $account, array $args): array
    {
        $cmd = ['sudo', '-u', $account->system_username, 'wp'];
        $cmd = array_merge($cmd, $args);
        $cmd[] = '--path=' . $wp->path;

        $process = new Process($cmd);
        $process->setTimeout(300);
        $process->run();

        return [
            'success' => $process->isSuccessful(),
            'output' => $process->getOutput(),
            'error' => $process->getErrorOutput(),
            'exit_code' => $process->getExitCode(),
        ];
    }
}
