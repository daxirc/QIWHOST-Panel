# QIWHOST Panel - Hostname Let's Encrypt SSL Provisioning

This document outlines the architecture, execution pipeline, and verification metrics for the Admin Hostname SSL Provisioning feature in QIWHOST Panel.

---

## 🔒 Architectural Overview

The **Hostname SSL** feature allows administrators to secure control panel ports (`8443` for the Next.js frontend and `8080` for the Laravel API) under a single, secure Let's Encrypt certificate generated for the server hostname (e.g., `node3.qiwhost.com`).

```
                    Let's Encrypt standalone challenge
 ┌──────────────┐             (Temporarily stops OLS)             ┌──────────────┐
 │  Certbot API  │ <────────────────────────────────────────────> │  QIWHOST VPS │
 └──────────────┘                                                 └──────────────┘
                                                                         │
                                                                   Map listener
                                                                         ▼
                                                                  ┌──────────────┐
                                                                  │ OpenLiteSpeed│
                                                                  │ (Port 8443)  │
                                                                  └──────────────┘
```

---

## ⚙️ Execution Pipeline

When the administrator triggers "Start Provisioning" on the Admin Settings interface, the backend dispatches a serialized `ProvisionHostnameSslJob` background queue thread:

### Step 1: DNS glue record audit
- **Action**: Resolves the hostname (`gethostbyname($hostname)`) and matches it with the current public VPS network interface IP.
- **Goal**: Prevent Let's Encrypt challenge blocks before requesting certs.

### Step 2: Certbot Standalone Issuance
- **Action**: Briefly suspends OpenLiteSpeed HTTP pools to free port 80.
- **Challenge Execution**:
  ```bash
  sudo /snap/bin/certbot certonly --standalone --non-interactive --agree-tos --email <email> -d <hostname> --preferred-challenges http
  ```
- **OLS Restore**: Instantly resumes OpenLiteSpeed services.

### Step 3: OpenLiteSpeed SSL Listener registration
- **Action**: Injects a custom secure listener `PanelSSL` on port `8443` mapped to the hostname certs paths:
  - **Key File**: `/etc/letsencrypt/live/<hostname>/privkey.pem`
  - **Cert File**: `/etc/letsencrypt/live/<hostname>/fullchain.pem`
- **Firewall Integration**: Opens port `8443` and `8080` in UFW and gracefully reloads OLS.

### Step 4: Environment & Settings Updates
- **API configuration**: Replaces `APP_URL` inside `panel-api/.env` with `https://<hostname>:8080`.
- **Frontend configuration**: Re-writes `/opt/qiwhost/panel-frontend/.env.local` to point to `https://<hostname>:8080/api` securely.
- **Asset Re-compilation**: Automatically executes `npm run build` inside `panel-frontend` to bake the secure hostname settings into the production build.
- **System restart**: Triggers `systemctl restart qiwhost-api qiwhost-frontend qiwhost-queue` to apply secure environments immediately.

---

## 🕒 Auto-Renewal Schedule

The installation template registers an automated cron scheduler task inside `/etc/cron.d/qiwhost-ssl-renewal`:
```bash
0 0 * * * root /snap/bin/certbot renew --quiet && /usr/local/lsws/bin/lswsctrl reload
```
This scans certificates daily at midnight and triggers a graceful configuration reload of OpenLiteSpeed whenever certificates are renewed successfully, maintaining secure connections with exactly zero administrator actions.
