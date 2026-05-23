#!/bin/bash

# ==============================================================================
# QIWHOST Panel One-Command Installer
# Supported OS: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS (x86_64 / amd64)
# ==============================================================================

# Exit on any error during critical segments (we handle steps with run_cmd wrapper)
set -o pipefail

# Define Colors for UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global Configuration
LOG_FILE="/var/log/qiwhost_install.log"
CONFIG_FILE="/etc/qiwhost/install.conf"
TOTAL_STEPS=20
CURRENT_STEP=0
export COMPOSER_ALLOW_SUPERUSER=1

# Clean old log on brand-new run (but preserve config for idempotency)
if [ ! -f "$CONFIG_FILE" ]; then
    rm -f "$LOG_FILE"
fi

# Make sure log file exists and is writable
touch "$LOG_FILE"
chmod 600 "$LOG_FILE"

# Log Helpers
log_info() {
    echo -e "${CYAN}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

# Step Tracker Helper
step_header() {
    ((CURRENT_STEP++))
    echo -e "\n${PURPLE}======================================================================${NC}"
    echo -e "${PURPLE}[$CURRENT_STEP/$TOTAL_STEPS] $1${NC}"
    echo -e "${PURPLE}======================================================================${NC}\n"
    echo -e "\n--- Step $CURRENT_STEP: $1 ---" >> "$LOG_FILE"
}

# General Command Execution Wrapper
run_cmd() {
    local cmd="$1"
    local desc="$2"
    echo -e "${CYAN}Running: $desc...${NC}"
    echo "--- $desc at $(date) ---" >> "$LOG_FILE"
    bash -c "$cmd" >> "$LOG_FILE" 2>&1
    local status=$?
    if [ $status -ne 0 ]; then
        log_error "$desc FAILED (exit: $status) - check $LOG_FILE"
        exit $status
    fi
    log_success "$desc done."
}

# ==============================================================================
# STEP 0: Welcome Banner
# ==============================================================================
clear
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       QIWHOST Panel Installer v1.0.0         ║${NC}"
echo -e "${CYAN}║       Production Hosting Control Panel       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo -e "Starting automated installation procedure at $(date)\n"

# ==============================================================================
# STEP 1: Pre-flight checks
# ==============================================================================
step_header "Pre-flight Checks"

# 1. Root check
if [ "$EUID" -ne 0 ]; then
    log_error "This installer must be run as root (UID 0). Currently running as UID $EUID."
    exit 1
fi
log_success "Running as root user."

# 2. Ubuntu 22.04 / 24.04 OS check
OS_NAME=$(lsb_release -is 2>/dev/null || grep -oP '(?<=^NAME=").*(?=")' /etc/os-release)
OS_VERSION=$(lsb_release -rs 2>/dev/null || grep -oP '(?<=^VERSION_ID=").*(?=")' /etc/os-release)

if [ "$OS_NAME" != "Ubuntu" ] || { [ "$OS_VERSION" != "22.04" ] && [ "$OS_VERSION" != "24.04" ]; }; then
    log_error "This installer only supports Ubuntu 22.04 or 24.04 LTS. Detected OS: $OS_NAME $OS_VERSION."
    exit 1
fi
log_success "Operating System matches: $OS_NAME $OS_VERSION."

# 3. Memory Check (Min 1GB)
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM_MB" -ge 950 ]; then
    RAM_CHECK="✓"
    log_success "System Memory: ✓ (Detected ${TOTAL_RAM_MB}MB)"
else
    RAM_CHECK="✗"
    log_warning "System Memory: ✗ (Detected ${TOTAL_RAM_MB}MB. Minimum recommended is 1GB RAM)"
fi

# 4. Disk Check (Min 20GB)
FREE_DISK_GB=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')
if [ "$FREE_DISK_GB" -ge 20 ]; then
    DISK_CHECK="✓"
    log_success "Disk Free Space: ✓ (Detected ${FREE_DISK_GB}GB)"
else
    DISK_CHECK="✗"
    log_warning "Disk Free Space: ✗ (Detected ${FREE_DISK_GB}GB. Minimum recommended is 20GB free space)"
fi

# 5. Internet check
if ping -c 1 -W 3 google.com >/dev/null 2>&1; then
    NET_CHECK="✓"
    log_success "Internet Connectivity: ✓"
else
    NET_CHECK="✗"
    log_error "Internet Connectivity: ✗ (Could not ping google.com. Active internet connection required)"
    exit 1
fi

echo -e "\n${GREEN}Pre-flight checks passed successfully. Proceeding...${NC}\n"

# ==============================================================================
# STEP 2: Collect user input (interactive)
# ==============================================================================
step_header "User Input Collection"

# Read inputs
read -p "Enter server hostname (e.g. server1.qiwhost.com): " SERVER_HOSTNAME
while [[ ! "$SERVER_HOSTNAME" =~ \. ]]; do
    echo -e "${RED}Invalid hostname. Hostname must contain at least one dot (e.g. server1.qiwhost.com).${NC}"
    read -p "Enter server hostname (e.g. server1.qiwhost.com): " SERVER_HOSTNAME
done

read -p "Enter admin email address: " ADMIN_EMAIL
while [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
    echo -e "${RED}Invalid email address. Please try again.${NC}"
    read -p "Enter admin email address: " ADMIN_EMAIL
done

# Read existing configuration or generate fresh credentials
if [ -f "$CONFIG_FILE" ]; then
    log_info "Found existing configuration file. Extracting credentials for idempotency..."
    source "$CONFIG_FILE"
    MYSQL_ROOT_PASS="$MYSQL_ROOT_PASSWORD"
    PANEL_DB_PASS="$PANEL_DB_PASSWORD"
    ROUNDCUBE_DB_PASS="$ROUNDCUBE_DB_PASSWORD"
    ADMIN_PASSWORD="$ADMIN_PASSWORD"
else
    log_info "No prior configuration found. Auto-generating secure passwords..."
    ADMIN_PASSWORD=$(openssl rand -base64 20 | tr -dc 'a-zA-Z0-9' | cut -c1-16)
    MYSQL_ROOT_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | cut -c1-24)
    PANEL_DB_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | cut -c1-20)
    ROUNDCUBE_DB_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | cut -c1-16)
