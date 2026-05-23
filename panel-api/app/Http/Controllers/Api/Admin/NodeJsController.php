<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NodeJsApp;
use Illuminate\Http\Request;

class NodeJsController extends Controller
{
    public function index()
    {
        try {
            $apps = NodeJsApp::with(['hostingAccount.customer', 'domain'])->get();
            
            $results = [];
            foreach ($apps as $app) {
                $results[] = [
                    'id' => $app->id,
                    'name' => $app->name,
                    'node_version' => $app->node_version,
                    'port' => $app->port,
                    'startup_file' => $app->startup_file,
                    'environment' => $app->environment,
                    'status' => $app->status,
                    'git_repo' => $app->git_repo,
                    'git_branch' => $app->git_branch,
                    'pm2_name' => $app->pm2_name,
                    'owner' => $app->hostingAccount->customer->name ?? 'System',
                    'domain' => $app->domain->domain ?? '',
                ];
            }

            return $this->successResponse($results, 'All cluster Node.js applications loaded.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function getNodeVersions()
    {
        // Dynamic version scan or standard operational LTS
        return $this->successResponse([
            ['version' => '18', 'label' => 'Node.js 18 LTS', 'installed' => true],
            ['version' => '20', 'label' => 'Node.js 20 LTS (Default)', 'installed' => true],
            ['version' => '22', 'label' => 'Node.js 22 Current', 'installed' => true]
        ], 'Installed Node.js versions retrieved.');
    }
}
