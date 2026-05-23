<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Whmcs\WhmcsController;
use App\Http\Middleware\WhmcsTokenMiddleware;

Route::prefix('whmcs')->middleware([WhmcsTokenMiddleware::class])->group(function () {
    Route::get('/ping', [WhmcsController::class, 'ping']);
    Route::post('/create-account', [WhmcsController::class, 'createAccount']);
    Route::post('/suspend', [WhmcsController::class, 'suspend']);
    Route::post('/unsuspend', [WhmcsController::class, 'unsuspend']);
    Route::post('/terminate', [WhmcsController::class, 'terminate']);
    Route::post('/change-password', [WhmcsController::class, 'changePassword']);
    Route::post('/sso', [WhmcsController::class, 'sso']);
    Route::get('/usage/{username}', [WhmcsController::class, 'usage']);
});

// SSO redirect (no auth - validated by token)
Route::get('/sso', [WhmcsController::class, 'ssoRedirect'])->name('whmcs.sso.redirect');
