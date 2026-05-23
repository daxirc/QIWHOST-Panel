<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $customer = $request->user();
        return $this->successResponse($customer, 'Customer profile retrieved successfully.');
    }

    public function update(Request $request)
    {
        $customer = $request->user();

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => ['required', 'email', Rule::unique('customers')->ignore($customer->id)],
            'phone' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
        ]);

        $customer->update($validated);

        return $this->successResponse($customer, 'Profile information updated successfully.');
    }

    public function changePassword(Request $request)
    {
        $customer = $request->user();

        $validated = $request->validate([
            'old_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if (!Hash::check($validated['old_password'], $customer->password)) {
            return $this->errorResponse('Current password does not match our records.', null, 422);
        }

        $customer->update([
            'password' => Hash::make($validated['new_password'])
        ]);

        return $this->successResponse(null, 'Password changed successfully.');
    }

    public function getSessions(Request $request)
    {
        $customer = $request->user();
        
        // Fetch active API access tokens
        $tokens = $customer->tokens()->get()->map(function ($token) {
            return [
                'id' => $token->id,
                'name' => $token->name,
                'last_used_at' => $token->last_used_at ? $token->last_used_at->toIso8601String() : null,
                'created_at' => $token->created_at->toIso8601String(),
                'ip_address' => '127.0.0.1', // Mock IP mapping
            ];
        });

        return $this->successResponse($tokens, 'Active token sessions retrieved.');
    }

    public function revokeSession(Request $request, $tokenId)
    {
        $customer = $request->user();
        $token = $customer->tokens()->find($tokenId);

        if (!$token) {
            return $this->errorResponse('Session token not found or unauthorized.', null, 404);
        }

        $token->delete();

        return $this->successResponse(null, 'Session token revoked successfully.');
    }
}
