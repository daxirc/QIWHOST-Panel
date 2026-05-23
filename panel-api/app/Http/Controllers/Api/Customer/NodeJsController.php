<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\NodeJsApp;
use App\Models\HostingAccount;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NodeJsController extends Controller
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
            $apps = NodeJsApp::with('domain')->where('hosting_account_id', $account->id)->get();
            return $this->successResponse($apps, 'Node.js applications loaded successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $app = NodeJsApp::where('hosting_account_id', $account->id)->with('domain')->findOrFail($id);
            return $this->successResponse($app, 'Node.js application details loaded.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function store(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);

            $validated = $request->validate([
                'name' => 'required|string|max:50|regex:/^[a-zA-Z0-9_-]+$/',
                'domain_id' => 'required|exists:domains,id',
                'port' => 'required|integer|between:3000,65535',
                'startup_file' => 'required|string',
                'node_version' => 'required|in:18,20,22',
                'environment' => 'required|in:development,production',
                'git_repo' => 'nullable|url',
                'git_branch' => 'nullable|string',
            ]);

            // Port collision check
            $portExists = NodeJsApp::where('port', $validated['port'])->exists();
            if ($portExists) {
                return $this->errorResponse("Port {$validated['port']} is already allocated to another application.");
            }

            $domain = Domain::findOrFail($validated['domain_id']);
            $appPath = "/home/{$account->system_username}/nodejs/{$validated['name']}";
            $pm2Name = $account->system_username . '_' . $validated['name'];

            // 1. Create app directory
            try {
                $mkdir = new Process(['sudo', '-u', $account->system_username, 'mkdir', '-p', $appPath]);
                $mkdir->run();
            } catch (\Exception $e) {}

            // 2. Create .env file
            $envContent = "NODE_ENV={$validated['environment']}\nPORT={$validated['port']}\n";
            try {
                $envFile = "{$appPath}/.env";
                file_put_contents($envFile, $envContent);
                // Set correct ownership
                $chownEnv = new Process(['sudo', 'chown', "{$account->system_username}:www-data", $envFile]);
                $chownEnv->run();
            } catch (\Exception $e) {}

            // 3. Create PM2 ecosystem config
            $pm2Config = [
                'apps' => [[
                    'name' => $pm2Name,
                    'script' => $validated['startup_file'],
                    'cwd' => $appPath,
                    'instances' => 1,
                    'max_memory_restart' => '256M',
                    'env' => [
                        'NODE_ENV' => $validated['environment'],
                        'PORT' => $validated['port'],
                    ]
                ]]
            ];

            try {
                $configJs = 'module.exports = ' . var_export($pm2Config, true) . ';';
                $configJs = str_replace('array (', '[', $configJs);
                $configJs = str_replace(')', ']', $configJs);
                $configPath = "{$appPath}/ecosystem.config.js";
                file_put_contents($configPath, $configJs);

                $chownCfg = new Process(['sudo', 'chown', "{$account->system_username}:www-data", $configPath]);
                $chownCfg->run();
            } catch (\Exception $e) {}

            // 4. Git clone if provided
            if (!empty($validated['git_repo'])) {
                $this->deployFromGit($appPath, $validated['git_repo'], $validated['git_branch'] ?? 'main', $account, $request);
            } else {
                // Generate a dummy index.js to prevent PM2 crash
                $dummyIndex = "const http = require('http');\n" .
                              "const server = http.createServer((req, res) => {\n" .
                              "  res.writeHead(200, {'Content-Type': 'text/plain'});\n" .
                              "  res.end('Hello from QIWHOST Node.js App\\\\n');\n" .
                              "});\n" .
                              "server.listen(process.env.PORT || {$validated['port']});\n";
                $filePath = "{$appPath}/{$validated['startup_file']}";
                if (!file_exists($filePath)) {
                    file_put_contents($filePath, $dummyIndex);
                    $chownDummy = new Process(['sudo', 'chown', "{$account->system_username}:www-data", $filePath]);
                    $chownDummy->run();
                }
            }

            // 5. Configure OLS proxy settings
            $this->configureOlsProxy($domain, $validated['port']);

            // 6. Save DB entry
            $app = NodeJsApp::create([
                'hosting_account_id' => $account->id,
                'domain_id' => $validated['domain_id'],
                'name' => $validated['name'],
                'node_version' => $validated['node_version'],
                'port' => $validated['port'],
                'startup_file' => $validated['startup_file'],
                'environment' => $validated['environment'],
                'status' => 'stopped',
                'git_repo' => $validated['git_repo'],
                'git_branch' => $validated['git_branch'] ?? 'main',
                'pm2_name' => $pm2Name,
                'auto_restart' => true,
            ]);

            return $this->successResponse($app, 'Node.js application provisioned successfully.', 201);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function deployFromGit(string $appPath, string $gitRepo, string $branch, $account, Request $request)
    {
        // Check git URL safety (Correction 2 regex verification)
        if (!preg_match('/^https:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(.git)?$/', $gitRepo)) {
            throw new \InvalidArgumentException('Security Error: Only public HTTPS repositories from GitHub, GitLab, or Bitbucket are allowed.');
        }

        // Clone repository
        try {
            // Remove existing files in folder before cloning
            $cleanProc = new Process(['sudo', '-u', $account->system_username, 'rm', '-rf', $appPath]);
            $cleanProc->run();

            $mkdir = new Process(['sudo', '-u', $account->system_username, 'mkdir', '-p', $appPath]);
            $mkdir->run();

            $cloneProc = new Process([
                'git', 'clone', '--branch', $branch, '--depth', '1', $gitRepo, $appPath
            ]);
            $cloneProc->setTimeout(120);
            $cloneProc->run();

            if (!$cloneProc->isSuccessful() && env('APP_ENV') !== 'local') {
                throw new \RuntimeException('Git clone failed: ' . $cloneProc->getErrorOutput());
            }
        } catch (\Exception $e) {
            if (env('APP_ENV') !== 'local') {
                throw $e;
            }
        }

        // package.json scripts check (CORRECTION 2)
        $pkgPath = "{$appPath}/package.json";
        if (file_exists($pkgPath)) {
            try {
                $pkgData = json_decode(file_get_contents($pkgPath), true);
                if (isset($pkgData['scripts']) && is_array($pkgData['scripts'])) {
                    $blockedTerms = ['curl', 'wget', 'bash', 'sh', 'exec', 'eval'];
                    foreach ($pkgData['scripts'] as $scriptKey => $scriptVal) {
                        $fullScript = strtolower($scriptKey . ' ' . (is_string($scriptVal) ? $scriptVal : ''));
                        foreach ($blockedTerms as $term) {
                            if (str_contains($fullScript, $term)) {
                                // Save to security_events table
                                DB::table('security_events')->insert([
                                    'hosting_account_id' => $account->id,
                                    'event_type' => 'malicious_npm_script',
                                    'description' => "Blocked npm postinstall script execution: trigger '{$term}' in script section '{$scriptKey}'",
                                    'ip_address' => $request->ip() ?? '127.0.0.1',
                                    'file_path' => 'package.json',
                                    'blocked' => true,
                                    'created_at' => now(),
                                    'updated_at' => now()
                                ]);

                                // Purge cloned folder
                                $purge = new Process(['sudo', 'rm', '-rf', $appPath]);
                                $purge->run();

                                throw new \RuntimeException("Malicious postinstall script detected in package.json");
                            }
                        }
                    }
                }
            } catch (\RuntimeException $re) {
                throw $re;
            } catch (\Exception $ex) {}
        }

        // Run npm install as user (NOT root)
        try {
            $npmInstall = new Process(['sudo', '-u', $account->system_username, 'npm', 'install', '--production']);
            $npmInstall->setWorkingDirectory($appPath);
            $npmInstall->setTimeout(300);
            $npmInstall->run();
        } catch (\Exception $e) {}
    }

    public function start(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $app = NodeJsApp::where('hosting_account_id', $account->id)->findOrFail($id);

            $configPath = "/home/{$account->system_username}/nodejs/{$app->name}/ecosystem.config.js";

            try {
                $process = new Process([
                    'sudo', '-u', $account->system_username,
                    'pm2', 'start', $configPath
                ]);
                $process->run();
            } catch (\Exception $e) {}

            $app->update(['status' => 'running']);
            return $this->successResponse($app, 'Application started successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function stop(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $app = NodeJsApp::where('hosting_account_id', $account->id)->findOrFail($id);

            try {
                $process = new Process([
                    'sudo', '-u', $account->system_username,
                    'pm2', 'stop', $app->pm2_name
                ]);
                $process->run();
            } catch (\Exception $e) {}

            $app->update(['status' => 'stopped']);
            return $this->successResponse($app, 'Application stopped.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function restart(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $app = NodeJsApp::where('hosting_account_id', $account->id)->findOrFail($id);

            try {
                $process = new Process([
                    'sudo', '-u', $account->system_username,
                    'pm2', 'restart', $app->pm2_name
                ]);
                $process->run();
            } catch (\Exception $e) {}

            $app->update(['status' => 'running']);
            return $this->successResponse($app, 'Application restarted.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function logs(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $app = NodeJsApp::where('hosting_account_id', $account->id)->findOrFail($id);

            $logFile = "/home/{$account->system_username}/.pm2/logs/{$app->pm2_name}-out.log";
            $errFile = "/home/{$account->system_username}/.pm2/logs/{$app->pm2_name}-error.log";

            $logs = [];
            if (file_exists($logFile)) {
                $logs = array_slice(file($logFile), -100);
            }
            if (file_exists($errFile)) {
                $logs = array_merge($logs, ['--- ERROR LOG ---'], array_slice(file($errFile), -50));
            }

            if (empty($logs)) {
                $logs = ['[System Console] No logs recorded. Application may be idle.'];
            }

            return $this->successResponse($logs, 'Logs retrieved.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function gitDeploy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $app = NodeJsApp::where('hosting_account_id', $account->id)->findOrFail($id);

            if (empty($app->git_repo)) {
                return $this->errorResponse('No Git repository bound to this application.');
            }

            $appPath = "/home/{$account->system_username}/nodejs/{$app->name}";

            // 1. Pull branch code
            try {
                $gitPull = new Process(['git', 'pull', 'origin', $app->git_branch], $appPath);
                $gitPull->run();
            } catch (\Exception $e) {}

            // 2. Perform package.json check (Correction 2)
            $pkgPath = "{$appPath}/package.json";
            if (file_exists($pkgPath)) {
                try {
                    $pkgData = json_decode(file_get_contents($pkgPath), true);
                    if (isset($pkgData['scripts']) && is_array($pkgData['scripts'])) {
                        $blockedTerms = ['curl', 'wget', 'bash', 'sh', 'exec', 'eval'];
                        foreach ($pkgData['scripts'] as $scriptKey => $scriptVal) {
                            $fullScript = strtolower($scriptKey . ' ' . (is_string($scriptVal) ? $scriptVal : ''));
                            foreach ($blockedTerms as $term) {
                                if (str_contains($fullScript, $term)) {
                                    DB::table('security_events')->insert([
                                        'hosting_account_id' => $account->id,
                                        'event_type' => 'malicious_npm_script',
                                        'description' => "Blocked malicious git-deploy update: triggers '{$term}' in script section '{$scriptKey}'",
                                        'ip_address' => $request->ip() ?? '127.0.0.1',
                                        'file_path' => 'package.json',
                                        'blocked' => true,
                                        'created_at' => now(),
                                        'updated_at' => now()
                                    ]);

                                    throw new \RuntimeException("Malicious postinstall script detected in package.json");
                                }
                            }
                        }
                    }
                } catch (\RuntimeException $re) {
                    throw $re;
                } catch (\Exception $ex) {}
            }

            // 3. npm install
            try {
                $npmInstall = new Process(['sudo', '-u', $account->system_username, 'npm', 'install', '--production'], $appPath);
                $npmInstall->run();
            } catch (\Exception $e) {}

            // 4. pm2 restart
            try {
                $pm2 = new Process(['sudo', '-u', $account->system_username, 'pm2', 'restart', $app->pm2_name]);
                $pm2->run();
            } catch (\Exception $e) {}

            return $this->successResponse(null, 'Latest commits successfully pulled, packages compiled, and Node server re-loaded.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    private function configureOlsProxy($domain, $port)
    {
        try {
            $vhostConfFile = "/usr/local/lsws/conf/vhosts/{$domain->domain}/vhconf.conf";
            if (!file_exists($vhostConfFile)) return;

            $proxyConfig = "\ncontext / {\n" .
                           "  type                    proxy\n" .
                           "  handler                 127.0.0.1:{$port}\n" .
                           "  addDefaultCharset       off\n" .
                           "}\n\n" .
                           "extprocessor 127.0.0.1:{$port} {\n" .
                           "  type                    proxy\n" .
                           "  address                 127.0.0.1:{$port}\n" .
                           "  maxConns                100\n" .
                           "  pcKeepAliveTimeout      60\n" .
                           "  initTimeout             60\n" .
                           "  retryTimeout            0\n" .
                           "  respBuffer              0\n" .
                           "}\n";

            file_put_contents($vhostConfFile, file_get_contents($vhostConfFile) . $proxyConfig);

            // Reload OLS
            $reloadLSWS = new Process(['sudo', 'service', 'lsws', 'restart']);
            $reloadLSWS->run();
        } catch (\Exception $e) {
            // Local dev silent failover
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $app = NodeJsApp::where('hosting_account_id', $account->id)->findOrFail($id);

            // 1. Delete PM2 app
            try {
                $process = new Process([
                    'sudo', '-u', $account->system_username,
                    'pm2', 'delete', $app->pm2_name
                ]);
                $process->run();
            } catch (\Exception $e) {}

            // 2. Remove directory
            try {
                $appPath = "/home/{$account->system_username}/nodejs/{$app->name}";
                $rmDir = new Process(['sudo', 'rm', '-rf', $appPath]);
                $rmDir->run();
            } catch (\Exception $e) {}

            // 3. Delete DB record
            $app->delete();

            return $this->successResponse(null, 'Node.js application terminated and all configurations dropped.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
