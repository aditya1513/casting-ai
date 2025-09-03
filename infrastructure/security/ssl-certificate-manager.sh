#!/bin/bash

################################################################################
# CastMatch SSL Certificate Management Script
# Version: 2.0
# Description: Automated SSL certificate management using Let's Encrypt with
#              auto-renewal, monitoring, and multi-domain support
################################################################################

set -euo pipefail

# Configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly CERTBOT_DIR="/etc/letsencrypt"
readonly NGINX_DIR="/etc/nginx"
readonly LOG_DIR="/var/log/castmatch"
readonly LOG_FILE="${LOG_DIR}/ssl_management_$(date +%Y%m%d).log"

# Domain configuration
declare -A DOMAIN_CONFIG=(
    ["production"]="castmatch.com www.castmatch.com api.castmatch.com app.castmatch.com"
    ["staging"]="staging.castmatch.com api-staging.castmatch.com app-staging.castmatch.com"
    ["development"]="dev.castmatch.com api-dev.castmatch.com app-dev.castmatch.com"
)

# Certificate configuration
readonly CERT_EMAIL="ssl-admin@castmatch.com"
readonly KEY_SIZE="4096"
readonly RENEWAL_DAYS="30"

# Cloudflare API for DNS validation
readonly CF_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
readonly CF_ZONE_ID="${CLOUDFLARE_ZONE_ID}"

################################################################################
# Logging Functions
################################################################################

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$1] ${*:2}" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }

send_notification() {
    local severity="$1"
    local message="$2"
    
    # Send to Slack
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        local color="good"
        [[ "$severity" == "error" ]] && color="danger"
        [[ "$severity" == "warning" ]] && color="warning"
        
        curl -X POST "${SLACK_WEBHOOK}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"title\": \"SSL Certificate Management\",
                    \"text\": \"${message}\",
                    \"footer\": \"${HOSTNAME}\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || true
    fi
}

################################################################################
# Certificate Management Functions
################################################################################

install_certbot() {
    log_info "Installing/updating Certbot..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx python3-certbot-dns-cloudflare
        # RHEL/CentOS/Amazon Linux
        elif command -v yum &> /dev/null; then
            yum install -y epel-release
            yum install -y certbot python3-certbot-nginx
            pip3 install certbot-dns-cloudflare
        fi
    fi
    
    # Install Cloudflare plugin
    pip3 install --upgrade certbot-dns-cloudflare
    
    log_success "Certbot installation completed"
}

setup_cloudflare_credentials() {
    log_info "Setting up Cloudflare credentials..."
    
    local cf_creds_file="${CERTBOT_DIR}/cloudflare.ini"
    
    cat > "$cf_creds_file" <<EOF
# Cloudflare API credentials for CastMatch
dns_cloudflare_api_token = ${CF_API_TOKEN}
EOF
    
    chmod 600 "$cf_creds_file"
    log_success "Cloudflare credentials configured"
}

request_certificate() {
    local environment="$1"
    local domains="${DOMAIN_CONFIG[$environment]}"
    
    log_info "Requesting certificate for ${environment} environment"
    log_info "Domains: ${domains}"
    
    # Build domain arguments
    local domain_args=""
    for domain in $domains; do
        domain_args="${domain_args} -d ${domain}"
    done
    
    # Request certificate using DNS challenge (works with wildcard domains)
    certbot certonly \
        --dns-cloudflare \
        --dns-cloudflare-credentials "${CERTBOT_DIR}/cloudflare.ini" \
        --email "$CERT_EMAIL" \
        --agree-tos \
        --non-interactive \
        --expand \
        --rsa-key-size "$KEY_SIZE" \
        --cert-name "castmatch-${environment}" \
        $domain_args \
        2>&1 | tee -a "$LOG_FILE"
    
    if [[ $? -eq 0 ]]; then
        log_success "Certificate obtained successfully for ${environment}"
        send_notification "success" "New SSL certificate issued for ${environment} environment"
        return 0
    else
        log_error "Failed to obtain certificate for ${environment}"
        send_notification "error" "Failed to obtain SSL certificate for ${environment}"
        return 1
    fi
}

