<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WordPressInstallation;
use Illuminate\Http\Request;

class WordPressController extends Controller
{
    public function index()
    {
        $installs = WordPressInstallation::with(['hostingAccount.customer', 'domain'])->get();
        return $this->successResponse($installs, 'All WordPress installations retrieved successfully.');
    }

    public function getStats()
    {
        $total = WordPressInstallation::count();
        $outdated = WordPressInstallation::where('version', '!=', '6.5')->count();
        $maintenance = WordPressInstallation::where('status', 'maintenance')->count();

        return $this->successResponse([
            'total_wp_installations' => $total,
            'outdated_wp_installations' => $outdated,
            'maintenance_wp_installations' => $maintenance,
        ], 'WordPress toolkit central stats retrieved successfully.');
    }
}
