<?php
/**
 * QIWHOST Panel - WHMCS Provisioning Module
 * Connects WHMCS billing with QIWHOST hosting control panel
 */

if (!defined('WHMCS')) die('Access Denied');

/**
 * Module metadata
 */
function qiwhost_MetaData() {
    return [
        'DisplayName' => 'QIWHOST Panel',
        'APIVersion' => '1.1',
        'RequiresServer' => true,
        'DefaultNonSSLPort' => '8080',
        'DefaultSSLPort' => '8443',
        'ServiceSingleSignOnLabel' => 'Login to Hosting Panel',
    ];
}

/**
 * Module configuration fields shown in WHMCS Admin > Servers
 */
function qiwhost_ConfigOptions() {
    return [
        'Package Name' => [
            'Type' => 'text',
            'Size' => 25,
            'Description' => 'QIWHOST hosting package name (must match panel)',
        ],
        'Max Disk (MB)' => [
            'Type' => 'text',
            'Size' => 10,
            'Default' => '2048',
            'Description' => 'Disk space in MB',
        ],
        'Max Bandwidth (MB)' => [
            'Type' => 'text',
            'Size' => 10,
            'Default' => '10240',
            'Description' => 'Bandwidth in MB',
        ],
        'Max Domains' => [
            'Type' => 'text',
            'Size' => 5,
            'Default' => '5',
        ],
        'Max Emails' => [
            'Type' => 'text',
            'Size' => 5,
            'Default' => '10',
        ],
        'Max Databases' => [
            'Type' => 'text',
            'Size' => 5,
            'Default' => '5',
        ],
    ];
}

/**
 * Helper: Make API call to QIWHOST Panel
 */
function qiwhost_api_call($params, $endpoint, $method = 'POST', $data = []) {
    $serverUrl = $params['serverhttpprefix'] . '://' . $params['serverip'] . ':' . $params['serverport'];
    $apiUrl = $serverUrl . '/api/whmcs/' . $endpoint;
    $apiKey = $params['serverpassword']; // WHMCS "Password" field = API secret key

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-WHMCS-Token: ' . $apiKey,
    ]);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    } elseif ($method === 'GET') {
        curl_setopt($ch, CURLOPT_HTTPGET, true);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$response) return ['success' => false, 'message' => 'No response from panel'];
    
    $decoded = json_decode($response, true);
    return $decoded ?: ['success' => false, 'message' => 'Invalid JSON response'];
}

/**
 * CREATE ACCOUNT
 * Triggered when: New order activated
 */
function qiwhost_CreateAccount($params) {
    $data = [
        'domain'        => $params['domain'],
        'username'      => $params['username'],
        'password'      => $params['password'],
        'email'         => $params['clientsdetails']['email'],
        'first_name'    => $params['clientsdetails']['firstname'],
        'last_name'     => $params['clientsdetails']['lastname'],
        'package_name'  => $params['configoption1'],
        'disk_mb'       => (int) $params['configoption2'],
        'bandwidth_mb'  => (int) $params['configoption3'],
        'max_domains'   => (int) $params['configoption4'],
        'max_emails'    => (int) $params['configoption5'],
        'max_databases' => (int) $params['configoption6'],
    ];

    $result = qiwhost_api_call($params, 'create-account', 'POST', $data);

    if (isset($result['success']) && $result['success']) {
        return 'success';
    }

    return isset($result['message']) ? $result['message'] : 'Unknown error creating account';
}

/**
 * SUSPEND ACCOUNT
 * Triggered when: Invoice overdue / manual suspend
 */
function qiwhost_SuspendAccount($params) {
    $data = ['username' => $params['username']];
    $result = qiwhost_api_call($params, 'suspend', 'POST', $data);

    if (isset($result['success']) && $result['success']) return 'success';
    return isset($result['message']) ? $result['message'] : 'Suspend failed';
}

/**
 * UNSUSPEND ACCOUNT
 * Triggered when: Payment received / manual unsuspend
 */
function qiwhost_UnsuspendAccount($params) {
    $data = ['username' => $params['username']];
    $result = qiwhost_api_call($params, 'unsuspend', 'POST', $data);

    if (isset($result['success']) && $result['success']) return 'success';
    return isset($result['message']) ? $result['message'] : 'Unsuspend failed';
}

/**
 * TERMINATE ACCOUNT
 * Triggered when: Service cancelled
 */
function qiwhost_TerminateAccount($params) {
    $data = ['username' => $params['username']];
    $result = qiwhost_api_call($params, 'terminate', 'POST', $data);

    if (isset($result['success']) && $result['success']) return 'success';
    return isset($result['message']) ? $result['message'] : 'Termination failed';
}

