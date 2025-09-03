#!/bin/bash
# CastMatch SSL Certificate Management Script
# Automated SSL certificate provisioning, renewal, and monitoring

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/ssl.env"

# Default values
DOMAIN="${DOMAIN:-app.castmatch.com}"
EMAIL="${EMAIL:-admin@castmatch.com}"
WEBROOT_PATH="${WEBROOT_PATH:-/var/www/html}"
CERT_PATH="${CERT_PATH:-/etc/letsencrypt/live}"
NGINX_CONFIG_PATH="${NGINX_CONFIG_PATH:-/etc/nginx}"
BACKUP_PATH="${BACKUP_PATH:-/opt/castmatch/ssl-backups}"

# Logging
LOG_FILE="/var/log/castmatch/ssl-management.log"
mkdir -p "$(dirname "${LOG_FILE}")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "This script must be run as root"
    fi
}

# Install required packages
install_dependencies() {
    log "Installing SSL certificate dependencies..."
    
    # Update package list
    apt-get update
    
    # Install certbot and nginx
    apt-get install -y certbot python3-certbot-nginx nginx openssl
    
    # Install AWS CLI for backup
    if ! command -v aws &> /dev/null; then
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf aws awscliv2.zip
    fi
    
    log "Dependencies installed successfully"
}

# Generate strong DH parameters
generate_dh_params() {
    local dh_file="/etc/nginx/ssl/dhparam.pem"
    
    if [[ ! -f "${dh_file}" ]]; then
        log "Generating strong DH parameters (this may take several minutes)..."
        mkdir -p "$(dirname "${dh_file}")"
        openssl dhparam -out "${dh_file}" 2048
        chmod 600 "${dh_file}"
        log "DH parameters generated successfully"
    else
        log "DH parameters already exist"
    fi
}

# Obtain SSL certificate using Let's Encrypt
obtain_certificate() {
    local domains=("$@")
    local domain_args=""
    
    for domain in "${domains[@]}"; do
        domain_args="${domain_args} -d ${domain}"
    done
    
    log "Obtaining SSL certificate for domains: ${domains[*]}"
    
    # Stop nginx temporarily
    systemctl stop nginx || log "Nginx not running"
    
    # Obtain certificate
    certbot certonly \
        --standalone \
        --email "${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --preferred-challenges http \
        ${domain_args} \
        || error_exit "Failed to obtain SSL certificate"
    
    log "SSL certificate obtained successfully"
}

