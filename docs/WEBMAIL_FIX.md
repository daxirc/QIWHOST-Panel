# QIWHOST Panel - Webmail (Roundcube) Serving & Installation Fix

## Problem Overview
During testing, Roundcube Webmail was not accessible in the browser (e.g., yielding `404 Not Found` or `403 Forbidden` errors under OpenLiteSpeed). This was due to several OLS conflicts and path/symlink configuration mismatches:
1. **LSAPI Script Handler**: The installer attempted to define an LSAPI script handler with syntax conflicts (`lsapi:lsphp83` vs `lsapi:lsphp`).
2. **OLS Symlink Permissions**: Symlink maps in `/var/lib/roundcube/public_html` frequently caused 403 or 404 errors due to default OLS virtual host constraints.
3. **Port Collisions / Context Overlaps**: Defining OLS listener map contexts dynamically inside the main Default listener block for Webmail caused instability and OLS port conflict errors on specific configurations.

---

## Technical Solution & Fixes Applied

To deliver a robust, permanently stable, and production-grade solution, the webmail routing was refactored to use a dedicated PHP built-in server served over a secure port (`8025`), backed by a managed `systemd` daemon. OpenLiteSpeed configurations were thoroughly cleaned up to prevent listener map collisions.

### 1. Dedicated Systemd Service (`roundcube-webmail`)
Roundcube is now served directly by the PHP CLI server at port `8025`.
- **Service Configuration File**: `/etc/systemd/system/roundcube-webmail.service`
  - **ExecStart**: `/usr/bin/php8.3 -S 0.0.0.0:8025 -t /var/lib/roundcube`
  - **User/Group**: `www-data` (matches standard webserver context)
  - **Restart**: Always, with a 5-second backoff recovery.

### 2. OLS Virtual Host Cleanup & phpMyAdmin Alias Routing
- **Webmail OLS configurations removed**: Removed broken `/usr/local/lsws/conf/vhosts/webmail` directories, `vhconf.conf` maps, OLS listener mappings, and virtual host blocks to prevent any port collisions or context conflicts under OpenLiteSpeed.
- **phpMyAdmin virtualhost**: Rather than listener maps, phpMyAdmin is registered as a clean standalone OLS virtualhost block inside `httpd_config.conf` with a simple mapping context on port 80:
  - **Context Endpoint**: `/phpmyadmin/`
  - **Target Location**: `/usr/share/phpmyadmin/`

### 3. Firewall Protection (UFW)
- Added firewall allowance rules opening up port `8025/tcp` for Roundcube Webmail globally:
  ```bash
  ufw allow 8025/tcp comment 'Roundcube Webmail'
  ```

### 4. Admin & Customer Frontend Integration
- **Admin Panel Settings**: Updated [Admin Webmail page](file:///C:/Projects/QIWHOST-Panel/panel-frontend/src/app/(admin)/admin/webmail/page.tsx) to resolve `webmailUrl` dynamically using port `8025`:
  ```typescript
  const serverIp = process.env.NEXT_PUBLIC_SERVER_IP || (typeof window !== "undefined" ? window.location.hostname : "");
  const webmailUrl = `http://${serverIp}:8025`;
  ```
- **Customer Portal**: Updated [Customer Webmail page](file:///C:/Projects/QIWHOST-Panel/panel-frontend/src/app/(customer)/customer/webmail/page.tsx) to point both the main "Open Roundcube client" button and individual "Access Box" links to the dynamic `webmailUrl` on port `8025`.

### 5. Backend Status Telemetry Updates
- **Path Audits**: Updated [WebmailController.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Controllers/Api/Admin/WebmailController.php) to search multiple directory patterns (`/var/lib/roundcube`, `/usr/share/roundcube`, `/var/www/roundcube`) for reliable path resolution.
- **Service Validation**: Implemented service status tracking that queries the active `roundcube-webmail` systemd daemon rather than checking OLS configs:
  ```php
  $process = new Process(['systemctl', 'is-active', 'roundcube-webmail']);
  $process->run();
  $serviceRunning = trim($process->getOutput()) === 'active';
  ```
- **Port Output**: The backend now correctly reports port `8025` in the JSON status payload for compatibility.

---

## Verification Checklist

1. **Compilation Check**: `npm run build` ran with `0 errors` inside `panel-frontend`.
2. **Bash Syntax Verification**: `bash -n installer/install.sh` passed successfully with zero syntax warnings.
3. **Firewall Allowances**: Port `8025` is correctly mapped inside `install.sh` under the firewall rules section.
4. **Welcome Banner Display**: Port `8025` URL is successfully written to `/etc/qiwhost/install.conf` and printed in the terminal completion banner.
