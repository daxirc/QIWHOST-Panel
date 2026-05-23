<?php

use Illuminate\Support\Facades\Route;

// Import Admin Controllers
use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\Admin\HostingPackageController as AdminHostingPackageController;
use App\Http\Controllers\Api\Admin\HostingAccountController as AdminHostingAccountController;
use App\Http\Controllers\Api\Admin\DomainController as AdminDomainController;
use App\Http\Controllers\Api\Admin\ServerController as AdminServerController;
use App\Http\Controllers\Api\Admin\SslController as AdminSslController;
use App\Http\Controllers\Api\Admin\DatabaseController as AdminDatabaseController;
use App\Http\Controllers\Api\Admin\EmailController as AdminEmailController;
use App\Http\Controllers\Api\Admin\DnsRecordController as AdminDnsRecordController;
use App\Http\Controllers\Api\Admin\EmailSystemController as AdminEmailSystemController;
use App\Http\Controllers\Api\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Api\Admin\FileManagerController as AdminFileManagerController;
use App\Http\Controllers\Api\Admin\PhpManagerController as AdminPhpManagerController;
use App\Http\Controllers\Api\Admin\WordPressController as AdminWordPressController;
use App\Http\Controllers\Api\Admin\WebmailController as AdminWebmailController;
use App\Http\Controllers\Api\Admin\NodeJsController as AdminNodeJsController;
use App\Http\Controllers\Api\Admin\SecurityController as AdminSecurityController;

// Import Customer Controllers
use App\Http\Controllers\Api\Customer\AuthController as CustomerAuthController;
use App\Http\Controllers\Api\Customer\DashboardController as CustomerDashboardController;
use App\Http\Controllers\Api\Customer\FileManagerController as CustomerFileManagerController;
use App\Http\Controllers\Api\Customer\DatabaseController as CustomerDatabaseController;
use App\Http\Controllers\Api\Customer\EmailController as CustomerEmailController;
use App\Http\Controllers\Api\Customer\DomainController as CustomerDomainController;
use App\Http\Controllers\Api\Customer\SslController as CustomerSslController;
use App\Http\Controllers\Api\Customer\CronJobController as CustomerCronJobController;
use App\Http\Controllers\Api\Customer\BackupController as CustomerBackupController;
use App\Http\Controllers\Api\Customer\StatsController as CustomerStatsController;
use App\Http\Controllers\Api\Customer\DnsRecordController as CustomerDnsRecordController;
use App\Http\Controllers\Api\Customer\ProfileController as CustomerProfileController;
use App\Http\Controllers\Api\Customer\PhpManagerController as CustomerPhpManagerController;
use App\Http\Controllers\Api\Customer\WordPressController as CustomerWordPressController;
use App\Http\Controllers\Api\Customer\NodeJsController as CustomerNodeJsController;

/*
|--------------------------------------------------------------------------
| QIWHOST Panel API Routes
|--------------------------------------------------------------------------
*/

// ==========================================
// ADMIN PORTAL API ROUTES
// ==========================================
Route::post('/admin/login', [AdminAuthController::class, 'login']);