fi

echo -e "\n${CYAN}--- Installation Settings Summary ---${NC}"
echo -e "Hostname:       ${YELLOW}$SERVER_HOSTNAME${NC}"
echo -e "Admin Email:    ${YELLOW}$ADMIN_EMAIL${NC}"
echo -e "Admin Password: ${YELLOW}(Auto-generated, will display at the end)${NC}"
echo -e "-------------------------------------\n"

read -p "Do you want to proceed with the installation? [y/N]: " CONFIRM
if [[ ! "$CONFIRM" =~ ^[yY]([eE][sS])?$ ]]; then
    log_error "Installation aborted by the user."
    exit 1
fi

# ==============================================================================
# STEP 3: System Update
# ==============================================================================
step_header "System Packages Update"
run_cmd "apt-get update -y" "Updating apt repositories"
run_cmd "apt-get upgrade -y" "Upgrading system packages"
run_cmd "apt-get install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw" "Installing system utilities"

# ==============================================================================
# STEP 4: Install OpenLiteSpeed
# ==============================================================================
step_header "OpenLiteSpeed Web Server Installation"
run_cmd "wget -O - https://repo.litespeed.sh | bash" "Adding OpenLiteSpeed repository"
run_cmd "apt-get install -y openlitespeed" "Installing OpenLiteSpeed Web Server"
run_cmd "apt-get install -y lsphp81 lsphp81-common lsphp81-mysql lsphp81-curl lsphp81-intl lsphp81-opcache lsphp81-redis lsphp81-sqlite3" "Installing LSPHP 8.1"
run_cmd "apt-get install -y lsphp82 lsphp82-common lsphp82-mysql lsphp82-curl lsphp82-intl lsphp82-opcache lsphp82-redis lsphp82-sqlite3" "Installing LSPHP 8.2"
run_cmd "apt-get install -y lsphp83 lsphp83-common lsphp83-mysql lsphp83-curl lsphp83-intl lsphp83-opcache lsphp83-redis lsphp83-sqlite3" "Installing LSPHP 8.3"

# Trigger systemd daemon reload to register OpenLiteSpeed service unit
run_cmd "systemctl daemon-reload" "Reloading systemd configuration for OLS"

# Set official service name directly
OLS_SERVICE="lshttpd"

run_cmd "systemctl enable $OLS_SERVICE" "Enabling OpenLiteSpeed service"
run_cmd "systemctl start $OLS_SERVICE" "Starting OpenLiteSpeed service"

# Disable Apache if installed
run_cmd "systemctl stop apache2 2>/dev/null || true" "Stopping Apache if running"
run_cmd "systemctl disable apache2 2>/dev/null || true" "Disabling Apache"

# Change OLS default port from 8088 to 80
run_cmd "sed -i 's/address.*\*:8088/address                  *:80/' /usr/local/lsws/conf/httpd_config.conf" "Configuring OLS on port 80"
run_cmd "systemctl restart $OLS_SERVICE" "Restarting OLS on port 80"

# Setup www-data sudo permissions for hosting provisioning
cat > /etc/sudoers.d/qiwhost-www-data << 'SUDOEOF'
www-data ALL=(ALL) NOPASSWD: /usr/sbin/useradd
www-data ALL=(ALL) NOPASSWD: /usr/sbin/userdel
www-data ALL=(ALL) NOPASSWD: /usr/bin/chpasswd
www-data ALL=(ALL) NOPASSWD: /bin/mkdir
www-data ALL=(ALL) NOPASSWD: /bin/chown
www-data ALL=(ALL) NOPASSWD: /bin/chmod
www-data ALL=(ALL) NOPASSWD: /usr/sbin/setquota
www-data ALL=(ALL) NOPASSWD: /bin/mv
www-data ALL=(ALL) NOPASSWD: /bin/rm
www-data ALL=(ALL) NOPASSWD: /usr/sbin/service
www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl
www-data ALL=(ALL) NOPASSWD: /usr/local/lsws/bin/lswsctrl
SUDOEOF
chmod 440 /etc/sudoers.d/qiwhost-www-data
run_cmd "visudo -c" "Validating sudoers syntax"