/**
 * CHANGE PASSWORD
 * Triggered when: Customer changes password in WHMCS
 */
function qiwhost_ChangePassword($params) {
    $data = [
        'username' => $params['username'],
        'password' => $params['password'],
    ];
    $result = qiwhost_api_call($params, 'change-password', 'POST', $data);

    if (isset($result['success']) && $result['success']) return 'success';
    return isset($result['message']) ? $result['message'] : 'Password change failed';
}

/**
 * LOGIN LINK (SSO)
 * Triggered when: Customer clicks "Login to Hosting Panel"
 */
function qiwhost_ServiceSingleSignOn($params) {
    $data = ['username' => $params['username']];
    $result = qiwhost_api_call($params, 'sso', 'POST', $data);

    if (isset($result['success']) && $result['success'] && isset($result['data']['redirect_url'])) {
        return [
            'success' => true,
            'redirectTo' => $result['data']['redirect_url'],
        ];
    }

    return [
        'success' => false,
        'errorMsg' => isset($result['message']) ? $result['message'] : 'SSO failed',
    ];
}

/**
 * USAGE STATS
 * Triggered by: WHMCS cron to update disk usage
 */
function qiwhost_UsageUpdate($params) {
    $result = qiwhost_api_call(
        $params,
        'usage/' . $params['username'],
        'GET'
    );

    if (isset($result['success']) && $result['success']) {
        $usage = $result['data'];
        return [
            'hdd' => $usage['disk_used_mb'] ?? 0,
            'bw'  => $usage['bandwidth_used_mb'] ?? 0,
        ];
    }
    return [];
}

/**
 * CLIENT AREA
 * Shows disk usage + domain + login button in WHMCS client area
 */
function qiwhost_ClientArea($params) {
    $result = qiwhost_api_call(
        $params,
        'usage/' . $params['username'],
        'GET'
    );

    $diskUsed = 0;
    $diskTotal = (int) $params['configoption2'];
    $diskPercent = 0;
    $primaryDomain = $params['domain'];
    $bandwidthUsed = 0;

    if (isset($result['success']) && $result['success']) {
        $diskUsed = $result['data']['disk_used_mb'] ?? 0;
        $bandwidthUsed = $result['data']['bandwidth_used_mb'] ?? 0;
        $diskPercent = $diskTotal > 0 ? round(($diskUsed / $diskTotal) * 100, 1) : 0;
    }

    // Format sizes
    $diskUsedLabel = $diskUsed >= 1024
        ? round($diskUsed / 1024, 2) . ' GB'
        : $diskUsed . ' MB';
    $diskTotalLabel = $diskTotal >= 1024
        ? round($diskTotal / 1024, 2) . ' GB'
        : $diskTotal . ' MB';

    // Progress bar color
    $barColor = $diskPercent < 70 ? '#22c55e' : ($diskPercent < 90 ? '#eab308' : '#ef4444');

    // Generate SSO URL server-side (backend call)
    $ssoResult = qiwhost_api_call($params, 'sso', 'POST', ['username' => $params['username']]);
    $ssoLoginUrl = '';
    if (isset($ssoResult['success']) && $ssoResult['success']) {
        $ssoLoginUrl = $ssoResult['data']['redirect_url'];
    } else {
        $ssoLoginUrl = '#sso-failed';
    }

    return [
        'templatefile' => 'templates/clientarea',
        'vars' => [
            'primaryDomain'   => $primaryDomain,
            'diskUsed'        => $diskUsedLabel,
            'diskTotal'       => $diskTotalLabel,
            'diskPercent'     => $diskPercent,
            'barColor'        => $barColor,
            'bandwidthUsed'   => $bandwidthUsed >= 1024
                ? round($bandwidthUsed / 1024, 2) . ' GB'
                : $bandwidthUsed . ' MB',
            'username'        => $params['username'],
            'ssoLoginUrl'     => $ssoLoginUrl,
            'panelUrl'        => $params['serverhttpprefix'] . '://' . $params['serverip'] . ':' . $params['serverport'],
        ],
    ];
}

/**
 * TEST CONNECTION
 * Admin clicks "Test Connection" in WHMCS server settings
 */
function qiwhost_TestConnection($params) {
    $result = qiwhost_api_call($params, 'ping', 'GET');

    if (isset($result['success']) && $result['success']) {
        return ['success' => true, 'error' => ''];
    }
    return [
        'success' => false,
        'error' => isset($result['message']) ? $result['message'] : 'Connection failed'
    ];
}