renew_certificates() {
    log_info "Checking certificates for renewal..."
    
    # Dry run first
    certbot renew --dry-run 2>&1 | tee -a "$LOG_FILE"
    
    if [[ $? -eq 0 ]]; then
        log_info "Attempting certificate renewal..."
        
        # Actual renewal
        certbot renew \
            --deploy-hook "/usr/local/bin/castmatch-ssl-deploy.sh" \
            --pre-hook "systemctl stop nginx" \
            --post-hook "systemctl start nginx" \
            2>&1 | tee -a "$LOG_FILE"
        
        if [[ $? -eq 0 ]]; then
            log_success "Certificate renewal completed"
            
            # Check which certificates were renewed
            local renewed_certs=$(grep "Congratulations" "$LOG_FILE" | wc -l)
            if [[ $renewed_certs -gt 0 ]]; then
                send_notification "success" "${renewed_certs} certificate(s) renewed successfully"
            fi
        else
            log_error "Certificate renewal failed"
            send_notification "error" "Certificate renewal failed - manual intervention required"
            return 1
        fi
    else
        log_error "Certificate renewal dry-run failed"
        return 1
    fi
}

deploy_certificate() {
    local environment="$1"
    local cert_name="castmatch-${environment}"
    
    log_info "Deploying certificate for ${environment}..."
    
    # Certificate paths
    local cert_path="${CERTBOT_DIR}/live/${cert_name}/fullchain.pem"
    local key_path="${CERTBOT_DIR}/live/${cert_name}/privkey.pem"
    
    # Verify certificate exists
    if [[ ! -f "$cert_path" ]] || [[ ! -f "$key_path" ]]; then
        log_error "Certificate files not found for ${environment}"
        return 1
    fi
    
    # Update NGINX configuration
    update_nginx_config "$environment" "$cert_path" "$key_path"
    
    # Copy to application servers (if needed)
    if [[ "$environment" == "production" ]]; then
        deploy_to_servers "$cert_path" "$key_path"
    fi
    
    # Update load balancer certificates (AWS ALB/NLB)
    update_load_balancer_cert "$environment" "$cert_path" "$key_path"
    
    log_success "Certificate deployed for ${environment}"
}

update_nginx_config() {
    local environment="$1"
    local cert_path="$2"
    local key_path="$3"
    
    log_info "Updating NGINX configuration..."
    
    local nginx_config="${NGINX_DIR}/sites-available/castmatch-${environment}"
    
    # Backup current configuration
    cp "$nginx_config" "${nginx_config}.backup.$(date +%Y%m%d)"
    
    # Update SSL certificate paths
    sed -i "s|ssl_certificate .*|ssl_certificate ${cert_path};|g" "$nginx_config"
    sed -i "s|ssl_certificate_key .*|ssl_certificate_key ${key_path};|g" "$nginx_config"
    
    # Test NGINX configuration
    nginx -t 2>&1 | tee -a "$LOG_FILE"
    
    if [[ $? -eq 0 ]]; then
        # Reload NGINX
        systemctl reload nginx
        log_success "NGINX configuration updated and reloaded"
    else
        # Restore backup
        cp "${nginx_config}.backup.$(date +%Y%m%d)" "$nginx_config"
        log_error "NGINX configuration test failed, restored backup"
        return 1
    fi
}

deploy_to_servers() {
    local cert_path="$1"
    local key_path="$2"
    
    log_info "Deploying certificates to application servers..."
    
    # List of application servers
    local servers=(
        "app-server-1.castmatch.internal"
        "app-server-2.castmatch.internal"
        "app-server-3.castmatch.internal"
    )
    
    for server in "${servers[@]}"; do
        log_info "Deploying to ${server}..."
        
        # Copy certificate files
        scp "$cert_path" "ubuntu@${server}:/etc/ssl/certs/castmatch.crt"
        scp "$key_path" "ubuntu@${server}:/etc/ssl/private/castmatch.key"
        
        # Restart application
        ssh "ubuntu@${server}" "sudo systemctl restart castmatch-app"
        
        log_success "Deployed to ${server}"
    done
}

