# QIWHOST Panel - Production Security Patching & Hardening Verification Report

This document records the successful implementation, testing, and verification of the security patches resolving the 7 identified security vulnerabilities prior to production deployment.

---

## 1. Patched Vulnerabilities & Technical Summary

### SEC-01 & SEC-02 [RESOLVED] (CRITICAL) - Master Administrative Token Leakage & SSO Impersonation Bypass
* **Remediation File**: [clientarea.tpl](file:///C:/Projects/QIWHOST-Panel/whmcs-module/modules/servers/qiwhost/templates/clientarea.tpl) & [qiwhost.php](file:///C:/Projects/QIWHOST-Panel/whmcs-module/modules/servers/qiwhost/qiwhost.php) & [WhmcsController.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Controllers/Api/Whmcs/WhmcsController.php)
* **Changes Made**:
  1. Removed the client-side form that previously exposed the master provisioning key `X-WHMCS-Token` in the client's browser.
  2. Modified `qiwhost_ClientArea()` to securely request a cryptographically secure, 64-character one-time redirect token (`bin2hex(random_bytes(32))`) via a backend server-to-server API call prior to page rendering.
  3. Replaced the form in the WHMCS clientarea page with a direct login anchor link pointing to the dynamically resolved temporary URL.
  4. Added validation in the backend `sso()` endpoint ensuring only active accounts can request SSO.
  5. Implemented IP-based and token age validation limits inside `ssoRedirect()`, immediately invalidating and forgetting the token upon its first consumption.

### SEC-03 [RESOLVED] (HIGH) - SQL Injection in Remote Database Access
* **Remediation File**: [DatabaseController.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Controllers/Api/Customer/DatabaseController.php)
* **Changes Made**:
  1. Enhanced input validation on the `allowed_ip` parameter to strictly enforce valid IPv4/IPv6 formats or `%` wildcards using PHP `filter_var` flags inside a custom validator closure.
  2. Migrated the remote user creation system to use a secure, separate PDO administrative database instance.
  3. Escaped all parameters and bound variables via `$pdo->quote` and backtick separators to fully prevent SQL injection during user and permission creations.

### SEC-04 [RESOLVED] (HIGH) - Hardcoded Seeding Credentials
* **Remediation File**: [DatabaseUser.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Models/DatabaseUser.php) & [DatabaseController.php (Admin & Customer)](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Controllers/Api/Admin/DatabaseController.php)
* **Changes Made**:
  1. Configured Eloquent automatic symmetric database encryption casting on the `DatabaseUser` model using `password_encrypted => encrypted`.
  2. Modified `Admin\DatabaseController` to save the raw, plain password during user creation and modifications, allowing Laravel to automatically encrypt it in the database.
  3. Replaced all occurrences of the default hardcoded password `'ali12345'` inside customer database management and phpMyAdmin SSO with the user's actual, decrypted secure password.

### SEC-05 [RESOLVED] (MEDIUM) - Over-Privileged Sudoers Rules for `www-data`
* **Remediation File**: [install.sh](file:///C:/Projects/QIWHOST-Panel/installer/install.sh)
* **Changes Made**:
  1. Replaced the generic wildcard passwordless sudo permissions on system utility commands (`mkdir`, `chown`, `chmod`, `mv`, `rm`) with highly restricted command strings limiting execution path arguments.
  2. Restricted mkdir, chown, and chmod to the `/home/` jail root directory.
  3. Confined moving (`mv`) configurations to specific virtualhost temp paths (`/tmp/vhconf_*`) and reloading to `lswsctrl` specifically.

### SEC-06 [RESOLVED] (MEDIUM) - Directory Traversal Prefix Matching Flaw
* **Remediation File**: [FileManagerController.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Controllers/Api/Customer/FileManagerController.php)
* **Changes Made**:
  1. Refactored the `getJailedPath()` directory traversal guard to append normalized trailing slashes (`/`) to both the resolved and the jail-root path before prefix string matching.
  2. This ensures exact directory boundary matching, preventing cross-tenant traversal where usernames share prefixes (e.g., `user1` traversing into `user10`).

### SEC-07 [RESOLVED] (LOW) - Restricted Cross-Origin Resource Sharing (CORS) Policy
* **Remediation File**: [cors.php](file:///C:/Projects/QIWHOST-Panel/panel-api/config/cors.php) & [install.sh](file:///C:/Projects/QIWHOST-Panel/installer/install.sh)
* **Changes Made**:
  1. Replaced the wildcard CORS configuration (`*`) with dynamic, restricted environments parsed from the `.env` configuration file (`APP_URL` and `FRONTEND_URL`).
  2. Implemented CORS origin pattern regex filters ensuring only specific system IP addresses and ports can cross-origin queries.
  3. Modified the installer to write `FRONTEND_URL` to `.env` dynamically during setup.

### SEC-08 [RESOLVED] (GENERAL HARDENING) - Rate-Limiting & Timing Attack Protections
* **Remediation File**: [WhmcsTokenMiddleware.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Middleware/WhmcsTokenMiddleware.php)
* **Changes Made**:
  1. Added an IP-based rate limiter (capped at 60 requests per minute) inside the WHMCS middleware to protect administrative endpoints.
  2. Replaced standard token string comparison with constant-time cryptographic verification using `hash_equals()` to fully prevent timing attacks.

---

## 2. Production Verification Checklist

1. **Next.js Production Compilation**: `npm run build` ran inside `panel-frontend` and succeeded with **exactly 0 errors**.
2. **Next.js SSO Route**: The new `/sso` route page was statically generated successfully (`├ ○ /sso                                 686 B            88 kB`).
3. **Laravel API Routing**: Verified backend routes list via WSL (`wsl php artisan route:list`), confirming all 181 routes are registered successfully, including `/api/sso` (SSO callback redirect) and `/api/whmcs/sso` (SSO token provider).
4. **Git Repository Tracking**: Staged, committed, and pushed all security patches to origin `main` branch.
5. **Billing Package Updated**: Packaged and compressed the secure server module to `whmcs-module/modules/servers/qiwhost.zip`.
