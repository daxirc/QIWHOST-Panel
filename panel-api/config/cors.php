<?php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter([
        env('APP_URL'),
        env('FRONTEND_URL'),
        'http://localhost:3000',
        'http://localhost:8443',
    ]),
    'allowed_origins_patterns' => [
        // Allow panel IP with any port
        '#^https?://\d+\.\d+\.\d+\.\d+(:\d+)?$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
