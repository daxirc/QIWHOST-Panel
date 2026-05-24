#!/bin/bash

# ==============================================================================
# QIWHOST Panel Updater Script
# ==============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

LOG_FILE="/var/log/qiwhost_update.log"

log_info() {
    echo -e "${CYAN}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

# Root check
if [ "$EUID" -ne 0 ]; then
    log_error "This update script must be run as root."
    exit 1
fi

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         QIWHOST Panel Updater v1.0.0         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
log_info "Initiating system update procedure at $(date)..."

# Step 1: pull latest files
log_info "Fetching latest codebase changes from GitHub repository..."
cd /opt/qiwhost || { log_error "Installation folder /opt/qiwhost not found."; exit 1; }
git pull origin main >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log_error "Failed to pull updates from GitHub. Check $LOG_FILE for details."
    exit 1
fi
log_success "Codebase fetched successfully."

# Step 2: Laravel updates
log_info "Updating backend composer packages and running database migrations..."
cd /opt/qiwhost/panel-api || { log_error "Backend folder not found."; exit 1; }
composer install --no-dev --optimize-autoloader --no-interaction >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log_error "Composer packages install failed."
    exit 1
fi

php artisan migrate --force >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log_error "Laravel database migrations execution failed."
    exit 1
fi

php artisan config:clear >> "$LOG_FILE" 2>&1
php artisan cache:clear >> "$LOG_FILE" 2>&1
php artisan view:clear >> "$LOG_FILE" 2>&1
log_success "Backend framework update and migrations finalized."

# Step 3: Frontend compilation
log_info "Updating and rebuilding Next.js frontend compiled packages..."
cd /opt/qiwhost/panel-frontend || { log_error "Frontend folder not found."; exit 1; }
npm install --production=false >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log_error "Frontend npm install failed."
    exit 1
fi

# Ensure clean build
chown -R root:root /opt/qiwhost/panel-frontend/.next 2>/dev/null || true
chmod -R 777 /opt/qiwhost/panel-frontend/.next 2>/dev/null || true
rm -rf /opt/qiwhost/panel-frontend/.next

npm run build >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log_error "Frontend Next.js production build failed."
    exit 1
fi

chown -R www-data:www-data /opt/qiwhost/panel-frontend
log_success "Frontend packages updated and compiled."

# Step 4: Daemon restarts
log_info "Restarting background systemd processes..."
systemctl restart qiwhost-api qiwhost-frontend qiwhost-queue >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    log_error "Failed to restart panel services via systemd."
    exit 1
fi

log_success "Services restarted successfully."
echo -e "\n${GREEN}======================================================================${NC}"
log_success "QIWHOST Panel has been successfully updated to the latest release!"
echo -e "${GREEN}======================================================================${NC}\n"
