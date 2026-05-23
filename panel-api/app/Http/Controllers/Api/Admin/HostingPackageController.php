<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HostingPackage;
use Illuminate\Http\Request;

class HostingPackageController extends Controller
{
    public function index()
    {
        $packages = HostingPackage::all();
        return $this->successResponse($packages, 'Hosting packages retrieved successfully.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'disk_space' => 'required|integer|min:0', // In MB
            'bandwidth' => 'required|integer|min:0', // In GB
            'databases' => 'required|integer|min:0',
            'ftp_accounts' => 'required|integer|min:0',
            'email_accounts' => 'required|integer|min:0',
            'subdomains' => 'required|integer|min:0',
            'parked_domains' => 'nullable|integer|min:0',
            'addon_domains' => 'required|integer|min:0',
            'ssl_certificates' => 'nullable|integer|min:0',
            'daily_backups' => 'nullable|integer|min:0',
            'free_domain' => 'nullable|boolean',
        ]);

        $package = HostingPackage::create($validated);

        return $this->successResponse($package, 'Hosting package created successfully.', 201);
    }

    public function show($id)
    {
        $package = HostingPackage::find($id);
        
        if (!$package) {
            return $this->errorResponse('Hosting package not found.', null, 404);
        }

        return $this->successResponse($package, 'Hosting package retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $package = HostingPackage::find($id);
        
        if (!$package) {
            return $this->errorResponse('Hosting package not found.', null, 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'disk_space' => 'required|integer|min:0',
            'bandwidth' => 'required|integer|min:0',
            'databases' => 'required|integer|min:0',
            'ftp_accounts' => 'required|integer|min:0',
            'email_accounts' => 'required|integer|min:0',
            'subdomains' => 'required|integer|min:0',
            'parked_domains' => 'nullable|integer|min:0',
            'addon_domains' => 'required|integer|min:0',
            'ssl_certificates' => 'nullable|integer|min:0',
            'daily_backups' => 'nullable|integer|min:0',
            'free_domain' => 'nullable|boolean',
        ]);

        $package->update($validated);

        return $this->successResponse($package, 'Hosting package updated successfully.');
    }

    public function destroy($id)
    {
        $package = HostingPackage::find($id);
        
        if (!$package) {
            return $this->errorResponse('Hosting package not found.', null, 404);
        }

        $package->delete();

        return $this->successResponse(null, 'Hosting package deleted successfully.');
    }
}