# Verify OpenLiteSpeed is active
systemctl is-active --quiet $OLS_SERVICE || { log_error "OpenLiteSpeed failed to start."; exit 1; }
log_success "OpenLiteSpeed is up and running."

# ==============================================================================
# STEP 5: Install PHP CLI (for Laravel/panel itself)
# ==============================================================================
step_header "PHP CLI & Composer Installation"
run_cmd "add-apt-repository ppa:ondrej/php -y" "Adding PHP PPA repository"
run_cmd "apt-get update -y" "Updating repository listings for PPA"
run_cmd "apt-get install -y php8.3-cli php8.3-fpm php8.3-mysql php8.3-curl php8.3-zip php8.3-mbstring php8.3-xml php8.3-dom php8.3-bcmath php8.3-gd php8.3-intl php8.3-redis php8.3-opcache" "Installing PHP 8.3 CLI and modules"
run_cmd "apt-get install -y php8.3-xml php8.3-dom" "Installing PHP DOM extension"
run_cmd "update-alternatives --set php /usr/bin/php8.3 2>/dev/null || true" "Setting PHP 8.3 as system default"
run_cmd "apt-get install -y ufw" "Ensuring UFW is installed"
run_cmd "curl -sS https://getcomposer.org/installer | php8.3 -- --install-dir=/usr/local/bin --filename=composer" "Downloading and installing Composer"

# Verify Composer
php8.3 /usr/local/bin/composer --version >/dev/null 2>&1 || { log_error "Composer installation verification failed."; exit 1; }
log_success "Composer is active."

# ==============================================================================
# STEP 6: Install MySQL 8.0
# ==============================================================================
step_header "MySQL 8.0 Database Installation"
run_cmd "apt-get install -y mysql-server mysql-client" "Installing MySQL Server"
run_cmd "systemctl enable mysql && systemctl start mysql" "Enabling and starting MySQL service"

# Configure root account and security parameters
run_cmd "mysql -e \"ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASS';\" || mysql -u root -p'$MYSQL_ROOT_PASS' -e \"SELECT 1;\"" "Configuring MySQL root password"
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"DELETE FROM mysql.user WHERE User='';\"" "Securing MySQL anonymous users"
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"DROP DATABASE IF EXISTS test;\"" "Removing MySQL test database"
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"FLUSH PRIVILEGES;\"" "Flushing database privileges"

# Create panel database and users
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"CREATE DATABASE IF NOT EXISTS qiwpanel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"" "Creating panel database"
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"CREATE USER IF NOT EXISTS 'qiwpanel'@'localhost' IDENTIFIED BY '$PANEL_DB_PASS';\"" "Creating panel database user"
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"GRANT ALL PRIVILEGES ON qiwpanel.* TO 'qiwpanel'@'localhost';\"" "Granting database privileges to panel user"
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"FLUSH PRIVILEGES;\"" "Refreshing database privileges"

# ==============================================================================
# STEP 7: Install Redis
# ==============================================================================
step_header "Redis Server Installation"
run_cmd "apt-get install -y redis-server" "Installing Redis Server"
run_cmd "sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf" "Configuring Redis maxmemory"
run_cmd "sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf" "Configuring Redis cache policy"
run_cmd "systemctl enable redis-server && systemctl start redis-server" "Starting Redis service"

# ==============================================================================
# STEP 8: Install Node.js & PM2
# ==============================================================================
step_header "Node.js & PM2 Installation"
run_cmd "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -" "Adding Node.js 20 LTS repository"
run_cmd "apt-get install -y nodejs" "Installing Node.js"
run_cmd "npm install -g pm2" "Installing PM2 globally"
run_cmd "pm2 startup systemd -u root --hp /root || true" "Setting up PM2 systemd startup configuration"

# Verify Node.js
node --version >/dev/null 2>&1 || { log_error "Node.js installation verification failed."; exit 1; }
log_success "Node.js is active."

# ==============================================================================
# STEP 9: Install Email Stack (Postfix + Dovecot)
# ==============================================================================
step_header "Mail Services Configuration (Postfix + Dovecot + OpenDKIM)"

# Set hostname configuration
run_cmd "hostnamectl set-hostname '$SERVER_HOSTNAME'" "Setting server hostname"
run_cmd "grep -qF '$SERVER_HOSTNAME' /etc/hosts || echo '127.0.0.1 $SERVER_HOSTNAME' >> /etc/hosts" "Updating /etc/hosts"

# Install postfix non-interactively
run_cmd "DEBIAN_FRONTEND=noninteractive apt-get install -y postfix postfix-mysql" "Installing Postfix MTA"

