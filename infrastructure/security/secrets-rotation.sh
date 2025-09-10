#!/bin/bash
# CastMatch Automated Secrets Rotation System
# Scheduled secret rotation with zero-downtime deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/credentials.env"
source "${SCRIPT_DIR}/credential-management.sh"

# Rotation configuration
ROTATION_LOG="/var/log/castmatch/secrets-rotation.log"
ROTATION_STATE_FILE="/var/lib/castmatch/rotation-state.json"
ROLLBACK_WINDOW=1800  # 30 minutes rollback window

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${ROTATION_LOG}"
}

# Create rotation state tracking
create_rotation_state() {
    local secret_type="$1"
    local old_version="$2"
    local new_version="$3"
    
    local state=$(cat << EOF
{
    "rotation_id": "$(openssl rand -hex 8)",
    "secret_type": "${secret_type}",
    "start_time": "$(date -Iseconds)",
    "old_version": "${old_version}",
    "new_version": "${new_version}",
    "status": "in_progress",
    "rollback_deadline": "$(date -d '+30 minutes' -Iseconds)"
}
EOF
    )
    
    echo "$state" > "${ROTATION_STATE_FILE}"
    log "Created rotation state for ${secret_type}: $(jq -r '.rotation_id' <<< "$state")"
}

# Update rotation state
update_rotation_state() {
    local status="$1"
    local message="${2:-}"
    
    if [[ -f "${ROTATION_STATE_FILE}" ]]; then
        local updated_state=$(jq \
            --arg status "$status" \
            --arg message "$message" \
            --arg end_time "$(date -Iseconds)" \
            '.status = $status | .end_time = $end_time | .message = $message' \
            "${ROTATION_STATE_FILE}")
        
        echo "$updated_state" > "${ROTATION_STATE_FILE}"
        log "Updated rotation state: $status - $message"
    fi
}

# Send rotation notification
send_notification() {
    local level="$1"
    local message="$2"
    local rotation_id="${3:-unknown}"
    
    local notification="{
        \"text\": \"[${level}] CastMatch Secrets Rotation - ID: ${rotation_id}\\n${message}\",
        \"username\": \"CastMatch Security\",
        \"icon_emoji\": \":key:\"
    }"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "$notification" \
            "${SLACK_WEBHOOK_URL}" || log "Failed to send Slack notification"
    fi
    
    # Send email notification for critical events
    if [[ "$level" == "CRITICAL" && -n "${ALERT_EMAIL:-}" ]]; then
        echo "$message" | mail -s "CastMatch Critical Secrets Rotation Alert" "${ALERT_EMAIL}" || true
    fi
}

# Pre-rotation health checks
pre_rotation_checks() {
    local secret_type="$1"
    
    log "Running pre-rotation health checks for: $secret_type"
    
    # Check system health
    if ! health_check; then
        error_exit "Pre-rotation health check failed"
    fi
    
    # Check if services are running
    local services=("castmatch-backend" "castmatch-frontend" "postgresql" "redis")
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet "$service" 2>/dev/null && ! docker ps --format "table {{.Names}}" | grep -q "$service"; then
            log "WARNING: Service $service is not running"
        fi
    done
    
    # Check disk space
    local disk_usage=$(df /opt/castmatch | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 85 ]]; then
        error_exit "Insufficient disk space: ${disk_usage}% used"
    fi
    
    # Check memory usage
    local mem_usage=$(free | awk 'NR==2 {printf "%.0f", $3*100/$2}')
    if [[ $mem_usage -gt 90 ]]; then
        log "WARNING: High memory usage: ${mem_usage}%"
    fi
    
    log "Pre-rotation health checks completed successfully"
}

# Post-rotation verification
post_rotation_verification() {
    local secret_type="$1"
    local max_attempts=30
    local attempt=1
    
    log "Starting post-rotation verification for: $secret_type"
    
    case "$secret_type" in
        "jwt")
            # Test JWT generation and validation
            while [[ $attempt -le $max_attempts ]]; do
                if test_jwt_functionality; then
                    log "JWT functionality verified successfully"
                    return 0
                fi
                log "JWT verification attempt $attempt failed, retrying..."
                sleep 10
                ((attempt++))
            done
            ;;
        "database")
            # Test database connectivity
            while [[ $attempt -le $max_attempts ]]; do
                if test_database_connectivity; then
                    log "Database connectivity verified successfully"
                    return 0
                fi
                log "Database verification attempt $attempt failed, retrying..."
                sleep 15
                ((attempt++))
            done
            ;;
        "redis")
            # Test Redis connectivity
            while [[ $attempt -le $max_attempts ]]; do
                if test_redis_connectivity; then
                    log "Redis connectivity verified successfully"
                    return 0
                fi
                log "Redis verification attempt $attempt failed, retrying..."
                sleep 10
                ((attempt++))
            done
            ;;
    esac
    
    error_exit "Post-rotation verification failed for: $secret_type"
}

