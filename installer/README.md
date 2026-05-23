# QIWHOST Panel - Production One-Command Installer

This directory contains the production-grade installation scripts to set up a secure, blazing-fast, and high-performance QIWHOST Web Hosting Panel on a fresh server.

---

## System Requirements

The installer is engineered specifically for clean, fresh servers to prevent resource and port conflicts.

* **Operating System**: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS (x86_64 / amd64 architectures only).
* **RAM**: 2 GB Minimum (4 GB or more recommended for production spam/virus scanning workloads).
* **Disk Space**: 40 GB Minimum SSD/NVMe disk space.
* **Network**: 1 Public IPv4 address with active Internet connection.
* **Ports**: Standard web, mail, database, and panel ports must be fully open (UFW firewall will be configured automatically by the script).

---

## 🚀 One-Command Installation

Log in as the **root** user on your fresh server and execute the following commands:

```bash
# Update local packages and fetch the installer
apt-get update -y && apt-get install -y git
mkdir -p /opt/qiwhost
git clone https://github.com/daxirc/QIWHOST-Panel.git /opt/qiwhost

# Run the production installer
bash /opt/qiwhost/installer/install.sh
```

---

## What Gets Installed

The installer deploys a robust, production-grade enterprise hosting stack:
1. **Web Server**: OpenLiteSpeed (OLS) with native LSAPI.
2. **PHP Engines**: Multiple LSPHP pools installed concurrently (PHP 8.1, PHP 8.2, PHP 8.3).
3. **Database Engine**: MySQL 8.0 with default optimized settings and a secured root user.
4. **Caching & Queue**: Redis Server configured with `allkeys-lru` eviction policy.
5. **System Node**: Node.js 20 LTS with PM2 global daemon control.
6. **MTA & Mail Server**: Postfix with Dovecot (IMAP/POP3/LMTP) and SpamAssassin spam filtering.
7. **Security stacks**: OpenDKIM signatures, ClamAV antivirus daemon, and UFW firewall enforcement.
8. **Webmail**: Roundcube Webmail proxied at `/webmail` on port 80/443.
9. **SSO phpMyAdmin**: Proxied at `/phpmyadmin` with safe token-based Single Sign-On.
10. **WP-CLI**: Global WordPress command-line utilities.

---

## Accessing the Panel & Applications

Upon successful installation, access URLs and initial credentials will be displayed in the terminal:

* **Control Panel Portal**: `http://<your-server-hostname>:8443` (Redirects to `/customer/login` or `/login`)
* **Control Panel API**: `http://<your-server-hostname>:8080`
* **Webmail Portal**: `http://<your-server-hostname>/webmail`
* **phpMyAdmin Portal**: `http://<your-server-hostname>/phpmyadmin`

---

## Post-Installation Actions

### 1. Configure Domain Nameservers (DNS)
At your domain registrar, add the custom Glue Records and Nameservers mapping your server IP:
* `ns1.node1.qiwhost.com` $\rightarrow$ `<Server-IP>`
* `ns2.node1.qiwhost.com` $\rightarrow$ `<Server-IP>`

### 2. Set Up SSL Certificate
Secure the control panel and your server hostnames with Let's Encrypt SSL:
```bash
apt-get install -y certbot
certbot certonly --standalone -d <your-server-hostname>
```

### 3. Change Administrator Password
The installation generates a secure random 16-character password and prints it at the end. You can change it at any time directly through the artisan console:
```bash
cd /opt/qiwhost/panel-api
php artisan tinker --execute="$user = App\Models\User::where('email', 'YOUR_ADMIN_EMAIL')->first(); $user->password = bcrypt('NEW_SECURE_PASSWORD'); $user->save();"
```

---

## Updating QIWHOST Panel

The panel can be updated seamlessly to the latest codebase release in a single command:

```bash
bash /opt/qiwhost/installer/update.sh
```

This script pulls files, reinstalls backend/frontend dependencies, runs safe schema migrations, and restarts necessary daemon services automatically.

---

## Troubleshooting

### Check Service Statuses
Verify if all panel services are active and running:
```bash
systemctl status qiwhost-api
systemctl status qiwhost-frontend
systemctl status qiwhost-queue
```

### View Installation Logs
If any installation step fails, consult the logs to pinpoint the issue:
```bash
tail -n 100 /var/log/qiwhost_install.log
```

### Resetting Firewall Ports
If you lose access to specific applications, check active UFW rules:
```bash
ufw status verbose
```
If necessary, re-allow panel ports:
```bash
ufw allow 8443/tcp comment 'QIWHOST Frontend'
ufw allow 8080/tcp comment 'QIWHOST API'
```
