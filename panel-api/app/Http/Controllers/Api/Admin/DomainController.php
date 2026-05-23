<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\HostingAccount;
use Illuminate\Http\Request;

class DomainController extends Controller
{
    public function index()
    {
        $domains = Domain::with('hostingAccount.customer')->get();
        return $this->successResponse($domains, 'Domains retrieved successfully.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'hosting_account_id' => 'required|exists:hosting_accounts,id',
            'domain' => 'required|string|unique:domains,domain',
            'is_secure_with_ssl' => 'nullable|boolean',
        ]);

        $account = HostingAccount::find($validated['hosting_account_id']);

        $domain = Domain::create([
            'hosting_account_id' => $validated['hosting_account_id'],
            'domain' => $validated['domain'],
            'home_root' => "/home/{$account->system_username}",
            'domain_root' => "/home/{$account->system_username}/{$validated['domain']}",
            'domain_public' => "/home/{$account->system_username}/{$validated['domain']}",
            'is_secure_with_ssl' => $validated['is_secure_with_ssl'] ?? false,
            'is_main' => false, // Addon domain
            'status' => 'active',
        ]);

        return $this->successResponse($domain, 'Addon domain created successfully.', 201);
    }

    public function show($id)
    {
        $domain = Domain::with('hostingAccount')->find($id);

        if (!$domain) {
            return $this->errorResponse('Domain not found.', null, 404);
        }

        return $this->successResponse($domain, 'Domain retrieved successfully.');
    }

    public function destroy($id)
    {
        $domain = Domain::find($id);

        if (!$domain) {
            return $this->errorResponse('Domain not found.', null, 404);
        }

        if ($domain->is_main) {
            return $this->errorResponse('Cannot delete the primary hosting domain from this panel. Please terminate the hosting subscription instead.');
        }

        $domain->delete();

        return $this->successResponse(null, 'Domain deleted successfully.');
    }
}
