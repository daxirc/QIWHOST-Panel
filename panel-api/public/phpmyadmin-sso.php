<?php

// Bootstrap Laravel Framework
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::capture();
$app->instance('request', $request);
$kernel->bootstrap();

// Fetch secure token
$token = $_GET['token'] ?? '';
$credentials = Illuminate\Support\Facades\Cache::get('pma_sso_' . $token);

if (!$credentials) {
    die("Error: SSO Token has expired or is invalid.");
}

$user = $credentials['username'];
$pass = $credentials['password'];

// Wipe cache token immediately to prevent replay attacks
Illuminate\Support\Facades\Cache::forget('pma_sso_' . $token);

// Redirect directly to the local phpMyAdmin instance pre-authenticated
header("Location: /phpmyadmin?pma_username=" . urlencode($user) . "&pma_password=" . urlencode($pass));
exit;
