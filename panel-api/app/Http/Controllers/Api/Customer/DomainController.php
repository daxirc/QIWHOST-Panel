<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\HostingAccount;
use Illuminate\Http\Request;

class DomainController extends Controller
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
        $customer = $request->user();
        $account = $customer->hostingAccounts()->with('domains')->first();
        if (!$account) {
            return response()->json(['success' => true, 'data' => []]);
        }
        $domains = $account->domains()->get()->map(function($domain) {
            return [
                'id' => $domain->id,
                'domain' => $domain->domain,
                'type' => $domain->is_main ? 'primary' : 'addon',
                'document_root' => $domain->domain_root ?? $domain->domain_public,
                'ssl_enabled' => $domain->ssl_enabled ?? false,
                'status' => $domain->status ?? 'active',
            ];
        });
        return response()->json(['success' => true, 'data' => $domains]);
    }

    public function store(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);

            // Limit check
            $limit = $account->hostingPackage->subdomains; // Treat subdomains/domains limit
            $currentCount = $account->domains()->count();
            if ($currentCount >= $limit) {
                return $this->errorResponse("Domain limit reached ({$limit}). Please upgrade your hosting plan.");
            }

            $validated = $request->validate([
                'domain' => 'required|string|unique:domains,domain|regex:/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/',
            ]);

            // Addon domain directory inside user home root
            $homeRoot = "/home/{$account->system_username}";
            $domainRoot = "{$homeRoot}/{$validated['domain']}";

            try {
                // Securely make directory and set permissions using Symfony Process
                $mkdir = new \Symfony\Component\Process\Process(['sudo', 'mkdir', '-p', $domainRoot]);
                $mkdir->run();

                $chown = new \Symfony\Component\Process\Process(['sudo', 'chown', '-R', "{$account->system_username}:www-data", $domainRoot]);
                $chown->run();

                // Write default index.html page for the addon domain
                try {
                    $defaultIndexHtml = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website Live - QIW HOST</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
        }
        body::before {
            content: '';
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
            top: -200px;
            left: -200px;
            pointer-events: none;
        }
        body::after {
            content: '';
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%);
            bottom: -200px;
            right: -200px;
            pointer-events: none;
        }
        .container {
            max-width: 540px;
            width: 100%;
            padding: 24px;
            z-index: 10;
        }
        .card {
            background: rgba(30, 41, 59, 0.4);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 48px 32px;
            text-align: center;
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 30px 50px -20px rgba(99, 102, 241, 0.2);
            border-color: rgba(99, 102, 241, 0.2);
        }
        .icon-wrapper {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 32px;
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
            position: relative;
        }
        .pulse-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 2px solid #6366f1;
            border-radius: 20px;
            animation: pulse 2s infinite;
            pointer-events: none;
        }
        @keyframes pulse {
            0% {
                transform: scale(1);
                opacity: 0.8;
            }
            100% {
                transform: scale(1.4);
                opacity: 0;
            }
        }
        .badge {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
            color: #4ade80;
            padding: 6px 14px;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 24px;
        }
        .badge-dot {
            width: 6px;
            height: 6px;
            background: #22c55e;
            border-radius: 50%;
            display: inline-block;
        }
        h1 {
            font-size: 2.25rem;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #ffffff 30%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            color: #94a3b8;
            font-size: 0.975rem;
            line-height: 1.6;
            margin-bottom: 32px;
        }
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 0.85rem;
            color: #64748b;
        }
        .footer a {
            color: #6366f1;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s ease;
        }
        .footer a:hover {
            color: #a855f7;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="icon-wrapper">
                <div class="pulse-ring"></div>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #fff;">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
            </div>
            
            <div class="badge">
                <span class="badge-dot"></span>
                System Operational
            </div>
            
            <h1>Your Website is live on QIW HOST</h1>
            
            <p>Your premium high-performance hosting space is fully configured and ready. You can replace this default index file by uploading your web files to the public directory using the File Manager or Git integration.</p>
            
            <div class="footer">
                Powered by <a href="#" target="_blank">QIW HOST Panel</a>
            </div>
        </div>
    </div>
</body>
</html>
HTML;

                    $tempIndexFile = "/tmp/index_addon_" . uniqid() . ".html";
                    file_put_contents($tempIndexFile, $defaultIndexHtml);

                    $targetIndexPath = "{$domainRoot}/index.html";
                    $mvIndexProc = new \Symfony\Component\Process\Process(['sudo', 'mv', $tempIndexFile, $targetIndexPath]);
                    $mvIndexProc->run();

                    $chownIndexProc = new \Symfony\Component\Process\Process(['sudo', 'chown', "{$account->system_username}:www-data", $targetIndexPath]);
                    $chownIndexProc->run();

                    $chmodIndexProc = new \Symfony\Component\Process\Process(['sudo', 'chmod', '644', $targetIndexPath]);
                    $chmodIndexProc->run();
                } catch (\Exception $e) {}
            } catch (\Exception $e) {
                // local fallback
            }

            $domain = Domain::create([
                'hosting_account_id' => $account->id,
                'domain' => $validated['domain'],
                'home_root' => $homeRoot,
                'domain_root' => $domainRoot,
                'domain_public' => $domainRoot,
                'is_secure_with_ssl' => false,
                'is_main' => false,
                'status' => 'active',
            ]);

            return $this->successResponse($domain, 'Addon domain created successfully.', 201);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $domain = $account->domains()->find($id);

            if (!$domain) {
                return $this->errorResponse('Domain not found.', null, 404);
            }

            return $this->successResponse($domain, 'Domain retrieved successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $domain = $account->domains()->find($id);

            if (!$domain) {
                return $this->errorResponse('Domain not found.', null, 404);
            }

            if ($domain->is_main) {
                return $this->errorResponse('Primary domain cannot be deleted. You must terminate the hosting account to remove this domain.');
            }

            try {
                // Clean up folder securely using Symfony Process
                $process = new \Symfony\Component\Process\Process(['sudo', 'rm', '-rf', $domain->domain_root]);
                $process->run();
            } catch (\Exception $e) {
                // local dev sandbox fallback
            }

            $domain->delete();

            return $this->successResponse(null, 'Domain deleted successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
