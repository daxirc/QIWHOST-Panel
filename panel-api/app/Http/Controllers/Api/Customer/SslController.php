<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\SslCertificate;
use App\Http\Controllers\Api\Admin\SslController as AdminSslController;
use Illuminate\Http\Request;

class SslController extends Controller
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

    public function validateDomain(Request $request, $domainId)
    {
        try {
            $account = $this->getHostingAccount($request);
            $domain = $account->domains()->find($domainId);

            if (!$domain) {
                return $this->errorResponse('Domain not found or unauthorized.', null, 404);
            }

            $adminSsl = new AdminSslController();
            return $adminSsl->validateDomain($domainId);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function install(Request $request, $domainId)
    {
        try {
            $account = $this->getHostingAccount($request);
            $domain = $account->domains()->find($domainId);

            if (!$domain) {
                return $this->errorResponse('Domain not found or unauthorized.', null, 404);
            }

            $adminSsl = new AdminSslController();
            return $adminSsl->install($domainId);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
