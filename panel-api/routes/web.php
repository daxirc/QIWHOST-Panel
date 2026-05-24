<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\Whmcs\WhmcsController;

Route::get('/', function () {
    return view('welcome');
});

// Map root /sso to handle WHMCS SSO redirects (matching /backend/sso)
Route::get('/sso', [WhmcsController::class, 'ssoRedirect'])->name('whmcs.sso.redirect');
