#!/bin/bash

################################################################################
# CastMatch Database Automated Backup Script
# Version: 2.0
# Description: Production-grade automated backup with compression, encryption,
#              S3 upload, and monitoring integration
################################################################################

set -euo pipefail

# Load environment variables
source /etc/castmatch/backup.env

# Configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
readonly BACKUP_PREFIX="castmatch_backup"
readonly LOG_FILE="/var/log/castmatch/backup_${TIMESTAMP}.log"
readonly METRICS_FILE="/var/lib/prometheus/node-exporter/backup_metrics.prom"

# Database configurations
declare -A DB_CONFIGS=(
    ["production"]="${DB_HOST_PROD}:${DB_PORT_PROD}:${DB_NAME_PROD}:${DB_USER_PROD}"
    ["staging"]="${DB_HOST_STAGING}:${DB_PORT_STAGING}:${DB_NAME_STAGING}:${DB_USER_STAGING}"
)

# S3 Configuration
readonly S3_BUCKET="${BACKUP_S3_BUCKET}"
readonly S3_PREFIX="${BACKUP_S3_PREFIX:-backups}"
readonly S3_STORAGE_CLASS="${S3_STORAGE_CLASS:-STANDARD_IA}"

# Retention policies (days)
readonly DAILY_RETENTION=7
readonly WEEKLY_RETENTION=28
readonly MONTHLY_RETENTION=365

# Encryption
readonly GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT}"

################################################################################
# Logging Functions
################################################################################

log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$@"
}

log_error() {
    log "ERROR" "$@"
    send_alert "ERROR" "$@"
}

log_success() {
    log "SUCCESS" "$@"
}

################################################################################
# Monitoring Functions
################################################################################

update_metric() {
    local metric_name="$1"
    local value="$2"
    local labels="$3"
    
    cat >> "$METRICS_FILE" <<EOF
# HELP ${metric_name} Database backup metric
# TYPE ${metric_name} gauge
${metric_name}${labels} ${value}
EOF
}

send_alert() {
    local severity="$1"
    local message="$2"
    
    # Send to PagerDuty
    if [[ -n "${PAGERDUTY_KEY:-}" ]]; then
        curl -X POST https://events.pagerduty.com/v2/enqueue \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"${PAGERDUTY_KEY}\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"Database Backup ${severity}: ${message}\",
                    \"severity\": \"$(echo "${severity}" | tr '[:upper:]' '[:lower:]')\",
                    \"source\": \"${HOSTNAME}\",
                    \"component\": \"database-backup\"
                }
            }" 2>/dev/null || true
    fi
    
    # Send to Slack
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        curl -X POST "${SLACK_WEBHOOK}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \":warning: Database Backup ${severity}\",
                \"attachments\": [{
                    \"color\": \"danger\",
                    \"text\": \"${message}\",
                    \"footer\": \"${HOSTNAME}\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || true
    fi
}

################################################################################
# Backup Functions
################################################################################

perform_backup() {
    local env="$1"
    local config="${DB_CONFIGS[$env]}"
    
    IFS=':' read -r host port database user <<< "$config"
    
    local backup_file="${BACKUP_PREFIX}_${env}_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    local encrypted_file="${compressed_file}.gpg"
    local temp_dir="/tmp/backup_${TIMESTAMP}"
    
    log_info "Starting backup for ${env} environment"
    
    # Create temporary directory
    mkdir -p "$temp_dir"
    cd "$temp_dir"
    
    # Start timing
    local start_time=$(date +%s)
    
    # Perform backup with pg_dump
    log_info "Dumping database ${database}..."
    
    PGPASSWORD="${!DB_PASS_VAR}" pg_dump \
        --host="$host" \
        --port="$port" \
        --username="$user" \
        --database="$database" \
        --no-password \
        --verbose \
        --format=plain \
        --create \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        --no-tablespaces \
        --no-unlogged-table-data \
        --exclude-table-data='audit_logs' \
        --exclude-table-data='session_tokens' \
        --file="$backup_file" 2>&1 | tee -a "$LOG_FILE"
    
    local backup_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
    log_info "Backup completed. Size: $(numfmt --to=iec-i --suffix=B $backup_size)"
    
    # Compress backup
    log_info "Compressing backup..."
    gzip -9 "$backup_file"
    
    local compressed_size=$(stat -f%z "$compressed_file" 2>/dev/null || stat -c%s "$compressed_file")
    log_info "Compression completed. Size: $(numfmt --to=iec-i --suffix=B $compressed_size)"
    
    # Encrypt backup
    log_info "Encrypting backup..."
    gpg --trust-model always \
        --encrypt \
        --recipient "$GPG_RECIPIENT" \
        --cipher-algo AES256 \
        --compress-algo none \
        --output "$encrypted_file" \
        "$compressed_file"
    
    # Calculate checksum
    local checksum=$(sha256sum "$encrypted_file" | cut -d' ' -f1)
    log_info "Checksum: $checksum"
    
    # Upload to S3
    log_info "Uploading to S3..."
    
    local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${env}/daily/${encrypted_file}"
    
    aws s3 cp "$encrypted_file" "$s3_path" \
        --storage-class "$S3_STORAGE_CLASS" \
        --metadata "checksum=${checksum},timestamp=${TIMESTAMP},environment=${env}" \
        --server-side-encryption AES256 \
        --no-progress 2>&1 | tee -a "$LOG_FILE"
    
    # Create weekly backup (on Sunday)
    if [[ $(date +%u) -eq 7 ]]; then
        local weekly_path="s3://${S3_BUCKET}/${S3_PREFIX}/${env}/weekly/${encrypted_file}"
        aws s3 cp "$s3_path" "$weekly_path" \
            --storage-class "$S3_STORAGE_CLASS" \
            --no-progress 2>&1 | tee -a "$LOG_FILE"
        log_info "Weekly backup created"
    fi
    
    # Create monthly backup (on 1st)
    if [[ $(date +%d) -eq 01 ]]; then
        local monthly_path="s3://${S3_BUCKET}/${S3_PREFIX}/${env}/monthly/${encrypted_file}"
        aws s3 cp "$s3_path" "$monthly_path" \
            --storage-class "GLACIER" \
            --no-progress 2>&1 | tee -a "$LOG_FILE"
        log_info "Monthly backup created"
    fi
    
    # Clean up temporary files
    rm -rf "$temp_dir"
    
    # Calculate metrics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Update Prometheus metrics
    update_metric "database_backup_duration_seconds" "$duration" "{environment=\"${env}\"}"
    update_metric "database_backup_size_bytes" "$backup_size" "{environment=\"${env}\",type=\"raw\"}"
    update_metric "database_backup_size_bytes" "$compressed_size" "{environment=\"${env}\",type=\"compressed\"}"
    update_metric "database_backup_last_success_timestamp" "$end_time" "{environment=\"${env}\"}"
    update_metric "database_backup_status" "1" "{environment=\"${env}\"}"
    
    log_success "Backup completed for ${env} in ${duration} seconds"
    
    return 0
}

