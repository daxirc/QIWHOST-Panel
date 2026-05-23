<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailAccount;
use App\Models\HostingAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\Process\Process;

class EmailController extends Controller
{
    public function index()
    {
        $emails = EmailAccount::with('hostingAccount.customer')->get();
        return $this->successResponse($emails, 'Email accounts retrieved successfully.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'hosting_account_id' => 'required|exists:hosting_accounts,id',
            'local_part' => 'required|string|alpha_dash|max:64',
            'password' => 'required|string|min:6',
            'name' => 'nullable|string|max:255',
            'quota' => 'nullable|integer|min:0',
        ]);

        $account = HostingAccount::find($validated['hosting_account_id']);
        $domain = $account->domain; // Set primary domain
        $emailAddress = $validated['local_part'] . '@' . $domain;

        // Check uniqueness under this domain
        $exists = EmailAccount::where('domain', $domain)
            ->where('local_part', $validated['local_part'])
            ->exists();

        if ($exists) {
            return $this->errorResponse('Email address already exists.');
        }

        try {
            // Secure process execution (e.g. maildir creation / virtual mailbox mapping)
            // Use Symfony Process with secure array syntax
            // sudo mailadm account create user@domain.com password
            $process = new Process([
                'sudo',
                'maildirmake',
                "/home/{$account->system_username}/Maildir/.{$validated['local_part']}"
            ]);
            $process->run();
        } catch (\Exception $e) {
            // Local dev / WSL sandbox fallback
        }

        $emailAccount = EmailAccount::create([
            'hosting_account_id' => $validated['hosting_account_id'],
            'username' => $emailAddress,
            'password' => Hash::make($validated['password']),
            'name' => $validated['name'] ?? null,
            'quota' => $validated['quota'] ?? 1024, // Default 1GB
            'local_part' => $validated['local_part'],
            'domain' => $domain,
            'active' => true,
            'smtp_active' => true,
        ]);

        return $this->successResponse($emailAccount, 'Email account created successfully.', 201);
    }

    public function show($id)
    {
        $email = EmailAccount::with('hostingAccount')->find($id);

        if (!$email) {
            return $this->errorResponse('Email account not found.', null, 404);
        }

        return $this->successResponse($email, 'Email account retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $email = EmailAccount::find($id);

        if (!$email) {
            return $this->errorResponse('Email account not found.', null, 404);
        }

        $validated = $request->validate([
            'password' => 'nullable|string|min:6',
            'name' => 'nullable|string|max:255',
            'quota' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean',
            'smtp_active' => 'nullable|boolean',
        ]);

        $data = [];
        if (isset($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }
        if (isset($validated['name'])) {
            $data['name'] = $validated['name'];
        }
        if (isset($validated['quota'])) {
            $data['quota'] = $validated['quota'];
        }
        if (isset($validated['active'])) {
            $data['active'] = $validated['active'];
        }
        if (isset($validated['smtp_active'])) {
            $data['smtp_active'] = $validated['smtp_active'];
        }

        $email->update($data);

        return $this->successResponse($email, 'Email account updated successfully.');
    }

    public function destroy($id)
    {
        $email = EmailAccount::find($id);

        if (!$email) {
            return $this->errorResponse('Email account not found.', null, 404);
        }

        try {
            // Delete maildir securely using array syntax
            $account = HostingAccount::find($email->hosting_account_id);
            $process = new Process([
                'sudo',
                'rm',
                '-rf',
                "/home/{$account->system_username}/Maildir/.{$email->local_part}"
            ]);
            $process->run();
        } catch (\Exception $e) {
            // Sandbox/WSL fallback
        }

        $email->delete();

        return $this->successResponse(null, 'Email account deleted successfully.');
    }
}