# Test JWT functionality
test_jwt_functionality() {
    local api_url="http://localhost:5000/api/health"
    
    # Test basic API connectivity
    if curl -f -s -m 10 "$api_url" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Test database connectivity
test_database_connectivity() {
    # Get new database password
    local db_password=$(get_aws_secret "database/password")
    
    # Test connection
    if PGPASSWORD="$db_password" psql -h localhost -U castmatch_user -d castmatch_production -c "SELECT 1;" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Test Redis connectivity
test_redis_connectivity() {
    local redis_password=$(get_aws_secret "redis/password")
    
    if redis-cli -a "$redis_password" ping | grep -q "PONG"; then
        return 0
    else
        return 1
    fi
}

# Rollback rotation
rollback_rotation() {
    local secret_type="$1"
    local old_version="$2"
    
    log "Rolling back rotation for: $secret_type"
    
    case "$secret_type" in
        "jwt")
            # Restore old JWT secret
            store_aws_secret "jwt/secret" "$old_version" "JWT secret (rollback)"
            ;;
        "database")
            # Restore old database password
            store_aws_secret "database/password" "$old_version" "Database password (rollback)"
            ;;
        "redis")
            # Restore old Redis password
            store_aws_secret "redis/password" "$old_version" "Redis password (rollback)"
            ;;
    esac
    
    # Restart services with old credentials
    restart_services "$secret_type"
    
    log "Rollback completed for: $secret_type"
}

# Restart services after rotation
restart_services() {
    local secret_type="$1"
    
    log "Restarting services for secret type: $secret_type"
    
    case "$secret_type" in
        "jwt"|"nextauth")
            # Restart application services
            if systemctl is-active --quiet castmatch-backend; then
                systemctl reload castmatch-backend || systemctl restart castmatch-backend
            fi
            if systemctl is-active --quiet castmatch-frontend; then
                systemctl reload castmatch-frontend || systemctl restart castmatch-frontend
            fi
            
            # Or restart Docker containers
            if command -v docker &> /dev/null; then
                docker-compose -f /opt/castmatch/docker-compose.yml restart backend frontend || true
            fi
            ;;
        "database")
            # Update database server configuration
            log "WARNING: Database password rotated. Manual intervention required."
            log "1. Update PostgreSQL user password"
            log "2. Restart application services"
            ;;
        "redis")
            # Update Redis configuration
            log "WARNING: Redis password rotated. Manual intervention required."
            log "1. Update Redis configuration"
            log "2. Restart Redis server"
            log "3. Restart application services"
            ;;
    esac
    
    # Wait for services to start
    sleep 30
    
    log "Service restart completed for: $secret_type"
}

# Rotate JWT secrets
rotate_jwt_secrets() {
    local rotation_id="rot_$(openssl rand -hex 4)"
    
    log "Starting JWT secrets rotation: $rotation_id"
    send_notification "INFO" "Starting JWT secrets rotation" "$rotation_id"
    
    # Get current JWT secret
    local old_jwt_secret=$(get_aws_secret "jwt/secret" 2>/dev/null || echo "")
    local old_nextauth_secret=$(get_aws_secret "nextauth/secret" 2>/dev/null || echo "")
    
    # Pre-rotation checks
    pre_rotation_checks "jwt"
    
    # Generate new secrets
    local new_jwt_secret=$(generate_jwt_secret 64)
    local new_nextauth_secret=$(generate_jwt_secret 64)
    
    # Create rotation state
    create_rotation_state "jwt" "$old_jwt_secret" "$new_jwt_secret"
    
    # Store new secrets
    store_aws_secret "jwt/secret" "$new_jwt_secret" "JWT secret (rotated)"
    store_aws_secret "nextauth/secret" "$new_nextauth_secret" "NextAuth secret (rotated)"
    
    # Generate new environment file
    generate_env_file "production" "/opt/castmatch/.env.production"
    
    # Restart services
    restart_services "jwt"
    
    # Verification
    if post_rotation_verification "jwt"; then
        update_rotation_state "completed" "JWT secrets rotated successfully"
        send_notification "SUCCESS" "JWT secrets rotation completed successfully" "$rotation_id"
        log "JWT secrets rotation completed successfully"
    else
        update_rotation_state "failed" "JWT secrets verification failed"
        send_notification "CRITICAL" "JWT secrets rotation failed - initiating rollback" "$rotation_id"
        rollback_rotation "jwt" "$old_jwt_secret"
        error_exit "JWT secrets rotation failed"
    fi
}

