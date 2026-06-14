<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\EmailAccount;
use App\Models\HostingAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\Process\Process;

class EmailController extends Controller
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
            $emails = $account->emailAccounts()->get();
            return $this->successResponse($emails, 'Email accounts retrieved successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function store(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);

            // Limit check
            $limit = $account->hostingPackage->email_accounts;
            $currentCount = $account->emailAccounts()->count();
            if ($currentCount >= $limit) {
                return $this->errorResponse("Email account limit reached ({$limit}). Please upgrade your hosting plan.");
            }

            $validated = $request->validate([
                'local_part' => 'required|string|alpha_dash|max:64',
                'password' => 'required|string|min:6',
                'name' => 'nullable|string|max:255',
                'quota' => 'nullable|integer|min:0',
                'domain_id' => 'required|exists:domains,id',
            ]);

            $domainModel = $account->domains()->findOrFail($validated['domain_id']);
            $domain = $domainModel->domain;
            $emailAddress = $validated['local_part'] . '@' . $domain;

            // Check if exists
            $exists = EmailAccount::where('domain', $domain)
                ->where('local_part', $validated['local_part'])
                ->exists();

            if ($exists) {
                return $this->errorResponse('Email address already exists.');
            }

            try {
                // Create maildir at /var/mail/vhosts/{domain}/{local_part}/
                $maildir = "/var/mail/vhosts/{$domain}/{$validated['local_part']}";
                
                $mkdir = new Process(['sudo', 'mkdir', '-p', $maildir]);
                $mkdir->run();
                
                // Create Maildir sub-structure
                foreach (['cur', 'new', 'tmp'] as $sub) {
                    $mkSub = new Process(['sudo', 'mkdir', '-p', "{$maildir}/{$sub}"]);
                    $mkSub->run();
                }
                
                // Set ownership to vmail user (uid/gid 5000)
                $chown = new Process(['sudo', 'chown', '-R', 'vmail:vmail', "/var/mail/vhosts/{$domain}"]);
                $chown->run();
                
                $chmod = new Process(['sudo', 'chmod', '-R', '770', "/var/mail/vhosts/{$domain}"]);
                $chmod->run();
            } catch (\Exception $e) {
                // Log but don't fail - DB record is more important
                \Log::warning("Maildir creation warning: " . $e->getMessage());
            }

            $emailAccount = EmailAccount::create([
                'hosting_account_id' => $account->id,
                'username' => $emailAddress,
                'password' => Hash::make($validated['password']),
                'name' => $validated['name'] ?? null,
                'quota' => $validated['quota'] ?? 1024,
                'local_part' => $validated['local_part'],
                'domain' => $domain,
                'active' => true,
                'smtp_active' => true,
            ]);

            // Reload Postfix to pick up new virtual mailbox
            try {
                $reload = new Process(['sudo', 'postfix', 'reload']);
                $reload->run();
            } catch (\Exception $e) {
                \Log::warning("Postfix reload warning: " . $e->getMessage());
            }

            return $this->successResponse($emailAccount, 'Email account created successfully.', 201);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $email = $account->emailAccounts()->find($id);

            if (!$email) {
                return $this->errorResponse('Email account not found.', null, 404);
            }

            return $this->successResponse($email, 'Email account retrieved successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $email = $account->emailAccounts()->find($id);

            if (!$email) {
                return $this->errorResponse('Email account not found.', null, 404);
            }

            $validated = $request->validate([
                'name' => 'nullable|string|max:255',
                'quota' => 'nullable|integer|min:0',
                'active' => 'nullable|boolean',
                'smtp_active' => 'nullable|boolean',
            ]);

            $email->update($validated);

            return $this->successResponse($email, 'Email account updated successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $email = $account->emailAccounts()->find($id);

            if (!$email) {
                return $this->errorResponse('Email account not found.', null, 404);
            }

            try {
                // Delete maildir from /var/mail/vhosts/{domain}/{local_part}
                $process = new Process([
                    'sudo',
                    'rm',
                    '-rf',
                    "/var/mail/vhosts/{$email->domain}/{$email->local_part}"
                ]);
                $process->run();
            } catch (\Exception $e) {
                \Log::warning("Maildir deletion warning: " . $e->getMessage());
            }

            $email->delete();

            // Reload Postfix
            try {
                $reload = new Process(['sudo', 'postfix', 'reload']);
                $reload->run();
            } catch (\Exception $e) {
                // silent
            }

            return $this->successResponse(null, 'Email account deleted successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function changePassword(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $email = $account->emailAccounts()->find($id);

            if (!$email) {
                return $this->errorResponse('Email account not found.', null, 404);
            }

            $validated = $request->validate([
                'password' => 'required|string|min:6',
            ]);

            $email->update([
                'password' => Hash::make($validated['password']),
            ]);

            return $this->successResponse(null, 'Email account password changed successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
