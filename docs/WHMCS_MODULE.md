# QIWHOST Panel - WHMCS server provisioning module

This document outlines the architecture, integration flow, and complete setup instructions for the WHMCS Provisioning Module for QIWHOST Panel.

---

## 🏗️ Architecture Overview

The integration consists of two primary components operating securely over network channels:
1. **WHMCS Provisioning Module (PHP)**: Installed within your WHMCS billing directory (`modules/servers/qiwhost/`). It maps product billing cycles to panel commands via secure cURL calls.
2. **QIWHOST Panel API (Laravel)**: A dedicated REST endpoint suite (`/api/whmcs/*`) protected by static secret token authorization that executes server actions (Create, Suspend, Unsuspend, Terminate, Password updates, SSO generation).

```
 ┌──────────────┐                  HTTPs/REST (Port 8080)                 ┌───────────────┐
 │    WHMCS     │ ──────────────────────────────────────────────────────> │ QIWHOST Panel │
 │ Billing Portal│ <────────────────────────────────────────────────────── │  Laravel API  │
 └──────────────┘             Auto-Login Redirect (Port 8443)             └───────────────┘
```

---

## 🛠️ API Endpoint Telemetry

All API endpoints are prefixed with `/api/` and route requests through the `WhmcsTokenMiddleware` check.

### 1. Test Connection
- **Endpoint**: `GET /api/whmcs/ping`
- **Goal**: Ping server status to verify API authentication.
- **Response**:
  ```json
  {
    "success": true,
    "message": "QIWHOST Panel API is reachable",
    "version": "1.0.3"
  }
  ```

### 2. Create Hosting Account
- **Endpoint**: `POST /api/whmcs/create-account`
- **Goal**: Automatically creates database records, provisons Linux system users, structures jail directories, binds vhost blocks, writes a default landing page, and restarts OLS.
- **Parameters**: `domain`, `username`, `password`, `email`, `first_name`, `last_name`, `package_name`, `disk_mb`, `bandwidth_mb`, `max_domains`, `max_emails`, `max_databases`

### 3. Account Suspension
- **Endpoint**: `POST /api/whmcs/suspend`
- **Goal**: Locks the Linux system account, renames active OLS virtual host config files, maps domain listener blocks to a minimal sandbox configuration, and reloads OLS.
- **Parameters**: `username`

### 4. Account Unsuspension
- **Endpoint**: `POST /api/whmcs/unsuspend`
- **Goal**: Unlocks the Linux system account, restores original OLS vhost files, deletes placeholder suspended html indexes, and reloads OLS.
- **Parameters**: `username`

### 5. Service Cancellation (Termination)
- **Endpoint**: `POST /api/whmcs/terminate`
- **Goal**: Sequentially deletes Linux system users and all files (`userdel -r`), removes OLS virtual host registration blocks, restarts OLS, and wipes DB mappings.
- **Parameters**: `username`

### 6. Single Sign-On (SSO) Auto-Login
- **Endpoint**: `POST /api/whmcs/sso`
- **Goal**: Generates a one-time 60-second valid secure token, records it in Redis/Cache, and generates a dynamic frontend redirection landing link on Port `8443`.
- **Parameters**: `username`

---

## ⚙️ WHMCS Setup & Activation

### 1. File Deployment
Ensure that all module files are copied exactly to your WHMCS directory:
- `modules/servers/qiwhost/qiwhost.php` $\rightarrow$ `<whmcs-root>/modules/servers/qiwhost/qiwhost.php`
- `modules/servers/qiwhost/hooks.php` $\rightarrow$ `<whmcs-root>/modules/servers/qiwhost/hooks.php`
- `modules/servers/qiwhost/lang/english.php` $\rightarrow$ `<whmcs-root>/modules/servers/qiwhost/lang/english.php`
- `modules/servers/qiwhost/templates/clientarea.tpl` $\rightarrow$ `<whmcs-root>/modules/servers/qiwhost/templates/clientarea.tpl`

### 2. Connect Your Server
1. In **WHMCS Admin**, navigate to **System Settings** $\rightarrow$ **Servers**.
2. Click **Add New Server** and enter the details:
   - **Name**: QIWHOST Node 1
   - **IP/Hostname**: Your QIWHOST Panel Server IP
   - **Port**: `8080` (API endpoint port)
   - **Password**: `<Your WHMCS_SECRET_KEY from /etc/qiwhost/install.conf>`
   - **Module**: `qiwhost` (QIWHOST Panel from list)
3. Click **Test Connection** to confirm connectivity.
4. Save changes and add the server to a server group.

### 3. Product Setup
1. Create a Product inside WHMCS, and under **Module Settings** select **qiwhost**.
2. Fill out the limits matching your panel packages (e.g. Package Name, Disk Limit, Bandwidth, Databases, Emails).
3. Set your automated provisioning triggers.
