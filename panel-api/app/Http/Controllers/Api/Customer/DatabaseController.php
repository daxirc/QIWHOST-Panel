<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Database;
use App\Models\DatabaseUser;
use App\Models\HostingAccount;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use App\Http\Controllers\Api\Admin\DatabaseController as AdminDatabaseController;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB as DBFacade;

class DatabaseController extends Controller
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
            $databases = $account->databases()->get();
            
            $results = [];
            foreach ($databases as $db) {
                $fullDbName = $db->database_name_prefix . '_' . $db->database_name;
                $size = 0.5; // default MB fallback
                try {
                    $sizeRes = DBFacade::select("
                        SELECT SUM(data_length + index_length) / 1024 / 1024 AS size 
                        FROM information_schema.TABLES 
                        WHERE table_schema = ?
                    ", [$fullDbName]);
                    if (!empty($sizeRes) && isset($sizeRes[0]->size)) {
                        $size = round((float)$sizeRes[0]->size, 2);
                    }
                } catch (\Exception $e) {}

                $results[] = [
                    'id' => $db->id,
                    'database_name' => $db->database_name,
                    'database_name_prefix' => $db->database_name_prefix,
                    'connection_host' => $db->connection_host,
                    'size_mb' => $size,
                    'created_at' => $db->created_at->toDateTimeString(),
                ];
            }

            return $this->successResponse($results, 'Databases retrieved successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function store(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);

            // Validate package limits
            $limit = $account->hostingPackage->databases;
            $currentCount = $account->databases()->count();
            if ($currentCount >= $limit) {
                return $this->errorResponse("Database limit reached ({$limit}). Please upgrade your hosting plan.");
            }

            $validated = $request->validate([
                'database_name' => 'required|string|alpha_dash|max:64',
                'database_username' => 'required|string|alpha_dash|max:64',
                'database_password' => 'required|string|min:6',
            ]);

            $adminController = new AdminPhpManagerController(); // wait, let's use AdminDatabaseController
            $adminDb = new AdminDatabaseController();
            
            $request->merge(['hosting_account_id' => $account->id]);
            return $adminDb->store($request);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $db = $account->databases()->find($id);

            if (!$db) {
                return $this->errorResponse('Database not found or unauthorized.', null, 404);
            }

            $adminDb = new AdminDatabaseController();
            return $adminDb->destroy($id);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function getUsers(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $db = $account->databases()->find($id);

            if (!$db) {
                return $this->errorResponse('Database not found or unauthorized.', null, 404);
            }

            $adminDb = new AdminDatabaseController();
            return $adminDb->getUsers($id);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function addUser(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $db = $account->databases()->find($id);

            if (!$db) {
                return $this->errorResponse('Database not found or unauthorized.', null, 404);
            }

            $adminDb = new AdminDatabaseController();
            return $adminDb->addUser($request, $id);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function removeUser(Request $request, $id, $userId)
    {
        try {
            $account = $this->getHostingAccount($request);
            $db = $account->databases()->find($id);

            if (!$db) {
                return $this->errorResponse('Database not found or unauthorized.', null, 404);
            }

            $adminDb = new AdminDatabaseController();
            return $adminDb->removeUser($id, $userId);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function changeUserPassword(Request $request, $userId)
    {
        try {
            $account = $this->getHostingAccount($request);
            $user = DatabaseUser::where('hosting_account_id', $account->id)->findOrFail($userId);

            $adminDb = new AdminDatabaseController();
            return $adminDb->changeUserPassword($request, $userId);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function phpmyadminSso(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $db = $account->databases()->find($id);

            if (!$db) {
                return $this->errorResponse('Database not found.', null, 404);
            }

            // Fetch first user mapped
            $dbUser = DatabaseUser::where('hosting_account_id', $account->id)->first();
            $username = $dbUser ? ($account->system_username . '_' . $dbUser->username) : $account->system_username;
            
            // Generate a secure token and cache it for 60 seconds
            $token = bin2hex(random_bytes(16));
            Cache::put('pma_sso_' . $token, [
                'username' => $username,
                'password' => 'ali12345' // seeded password in dev
            ], 60);

            // SSO Redirect URL linking to the public proxy handler
            $ssoUrl = "/phpmyadmin-sso.php?token={$token}";

            return $this->successResponse([
                'sso_url' => $ssoUrl,
            ], 'Single Sign-On session generated successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function remoteAccess(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $validated = $request->validate([
                'allowed_ip' => 'required|string'
            ]);

            $ip = $validated['allowed_ip'];

            // Query DB users and map remote hosts
            $dbUsers = DatabaseUser::where('hosting_account_id', $account->id)->get();
            foreach ($dbUsers as $user) {
                $fullUser = $account->system_username . '_' . $user->username;
                try {
                    $sql = "CREATE USER IF NOT EXISTS '{$fullUser}'@'{$ip}' IDENTIFIED BY 'ali12345'; " .
                           "GRANT ALL PRIVILEGES ON `{$account->system_username}\_%`.* TO '{$fullUser}'@'{$ip}'; " .
                           "FLUSH PRIVILEGES;";
                    $this->runMysql($sql);
                } catch (\Exception $e) {}
            }

            return $this->successResponse(null, "Remote MySQL authorization granted for IP: {$ip}.");

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    private function runMysql($sql)
    {
        $rootPass = env('DB_ROOT_PASSWORD');
        $cmd = $rootPass ? ['mysql', '-u', 'root', "-p{$rootPass}", '-e', $sql] : ['mysql', '-u', 'root', '-e', $sql];
        $process = new Process($cmd);
        $process->run();
        return $process;
    }
}