################################################################################
# Cleanup Functions
################################################################################

cleanup_old_backups() {
    local env="$1"
    
    log_info "Cleaning up old backups for ${env}..."
    
    # Clean daily backups
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${env}/daily/" \
        | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $1}')
        local file_name=$(echo "$line" | awk '{print $4}')
        
        if [[ -n "$file_name" ]]; then
            local age_days=$(( ($(date +%s) - $(date -d "$file_date" +%s)) / 86400 ))
            
            if [[ $age_days -gt $DAILY_RETENTION ]]; then
                log_info "Deleting old daily backup: $file_name (${age_days} days old)"
                aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${env}/daily/${file_name}"
            fi
        fi
    done
    
    # Clean weekly backups
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${env}/weekly/" \
        | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $1}')
        local file_name=$(echo "$line" | awk '{print $4}')
        
        if [[ -n "$file_name" ]]; then
            local age_days=$(( ($(date +%s) - $(date -d "$file_date" +%s)) / 86400 ))
            
            if [[ $age_days -gt $WEEKLY_RETENTION ]]; then
                log_info "Deleting old weekly backup: $file_name (${age_days} days old)"
                aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${env}/weekly/${file_name}"
            fi
        fi
    done
    
    log_info "Cleanup completed for ${env}"
}

################################################################################
# Validation Functions
################################################################################

validate_backup() {
    local env="$1"
    local backup_file="$2"
    
    log_info "Validating backup for ${env}..."
    
    # Download latest backup
    local temp_validate="/tmp/validate_${TIMESTAMP}"
    mkdir -p "$temp_validate"
    
    aws s3 cp "$backup_file" "$temp_validate/" --no-progress
    
    local encrypted_file=$(basename "$backup_file")
    local compressed_file="${encrypted_file%.gpg}"
    local sql_file="${compressed_file%.gz}"
    
    cd "$temp_validate"
    
    # Decrypt
    gpg --decrypt --output "$compressed_file" "$encrypted_file"
    
    # Decompress
    gunzip "$compressed_file"
    
    # Validate SQL syntax (basic check)
    if head -n 100 "$sql_file" | grep -q "PostgreSQL database dump"; then
        log_info "Backup validation successful"
        update_metric "database_backup_validation" "1" "{environment=\"${env}\"}"
    else
        log_error "Backup validation failed for ${env}"
        update_metric "database_backup_validation" "0" "{environment=\"${env}\"}"
        return 1
    fi
    
    # Clean up
    rm -rf "$temp_validate"
    
    return 0
}

################################################################################
# Main Execution
################################################################################

main() {
    log_info "Starting CastMatch database backup process"
    
    # Check prerequisites
    for cmd in pg_dump aws gpg gzip; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command '$cmd' not found"
            exit 1
        fi
    done
    
    # Initialize metrics file
    echo "# Database backup metrics $(date)" > "$METRICS_FILE"
    
    # Determine which environment to backup
    local environments=("${!DB_CONFIGS[@]}")
    
    if [[ $# -gt 0 ]]; then
        environments=("$1")
    fi
    
    local overall_status=0
    
    # Perform backups
    for env in "${environments[@]}"; do
        if perform_backup "$env"; then
            # Validate the backup
            local latest_backup="s3://${S3_BUCKET}/${S3_PREFIX}/${env}/daily/${BACKUP_PREFIX}_${env}_${TIMESTAMP}.sql.gz.gpg"
            validate_backup "$env" "$latest_backup"
            
            # Clean up old backups
            cleanup_old_backups "$env"
        else
            log_error "Backup failed for ${env}"
            update_metric "database_backup_status" "0" "{environment=\"${env}\"}"
            overall_status=1
        fi
    done
    
    # Send success notification if all backups succeeded
    if [[ $overall_status -eq 0 ]]; then
        log_success "All database backups completed successfully"
        
        if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
            curl -X POST "${SLACK_WEBHOOK}" \
                -H 'Content-Type: application/json' \
                -d "{
                    \"text\": \":white_check_mark: Database backups completed successfully\",
                    \"attachments\": [{
                        \"color\": \"good\",
                        \"text\": \"All environments backed up at ${TIMESTAMP}\",
                        \"footer\": \"${HOSTNAME}\"
                    }]
                }" 2>/dev/null || true
        fi
    fi
    
    exit $overall_status
}

# Execute main function
main "$@"