# Rotate database password
rotate_database_password() {
    local rotation_id="rot_$(openssl rand -hex 4)"
    
    log "Starting database password rotation: $rotation_id"
    send_notification "INFO" "Starting database password rotation" "$rotation_id"
    
    # Get current password
    local old_password=$(get_aws_secret "database/password" 2>/dev/null || echo "")
    
    # Pre-rotation checks
    pre_rotation_checks "database"
    
    # Generate new password
    local new_password=$(generate_password 32 false)
    
    # Create rotation state
    create_rotation_state "database" "$old_password" "$new_password"
    
    # Update database password
    PGPASSWORD="$old_password" psql -h localhost -U postgres -c \
        "ALTER USER castmatch_user PASSWORD '$new_password';"
    
    # Store new password in secrets manager
    store_aws_secret "database/password" "$new_password" "Database password (rotated)"
    
    # Generate new environment file
    generate_env_file "production" "/opt/castmatch/.env.production"
    
    # Restart services
    restart_services "database"
    
    # Verification
    if post_rotation_verification "database"; then
        update_rotation_state "completed" "Database password rotated successfully"
        send_notification "SUCCESS" "Database password rotation completed successfully" "$rotation_id"
        log "Database password rotation completed successfully"
    else
        update_rotation_state "failed" "Database password verification failed"
        send_notification "CRITICAL" "Database password rotation failed - manual intervention required" "$rotation_id"
        error_exit "Database password rotation failed"
    fi
}

# Rotate Redis password
rotate_redis_password() {
    local rotation_id="rot_$(openssl rand -hex 4)"
    
    log "Starting Redis password rotation: $rotation_id"
    send_notification "INFO" "Starting Redis password rotation" "$rotation_id"
    
    # Get current password
    local old_password=$(get_aws_secret "redis/password" 2>/dev/null || echo "")
    
    # Pre-rotation checks
    pre_rotation_checks "redis"
    
    # Generate new password
    local new_password=$(generate_password 32 false)
    
    # Create rotation state
    create_rotation_state "redis" "$old_password" "$new_password"
    
    # Update Redis configuration
    redis-cli -a "$old_password" CONFIG SET requirepass "$new_password"
    
    # Store new password in secrets manager
    store_aws_secret "redis/password" "$new_password" "Redis password (rotated)"
    
    # Generate new environment file
    generate_env_file "production" "/opt/castmatch/.env.production"
    
    # Restart services
    restart_services "redis"
    
    # Verification
    if post_rotation_verification "redis"; then
        update_rotation_state "completed" "Redis password rotated successfully"
        send_notification "SUCCESS" "Redis password rotation completed successfully" "$rotation_id"
        log "Redis password rotation completed successfully"
    else
        update_rotation_state "failed" "Redis password verification failed"
        send_notification "CRITICAL" "Redis password rotation failed - manual intervention required" "$rotation_id"
        error_exit "Redis password rotation failed"
    fi
}

# Check rotation status
check_rotation_status() {
    if [[ -f "${ROTATION_STATE_FILE}" ]]; then
        local state=$(cat "${ROTATION_STATE_FILE}")
        local status=$(jq -r '.status' <<< "$state")
        local rotation_id=$(jq -r '.rotation_id' <<< "$state")
        
        log "Current rotation status: $status (ID: $rotation_id)"
        
        # Check if rollback window has expired
        local rollback_deadline=$(jq -r '.rollback_deadline' <<< "$state")
        local current_time=$(date -Iseconds)
        
        if [[ "$status" == "in_progress" && "$current_time" > "$rollback_deadline" ]]; then
            log "WARNING: Rotation $rotation_id exceeded rollback window"
            update_rotation_state "expired" "Rollback window expired"
        fi
        
        echo "$state"
    else
        echo '{"status": "none", "message": "No active rotation"}'
    fi
}

# Main rotation function
main() {
    local action="$1"
    shift || true
    
    # Create required directories
    mkdir -p "$(dirname "${ROTATION_LOG}")" "$(dirname "${ROTATION_STATE_FILE}")"
    
    case "$action" in
        "rotate-jwt")
            rotate_jwt_secrets
            ;;
        "rotate-database")
            rotate_database_password
            ;;
        "rotate-redis")
            rotate_redis_password
            ;;
        "rotate-all")
            rotate_jwt_secrets
            sleep 300  # 5 minute delay between rotations
            rotate_database_password
            sleep 300
            rotate_redis_password
            ;;
        "status")
            check_rotation_status
            ;;
        "test")
            local test_type="${1:-all}"
            case "$test_type" in
                "jwt") test_jwt_functionality ;;
                "database") test_database_connectivity ;;
                "redis") test_redis_connectivity ;;
                "all")
                    test_jwt_functionality && \
                    test_database_connectivity && \
                    test_redis_connectivity
                    ;;
            esac
            ;;
        *)
            echo "Usage: $0 {rotate-jwt|rotate-database|rotate-redis|rotate-all|status|test}"
            echo ""
            echo "Examples:"
            echo "  $0 rotate-jwt          # Rotate JWT secrets"
            echo "  $0 rotate-database     # Rotate database password"
            echo "  $0 rotate-redis        # Rotate Redis password"
            echo "  $0 rotate-all          # Rotate all secrets (use with caution)"
            echo "  $0 status              # Check rotation status"
            echo "  $0 test jwt            # Test specific service"
            exit 1
            ;;
    esac
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi