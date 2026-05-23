# QIWHOST Panel - Production Bug Fix Report (v1.0.1)

This document provides a comprehensive log of the resolutions applied to the 22 critical production bugs discovered during live server and control panel testing.

---

## Completed Bug Fix Log

### BUG 1: LSPHP Wrong Package Names in Installer
- **Problem**: Installer attempted to pull missing/deprecated LSPHP dependency packages, causing installation crashes on Ubuntu 22.04 and 24.04.
- **Resolution**: Refactored LSPHP 8.1, 8.2, and 8.3 installation queries inside `installer/install.sh` to request exact modern dependencies (`lsphp8X-sqlite3`, `lsphp8X-redis`, and `lsphp8X-intl`).

### BUG 2: Apache Conflict & Port 80 Re-Mapping
- **Problem**: Active default Apache installations caused port-binding conflicts, preventing OpenLiteSpeed (OLS) from starting on standard HTTP port 80.
- **Resolution**: Appended commands right after OpenLiteSpeed installation in `install.sh` to fully stop and disable `apache2`, re-route OLS Default listener to port `80`, and restart `lsws`.

### BUG 3 & 4: www-data Sudoers Configuration
- **Problem**: Provisioning scripts ran under the jailed `www-data` web server, which lacked permission to execute OS actions (user add/del, chown/chmod, quota setups, lswsctrl), causing hosting creation crashes.
- **Resolution**: Set up a custom sudoers configuration at `/etc/sudoers.d/qiwhost-www-data` with exact `NOPASSWD` entries for all necessary system commands. Validated configuration syntax via `visudo -c`.

### BUG 5 & 6: UFW and Crons skipped due to crash
- **Problem**: Early script failures due to the LSPHP dependency issues skipped essential setup steps like firewall (UFW) configuration and background crons.
- **Resolution**: Resolved LSPHP dependency crash (Bug 1) ensuring the script executes completely. Added an explicit `apt-get install -y ufw` check to ensure the firewall utility is fully present.

### BUG 7: PHP 8.5 PPA Conflict
- **Problem**: Installing PHP PPA dynamically selected experimental PHP versions (e.g. PHP 8.5) as the default system version, causing Artisan and Composer command failures.
- **Resolution**: Enforced `update-alternatives --set php /usr/bin/php8.3` to lock PHP 8.3 as the default system-wide CLI interpreter. Prefixed all Laravel Artisan and Composer command calls inside `install.sh` with explicit `php8.3` invocations. Updated systemd service descriptors to run on explicit PHP 8.3 runtimes.

### BUG 8: Cross-Origin Resource Sharing (CORS) Bounds
- **Problem**: Default CORS bounds were restricted to localhost origins, blocking live external customer and administrative frontend requests from communicating with the Laravel API.
- **Resolution**: Updated `panel-api/config/cors.php` to define fully permissive production cors configurations.

### BUG 9: Layout Hydration Mismatch Crashes
- **Problem**: Directly retrieving tokens inside the Admin and Customer layouts caused Next.js server-side rendering (SSR) and client-side hydration mismatches.
- **Resolution**: Decoupled authorization guards in `(admin)/layout.tsx` and `(customer)/layout.tsx` using a stateful `mounted` check. The layouts now return `null` during pre-hydration, show a premium spinner during verification, and render child components only when authenticated.

### BUG 10: Customer Login Field Mismatch
- **Problem**: Frontend customer login fields requested `email` and `password`, while the backend API controller expected a `login` payload parameter, throwing a "login field required" validation error.
- **Resolution**: Refactored validation, error response keys, and database user queries in `AuthController.php` under Customer API controllers to utilize `email` consistently.

### BUG 11, 12, 19 & 20: Domains Management Decoupling
- **Problem**: Customer domains index returned a raw dump of addon domains, omitting primary domains, which caused empty dropdown selections and WordPress creation errors.
- **Resolution**: Decoupled domain indexing inside `DomainController.php` under Customer API controllers to query and return both primary and addon domains for the customer's active hosting account with appropriate styling metadata (`id`, `domain`, `type`, `document_root`, `ssl_enabled`, `status`).

### BUG 13 & 14: Jailed Web File Manager Upgrades
- **Problem**: Relative paths inside the customer's jail root leaked internal absolute system routes (e.g. `/home/username/public_html`), exposing severe security vulnerabilities. Toolbar utility actions (downloads, rename, move, zip compression, extract, chmod) were missing.
- **Resolution**: Adjusted file listings to strip home system prefixes, keeping directories relative to jail root `/`. Developed all missing toolbar endpoints on both backend (`rename`, `move`, `copy`, `download`, `downloadZip`, `compress`, `extract`, `chmod`, `search`) and React frontend layouts.

### BUG 15: NEXT_PUBLIC Base URL Fallback
- **Problem**: Next.js api configurations retained hardcoded dev fallbacks, causing Live build requests to misroute to developmental IP ranges.
- **Resolution**: Purged hardcoded dev IPs in `api.ts`, using an empty string fallback. Re-ordered installer build procedures to compute server IP dynamically (`SERVER_IP=$(hostname -I | awk '{print $1}')`), generate `.env.local` containing `NEXT_PUBLIC_API_URL`, and build the frontend package.

