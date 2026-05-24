# QIWHOST Panel - Production Security Review & Hardening Report

This document contains a comprehensive security review of the QIWHOST Panel codebase prior to production deployment. Multiple critical, high, and medium-severity vulnerabilities were discovered that must be remediated to prevent total server compromise, privilege escalation, cross-customer data leakage, and authentication bypasses.

---

## 1. Vulnerability Summary Table

| ID | Title | Severity | Component | Risk Impact | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Master Administrative Token Leakage in Client Browser | **CRITICAL** | `whmcs-module` | Leakage of the master administrative API key to untrusted client browsers. | **REMEDIAL ACTION REQUIRED** |
| **SEC-02** | Complete Customer Account Impersonation via SSO Bypass | **CRITICAL** | `panel-api` (WHMCS) | Any customer can bypass authentication to log into **any other customer's account** on the server. | **REMEDIAL ACTION REQUIRED** |
| **SEC-03** | SQL Injection via IP Concatenation in Remote MySQL | **HIGH** | `panel-api` (Databases) | Arbitrary SQL command execution under root database privileges. | **REMEDIAL ACTION REQUIRED** |
| **SEC-04** | Hardcoded/Default Credentials for Remote Database Users | **HIGH** | `panel-api` (Databases) | Weak default passwords (`ali12345`) leave databases vulnerable to dictionary attacks. | **REMEDIAL ACTION REQUIRED** |
| **SEC-05** | Over-Privileged Sudoers Rules for `www-data` | **MEDIUM** | `installer` | Trivial local privilege escalation to **root** user if the web application is compromised. | **REMEDIAL ACTION REQUIRED** |
| **SEC-06** | Cross-Tenant Path Traversal Prefix Mismatch | **MEDIUM** | `panel-api` (File Manager) | Customers can read/write files belonging to other customers with overlapping username prefixes. | **REMEDIAL ACTION REQUIRED** |
| **SEC-07** | Wildcard Cross-Origin Resource Sharing (CORS) Policy | **LOW** | `panel-api` (Config) | Broad API surface exposure to third-party domains. | **REMEDIAL ACTION REQUIRED** |

---

## 2. Detailed Vulnerability Breakdown