Route::middleware('auth.admin')->prefix('admin')->group(function () {
    Route::get('/profile', [AdminAuthController::class, 'profile']);
    Route::post('/logout', [AdminAuthController::class, 'logout']);

    Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
    Route::get('/server/services', [AdminServerController::class, 'services']);
    Route::post('/server/restart/{service}', [AdminServerController::class, 'restart']);
    Route::get('/server/stats', [AdminServerController::class, 'stats']);

    Route::apiResource('customers', AdminCustomerController::class);
    Route::apiResource('packages', AdminHostingPackageController::class);
    Route::apiResource('hosting-accounts', AdminHostingAccountController::class);
    Route::post('/hosting-accounts/{id}/suspend', [AdminHostingAccountController::class, 'suspend']);
    Route::post('/hosting-accounts/{id}/unsuspend', [AdminHostingAccountController::class, 'unsuspend']);
    Route::put('/hosting-accounts/{id}/php-version', [AdminHostingAccountController::class, 'changePhpVersion']);
    
    Route::apiResource('domains', AdminDomainController::class);
    Route::apiResource('databases', AdminDatabaseController::class);
    Route::apiResource('emails', AdminEmailController::class);
    Route::apiResource('dns', AdminDnsRecordController::class);
    Route::get('/dns/zone/{domainId}', [AdminDnsRecordController::class, 'getZone']);
    Route::get('/dns/{domainId}/zone-file', [AdminDnsRecordController::class, 'generateZoneFile']);
    
    // Settings Routes
    Route::get('/settings/server-info', [AdminSettingsController::class, 'getServerInfo']);
    Route::get('/settings/hostname', [AdminSettingsController::class, 'getHostname']);
    Route::post('/settings/hostname', [AdminSettingsController::class, 'saveHostname']);
    Route::get('/settings/server-defaults', [AdminSettingsController::class, 'getServerDefaults']);
    Route::post('/settings/server-defaults', [AdminSettingsController::class, 'saveServerDefaults']);
    Route::get('/settings/{group}', [AdminSettingsController::class, 'getSettings']);
    Route::post('/settings/{group}', [AdminSettingsController::class, 'saveSettings']);

    // Email System Routes
    Route::get('/email-system/domains', [AdminEmailSystemController::class, 'getDomains']);
    Route::post('/email-system/configure/{domain}', [AdminEmailSystemController::class, 'configureDomain']);

    Route::get('/ssl', [AdminSslController::class, 'index']);
    Route::get('/ssl/{domainId}/validate', [AdminSslController::class, 'validateDomain']);
    Route::post('/ssl/{domainId}/install', [AdminSslController::class, 'install']);

    // Admin Jailed File Manager Routes
    Route::get('/files', [AdminFileManagerController::class, 'list']);
    Route::get('/files/read', [AdminFileManagerController::class, 'readFile']);
    Route::post('/files/write', [AdminFileManagerController::class, 'writeFile']);
    Route::post('/files/create', [AdminFileManagerController::class, 'createFileOrFolder']);
    Route::post('/files/upload', [AdminFileManagerController::class, 'upload']);
    Route::delete('/files', [AdminFileManagerController::class, 'delete']);

    // Admin PHP Manager Routes
    Route::get('/php/versions', [AdminPhpManagerController::class, 'getPhpVersions']);
    Route::get('/php/{accountId}/config', [AdminPhpManagerController::class, 'getPhpConfig']);
    Route::post('/php/{accountId}/config', [AdminPhpManagerController::class, 'updatePhpConfig']);
    Route::get('/php/{accountId}/extensions', [AdminPhpManagerController::class, 'getPhpExtensions']);
    Route::post('/php/{accountId}/extensions/{extension}', [AdminPhpManagerController::class, 'toggleExtension']);
    Route::get('/php/fpm/status', [AdminPhpManagerController::class, 'getPhpFpmStatus']);

    // Admin Database User & Optimize/Repair Routes
    Route::get('/databases/{id}/users', [AdminDatabaseController::class, 'getUsers']);
    Route::post('/databases/{id}/users', [AdminDatabaseController::class, 'addUser']);
    Route::delete('/databases/{id}/users/{userId}', [AdminDatabaseController::class, 'removeUser']);
    Route::put('/database-users/{id}/password', [AdminDatabaseController::class, 'changeUserPassword']);
    Route::post('/databases/{id}/optimize', [AdminDatabaseController::class, 'optimize']);
    Route::post('/databases/{id}/repair', [AdminDatabaseController::class, 'repair']);

    // Admin Webmail Config & Test Connections
    Route::get('/webmail/status', [AdminWebmailController::class, 'getStatus']);
    Route::get('/webmail/config', [AdminWebmailController::class, 'getConfig']);
    Route::post('/webmail/config', [AdminWebmailController::class, 'updateConfig']);
    Route::post('/webmail/test-connection', [AdminWebmailController::class, 'testConnection']);
    Route::post('/webmail/install', [AdminWebmailController::class, 'install']);

    // Admin WordPress Installations Routes
    Route::get('/wordpress', [AdminWordPressController::class, 'index']);
    Route::get('/wordpress/stats', [AdminWordPressController::class, 'getStats']);

    // Admin Node.js Routes
    Route::get('/nodejs', [AdminNodeJsController::class, 'index']);

    // Admin Security Routes
    Route::get('/security/events', [AdminSecurityController::class, 'events']);
    Route::get('/security/quarantine', [AdminSecurityController::class, 'quarantine']);
    Route::post('/security/scan', [AdminSecurityController::class, 'runScan']);
    Route::delete('/security/quarantine/{id}', [AdminSecurityController::class, 'deleteQuarantined']);
    Route::post('/security/quarantine/{id}/restore', [AdminSecurityController::class, 'restore']);
});

// ==========================================
// CUSTOMER PORTAL API ROUTES
// ==========================================
Route::post('/customer/login', [CustomerAuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'enforce.limits', 'rate.customer'])->prefix('customer')->group(function () {
    // Profile Management
    Route::get('/profile', [CustomerProfileController::class, 'show']);
    Route::put('/profile', [CustomerProfileController::class, 'update']);
    Route::post('/profile/change-password', [CustomerProfileController::class, 'changePassword']);
    Route::get('/sessions', [CustomerProfileController::class, 'getSessions']);
    Route::delete('/sessions/{tokenId}', [CustomerProfileController::class, 'revokeSession']);
    Route::post('/logout', [CustomerAuthController::class, 'logout']);

    Route::get('/dashboard', [CustomerDashboardController::class, 'index']);
    
    Route::get('/files', [CustomerFileManagerController::class, 'list']);
    Route::get('/files/read', [CustomerFileManagerController::class, 'readFile']);
    Route::post('/files/write', [CustomerFileManagerController::class, 'writeFile']);
    Route::post('/files/create', [CustomerFileManagerController::class, 'createFileOrFolder']);
    Route::post('/files/upload', [CustomerFileManagerController::class, 'upload']);
    Route::delete('/files', [CustomerFileManagerController::class, 'delete']);
    Route::get('/files/download', [CustomerFileManagerController::class, 'download']);
    Route::post('/files/download-zip', [CustomerFileManagerController::class, 'downloadZip']);
    Route::post('/files/compress', [CustomerFileManagerController::class, 'compress']);
    Route::post('/files/extract', [CustomerFileManagerController::class, 'extract']);
    Route::post('/files/rename', [CustomerFileManagerController::class, 'rename']);
    Route::post('/files/move', [CustomerFileManagerController::class, 'move']);
    Route::post('/files/copy', [CustomerFileManagerController::class, 'copy']);
    Route::post('/files/chmod', [CustomerFileManagerController::class, 'chmod']);
    Route::get('/files/search', [CustomerFileManagerController::class, 'search']);
    Route::get('/files/size', [CustomerFileManagerController::class, 'getSize']);
    
    // Customer PHP Manager Routes
    Route::get('/php/config', [CustomerPhpManagerController::class, 'getConfig']);
    Route::post('/php/config', [CustomerPhpManagerController::class, 'updateConfig']);
    Route::get('/php/extensions', [CustomerPhpManagerController::class, 'getExtensions']);
    Route::post('/php/extensions/{extension}', [CustomerPhpManagerController::class, 'toggleExtension']);
    Route::get('/php/version', [CustomerPhpManagerController::class, 'getCurrentVersion']);

    // Customer Database SSO, Users, and Remote Access Routes
    Route::post('/databases/{id}/phpmyadmin-sso', [CustomerDatabaseController::class, 'phpmyadminSso']);
    Route::get('/databases/{id}/users', [CustomerDatabaseController::class, 'getUsers']);
    Route::post('/databases/{id}/users', [CustomerDatabaseController::class, 'addUser']);
    Route::delete('/databases/{id}/users/{userId}', [CustomerDatabaseController::class, 'removeUser']);
    Route::put('/database-users/{id}/password', [CustomerDatabaseController::class, 'changeUserPassword']);
    Route::post('/databases/remote-access', [CustomerDatabaseController::class, 'remoteAccess']);

    // Customer WordPress Toolkit Routes
    Route::get('/wordpress', [CustomerWordPressController::class, 'index']);
    Route::post('/wordpress/{domainId}/install', [CustomerWordPressController::class, 'install']);
    Route::get('/wordpress/{id}', [CustomerWordPressController::class, 'show']);
    Route::post('/wordpress/{id}/update-core', [CustomerWordPressController::class, 'updateCore']);
    Route::post('/wordpress/{id}/update-plugins', [CustomerWordPressController::class, 'updatePlugins']);
    Route::post('/wordpress/{id}/update-themes', [CustomerWordPressController::class, 'updateThemes']);
    Route::get('/wordpress/{id}/plugins', [CustomerWordPressController::class, 'listPlugins']);
    Route::post('/wordpress/{id}/plugins/{plugin}/activate', [CustomerWordPressController::class, 'activatePlugin']);
    Route::post('/wordpress/{id}/plugins/{plugin}/deactivate', [CustomerWordPressController::class, 'deactivatePlugin']);
    Route::post('/wordpress/{id}/change-admin-password', [CustomerWordPressController::class, 'changeAdminPassword']);
    Route::post('/wordpress/{id}/maintenance-mode', [CustomerWordPressController::class, 'toggleMaintenanceMode']);
    Route::post('/wordpress/{id}/backup', [CustomerWordPressController::class, 'createBackup']);
    Route::delete('/wordpress/{id}', [CustomerWordPressController::class, 'destroy']);

    Route::get('/domains', [CustomerDomainController::class, 'index']);
    Route::post('/domains', [CustomerDomainController::class, 'store']);
    Route::delete('/domains/{id}', [CustomerDomainController::class, 'destroy']);

    Route::apiResource('cron-jobs', CustomerCronJobController::class);
    
    Route::get('/backups', [CustomerBackupController::class, 'index']);
    Route::post('/backups', [CustomerBackupController::class, 'create']);
    Route::get('/backups/{id}/download', [CustomerBackupController::class, 'download']);
    
    Route::get('/stats', [CustomerStatsController::class, 'index']);

    // Customer Node.js Routes
    Route::prefix('nodejs')->group(function() {
        Route::get('/', [CustomerNodeJsController::class, 'index']);
        Route::post('/', [CustomerNodeJsController::class, 'store']);
        Route::get('/{id}', [CustomerNodeJsController::class, 'show']);
        Route::post('/{id}/start', [CustomerNodeJsController::class, 'start']);
        Route::post('/{id}/stop', [CustomerNodeJsController::class, 'stop']);
        Route::post('/{id}/restart', [CustomerNodeJsController::class, 'restart']);
        Route::get('/{id}/logs', [CustomerNodeJsController::class, 'logs']);
        Route::post('/{id}/git-deploy', [CustomerNodeJsController::class, 'gitDeploy']);
        Route::delete('/{id}', [CustomerNodeJsController::class, 'destroy']);
    });
});