# Configure Postfix parameters
run_cmd "postconf -e 'myhostname = $SERVER_HOSTNAME'" "Configuring Postfix hostname"
run_cmd "postconf -e 'mydomain = $(echo $SERVER_HOSTNAME | cut -d. -f2-)'" "Configuring Postfix domain"
run_cmd "postconf -e 'myorigin = \$mydomain'" "Configuring Postfix origin"
run_cmd "postconf -e 'inet_interfaces = all'" "Configuring Postfix interfaces"
run_cmd "postconf -e 'inet_protocols = ipv4'" "Configuring Postfix IP version"
run_cmd "postconf -e 'mydestination = \$myhostname, localhost.\$mydomain, localhost'" "Configuring Postfix destination"
run_cmd "postconf -e 'mynetworks = 127.0.0.0/8'" "Configuring Postfix networks"
run_cmd "postconf -e 'mailbox_transport = lmtp:unix:private/dovecot-lmtp'" "Configuring Postfix mailbox transport via Dovecot"
run_cmd "postconf -e 'smtpd_tls_security_level = may'" "Enabling incoming Postfix TLS"
run_cmd "postconf -e 'smtp_tls_security_level = may'" "Enabling outgoing Postfix TLS"

# Install Dovecot Mail stack
run_cmd "apt-get install -y dovecot-core dovecot-imapd dovecot-pop3d dovecot-lmtpd" "Installing Dovecot IMAP/POP3/LMTP Server"

# Configure Dovecot Maildir & plaintext auth
run_cmd "sed -i 's|^#mail_location =.*|mail_location = maildir:~/Maildir|' /etc/dovecot/conf.d/10-mail.conf" "Configuring Dovecot mail_location"
run_cmd "sed -i 's|^#disable_plaintext_auth = yes|disable_plaintext_auth = no|' /etc/dovecot/conf.d/10-auth.conf" "Configuring Dovecot authentication"

# Install OpenDKIM
run_cmd "apt-get install -y opendkim opendkim-tools" "Installing OpenDKIM"

# Generate DKIM key
run_cmd "mkdir -p /etc/opendkim/keys/$SERVER_HOSTNAME" "Creating DKIM keys directory"
run_cmd "if [ ! -f /etc/opendkim/keys/$SERVER_HOSTNAME/mail.private ]; then opendkim-genkey -t -s mail -d $SERVER_HOSTNAME -D /etc/opendkim/keys/$SERVER_HOSTNAME; fi" "Generating OpenDKIM keys"
run_cmd "chown -R opendkim:opendkim /etc/opendkim/keys" "Setting OpenDKIM keys ownership"

# Install SpamAssassin
run_cmd "apt-get install -y spamassassin spamc" "Installing SpamAssassin"
run_cmd "systemctl enable spamd && systemctl start spamd" "Enabling and starting SpamAssassin"

# Start mail services
run_cmd "systemctl enable postfix dovecot opendkim && systemctl restart postfix dovecot opendkim" "Enabling and starting Mail stack services"

# ==============================================================================
# STEP 10: Install Roundcube Webmail
# ==============================================================================
step_header "Roundcube Webmail Installation & Configuration"

# Disable prompts
run_cmd "echo 'roundcube-core roundcube/dbconfig-install boolean false' | debconf-set-selections" "Disabling Roundcube dbconfig-common prompts"
run_cmd "echo 'roundcube-core roundcube/database-type select mysql' | debconf-set-selections" "Setting Roundcube database driver"
run_cmd "DEBIAN_FRONTEND=noninteractive apt-get install -y roundcube roundcube-mysql roundcube-plugins" "Installing Roundcube packages"

# Database Configuration
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"CREATE DATABASE IF NOT EXISTS roundcubemail CHARACTER SET utf8mb4;\"" "Creating Roundcube database"
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"CREATE USER IF NOT EXISTS 'roundcube'@'localhost' IDENTIFIED BY '$ROUNDCUBE_DB_PASS';\"" "Creating Roundcube database user"
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"GRANT ALL PRIVILEGES ON roundcubemail.* TO 'roundcube'@'localhost';\"" "Granting Roundcube database privileges"
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' -e \"FLUSH PRIVILEGES;\"" "Flushing database privileges for Roundcube"

# Import schemas if empty
run_cmd "mysql -u root -p'$MYSQL_ROOT_PASS' roundcubemail -e \"SHOW TABLES;\" | grep -q users || mysql -u root -p'$MYSQL_ROOT_PASS' roundcubemail < /usr/share/roundcube/SQL/mysql.initial.sql" "Loading Roundcube initial database schema"

# Write Configuration File (using EOF and sed placeholders to prevent escaping issues)
cat > /etc/roundcube/config.inc.php << 'EOF'
<?php
$config['db_dsnw'] = 'mysql://roundcube:ROUNDCUBE_DB_PASS_PLACEHOLDER@localhost/roundcubemail';
$config['default_host'] = 'localhost';
$config['default_port'] = 143;
$config['smtp_server'] = 'localhost';
$config['smtp_port'] = 587;
$config['smtp_user'] = '%u';
$config['smtp_pass'] = '%p';
$config['product_name'] = 'QIWHOST Webmail';
$config['des_key'] = 'DES_KEY_PLACEHOLDER';
$config['plugins'] = ['archive', 'zipdownload', 'password'];
$config['language'] = 'en_US';
$config['support_url'] = '';
EOF

# Perform Sed replacement
run_cmd "sed -i 's/ROUNDCUBE_DB_PASS_PLACEHOLDER/'\"$ROUNDCUBE_DB_PASS\"'/g' /etc/roundcube/config.inc.php" "Injecting Roundcube database credentials"
run_cmd "sed -i 's/DES_KEY_PLACEHOLDER/'\"$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)\"'/g' /etc/roundcube/config.inc.php" "Injecting Roundcube encryption DES key"

# FIX 4 - Create proper OLS virtual host for Roundcube (/webmail)
run_cmd "mkdir -p /usr/local/lsws/conf/vhosts/webmail" "Creating Roundcube virtual host directory"
cat > /usr/local/lsws/conf/vhosts/webmail/vhconf.conf << EOF
docRoot /var/lib/roundcube/
vhDomain $SERVER_HOSTNAME
enableGzip 1
index {
  useServer 0
  indexFiles index.php
}
scripthandler {
  add lsapi:lsphp83 php
}
rewrite {
  enable 1
  autoLoadHtaccess 1
}
EOF

# Register webmail in httpd_config.conf as proper virtualhost block
vhostRegister="\nvirtualhost webmail {\n  vhRoot                  /var/lib/roundcube/\n  configFile              conf/vhosts/webmail/vhconf.conf\n  allowSymbolLink         1\n  enableScript            1\n  restrained              1\n}\n"
run_cmd "echo -e \"\$vhostRegister\" >> /usr/local/lsws/conf/httpd_config.conf" "Registering webmail virtual host in OLS config"

# Map in Default listener as: map webmail webmail
run_cmd "sed -i '/listener Default{/a\\    map                      webmail webmail' /usr/local/lsws/conf/httpd_config.conf" "Mapping webmail in Default listener"

# ==============================================================================
# STEP 11: Install phpMyAdmin
# ==============================================================================
step_header "phpMyAdmin Installation"

# Non-interactive phpMyAdmin installer selection
run_cmd "echo 'phpmyadmin phpmyadmin/dbconfig-install boolean false' | debconf-set-selections" "Disabling phpMyAdmin dbconfig-common prompts"
run_cmd "echo 'phpmyadmin phpmyadmin/reconfigure-webserver multiselect none' | debconf-set-selections" "Disabling web server selection for phpMyAdmin"
run_cmd "DEBIAN_FRONTEND=noninteractive apt-get install -y phpmyadmin" "Installing phpMyAdmin package"

# Create Single Sign-on Script
run_cmd "mkdir -p /var/www/html" "Creating web document root"
cat > /var/www/html/phpmyadmin-sso.php << 'EOF'
<?php
session_name('QIWSignonSession');
session_start();
if (isset($_GET['user']) && isset($_GET['pass'])) {
    $_SESSION['PMA_single_signon_user'] = $_GET['user'];
    $_SESSION['PMA_single_signon_password'] = base64_decode($_GET['pass']);
    $_SESSION['PMA_single_signon_HMAC_secret'] = hash('sha256', $_GET['user'] . $_GET['pass']);
    header('Location: /phpmyadmin/');
    exit;
}
header('Location: /phpmyadmin/');
EOF
chmod 644 /var/www/html/phpmyadmin-sso.php
log_success "phpMyAdmin SSO Script configured."

# FIX 4 - Create proper OLS virtual host for phpMyAdmin
run_cmd "mkdir -p /usr/local/lsws/conf/vhosts/phpmyadmin" "Creating phpMyAdmin virtual host directory"
cat > /usr/local/lsws/conf/vhosts/phpmyadmin/vhconf.conf << EOF
docRoot /usr/share/phpmyadmin/
vhDomain $SERVER_HOSTNAME
enableGzip 1
index {
  useServer 0
  indexFiles index.php
}
scripthandler {
  add lsapi:lsphp83 php
}
EOF

# Register phpmyadmin in httpd_config.conf as proper virtualhost block
pmaRegister="\nvirtualhost phpmyadmin {\n  vhRoot                  /usr/share/phpmyadmin/\n  configFile              conf/vhosts/phpmyadmin/vhconf.conf\n  allowSymbolLink         1\n  enableScript            1\n  restrained              1\n}\n"
run_cmd "echo -e \"\$pmaRegister\" >> /usr/local/lsws/conf/httpd_config.conf" "Registering phpMyAdmin virtual host in OLS config"

# Map in Default listener as: map phpmyadmin phpmyadmin
run_cmd "sed -i '/listener Default{/a\\    map                      phpmyadmin phpmyadmin' /usr/local/lsws/conf/httpd_config.conf" "Mapping phpMyAdmin in Default listener"

# Restart OpenLiteSpeed Server to load Virtual Hosts configurations
run_cmd "systemctl restart $OLS_SERVICE" "Restarting OpenLiteSpeed Server"

# ==============================================================================
# STEP 12: Install WP-CLI
# ==============================================================================
step_header "WP-CLI Installation"
run_cmd "curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar" "Downloading WP-CLI"
run_cmd "chmod +x wp-cli.phar && mv wp-cli.phar /usr/local/bin/wp" "Moving WP-CLI to /usr/local/bin/wp"

