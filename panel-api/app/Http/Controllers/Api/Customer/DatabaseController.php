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

                // Get database users for this account
                $dbUsers = DatabaseUser::where('hosting_account_id', $account->id)->get();

                $results[] = [
                    'id' => $db->id,
                    'database_name' => $db->database_name,
                    'database_name_prefix' => $db->database_name_prefix,
                    'connection_host' => $db->connection_host,
                    'size_mb' => $size,
                    'created_at' => $db->created_at->toDateTimeString(),
                    'users' => $dbUsers->map(function ($u) use ($db) {
                        return [
                            'id' => $u->id,
                            'username' => $u->username,
                            'full_username' => $db->database_name_prefix . '_' . $u->username,
                            'host' => $u->host,
                        ];
                    })->values(),
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
            
            // Use the database user's actual stored password
            $password = $dbUser ? $dbUser->password_encrypted : 'ali12345';
            
            // Generate a secure token and write credentials to a temp file
            // (readable by PMA's signon.php script)
            $token = bin2hex(random_bytes(16));
            $cacheFile = '/tmp/pma_sso_' . $token;
            file_put_contents($cacheFile, json_encode([
                'username' => $username,
                'password' => $password,
            ]));
            chmod($cacheFile, 0644);

            // Auto-expire: clean up old SSO tokens (older than 2 minutes)
            foreach (glob('/tmp/pma_sso_*') as $file) {
                if (filemtime($file) < time() - 120 && $file !== $cacheFile) {
                    @unlink($file);
                }
            }

            // SSO URL points to PMA's signon script served directly by OLS
            $ssoUrl = "/phpmyadmin/signon.php?token={$token}";

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
                'allowed_ip' => ['required', 'string', function($attr, $value, $fail) {
                    // Allow: valid IPv4, valid IPv6, or '%' (any host)
                    if ($value === '%') return; // allow wildcard
                    if (filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) return;
                    if (filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) return;
                    $fail('The allowed IP must be a valid IPv4, IPv6 address, or % for any host.');
                }],
            ]);

            // Use separate PDO connection for MySQL admin operations
            $pdo = new \PDO(
                "mysql:host=127.0.0.1;port=3306",
                "root",
                config('database.connections.mysql.password')
            );
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

            // Query DB users and map remote hosts
            $dbUsers = DatabaseUser::where('hosting_account_id', $account->id)->get();
            foreach ($dbUsers as $user) {
                try {
                    $safeName = str_replace(['`', "'", '"', '\\', "\0"], '', $account->system_username . '_' . $user->username);
                    $safeIp   = $validated['allowed_ip']; // already validated as real IP or %
                    $safePass = $user->password_encrypted; // decrypted from DB via casts

                    $pdo->exec("CREATE USER IF NOT EXISTS `{$safeName}`@'{$safeIp}' IDENTIFIED BY " . $pdo->quote($safePass));
                    $pdo->exec("GRANT ALL PRIVILEGES ON `{$account->system_username}\\_%`.* TO `{$safeName}`@'{$safeIp}'");
                    $pdo->exec("FLUSH PRIVILEGES");
                } catch (\Exception $e) {}
            }

            return $this->successResponse(null, "Remote MySQL authorization granted for IP: {$validated['allowed_ip']}.");

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
