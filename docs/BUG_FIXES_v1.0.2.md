# QIWHOST Panel - Bug Fixes Report v1.0.2

This document details the resolutions for all 10 critical bugs discovered during live testing of QIWHOST Panel v1.0.2. The fixes have been applied across the Laravel API backend, Next.js frontend, and the system installer scripts.

---

## Bug 1: SSL Provisioning Modal & Polling API
- **Problem**: When "Enable SSL" was clicked, there was no progress indication or modal feedback, leading to uncertainty during SSL generation.
- **Backend Fix**: Refactored `Customer/SslController.php` to include `provision` and `poll` endpoints. Implemented `App\Jobs\ProvisionSslJob.php` to execute certbot in the background and cache the step-by-step progress status (DNS -> Certbot -> Database -> OLS Graceful reload).
- **Frontend Fix**: Updated `ssl/page.tsx` with a premium glassmorphic Progress Modal wizard that polls the real-time cache every 2 seconds, displaying interactive step indicators and clear success/error summaries.

## Bug 2: File Manager & Creation Permissions
- **Problem**: Creating files or folders via the File Manager resulted in ownership by `www-data`, blocking users from editing them, or user files blocking the web server due to strict jail permissions.
- **Backend Fix**: Added group association (`usermod -aG {username} www-data`) and correct permissions mapping (`chmod 775` on public_html, `chmod 750` on home root) in `Admin/HostingAccountController.php`. Implemented a helper `fixPermissions` inside customer `FileManagerController.php` which runs `chown {username}:www-data` and `chmod 664/775` automatically after writes, uploads, extractions, creations, and moves.
- **Installer Fix**: Appended proper group associations and permissions inside `installer/install.sh` to ensure perfect jailed user and web server read/write bounds.

## Bug 3 & 7: Real WordPress Installation (WP-CLI)
- **Problem**: WordPress provisioning used generic mock folder templates instead of running actual WP-CLI setups, and the core installer was locked to hardcoded versions.
- **Frontend Fix**: Added input fields to the installer modal in `wordpress/page.tsx` for Database Name Suffix, Database User Suffix, Database Password, and Subfolder Directory.
- **Backend Fix**: Refactored `Customer/WordPressController.php` and added support for custom database suffixes, passwords, and custom subfolder paths. Implemented secure sequential execution of `wp core download` (without version flags to pull the latest core), `wp config create`, and `wp core install` as the customer user using `sudo -u {system_username}` to enforce perfect user file permissions and jail bounds.

## Bug 4: Email Domain Selector
- **Problem**: Creating mailboxes was restricted strictly to the primary domain without supporting addon domains configured by the user.
- **Frontend Fix**: Added a React Query fetch for customer domains in `email/page.tsx` and introduced a "Select Domain" dropdown field alongside a real-time live preview (`prefix@selected-domain.com`).
- **Backend Fix**: Updated `Customer/EmailController.php` to require and validate `domain_id`, dynamically lookup the corresponding addon or primary domain, and construct the correct mailbox address.

## Bug 5: Package Configuration Limits & Prices Decoupling
- **Problem**: Package limits did not include addon domains, subdomains, and FTP limits, and pricing details were coupled directly into technical hosting profiles.
- **Frontend Fix**:
  - Added new configuration input fields for Max Addon Domains, Max Subdomains, and Max FTP Accounts inside `admin/packages/page.tsx`, and removed all price fields.
  - Updated the service plans grid card specs lists to render these limits.
  - Refactored `admin/hosting-accounts/page.tsx` to remove the `($price/mo)` string display from dropdown selections, rendering the resource specs (Disk and Bandwidth) instead.

## Bug 6: Database Suffix Prefixing & Real Execution
- **Problem**: The database creation wizard used simple `db_` and `user_` prefixes rather than the actual user's jailed `system_username_` prefix, and it didn't use root credentials.
- **Frontend Fix**: Renamed the database provisioning wizard button to "Create Database" and fetched customer dashboard metrics to display the dynamic `{systemUsername}_` prefix next to inputs.
- **Backend Fix**: Modified `DatabaseController.php` (both Admin and Customer sides) and `StatsController.php` to dynamically prepend `$account->system_username` to the database name/username inputs, and securely execute MySQL queries using the custom database root password if configured.

## Bug 8: OpenLiteSpeed /webmail 404 & Admin Button
- **Problem**: The portal button pointed to relative `/webmail` (Next.js port) instead of OpenLiteSpeed port 80, and the `/webmail` path returned a 404.
- **Installer Fix**: Added a Context block for `/webmail/` mapping directly to `/var/lib/roundcube/` in the OLS Example vhost configuration inside `installer/install.sh`.
- **Backend Fix**: Appended the `/webmail/` and `/phpmyadmin/` context declarations inside dynamically generated virtual host files in `HostingAccountController.php`.
- **Frontend Fix**: Updated the "Open Webmail Portal" buttons in `admin/webmail/page.tsx` and `customer/webmail/page.tsx` to route dynamically to `http://${window.location.hostname}/webmail` in a new tab.

## Bug 9: Customer Dashboard Decoupling & Public IP
- **Problem**: The customer dashboard details card had a hardcoded layout with a coupled clock icon row for plan expiration and hardcoded `127.0.0.1` IPs.
- **Frontend Fix**: Deleted the "Expires on" Clock icon row completely from the cards in customer `dashboard/page.tsx`.
- **Backend Fix**: Updated customer `DashboardController.php` to dynamically read the server's public IP from `/etc/qiwhost/server_ip` with custom fallback headers (`SERVER_ADDR`, `getHost()`).

## Bug 10: Editable Nameservers
- **Problem**: Nameservers NS1 and NS2 displayed static placeholders, and there was no way to customize them.
- **Frontend Fix**:
  - Re-designed the Nameservers settings tab in `admin/settings/page.tsx` to make NS1 and NS2 fully editable inputs, sending updates to `/api/admin/settings/nameservers`.
  - Updated customer `domains/page.tsx` to query dashboard metrics and dynamically render the warning box active nameservers.
- **Backend Fix**: Added custom `ns1` and `ns2` field mappings inside `Admin/SettingsController.php@saveSettings` to support custom nameserver modifications, and returned them in customer `DashboardController.php`.

---

## Build & Syntax Verification
- [x] Tested Next.js compilation successfully via `npm run build` with 0 warnings.
- [x] Syntax checking validated across all PHP scripts.
- [x] Pushed all clean v1.0.2 modifications to the main branch.