# ==============================================================================
# STEP 13: Install ClamAV
# ==============================================================================
step_header "ClamAV Security Services Installation"
run_cmd "apt-get install -y clamav clamav-daemon" "Installing ClamAV Antivirus"
run_cmd "systemctl stop clamav-freshclam || true" "Stopping freshclam service for manual update"
run_cmd "freshclam || true" "Updating ClamAV virus signatures database (can take a minute)"
run_cmd "systemctl enable clamav-daemon clamav-freshclam && systemctl start clamav-daemon clamav-freshclam" "Enabling and starting ClamAV daemon"

# ==============================================================================
# STEP 14: Clone and Setup QIWHOST Panel
# ==============================================================================
step_header "Cloning & Configuring QIWHOST Panel"
run_cmd "mkdir -p /opt/qiwhost" "Creating QIWHOST base folder"
run_cmd "if [ -d /opt/qiwhost/.git ]; then cd /opt/qiwhost && git fetch --all && git reset --hard origin/main; else git clone https://github.com/daxirc/QIWHOST-Panel.git /opt/qiwhost; fi" "Cloning or updating QIWHOST Panel repository"
run_cmd "cd /opt/qiwhost/panel-api && php8.3 /usr/local/bin/composer install --no-dev --optimize-autoloader --no-interaction" "Installing Laravel API composer dependencies"

# Write Laravel .env configuration
cat > /opt/qiwhost/panel-api/.env << 'EOF'
APP_NAME="QIWHOST Panel"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://SERVER_HOSTNAME_PLACEHOLDER:8080

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=qiwpanel
DB_USERNAME=qiwpanel
DB_PASSWORD=DB_PASSWORD_PLACEHOLDER

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=database

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=localhost
MAIL_PORT=587
MAIL_FROM_ADDRESS=ADMIN_EMAIL_PLACEHOLDER
MAIL_FROM_NAME="QIWHOST Panel"

SANCTUM_STATEFUL_DOMAINS=SERVER_HOSTNAME_PLACEHOLDER:8080
EOF

run_cmd "sed -i 's/SERVER_HOSTNAME_PLACEHOLDER/'\"$SERVER_HOSTNAME\"'/g' /opt/qiwhost/panel-api/.env" "Applying hostname configuration to Laravel .env"
run_cmd "sed -i 's/DB_PASSWORD_PLACEHOLDER/'\"$PANEL_DB_PASS\"'/g' /opt/qiwhost/panel-api/.env" "Applying database credentials to Laravel .env"
run_cmd "sed -i 's/ADMIN_EMAIL_PLACEHOLDER/'\"$ADMIN_EMAIL\"'/g' /opt/qiwhost/panel-api/.env" "Applying admin email to Laravel .env"

# Execute artisan bootstrapping
run_cmd "cd /opt/qiwhost/panel-api && php8.3 artisan key:generate --force" "Generating Laravel application key"
run_cmd "cd /opt/qiwhost/panel-api && php8.3 artisan migrate --force" "Executing all 24 database migrations"
run_cmd "cd /opt/qiwhost/panel-api && php8.3 artisan db:seed --force" "Seeding initial roles and permissions"

# FIX 5 - Verification: Check that the seeder did not create any sample customers
CUSTOMER_COUNT=$(mysql -u qiwpanel -p"$PANEL_DB_PASS" qiwpanel -sNe "SELECT COUNT(*) FROM customers;" 2>/dev/null)
if [ "$CUSTOMER_COUNT" -gt 0 ]; then
    log_warning "Seeder created $CUSTOMER_COUNT customers - removing them..."
    mysql -u qiwpanel -p"$PANEL_DB_PASS" qiwpanel -e "DELETE FROM customers; DELETE FROM hosting_accounts;"
    log_success "Customer data cleared - clean installation verified"
else
    log_success "Clean installation verified - no customers created"
fi

# Apply system folder permissions
run_cmd "chown -R www-data:www-data /opt/qiwhost/panel-api" "Setting Laravel folder ownership to www-data"
run_cmd "chmod -R 755 /opt/qiwhost/panel-api" "Setting Laravel standard folder permissions"
run_cmd "chmod -R 775 /opt/qiwhost/panel-api/storage" "Enabling storage write permissions"
run_cmd "chmod -R 775 /opt/qiwhost/panel-api/bootstrap/cache" "Enabling cache write permissions"

# ==============================================================================
# STEP 15: Create Admin User (auto-generated password)
# ==============================================================================
step_header "Provisioning Administrator Account"

# FIX 2 - Seed administrator user account cleanly and idempotently via dedicated PHP script
cat > /opt/qiwhost/panel-api/create_admin.php << 'PHPEOF'
<?php
define('LARAVEL_START', microtime(true));
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$email = getenv('ADMIN_EMAIL');
$password = getenv('ADMIN_PASSWORD');

$user = App\Models\User::firstOrNew(['email' => $email]);
$user->name = 'QIWHOST Admin';
$user->password = Hash::make($password);
$user->save();
echo "Admin user provisioned: " . $user->email . PHP_EOL;
PHPEOF