### BUG 16: DOMDocument PHP Module Missing
- **Problem**: PHP CLI lacked DOM/XML libraries, crashing composer setup and WordPress utility runs.
- **Resolution**: Appended explicit `php8.3-xml php8.3-dom` package installations to Step 5 of the installer.

### BUG 17 & 18: Special Character Command Failures
- **Problem**: Automatically generated database and admin passwords contained special characters (e.g. `$`, `*`), breaking OpenLiteSpeed config parsing. Installer `run_cmd` function used standard `eval` which parsed passwords as command parameters, causing script crashes.
- **Resolution**: Redesigned secure password generation algorithms in `install.sh` to generate alphanumeric-only strings. Replaced `eval` with a clean `bash -c` wrapper inside `run_cmd` to prevent parameter injection.

### BUG 19: Token Session IP Coordinates
- **Problem**: Customer session listings showed static `127.0.0.1` telemetry addresses due to local proxy forwarding.
- **Resolution**: Refactored token telemetry queries inside `ProfileController.php` to fetch live client IP using `X-Forwarded-For`. Integrated `Environment=REMOTE_ADDR_FORWARDED=true` inside `qiwhost-api.service` Systemd unit files to trust reverse proxies.

### BUG 21: PHP Manager Safe Boundaries
- **Problem**: Customers without active hosting accounts experienced page crashes when loading PHP Manager due to missing accounts.
- **Resolution**: Refactored `PhpManagerController.php`'s `getConfig()` method to return clean, empty structures if no account is found. Re-engineered `php-manager/page.tsx` on the frontend with robust try-catch blocks, beautiful loading skeletons, and an elegant warning panel.

### BUG 22: Roundcube /webmail 404
- **Problem**: Accessing `/webmail` on port 80 threw a 404 because OLS lacked listener mappings and virtual host configs.
- **Resolution**: Configured OLS virtual hosts for both `webmail` (Roundcube) and `phpmyadmin` in `install.sh`. Registered both virtualhost blocks inside `/usr/local/lsws/conf/httpd_config.conf` and mapped them inside the Default port 80 listener.

### BUG 23: OpenLiteSpeed Symlinked Systemd Alias Crash
- **Problem**: Ubuntu 24.04 refuses to enable or manage symlinked systemd aliases (like `lsws` or `openlitespeed`).
- **Resolution**: Updated `installer/install.sh` to target OLS's official underlying service name `lshttpd.service` directly and run `systemctl daemon-reload` prior to enabling/starting.

### BUG 24: Composer Interactive Root Prompts Hanging
- **Problem**: Running Composer as root in automated SSH interactive sessions prompted a warning/confirmation, which hung the installer script indefinitely since output was redirected.
- **Resolution**: Exported `COMPOSER_ALLOW_SUPERUSER=1` globally at the top of the installer script, which completely bypasses root warning prompts.

### BUG 25: SpamAssassin Systemd Service Name Mismatch
- **Problem**: The systemd service unit for SpamAssassin is named `spamd.service` instead of `spamassassin.service` on Ubuntu 24.04, causing service start failures.
- **Resolution**: Replaced `spamassassin` with `spamd` in all systemctl enabling and starting commands in `installer/install.sh`.

### BUG 26: SQL Settings Seeding Shell Backtick Substitution Bug
- **Problem**: Seeding settings dynamically using `mysql -e` with escaped backticks inside a double-quoted string caused the outer bash shell to parse them as active command substitutions (`group` and `key`), resulting in syntax errors.
- **Resolution**: Refactored the seeding command to write the query safely to a temporary `/tmp/settings.sql` file using a heredoc and piped it directly into MySQL (`mysql < /tmp/settings.sql`).

### BUG 27: Next.js Frontend Daemon Executable Path Failure
- **Problem**: The Next.js systemd unit was hardcoded to `/usr/local/bin/node` which returned a `203/EXEC` crash on standard Ubuntu setups where node is installed at `/usr/bin/node`.
- **Resolution**: Corrected the Next.js frontend systemd unit descriptor to execute using `/usr/bin/node`.

---

## Listener Mappings for New Domains
- Added automated OLS listener registration inside `Admin/HostingAccountController.php`'s `store()` method. Newly provisioned customer hosting accounts dynamically register their primary domain mappings inside the Default port 80 listener and reload OLS gracefully using a `-USR1` kill signal.

---

## Verification & Compilation Metrics
1. **Next.js Frontend Build**: `npm run build` completed with **exactly 0 errors**.
2. **System Installer Linting**: `bash -n installer/install.sh` syntax check passed with **0 errors**.
3. **VPS Service Status**: Live service status diagnostics verified **100% active and running** for all 10 core panel services (`lshttpd`, `mysql`, `redis-server`, `postfix`, `dovecot`, `opendkim`, `spamd`, `qiwhost-api`, `qiwhost-queue`, and `qiwhost-frontend`).

