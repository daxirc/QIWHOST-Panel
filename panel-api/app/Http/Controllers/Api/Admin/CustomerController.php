<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $query = Customer::query();

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%");
            });
        }

        $customers = $query->withCount('hostingAccounts')->paginate(10);
        return $this->successResponse($customers, 'Customers retrieved successfully.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'required|email|unique:customers,email',
            'username' => 'required|string|max:255|unique:customers,username|alpha_dash',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'zip' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $customer = Customer::create($validated);

        return $this->successResponse($customer, 'Customer created successfully.', 201);
    }

    public function show($id)
    {
        $customer = Customer::with('hostingAccounts')->find($id);
        
        if (!$customer) {
            return $this->errorResponse('Customer not found.', null, 404);
        }

        return $this->successResponse($customer, 'Customer details retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::find($id);
        
        if (!$customer) {
            return $this->errorResponse('Customer not found.', null, 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => ['required', 'email', Rule::unique('customers')->ignore($customer->id)],
            'username' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('customers')->ignore($customer->id)],
            'password' => 'nullable|string|min:6',
            'phone' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'zip' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $customer->update($validated);

        return $this->successResponse($customer, 'Customer updated successfully.');
    }

    public function destroy($id)
    {
        $customer = Customer::find($id);
        
        if (!$customer) {
            return $this->errorResponse('Customer not found.', null, 404);
        }

        $customer->delete();

        return $this->successResponse(null, 'Customer deleted successfully.');
    }
}
