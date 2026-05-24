# QIWHOST Panel - Production Fixes Report v1.0.4

This report documents the comprehensive architectural changes and bug fixes applied to the QIWHOST Panel to achieve one-command installation safety on a fresh Ubuntu 24.04 host.

---

## 1. Unified Same-Origin HTTPS Proxy Architecture (Mixed Content Resolution)

### The Problem
Previously, serving the Next.js frontend over HTTPS (`port 8443`) while hitting the Laravel backend directly over HTTP (`port 8080`) resulted in browser **Mixed Content** blocks and **CORS** restrictions.

### The Solution
Instead of utilizing complex OLS proxy/rewrite setups (which are prone to 403/404 errors for Laravel), we routed all client-side API calls to a relative `/backend` path using Next.js internal client rewrites.

- **Next.js Client Rewrite** ([next.config.mjs](file:///C:/Projects/QIWHOST-Panel/panel-frontend/next.config.mjs)):
  Proxies all browser calls on `/backend/:path*` straight to local port `http://127.0.0.1:8080/:path*` internally.
- **Client Base URL Logic** ([src/lib/api.ts](file:///C:/Projects/QIWHOST-Panel/panel-frontend/src/lib/api.ts)):
  ```typescript
  const getBaseURL = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}/backend/api`;
    }
    return 'http://127.0.0.1:8080/api';
  };
  ```
- **Single Sign-On Bypass Fix** ([src/app/sso/page.tsx](file:///C:/Projects/QIWHOST-Panel/panel-frontend/src/app/sso/page.tsx)):
  SSO redirects are now routed relatively through `/backend/sso?token={token}` to ensure that the browser never tries to access the internal port `8080` from the outside.
- **Internal Service Bindings**:
  - The Laravel API service is bound exclusively to localhost `127.0.0.1:8080` for high security.
  - The Next.js frontend is bound internally to `port 3000` (`ExecStart` modified in systemd frontend service).
  - OpenLiteSpeed acts as a secure public proxy listening on `port 8443` (initially HTTP, upgraded to SSL upon provisioning).

---

## 2. Robust MySQL 8.0 & Ubuntu 24.04 Compatibility

### The Problem
Ubuntu 24.04 uses `auth_socket` authentication by default, meaning standard `mysql -u root` password settings fail or throw errors if package states are not fully ready.

### The Solution
We implemented a robust check block utilizing socket authentication first, falling back to `debian-sys-maint` credentials parsing to guarantee database and user creation under all installation states.
- Sets root password plugin to `mysql_native_password` properly.
- Falls back gracefully to `debian-sys-maint` if root authentication plugin migration encounters permission constraints.

---

## 3. Clean Roundcube Mail Stack & phpMyAdmin Isolation

- **Roundcube Database Setup**:
  Uses the robust `debian-sys-maint` credentials parsing block for user/database creation.
- **PHP Built-in Roundcube Service**:
  Configures the PHP-FPM server on port `8025` using a local systemd unit. Completely removes OLS Roundcube vhosts to prevent port and directory collisions.
- **phpMyAdmin Isolation**:
  Removed all default OLS context/vhost configurations for phpMyAdmin. Access to phpMyAdmin is restricted exclusively to the secure hosting account SSO links generated under individual customer domain vhosts.

---

## 4. Snapd & Package Lock Protections

- **Automated `wait_for_apt` Lock Checker**:
  Defined a robust helper function that loops and waits for dpkg lock closures, automatically freeing locks on safe timeout thresholds. This utility is dynamically intercepted in the `run_cmd` wrapper to protect all `apt-get` and `apt` commands automatically.
- **Missing Snapd Support**:
  Step 12b now detects snap command presence and automatically installs and boots snapd service daemon dependencies prior to snap Certbot classic deployment.

---

## 5. Hostname Mapping Corrections

- **Hosts Mappings**:
  Step 9 now deletes any existing or wrong mappings for `$SERVER_HOSTNAME` and appends the correct external public `$SERVER_IP $SERVER_HOSTNAME` record to `/etc/hosts`.

---

## 6. Upgraded diagnostics telemetry

- Step 20 now audits the actual active status of all 10 essential services (including `roundcube-webmail`).
- Performs actual port listener tests on port 80, 8443, 8080, 8025, 25, 143.
- Executes an automated curl login check against local Laravel API endpoints on port `8080` to verify correct authentication token delivery.