update_load_balancer_cert() {
    local environment="$1"
    local cert_path="$2"
    local key_path="$3"
    
    log_info "Updating AWS load balancer certificate..."
    
    # Upload certificate to AWS Certificate Manager
    local cert_arn=$(aws acm import-certificate \
        --certificate fileb://"$cert_path" \
        --private-key fileb://"$key_path" \
        --certificate-chain fileb://"${CERTBOT_DIR}/live/castmatch-${environment}/chain.pem" \
        --tags "Key=Environment,Value=${environment}" "Key=ManagedBy,Value=CastMatch" \
        --region us-west-2 \
        --query 'CertificateArn' \
        --output text)
    
    if [[ -n "$cert_arn" ]]; then
        log_info "Certificate uploaded to ACM: ${cert_arn}"
        
        # Update ALB listener
        local listener_arn=$(aws elbv2 describe-listeners \
            --load-balancer-arn "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/castmatch-${environment}/abc123" \
            --query 'Listeners[?Port==`443`].ListenerArn' \
            --output text)
        
        aws elbv2 modify-listener \
            --listener-arn "$listener_arn" \
            --certificates "CertificateArn=${cert_arn}"
        
        log_success "Load balancer certificate updated"
    else
        log_error "Failed to upload certificate to ACM"
        return 1
    fi
}

################################################################################
# Monitoring Functions
################################################################################

check_certificate_expiry() {
    log_info "Checking certificate expiry dates..."
    
    local warning_days=30
    local critical_days=7
    
    for environment in "${!DOMAIN_CONFIG[@]}"; do
        local cert_name="castmatch-${environment}"
        local cert_path="${CERTBOT_DIR}/live/${cert_name}/cert.pem"
        
        if [[ -f "$cert_path" ]]; then
            local expiry_date=$(openssl x509 -enddate -noout -in "$cert_path" | cut -d= -f2)
            local expiry_epoch=$(date -d "$expiry_date" +%s)
            local current_epoch=$(date +%s)
            local days_remaining=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            log_info "${environment}: Certificate expires in ${days_remaining} days (${expiry_date})"
            
            # Send alerts based on thresholds
            if [[ $days_remaining -lt $critical_days ]]; then
                log_error "CRITICAL: ${environment} certificate expires in ${days_remaining} days!"
                send_notification "error" "CRITICAL: ${environment} SSL certificate expires in ${days_remaining} days!"
            elif [[ $days_remaining -lt $warning_days ]]; then
                log_info "WARNING: ${environment} certificate expires in ${days_remaining} days"
                send_notification "warning" "WARNING: ${environment} SSL certificate expires in ${days_remaining} days"
            fi
            
            # Update Prometheus metrics
            echo "ssl_certificate_expiry_days{environment=\"${environment}\"} ${days_remaining}" \
                >> /var/lib/prometheus/node-exporter/ssl_metrics.prom
        else
            log_error "Certificate not found for ${environment}"
        fi
    done
}

validate_certificate() {
    local domain="$1"
    
    log_info "Validating certificate for ${domain}..."
    
    # Check certificate via openssl
    echo | openssl s_client -servername "$domain" -connect "${domain}:443" 2>/dev/null | \
        openssl x509 -noout -text | grep -E "(Subject:|DNS:)" | tee -a "$LOG_FILE"
    
    # Check SSL Labs grade (optional)
    if command -v ssllabs-scan &> /dev/null; then
        ssllabs-scan --quiet --grade "$domain" | tee -a "$LOG_FILE"
    fi
    
    # Test HTTPS connectivity
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" "https://${domain}")
    if [[ "$http_status" == "200" ]] || [[ "$http_status" == "301" ]] || [[ "$http_status" == "302" ]]; then
        log_success "HTTPS connectivity verified for ${domain} (HTTP ${http_status})"
    else
        log_error "HTTPS connectivity failed for ${domain} (HTTP ${http_status})"
        return 1
    fi
}

