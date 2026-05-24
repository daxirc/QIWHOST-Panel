<?php
namespace App\Http\Controllers\Api\Whmcs;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\HostingAccount;
use App\Models\HostingPackage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

class WhmcsController extends Controller
{
    /**
     * Test connection ping
     */
    public function ping()
    {
        return response()->json([
            'success' => true,
            'message' => 'QIWHOST Panel API is reachable',
            'version' => '1.0.3',
        ]);
    }

    /**
     * Create hosting account from WHMCS
     */
    public function createAccount(Request $request)
    {
        $request->validate([
            'domain'       => 'required|string',
            'username'     => 'required|string|max:32',
            'password'     => 'required|string',
            'email'        => 'required|email',
            'first_name'   => 'required|string',
            'last_name'    => 'required|string',
            'package_name' => 'required|string',
            'disk_mb'      => 'nullable|integer',
            'bandwidth_mb' => 'nullable|integer',
            'max_domains'  => 'nullable|integer',
            'max_emails'   => 'nullable|integer',
            'max_databases'=> 'nullable|integer',
        ]);

        // Find or create package
        $package = HostingPackage::firstOrCreate(
            ['name' => $request->package_name],
            [
                'disk_mb'       => $request->disk_mb ?? 2048,
                'bandwidth_mb'  => $request->bandwidth_mb ?? 10240,
                'max_domains'   => $request->max_domains ?? 5,
                'max_emails'    => $request->max_emails ?? 10,
                'max_databases' => $request->max_databases ?? 5,
                'max_ftp'       => 5,
                'max_subdomains'=> 10,
            ]
        );

        // Create customer
        $customer = Customer::firstOrCreate(
            ['email' => $request->email],
            [
                'name'     => $request->first_name . ' ' . $request->last_name,
                'username' => $request->username,
                'password' => Hash::make($request->password),
                'status'   => 'active',
            ]
        );

        // Check if hosting account already exists
        if (HostingAccount::where('system_username', $request->username)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Account already exists'
            ], 409);
        }

        // Delegate to HostingAccountController logic
        $adminRequest = new Request([
            'customer_id'      => $customer->id,
            'domain'           => $request->domain,
            'system_username'  => $request->username,
            'system_password'  => $request->password,
            'hosting_package_id' => $package->id,
            'php_version'      => '8.3',
        ]);

        $controller = new \App\Http\Controllers\Api\Admin\HostingAccountController();
        return $controller->store($adminRequest);
    }

    /**
     * Suspend account
     */
    public function suspend(Request $request)
    {
        $account = HostingAccount::where('system_username', $request->username)->first();
        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 404);
        }

        $controller = new \App\Http\Controllers\Api\Admin\HostingAccountController();
        return $controller->suspend($account->id);
    }

    /**
     * Unsuspend account
     */
    public function unsuspend(Request $request)
    {
        $account = HostingAccount::where('system_username', $request->username)->first();
        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 404);
        }

        $controller = new \App\Http\Controllers\Api\Admin\HostingAccountController();
        return $controller->unsuspend($account->id);
    }

    /**
     * Terminate account
     */
    public function terminate(Request $request)
    {
        $account = HostingAccount::where('system_username', $request->username)->first();
        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 404);
        }

        $controller = new \App\Http\Controllers\Api\Admin\HostingAccountController();
        return $controller->destroy($account->id);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request)
    {
        $customer = Customer::where('username', $request->username)->first();
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        }

        $customer->update(['password' => Hash::make($request->password)]);

        // Also update Linux user password
        $account = HostingAccount::where('system_username', $request->username)->first();
        if ($account) {
            $proc = new Process(['sudo', 'chpasswd']);
            $proc->setInput("{$request->username}:{$request->password}");
            $proc->run();
        }

        return response()->json(['success' => true, 'message' => 'Password updated']);
    }

    /**
     * Generate SSO token for auto-login
     */
    public function sso(Request $request)
    {
        $request->validate([
            'username' => 'required|string|alpha_dash|max:32',
        ]);

        // Find account - must be active
        $account = HostingAccount::where('system_username', $request->username)
            ->where('status', 'active') // only active accounts
            ->with('customer')
            ->first();

        if (!$account || !$account->customer) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found or suspended'
            ], 404);
        }

        // Generate cryptographically secure one-time token
        $token = bin2hex(random_bytes(32)); // 64 char hex, more secure than Str::random
        
        Cache::put("whmcs_sso_{$token}", [
            'customer_id' => $account->customer->id,
            'email'       => $account->customer->email,
            'username'    => $request->username,
            'created_at'  => now()->timestamp,
        ], now()->addSeconds(60)); // 60 seconds only

        // Resolve secure frontend URL dynamically
        $frontendUrl = env('FRONTEND_URL');
        if (empty($frontendUrl)) {
            $host = 'node1.qiwhost.com';
            if (file_exists('/etc/hostname')) {
                $sysHost = trim(file_get_contents('/etc/hostname'));
                if (!empty($sysHost)) {
                    $host = $sysHost;
                }
            }
            $frontendUrl = "https://" . $host . ":8443";
        }

        return response()->json([
            'success' => true,
            'data' => [
                'redirect_url' => $frontendUrl . '/sso?token=' . $token,
                'expires_in'   => 60,
            ]
        ]);
    }

    /**
     * SSO redirect handler - validates token and logs in customer
     */
    public function ssoRedirect(Request $request)
    {
        $token = $request->query('token');
        
        // Validate token format (must be 64 char hex)
        if (!$token || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return redirect('/customer/login')->with('error', 'Invalid SSO token format');
        }

        $ssoData = Cache::get("whmcs_sso_{$token}");
        if (!$ssoData) {
            return redirect('/customer/login')->with('error', 'SSO token expired or already used');
        }

        // One-time use: delete immediately
        Cache::forget("whmcs_sso_{$token}");

        // Validate token age (extra safety)
        if (now()->timestamp - $ssoData['created_at'] > 60) {
            return redirect('/customer/login')->with('error', 'SSO token expired');
        }

        $customer = Customer::find($ssoData['customer_id']);
        if (!$customer) {
            return redirect('/customer/login')->with('error', 'Customer not found');
        }

        // Generate short-lived API token (1 hour)
        $apiToken = $customer->createToken('whmcs-sso', ['customer'], now()->addHour())->plainTextToken;

        $panelUrl = config('app.url');
        // Use port 8443 for frontend
        $frontendUrl = str_replace(':8080', ':8443', $panelUrl);

        return redirect($frontendUrl . "/customer/sso-callback?token={$apiToken}&email=" . urlencode($customer->email));
    }

    /**
     * Get usage stats for WHMCS
     */
    public function usage($username)
    {
        $account = HostingAccount::where('system_username', $username)->first();
        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Account not found'], 404);
        }

        // Get disk usage safely
        $diskUsed = 0;
        try {
            $proc = new Process(['du', '-sm', "/home/{$username}"]);
            $proc->setTimeout(10);
            $proc->run();
            if ($proc->isSuccessful()) {
                $diskUsed = (int) explode("\t", trim($proc->getOutput()))[0];
            }
        } catch (\Exception $e) {}

        return response()->json([
            'success' => true,
            'data' => [
                'username'           => $username,
                'disk_used_mb'       => $diskUsed,
                'disk_limit_mb'      => $account->hostingPackage->disk_mb ?? 0,
                'bandwidth_used_mb'  => $account->bandwidth_used_mb ?? 0,
                'bandwidth_limit_mb' => $account->hostingPackage->bandwidth_mb ?? 0,
            ]
        ]);
    }
}