### SEC-01: Master Administrative Token Leakage in Client Browser
* **Severity**: **CRITICAL** (CVSS: 9.8)
* **File Location**: [clientarea.tpl](file:///C:/Projects/QIWHOST-Panel/whmcs-module/modules/servers/qiwhost/templates/clientarea.tpl#L29)
* **Vulnerable Code**:
  ```html
  <form method="POST" action="{$ssoApiUrl}" target="_blank">
      <input type="hidden" name="username" value="{$username}">
      <input type="hidden" name="whmcs_token" value="{$apiKey}"> <!-- master key leaked -->
      <button type="submit">🔑 Login to Hosting Panel</button>
  </form>
  ```
* **Security Risk**:
  The WHMCS server module's template renders a hidden input element containing `{$apiKey}`. In WHMCS server modules, `{$apiKey}` maps to the master `serverpassword` configuration field, which contains the panel's **global administrative API secret token**. Embedding this token in the HTML sends the master key directly to the customer's browser.
* **Impact**:
  Any logged-in shared hosting customer can inspect their browser's HTML source, extract the global `whmcs_token` key, and bypass all billing restrictions to perform administrative commands directly against the panel API (e.g., executing arbitrary code, creating free hosting accounts, terminating other users).
* **Remediation**:
  Exposing the master API token client-side is a major architectural risk. **The token should never leave the WHMCS server backend.** Instead, use a secure backend server-to-server SSO exchange:
  1. The user clicks "Login to Hosting Panel".
  2. WHMCS receives the click, and its PHP server makes a secure backend `POST /api/whmcs/sso` call (using the private token) to request a **short-lived, one-time SSO token** for that specific customer.
  3. The Panel API returns a secure temporary token (`temp_sso_123abc`) valid for 60 seconds.
  4. WHMCS redirects the client's browser to the callback endpoint using only this temporary token:
     `https://panel.hostname:8443/customer/sso-callback?token=temp_sso_123abc`
  5. The panel callback consumes and invalidates the token, logging the user in safely.

---

### SEC-02: Complete Customer Account Impersonation via SSO Bypass
* **Severity**: **CRITICAL** (CVSS: 9.8)
* **File Location**: [WhmcsController.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Controllers/Api/Whmcs/WhmcsController.php#L163-L199)
* **Vulnerable Code**:
  ```php
  public function sso(Request $request)
  {
      $account = HostingAccount::where('system_username', $request->username)
          ->with('customer')
          ->first();
      ...
      // Generate one-time token valid for 60 seconds
      $token = Str::random(64);
      Cache::put("whmcs_sso_{$token}", [
          'customer_id' => $account->customer->id,
          'username'    => $request->username,
      ], now()->addSeconds(60));
  }
  ```
* **Security Risk**:
  Because the master administrative key (`whmcs_token`) is exposed in the customer's browser (see SEC-01), the customer can make direct browser POST requests to the panel's SSO endpoint. Because the endpoint identifies who is logging in solely based on the `username` parameter passed in the request body, a customer can specify *any* other username on the system.
* **Impact**:
  By replacing the `username` input value with a different username (e.g., `victim_user`) in their browser's developer tools and submitting, an attacker can generate a valid one-time session and successfully authenticate as the victim, gaining full unauthorized control of their websites, files, databases, and emails.
* **Remediation**:
  Ensure the master API key is only validated in server-to-server contexts. Implement the secure backend exchange described in SEC-01 so that users never directly transmit administrative credentials.

---

### SEC-03: SQL Injection via IP Concatenation in Remote MySQL
* **Severity**: **HIGH** (CVSS: 8.8)
* **File Location**: [DatabaseController.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Controllers/Api/Customer/DatabaseController.php#L220-L245)
* **Vulnerable Code**:
  ```php
  $validated = $request->validate([
      'allowed_ip' => 'required|string' // accepts arbitrary strings
  ]);
  $ip = $validated['allowed_ip'];
  ...
  $sql = "CREATE USER IF NOT EXISTS '{$fullUser}'@'{$ip}' IDENTIFIED BY 'ali12345'; " .
         "GRANT ALL PRIVILEGES ON `{$account->system_username}\_%`.* TO '{$fullUser}'@'{$ip}'; " .
         "FLUSH PRIVILEGES;";
  $this->runMysql($sql); // raw execution
  ```
* **Security Risk**:
  The endpoint accepts the IP address as a raw, unsanitized string without confirming it is a valid IP structure. It then concatenates this string directly into SQL statements executed on the server under the `root` MySQL user privilege.
* **Impact**:
  A customer can easily inject malicious SQL strings (e.g., `127.0.0.1'; DROP DATABASE core_db; --`). Since the query is executed directly by MySQL as `root`, the injected statements will be executed, potentially resulting in complete database destruction, structural modification, or data exfiltration.
* **Remediation**:
  Strictly validate the IP address structure in the validator array using Laravel's built-in `ip` rule, and sanitize or parameterize MySQL query structures where possible:
  ```php
  $validated = $request->validate([
      'allowed_ip' => 'required|ip' // enforces strict IP address formats (v4/v6)
  ]);
  ```

---

### SEC-04: Hardcoded/Default Credentials for Remote Database Users
* **Severity**: **HIGH** (CVSS: 8.1)
* **File Location**: [DatabaseController.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Controllers/Api/Customer/DatabaseController.php#L234)
* **Vulnerable Code**:
  ```php
  $sql = "CREATE USER IF NOT EXISTS '{$fullUser}'@'{$ip}' IDENTIFIED BY 'ali12345'; ";
  ```
* **Security Risk**:
  Every time a customer configures remote database access, the MySQL user password is created with or reset to the hardcoded default value `'ali12345'`.
* **Impact**:
  If remote MySQL access is opened for an IP, anyone from that IP can log into the user's database using the predictable credentials (`ali12345`), leading to unauthorized database access and data leakage.
* **Remediation**:
  Retrieve the actual, secure user-configured password from the `DatabaseUser` database record (which is encrypted) or require the user to explicitly provide the database password when enabling remote IP permissions:
  ```php
  $password = $user->password; // decrypt or retrieve user's designated password safely
  ```

---

### SEC-05: Over-Privileged Sudoers Rules for `www-data`
* **Severity**: **MEDIUM** (CVSS: 7.8)
* **File Location**: [install.sh](file:///C:/Projects/QIWHOST-Panel/installer/install.sh#L223-L241)
* **Vulnerable Code**:
  ```text
  www-data ALL=(ALL) NOPASSWD: /bin/mkdir
  www-data ALL=(ALL) NOPASSWD: /bin/chown
  www-data ALL=(ALL) NOPASSWD: /bin/chmod
  www-data ALL=(ALL) NOPASSWD: /bin/mv
  www-data ALL=(ALL) NOPASSWD: /bin/rm
  www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl
  ```
* **Security Risk**:
  The installer grants the web user (`www-data`) passwordless `sudo` rights to raw shell utility binaries without any argument constraints. Sudo wildcard configurations are extremely dangerous.
* **Impact**:
  If an attacker exploits a single vulnerability in the web application (e.g. standard file upload, remote code execution), they can run:
  - `sudo mv /tmp/hacked_passwd /etc/passwd`
  - `sudo chown root:www-data /etc/shadow && sudo chmod 777 /etc/shadow`
  This allows immediate, trivial **local privilege escalation to root**, taking over the entire host machine.
* **Remediation**:
  Avoid granting broad shell access to web threads. Instead:
  1. Restrict wildcard parameters inside `sudoers.d` to strict argument paths, or (highly recommended) build a tiny, secure system daemon (written in Go, Rust, or Python) running as `root` that exposes a secure Unix socket or API loop to handle file/folder creation, permission management, and systemd service reloads. The daemon performs rigorous input sanitization before calling OS methods.
  2. Minimize NOPASSWD rules. Never expose generic binaries like `mv`, `chmod`, `chown` or `rm` with absolute wildcards.

---

### SEC-06: Cross-Tenant Path Traversal Prefix Mismatch
* **Severity**: **MEDIUM** (CVSS: 6.8)
* **File Location**: [FileManagerController.php](file:///C:/Projects/QIWHOST-Panel/panel-api/app/Http/Controllers/Api/Customer/FileManagerController.php#L54)
* **Vulnerable Code**:
  ```php
  if (strpos($realPath, $jailRoot) !== 0) {
      throw new \InvalidArgumentException("Access Denied: Path traversal detected.");
  }
  ```
* **Security Risk**:
  The path traversal validator relies on `strpos` to confirm that the target path starts with `$jailRoot` (e.g., `/home/customer1`). However, it does not append a directory separator boundary to the prefix check.
* **Impact**:
  In a multi-tenant shared-hosting environment, if another customer has the system username `customer11`, their jail path is `/home/customer11`. Because `strpos('/home/customer11', '/home/customer1')` starts at index `0`, the validation check passes! The user `customer1` can traverse directories and access the private files of `customer11` (or any username sharing their username prefix).
* **Remediation**:
  Append a trailing slash to the prefix root check to ensure exact directory matching:
  ```php
  $jailRootWithSlash = rtrim($jailRoot, '/') . '/';
  if (strpos($realPath . '/', $jailRootWithSlash) !== 0 && $realPath !== $jailRoot) {
      throw new \InvalidArgumentException("Access Denied: Path traversal detected.");
  }
  ```

---

## 3. General Hardening Best Practices

1. **CSRF Protection on WHMCS Callback**:
   Ensure client callback sessions mapped at `/customer/sso-callback` implement standard Next.js security headers, enforce HTTPS-only cookies, and utilize SameSite policies to prevent session hijacking.
2. **Dedicated Database Users for Panel Components**:
   Ensure the panel's web application (`panel-api`) connects to its database `qiwpanel` using a restricted user, not the root credentials, to contain database damage in the event of an application exploit.
3. **Sandbox PHP Process Execution**:
   To secure a production shared-hosting environment, configure LSPHP (OpenLiteSpeed PHP) to enforce strict `open_basedir` parameters, disabling system execution functions (`exec`, `system`, `shell_exec`, `passthru`, `proc_open`) on customer hosting accounts.
