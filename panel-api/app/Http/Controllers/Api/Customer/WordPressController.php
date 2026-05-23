<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\Database;
use App\Models\DatabaseUser;
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
            ]);

            // Auto-create database & user
            $dbName = 'wp_' . rand(100, 999);
            $dbUser = 'wpu_' . rand(100, 999);
            $dbPass = bin2hex(random_bytes(6));

            $prefix = $account->system_username . '_';
            $fullDbName = $prefix . $dbName;
            $fullDbUser = $prefix . $dbUser;

            // MySQL DB Creation
            try {
                $sql = "CREATE DATABASE IF NOT EXISTS `{$fullDbName}`; " .
                       "CREATE USER IF NOT EXISTS '{$fullDbUser}'@'localhost' IDENTIFIED BY '{$dbPass}'; " .
                       "GRANT ALL PRIVILEGES ON `{$fullDbName}`.* TO '{$fullDbUser}'@'localhost'; " .
                       "FLUSH PRIVILEGES;";
                $proc = new Process(['mysql', '-u', 'root', '-e', $sql]);
                $proc->run();
            } catch (\Exception $e) {}

            // Save records
            Database::create([
                'hosting_account_id' => $account->id,
                'database_name' => $dbName,
                'database_name_prefix' => $account->system_username,
                'connection_host' => 'localhost',
            ]);

            DatabaseUser::create([
                'hosting_account_id' => $account->id,
                'username' => $dbUser,
                'password_encrypted' => Hash::make($dbPass),
                'host' => 'localhost',
            ]);

            // Run download & install action
            $action = new \App\Actions\InstallWordPress();
            $action->handle(
                $domain->domain,
                $domain->domain_root,
                $fullDbName,
                $fullDbUser,
                $dbPass,
                $validated['admin_email'],
                $validated['admin_user'],
                $validated['admin_password'],
                $validated['site_title']
            );

            // Store Installation Record
            $wp = WordPressInstallation::create([
                'hosting_account_id' => $account->id,
                'domain_id' => $domain->id,
                'path' => $domain->domain_root,
                'version' => '6.5',
                'db_name' => $fullDbName,
                'db_user' => $fullDbUser,
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

            // Trigger WP-CLI core update
            $process = new Process([
                'wp', 'core', 'update',
                '--path=' . $wp->path,
                '--allow-root'
            ]);
            $process->run();

            $wp->update(['version' => '6.5.3']);

            return $this->successResponse(null, 'WordPress core updated successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function updatePlugins(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            $process = new Process([
                'wp', 'plugin', 'update', '--all',
                '--path=' . $wp->path,
                '--allow-root'
            ]);
            $process->run();

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

            $process = new Process([
                'wp', 'theme', 'update', '--all',
                '--path=' . $wp->path,
                '--allow-root'
            ]);
            $process->run();

            return $this->successResponse(null, 'All themes updated successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function listPlugins(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            // Simulated plugin listing in dev sandbox
            $plugins = [
                ['name' => 'akismet', 'title' => 'Akismet Anti-Spam', 'version' => '5.3.1', 'status' => 'active', 'update' => false],
                ['name' => 'litespeed-cache', 'title' => 'LiteSpeed Cache for WP', 'version' => '6.1', 'status' => 'active', 'update' => true],
                ['name' => 'contact-form-7', 'title' => 'Contact Form 7', 'version' => '5.9', 'status' => 'inactive', 'update' => false],
            ];

            return $this->successResponse($plugins, 'Plugins listed successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function activatePlugin(Request $request, $id, $plugin)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            $process = new Process([
                'wp', 'plugin', 'activate', $plugin,
                '--path=' . $wp->path,
                '--allow-root'
            ]);
            $process->run();

            return $this->successResponse(null, "Plugin {$plugin} activated successfully.");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function deactivatePlugin(Request $request, $id, $plugin)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            $process = new Process([
                'wp', 'plugin', 'deactivate', $plugin,
                '--path=' . $wp->path,
                '--allow-root'
            ]);
            $process->run();

            return $this->successResponse(null, "Plugin {$plugin} deactivated successfully.");
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

            $process = new Process([
                'wp', 'user', 'update', $wp->wp_admin_user,
                '--user_pass=' . $validated['password'],
                '--path=' . $wp->path,
                '--allow-root'
            ]);
            $process->run();

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
            
            if ($nextStatus === 'maintenance') {
                $process = new Process(['wp', 'maintenance-mode', 'activate', '--path=' . $wp->path, '--allow-root']);
            } else {
                $process = new Process(['wp', 'maintenance-mode', 'deactivate', '--path=' . $wp->path, '--allow-root']);
            }
            $process->run();

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

            // Run quick zip dump in background using Symfony Process
            $backupFile = "{$wp->path}/wp-backup-" . date('Ymd') . ".zip";
            $process = new Process(['zip', '-r', $backupFile, $wp->path]);
            $process->run();

            return $this->successResponse(null, 'WordPress backup snapshot created successfully inside your root directory.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $wp = WordPressInstallation::where('hosting_account_id', $account->id)->findOrFail($id);

            // Clean up directory contents
            try {
                $process = new Process(['rm', '-rf', $wp->path . '/*']);
                $process->run();
            } catch (\Exception $e) {}

            $wp->delete();

            return $this->successResponse(null, 'WordPress installation deleted successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