# Configure Nginx with SSL
configure_nginx_ssl() {
    local primary_domain="$1"
    local config_file="${NGINX_CONFIG_PATH}/sites-available/castmatch-ssl.conf"
    
    log "Configuring Nginx SSL for ${primary_domain}..."
    
    # Create SSL configuration
    cat > "${config_file}" << EOF
# CastMatch SSL Configuration
# Generated automatically - do not edit manually

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone \$binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone \$binary_remote_addr zone=general:10m rate=50r/m;

# Upstream backends
upstream castmatch_backend {
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream castmatch_frontend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${primary_domain} www.${primary_domain} api.${primary_domain};
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root ${WEBROOT_PATH};
    }
    
    # Redirect all other requests to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${primary_domain} www.${primary_domain};
    
    # SSL Certificate Configuration
    ssl_certificate ${CERT_PATH}/${primary_domain}/fullchain.pem;
    ssl_certificate_key ${CERT_PATH}/${primary_domain}/privkey.pem;
    ssl_trusted_certificate ${CERT_PATH}/${primary_domain}/chain.pem;
    
    # SSL Security Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_dhparam /etc/nginx/ssl/dhparam.pem;
    
    # SSL Session Configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' accounts.google.com apis.google.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: *.googleusercontent.com *.githubusercontent.com; connect-src 'self' api.github.com accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Remove server signature
    server_tokens off;
    
    # Rate limiting
    limit_req zone=general burst=20 nodelay;
    
    # Frontend application
    location / {
        proxy_pass http://castmatch_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}

# API Server Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.${primary_domain};
    
    # SSL Certificate Configuration
    ssl_certificate ${CERT_PATH}/${primary_domain}/fullchain.pem;
    ssl_certificate_key ${CERT_PATH}/${primary_domain}/privkey.pem;
    ssl_trusted_certificate ${CERT_PATH}/${primary_domain}/chain.pem;
    
    # SSL Security Configuration (same as above)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_dhparam /etc/nginx/ssl/dhparam.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers (API-specific)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Remove server signature
    server_tokens off;
    
    # API rate limiting
    limit_req zone=api burst=50 nodelay;
    
    # Authentication endpoints (stricter rate limiting)
    location ~ ^/api/(auth|login|register|password-reset) {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://castmatch_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # General API endpoints
    location /api/ {
        proxy_pass http://castmatch_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Enable CORS for API
        add_header 'Access-Control-Allow-Origin' 'https://${primary_domain}' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Enable the site
    ln -sf "${config_file}" "${NGINX_CONFIG_PATH}/sites-enabled/"
    
    # Test configuration
    nginx -t || error_exit "Nginx configuration test failed"
    
    # Reload Nginx
    systemctl reload nginx
    
    log "Nginx SSL configuration completed"
}

# Renew SSL certificates
renew_certificates() {
    log "Renewing SSL certificates..."
    
    # Run certbot renewal
    certbot renew --quiet --no-self-upgrade || log "Certificate renewal failed or not needed"
    
    # Reload Nginx if certificates were renewed
    if [[ -f "/tmp/certbot-renewed" ]]; then
        systemctl reload nginx
        rm -f "/tmp/certbot-renewed"
        log "Nginx reloaded after certificate renewal"
    fi
    
    # Backup certificates
    backup_certificates
    
    log "Certificate renewal process completed"
}

# Backup SSL certificates
backup_certificates() {
    local backup_dir="${BACKUP_PATH}/$(date '+%Y%m%d_%H%M%S')"
    local s3_bucket="castmatch-ssl-backups"
    
    log "Backing up SSL certificates..."
    
    mkdir -p "${backup_dir}"
    
    # Copy certificates
    if [[ -d "${CERT_PATH}" ]]; then
        cp -r "${CERT_PATH}"/* "${backup_dir}/"
        
        # Create encrypted archive
        tar -czf "${backup_dir}.tar.gz" -C "${backup_dir}" .
        
        # Encrypt archive
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
            --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65011712 \
            --passphrase "${SSL_BACKUP_PASSPHRASE}" --batch --yes \
            --output "${backup_dir}.tar.gz.gpg" "${backup_dir}.tar.gz"
        
        # Upload to S3
        aws s3 cp "${backup_dir}.tar.gz.gpg" "s3://${s3_bucket}/ssl-backups/"
        
        # Cleanup local files
        rm -rf "${backup_dir}" "${backup_dir}.tar.gz"
        
        log "SSL certificate backup completed"
    else
        log "No certificates found to backup"
    fi
}

# Monitor certificate expiry
monitor_certificates() {
    local warning_days=30
    local critical_days=7
    
    log "Monitoring SSL certificate expiry..."
    
    for cert_dir in "${CERT_PATH}"/*; do
        if [[ -d "${cert_dir}" ]]; then
            local domain=$(basename "${cert_dir}")
            local cert_file="${cert_dir}/cert.pem"
            
            if [[ -f "${cert_file}" ]]; then
                local expiry_date=$(openssl x509 -enddate -noout -in "${cert_file}" | cut -d= -f2)
                local expiry_timestamp=$(date -d "${expiry_date}" +%s)
                local current_timestamp=$(date +%s)
                local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [[ ${days_until_expiry} -lt ${critical_days} ]]; then
                    log "CRITICAL: SSL certificate for ${domain} expires in ${days_until_expiry} days!"
                    send_alert "CRITICAL" "${domain}" "${days_until_expiry}"
                elif [[ ${days_until_expiry} -lt ${warning_days} ]]; then
                    log "WARNING: SSL certificate for ${domain} expires in ${days_until_expiry} days"
                    send_alert "WARNING" "${domain}" "${days_until_expiry}"
                else
                    log "SSL certificate for ${domain} is valid for ${days_until_expiry} days"
                fi
            fi
        fi
    done
}

# Send alerts
send_alert() {
    local level="$1"
    local domain="$2"
    local days="$3"
    
    local message="[${level}] SSL certificate for ${domain} expires in ${days} days!"
    
    # Send to Slack if webhook is configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${message}\"}" \
            "${SLACK_WEBHOOK_URL}"
    fi
    
    # Send email if configured
    if [[ -n "${ALERT_EMAIL:-}" ]]; then
        echo "${message}" | mail -s "SSL Certificate Alert - CastMatch" "${ALERT_EMAIL}"
    fi
}

# Security scan
security_scan() {
    local domain="$1"
    
    log "Running SSL security scan for ${domain}..."
    
    # Test SSL configuration using testssl.sh
    if command -v testssl.sh &> /dev/null; then
        testssl.sh --quiet --color 0 "${domain}" > "/tmp/ssl-scan-${domain}.txt"
        
        # Check for critical issues
        if grep -q "CRITICAL\|HIGH" "/tmp/ssl-scan-${domain}.txt"; then
            log "CRITICAL SSL security issues found for ${domain}"
            send_alert "CRITICAL" "${domain}" "SSL Security Issues"
        fi
    else
        log "testssl.sh not installed, skipping security scan"
    fi
    
    # Test certificate chain
    echo | openssl s_client -servername "${domain}" -connect "${domain}:443" 2>/dev/null | \
    openssl x509 -noout -dates
    
    log "SSL security scan completed"
}

# Main function
main() {
    local action="$1"
    shift
    
    check_root
    
    case "$action" in
        "install")
            install_dependencies
            generate_dh_params
            ;;
        "obtain")
            obtain_certificate "$@"
            ;;
        "configure")
            configure_nginx_ssl "$@"
            ;;
        "renew")
            renew_certificates
            ;;
        "backup")
            backup_certificates
            ;;
        "monitor")
            monitor_certificates
            ;;
        "security-scan")
            security_scan "$@"
            ;;
        "setup")
            install_dependencies
            generate_dh_params
            obtain_certificate "$@"
            configure_nginx_ssl "$1"
            ;;
        *)
            echo "Usage: $0 {install|obtain|configure|renew|backup|monitor|security-scan|setup} [domain...]"
            echo ""
            echo "Examples:"
            echo "  $0 install"
            echo "  $0 obtain app.castmatch.com www.castmatch.com api.castmatch.com"
            echo "  $0 configure app.castmatch.com"
            echo "  $0 renew"
            echo "  $0 backup"
            echo "  $0 monitor"
            echo "  $0 security-scan app.castmatch.com"
            echo "  $0 setup app.castmatch.com www.castmatch.com api.castmatch.com"
            exit 1
            ;;
    esac
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi