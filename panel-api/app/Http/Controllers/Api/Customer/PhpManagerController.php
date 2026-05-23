<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\HostingAccount;
use App\Models\PhpSetting;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Admin\PhpManagerController as AdminPhpManagerController;

class PhpManagerController extends Controller
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

    public function getConfig(Request $request)
    {
        try {
            $customer = $request->user();
            $hostingAccountId = $request->header('X-Hosting-Account-Id') ?? $request->input('hosting_account_id');
            $account = $hostingAccountId 
                ? $customer->hostingAccounts()->find($hostingAccountId) 
                : $customer->hostingAccounts()->first();

            if (!$account) {
                return response()->json([
                    'success' => true, 
                    'data' => ['php_version' => '8.3', 'settings' => []]
                ]);
            }

            $adminController = new AdminPhpManagerController();
            return $adminController->getPhpConfig($account->id);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function updateConfig(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);

            // Validation against cPanel caps
            $validated = $request->validate([
                'memory_limit' => 'nullable|string',
                'max_execution_time' => 'nullable|integer|min:30|max:300',
                'max_input_time' => 'nullable|integer|min:30|max:300',
                'max_input_vars' => 'nullable|integer|min:100|max:10000',
                'upload_max_filesize' => 'nullable|string',
                'post_max_size' => 'nullable|string',
                'max_file_uploads' => 'nullable|integer|min:1|max:100',
                'session.gc_maxlifetime' => 'nullable|integer|min:60',
                'session.cookie_lifetime' => 'nullable|integer|min:0',
                'display_errors' => 'nullable|string|in:On,Off',
                'error_reporting' => 'nullable|string|in:E_ALL,E_ALL & ~E_NOTICE,E_ALL & ~E_DEPRECATED',
                'log_errors' => 'nullable|string|in:On,Off',
                'opcache.enable' => 'nullable|string|in:On,Off',
                'opcache.memory_consumption' => 'nullable|integer|min:32|max:512',
                'realpath_cache_size' => 'nullable|string',
                'realpath_cache_ttl' => 'nullable|integer|min:60|max:600'
            ]);

            // Filter memory sizing strings securely (e.g. 512M cap)
            if (isset($validated['memory_limit'])) {
                $val = strtoupper($validated['memory_limit']);
                $num = intval($val);
                if ($num > 2048) {
                    return $this->errorResponse("Memory limit exceeds max allowed panel cap (2048M).", null, 422);
                }
                $validated['memory_limit'] = $num . 'M';
            }

            if (isset($validated['upload_max_filesize'])) {
                $val = strtoupper($validated['upload_max_filesize']);
                $num = intval($val);
                if ($num > 512) {
                    return $this->errorResponse("Upload limit exceeds max allowed cap (512M).", null, 422);
                }
                $validated['upload_max_filesize'] = $num . 'M';
            }

            if (isset($validated['post_max_size'])) {
                $val = strtoupper($validated['post_max_size']);
                $num = intval($val);
                if ($num > 512) {
                    return $this->errorResponse("Post limit exceeds max allowed cap (512M).", null, 422);
                }
                $validated['post_max_size'] = $num . 'M';
            }

            // Update keys
            foreach ($validated as $key => $val) {
                PhpSetting::updateOrCreate(
                    ['hosting_account_id' => $account->id, 'setting_key' => $key],
                    ['setting_value' => (string) $val]
                );
            }

            // Trigger physical compilation
            $adminController = new AdminPhpManagerController();
            $adminController->updatePhpConfig($request, $account->id);

            return $this->getConfig($request);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function getExtensions(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $adminController = new AdminPhpManagerController();
            return $adminController->getPhpExtensions($account->id);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function toggleExtension(Request $request, $extension)
    {
        try {
            $account = $this->getHostingAccount($request);
            $adminController = new AdminPhpManagerController();
            return $adminController->toggleExtension($request, $account->id, $extension);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function getCurrentVersion(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            return $this->successResponse([
                'php_version' => $account->php_version,
            ], 'Active PHP version retrieved.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
