# QIWHOST Panel - Bug Fixes Report v1.0.3

This document details the resolutions for Bugs #11 to #19 discovered during live testing of QIWHOST Panel v1.0.3. The fixes have been applied across the Laravel API backend, Next.js frontend, and VPS installer scripts.

---

## Bug 11 & 12: OLS Virtual Host Blocks & Script Handlers
- **Problem**: 
  - OpenLiteSpeed (OLS) did not dynamically append the virtual host configuration blocks to the main `/usr/local/lsws/conf/httpd_config.conf` configuration upon hosting account creation, causing 404/503 errors.
  - The script handler inside OLS vhost templates was hardcoded to a specific PHP version (`lsapi:lsphp83 php`) which breaks compatibility when other PHP versions are used.
- **Backend Fix**: 
  - Refactored `HostingAccountController.php@store` to dynamically parse, check, and safely append the virtual host block configuration using `/tmp` staging (to prevent permission limitations under `www-data` execution bounds) and `sudo mv`.
  - Registered listener maps under the OLS Default listener map and triggered graceful reloads via `lswsctrl`.
  - Corrected the template script handler to `lsapi:lsphp php` to support dynamic environment default PHP versions seamlessly.

## Bug 13: Certbot snap package setup
- **Problem**: The VPS installation script failed to install Certbot, breaking all Let's Encrypt SSL generation tasks. Sudoers permissions were also missing snap paths.
- **Installer Fix**: 
  - Added a new installation step `Step 12b: Install Certbot` after WP-CLI inside `installer/install.sh` to install Certbot using the classic snap channel and establish symlinks to `/usr/bin/certbot`.
  - Updated the passwordless `sudoers` template `/etc/sudoers.d/qiwhost-www-data` to grant `www-data` execute privileges on both `/snap/bin/certbot` and `/usr/bin/certbot`.

## Bug 14, 15 & 16: SSL Provisioning background jobs
- **Problem**: 
  - Let's Encrypt validation failed because of a hardcoded duplicate `-d www.{domain}` naked mapping, and certbot was executed via absolute fallback paths instead of snap bounds.
  - Telemetry database records in the `ssl_certificates` table were not updated after success.
  - OLS port 443 listeners were not established, blocking secure HTTPS handshakes.
- **Backend Fix**: 
  - Refactored `App\Jobs\ProvisionSslJob.php` to use the snap path `/snap/bin/certbot` and cleanly removed the duplicate `www.` naked domain arguments.
  - Added `\DB::table('ssl_certificates')->updateOrInsert` blocks to automatically update the DB records as `active` upon successful certbot provisioning.
  - Programmed automated SSL virtual host configurations and OLS listener port 443 mapping logic using `/tmp` staging.
  - Allowed tcp traffic on port 443 via UFW rules and gracefully reloaded OLS configs using `lswsctrl`.

## Bug 17: phpMyAdmin Port 80 SSO Redirects
- **Problem**: Single-sign-on (SSO) links mapped to relative Next.js port 3000 locations instead of targeting the main OLS HTTP port 80, throwing 404 errors.
- **Installer Fix**: Updated step 16 in `install.sh` to capture the VPS IP and write it into Next.js local environment configs (`NEXT_PUBLIC_SERVER_IP=$SERVER_IP` inside `/opt/qiwhost/panel-frontend/.env.local`).
- **Frontend Fix**: Refactored customer [databases/page.tsx](file:///C:/Projects/QIWHOST-Panel/panel-frontend/src/app/(customer)/customer/databases/page.tsx) `ssoMutation` success handler to retrieve the server IP (or window hostname) and prepend it to `sso_url`, routing users directly to Port 80.

## Bug 18: File permissions on hosting creation
- **Problem**: File ownerships and permissions on newly created hosting accounts prevented `www-data` (the web server) from writing to user directories, causing permissions locks.
- **Backend Fix**: 
  - Refactored `HostingAccountController.php@store` to run a sequential sequence of permission settings: `chown -R {username}:www-data` and `chmod 775` on `public_html`, and `chmod 755` on `/home/{username}` jail folders.
  - Cleaned up the `qiwhost-api` restart process (excluded completely) to prevent mid-operation connection resets or crashed transactions.

## Bug 19: File Manager directories live refresh
- **Problem**: Creating, deleting, zipping, or uploading files inside the cPanel File Manager did not trigger directory list updates, forcing manual browser reloads.
- **Frontend Fix**: Updated `onSuccess` handlers inside customer [file-manager/page.tsx](file:///C:/Projects/QIWHOST-Panel/panel-frontend/src/app/(customer)/customer/file-manager/page.tsx) to dynamically execute React Query `refetch()` and clean up current `selectedPaths` states across all upload, create, rename, copy, move, compress, and extract operations.

---

## Build & Syntax Verification
- [x] Verified Next.js frontend compilation successfully via `npm run build` with **exactly 0 errors**.
- [x] Audited Bash syntax on `installer/install.sh` with **exactly 0 errors**.
- [x] Committed and pushed all patches to the main remote branch.