run_cmd "ADMIN_EMAIL=\"$ADMIN_EMAIL\" ADMIN_PASSWORD=\"$ADMIN_PASSWORD\" php8.3 /opt/qiwhost/panel-api/create_admin.php" "Executing Administrator provisioning script"
rm -f /opt/qiwhost/panel-api/create_admin.php

# FIX 1 - Seed Hostname & Cluster System settings (`group` column renamed from `group_name`)
cat > /tmp/settings.sql << EOF
INSERT INTO settings (\`group\`, \`key\`, value, created_at, updated_at) VALUES
('hostname', 'server_hostname', '$SERVER_HOSTNAME', NOW(), NOW()),
('hostname', 'server_node_name', 'node1', NOW(), NOW()),
('hostname', 'nameserver_1', 'ns1.node1.qiwhost.com', NOW(), NOW()),
('hostname', 'nameserver_2', 'ns2.node1.qiwhost.com', NOW(), NOW()),
('general', 'panel_name', 'QIWHOST Panel', NOW(), NOW()),
('general', 'admin_email', '$ADMIN_EMAIL', NOW(), NOW())
ON DUPLICATE KEY UPDATE value=VALUES(value);
EOF
run_cmd "mysql -u qiwpanel -p\"$PANEL_DB_PASS\" qiwpanel < /tmp/settings.sql" "Configuring hostname and general settings in MySQL"
rm -f /tmp/settings.sql


# ==============================================================================
# STEP 16: Build Next.js Frontend
# ==============================================================================
step_header "Next.js Frontend Compilations"
SERVER_IP=$(hostname -I | awk '{print $1}')
run_cmd "echo 'NEXT_PUBLIC_API_URL=http://$SERVER_IP:8080/api' > /opt/qiwhost/panel-frontend/.env.local" "Setting Next.js local environment variables"
run_cmd "cd /opt/qiwhost/panel-frontend && npm install --production=false" "Installing Next.js frontend node packages"
run_cmd "cd /opt/qiwhost/panel-frontend && npm run build" "Building Next.js optimized production package"
run_cmd "npm install -g serve" "Installing serve package globally"
run_cmd "chown -R www-data:www-data /opt/qiwhost/panel-frontend" "Setting Next.js frontend folder ownership to www-data"

# ==============================================================================
# STEP 17: Setup Systemd Services & Crons
# ==============================================================================
step_header "Configuring Daemon Services & Cronjobs"

# 1. API Systemd Daemon
cat > /etc/systemd/system/qiwhost-api.service << EOF
[Unit]
Description=QIWHOST Panel API (Laravel)
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/qiwhost/panel-api
ExecStart=/usr/bin/php8.3 artisan serve --host=0.0.0.0 --port=8080
Restart=always
RestartSec=5
Environment=APP_ENV=production
Environment=REMOTE_ADDR_FORWARDED=true

[Install]
WantedBy=multi-user.target
EOF

# 2. Queue Daemon
cat > /etc/systemd/system/qiwhost-queue.service << EOF
[Unit]
Description=QIWHOST Panel Queue Worker
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/qiwhost/panel-api
ExecStart=/usr/bin/php8.3 artisan queue:work --sleep=3 --tries=3 --timeout=90
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# FIX 3 - Next.js Frontend Daemon (Using correct Node/Next paths and NEXT_TELEMETRY_DISABLED)
cat > /etc/systemd/system/qiwhost-frontend.service << EOF
[Unit]
Description=QIWHOST Panel Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/qiwhost/panel-frontend
ExecStart=/usr/local/bin/node /opt/qiwhost/panel-frontend/node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=NEXT_TELEMETRY_DISABLED=1

[Install]
WantedBy=multi-user.target
EOF

# Reload and trigger systemctl startups
run_cmd "systemctl daemon-reload" "Reloading systemd configuration"
run_cmd "systemctl enable qiwhost-api qiwhost-queue qiwhost-frontend" "Enabling panel background services"
run_cmd "systemctl restart qiwhost-api qiwhost-queue qiwhost-frontend" "Triggering start on panel background services"

# Cron scheduling setup
run_cmd "echo '* * * * * www-data cd /opt/qiwhost/panel-api && php8.3 artisan schedule:run >> /dev/null 2>&1' > /etc/cron.d/qiwhost-scheduler" "Adding Laravel cron scheduler task"
run_cmd "echo '0 3 * * * www-data cd /opt/qiwhost/panel-api && php8.3 artisan security:scan --quarantine >> /var/log/qiwhost_security.log 2>&1' > /etc/cron.d/qiwhost-security" "Adding daily security scanning cronjob"
run_cmd "echo '0 0 * * * root certbot renew --quiet' > /etc/cron.d/qiwhost-ssl-renewal" "Adding daily SSL renewal cronjob"

# ==============================================================================
# STEP 18: Configure Firewall (UFW)
# ==============================================================================
step_header "Securing Cluster Network Firewall (UFW)"

run_cmd "ufw --force reset" "Resetting UFW configurations"
run_cmd "ufw default deny incoming" "Setting default incoming traffic to DENY"
run_cmd "ufw default allow outgoing" "Setting default outgoing traffic to ALLOW"

# Standard Ports permissions
run_cmd "ufw allow 22/tcp comment 'SSH'" "Opening SSH Port (22)"
run_cmd "ufw allow 80/tcp comment 'HTTP'" "Opening HTTP Port (80)"
run_cmd "ufw allow 443/tcp comment 'HTTPS'" "Opening HTTPS Port (443)"
run_cmd "ufw allow 3000/tcp comment 'QIWHOST Frontend'" "Opening Frontend Service Port (3000)"
run_cmd "ufw allow 8080/tcp comment 'QIWHOST API'" "Opening Backend API Port (8080)"

# Mail Ports permissions
run_cmd "ufw allow 25/tcp comment 'SMTP'" "Opening SMTP Port (25)"
run_cmd "ufw allow 587/tcp comment 'SMTP Submission'" "Opening SMTP Submission Port (587)"
run_cmd "ufw allow 993/tcp comment 'IMAPS'" "Opening Secure IMAP Port (993)"
run_cmd "ufw allow 995/tcp comment 'POP3S'" "Opening Secure POP3 Port (995)"
run_cmd "ufw allow 143/tcp comment 'IMAP'" "Opening Plain IMAP Port (143)"
run_cmd "ufw allow 110/tcp comment 'POP3'" "Opening Plain POP3 Port (110)"

# Enable UFW
run_cmd "ufw --force enable" "Activating UFW firewall rules"

# ==============================================================================
# STEP 19: Save credentials to secure config
# ==============================================================================
step_header "Saving System Metadata & Credentials"

run_cmd "mkdir -p /etc/qiwhost && chmod 700 /etc/qiwhost" "Creating secure config folders"

SERVER_IP=$(hostname -I | awk '{print $1}')
echo "$SERVER_IP" > /etc/qiwhost/server_ip

cat > "$CONFIG_FILE" << EOF
# QIWHOST Panel Installation Config
# Generated: $(date)
# Keep this file secure!

INSTALL_DATE=$(date)
SERVER_HOSTNAME=$SERVER_HOSTNAME
SERVER_IP=$SERVER_IP
PANEL_VERSION=1.0.0

ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASS
PANEL_DB_NAME=qiwpanel
PANEL_DB_USER=qiwpanel
PANEL_DB_PASSWORD=$PANEL_DB_PASS

ROUNDCUBE_DB_PASSWORD=$ROUNDCUBE_DB_PASS

PANEL_FRONTEND_URL=http://$SERVER_HOSTNAME:3000
PANEL_API_URL=http://$SERVER_HOSTNAME:8080
WEBMAIL_URL=http://$SERVER_HOSTNAME/webmail
EOF

chmod 600 "$CONFIG_FILE"
log_success "All server configuration metadata saved securely to $CONFIG_FILE."

# ==============================================================================
# STEP 20: Final verification & Summary
# ==============================================================================
step_header "Post-Installation Services Diagnostics"

check_service() {
    if systemctl is-active --quiet "$1"; then
        echo -e "  ${GREEN}✓${NC} $1 is active & running"
    else
        echo -e "  ${RED}✗${NC} $1 is ${RED}NOT${NC} running"
    fi
}

# Set official service name directly in diagnostics
OLS_SERVICE="lshttpd"

echo -e "\nPerforming service status telemetry check...\n"
check_service "$OLS_SERVICE"
check_service mysql
check_service redis-server
check_service postfix
check_service dovecot
check_service opendkim
check_service qiwhost-api
check_service qiwhost-frontend
check_service qiwhost-queue

echo -e "\n"
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║            QIWHOST Panel Installation Complete!              ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║  Panel URL:      ${YELLOW}http://$SERVER_HOSTNAME:3000${CYAN}               ║${NC}"
echo -e "${CYAN}║  Panel API:      ${YELLOW}http://$SERVER_HOSTNAME:8080${CYAN}               ║${NC}"
echo -e "${CYAN}║  Webmail:        ${YELLOW}http://$SERVER_HOSTNAME/webmail${CYAN}            ║${NC}"
echo -e "${CYAN}║  phpMyAdmin:     ${YELLOW}http://$SERVER_HOSTNAME/phpmyadmin${CYAN}         ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Admin Email:    ${GREEN}$ADMIN_EMAIL${CYAN}                               ║${NC}"
echo -e "${CYAN}║  Admin Password: ${GREEN}$ADMIN_PASSWORD${CYAN}                            ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Credentials saved to: ${PURPLE}/etc/qiwhost/install.conf${CYAN}            ║${NC}"
echo -e "${CYAN}║  Install log:          ${PURPLE}/var/log/qiwhost_install.log${CYAN}         ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║  ${RED}IMPORTANT: Save your admin password now!${CYAN}                   ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Nameservers to configure at your domain registrar:"
echo -e "  NS1: ns1.node1.qiwhost.com → $SERVER_IP"
echo -e "  NS2: ns2.node1.qiwhost.com → $SERVER_IP"
echo ""

log_success "QIWHOST Panel Installation has successfully completed!"
