# QIWHOST Panel - WHMCS Server Provisioning Module

This module connects **WHMCS Billing** with the **QIWHOST Hosting Control Panel**, enabling automated account provisioning, suspension, termination, client resources tracking, and Single Sign-On auto-login.

---

## 🚀 Installation & Setup Guide

### 1. Deploy the Module Files
Copy the `modules/` directory from this module package straight into your active WHMCS installation folder:
- Copy `modules/servers/qiwhost` $\rightarrow$ `<whmcs-root>/modules/servers/`

### 2. Retrieve your Panel API Secret Key
During panel installation, a secure 32-character random WHMCS API secret token is generated.
Run this command on your QIWHOST Panel server to view it:
```bash
cat /etc/qiwhost/install.conf | grep WHMCS_SECRET_KEY
```

### 3. Add Server in WHMCS Admin Portal
1. Navigate to **WHMCS Admin** $\rightarrow$ **System Settings** $\rightarrow$ **Servers** (or Setup $\rightarrow$ Products/Services $\rightarrow$ Servers).
2. Click **Add New Server**.
3. Configure the details:
   - **Name**: QIWHOST Node 1
   - **Hostname or IP Address**: `<Your-Panel-Server-IP-Or-Domain>`
   - **Port**: `8080` (API Listener)
   - **Password**: `<Your WHMCS_SECRET_KEY from Step 2>`
   - **Module**: `qiwhost` (Select QIWHOST Panel from dropdown list)
4. Click **Test Connection** to confirm connectivity.
5. Save changes and add the server to a server group.

### 4. Create WHMCS Products
1. Go to **Products/Services** $\rightarrow$ Create a new Product.
2. Under **Module Settings**, select **qiwhost** from the module dropdown.
3. Configure your hosting limits:
   - **Package Name**: Hosting package name (Must exactly match the name of a hosting package inside your QIWHOST Panel, e.g., `Starter`, `Business`).
   - **Max Disk (MB)**: Hard disk storage limit in megabytes.
   - **Max Bandwidth (MB)**: Bandwidth quota limit.
   - **Max Domains, Emails, Databases**: Resource constraints.
4. Set the provisioning triggers (e.g., *Automatically setup the product as soon as the first payment is received*).
