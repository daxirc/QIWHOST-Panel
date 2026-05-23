<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Log;

class EnforceHostingLimits
{
    public function handle(Request $request, Closure $next): Response
    {
        $customer = $request->user();
        if (!$customer) {
            return $next($request);
        }

        $hostingAccountId = $request->header('X-Hosting-Account-Id') ?? $request->input('hosting_account_id');
        $account = $hostingAccountId 
            ? $customer->hostingAccounts()->find($hostingAccountId) 
            : $customer->hostingAccounts()->first();

        if (!$account || !$account->hostingPackage) {
            return $next($request);
        }

        $package = $account->hostingPackage;

        // 1. Check disk quota before file uploads
        if ($request->hasFile('file') || $request->is('*/files/upload*') || $request->hasFile('files')) {
            $diskUsedMb = $this->getDiskUsage($account->system_username);
            $limit = $package->disk_space; // e.g. 5000 MB
            if ($diskUsedMb >= $limit) {
                return response()->json([
                    'success' => false,
                    'message' => "Disk quota exceeded. Used: {$diskUsedMb}MB / Limit: {$limit}MB"
                ], 422);
            }
        }

        // 2. Check database count before creating new DB
        if ($request->isMethod('POST') && $request->is('*/databases') && !$request->is('*/databases/*/users*') && !$request->is('*/databases/*/phpmyadmin-sso*')) {
            $dbCount = $account->databases()->count();
            $limit = $package->databases;
            if ($dbCount >= $limit) {
                return response()->json([
                    'success' => false,
                    'message' => "MySQL Database limit reached. Active: {$dbCount} / Max allowed: {$limit}"
                ], 422);
            }
        }

        // 3. Check email account count before creating new mailbox
        if ($request->isMethod('POST') && $request->is('*/emails')) {
            $emailCount = $account->emailAccounts()->count();
            $limit = $package->email_accounts;
            if ($emailCount >= $limit) {
                return response()->json([
                    'success' => false,
                    'message' => "Mailbox allocation limit reached. Active: {$emailCount} / Max allowed: {$limit}"
                ], 422);
            }
        }

        // 4. Check domain count before creating addon domains
        if ($request->isMethod('POST') && $request->is('*/domains') && !$request->is('*/domains/*/validate*')) {
            $domainCount = $account->domains()->where('is_main', false)->count();
            $limit = $package->subdomains ?? $package->addon_domains ?? 5;
            if ($domainCount >= $limit) {
                return response()->json([
                    'success' => false,
                    'message' => "Addon domain allocation limit reached. Active: {$domainCount} / Max allowed: {$limit}"
                ], 422);
            }
        }

        return $next($request);
    }

    private function getDiskUsage($username): int
    {
        try {
            $process = new Process(['du', '-sm', "/home/{$username}"]);
            $process->run();
            if ($process->isSuccessful()) {
                return (int) explode("\t", $process->getOutput())[0];
            }
        } catch (\Exception $e) {}

        return 50; // Local dev mock fallback
    }
}