################################################################################
# Backup Functions
################################################################################

backup_certificates() {
    log_info "Backing up certificates..."
    
    local backup_dir="/backup/ssl/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Let's Encrypt directory
    tar -czf "${backup_dir}/letsencrypt.tar.gz" "$CERTBOT_DIR" 2>/dev/null
    
    # Encrypt backup
    gpg --encrypt --recipient "$CERT_EMAIL" \
        --output "${backup_dir}/letsencrypt.tar.gz.gpg" \
        "${backup_dir}/letsencrypt.tar.gz"
    
    rm "${backup_dir}/letsencrypt.tar.gz"
    
    # Upload to S3
    aws s3 cp "${backup_dir}/letsencrypt.tar.gz.gpg" \
        "s3://castmatch-backups/ssl-certificates/$(date +%Y/%m/%d)/" \
        --server-side-encryption AES256
    
    log_success "Certificates backed up to S3"
}

################################################################################
# Main Functions
################################################################################

setup_auto_renewal() {
    log_info "Setting up automatic renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/castmatch-ssl-renew.sh <<'EOF'
#!/bin/bash
/usr/local/bin/castmatch-ssl-manager.sh renew
/usr/local/bin/castmatch-ssl-manager.sh check-expiry
/usr/local/bin/castmatch-ssl-manager.sh backup
EOF
    
    chmod +x /usr/local/bin/castmatch-ssl-renew.sh
    
    # Setup cron job for daily renewal check
    cat > /etc/cron.d/castmatch-ssl-renewal <<EOF
# CastMatch SSL Certificate Auto-Renewal
# Check twice daily at 2:30 AM and 2:30 PM
30 2,14 * * * root /usr/local/bin/castmatch-ssl-renew.sh >> ${LOG_DIR}/ssl_renewal.log 2>&1
EOF
    
    # Setup systemd timer (alternative to cron)
    cat > /etc/systemd/system/castmatch-ssl-renewal.service <<EOF
[Unit]
Description=CastMatch SSL Certificate Renewal
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/castmatch-ssl-renew.sh
User=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    cat > /etc/systemd/system/castmatch-ssl-renewal.timer <<EOF
[Unit]
Description=CastMatch SSL Certificate Renewal Timer
Requires=castmatch-ssl-renewal.service

[Timer]
OnCalendar=daily
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    systemctl daemon-reload
    systemctl enable castmatch-ssl-renewal.timer
    systemctl start castmatch-ssl-renewal.timer
    
    log_success "Auto-renewal configured"
}

usage() {
    cat <<EOF
Usage: $SCRIPT_NAME [COMMAND] [OPTIONS]

Commands:
    install             Install Certbot and dependencies
    request [env]       Request new certificate for environment
    renew              Renew all certificates
    deploy [env]       Deploy certificate to servers
    check-expiry       Check certificate expiry dates
    validate [domain]  Validate certificate for domain
    backup             Backup all certificates
    setup-renewal      Setup automatic renewal
    
Options:
    -h, --help         Show this help message
    -v, --verbose      Enable verbose output
    
Examples:
    $SCRIPT_NAME install
    $SCRIPT_NAME request production
    $SCRIPT_NAME renew
    $SCRIPT_NAME check-expiry
    
EOF
}

main() {
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    case "${1:-}" in
        install)
            install_certbot
            setup_cloudflare_credentials
            ;;
        request)
            request_certificate "${2:-production}"
            deploy_certificate "${2:-production}"
            ;;
        renew)
            renew_certificates
            ;;
        deploy)
            deploy_certificate "${2:-production}"
            ;;
        check-expiry)
            check_certificate_expiry
            ;;
        validate)
            validate_certificate "${2:-castmatch.com}"
            ;;
        backup)
            backup_certificates
            ;;
        setup-renewal)
            setup_auto_renewal
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"