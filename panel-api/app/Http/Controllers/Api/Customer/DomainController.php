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
