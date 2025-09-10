#!/bin/bash
# CastMatch Database Backup and Recovery Script
# Production-ready PostgreSQL backup with encryption and compression

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/backup.env"

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-castmatch_production}"
DB_USER="${DB_USER:-castmatch_user}"
BACKUP_DIR="${BACKUP_DIR:-/opt/castmatch/backups}"
S3_BUCKET="${S3_BUCKET:-castmatch-production-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"
mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check dependencies
check_dependencies() {
    local deps=("pg_dump" "pg_restore" "gpg" "aws" "gzip")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error_exit "Required dependency '$dep' not found"
        fi
    done
}

# Create full database backup
create_full_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${BACKUP_DIR}/castmatch_full_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    local encrypted_file="${compressed_file}.gpg"
    
    log "Starting full backup of database: ${DB_NAME}"
    
    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"
    
    # Create database dump
    log "Creating database dump..."
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="${backup_file}" \
        || error_exit "Database dump failed"
    
    # Compress backup
    log "Compressing backup..."
    gzip "${backup_file}" || error_exit "Compression failed"
    
    # Encrypt backup if encryption key is provided
    if [[ -n "${ENCRYPTION_KEY}" ]]; then
        log "Encrypting backup..."
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
            --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65011712 \
            --passphrase "${ENCRYPTION_KEY}" --batch --yes \
            --output "${encrypted_file}" "${compressed_file}" \
            || error_exit "Encryption failed"
        rm "${compressed_file}"
        backup_file="${encrypted_file}"
    else
        backup_file="${compressed_file}"
    fi
    
    # Upload to S3
    log "Uploading backup to S3..."
    aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/full-backups/" \
        --storage-class STANDARD_IA \
        || error_exit "S3 upload failed"
    
    # Verify backup integrity
    verify_backup "${backup_file}"
    
    log "Full backup completed successfully: $(basename "${backup_file}")"
    echo "${backup_file}"
}

# Create incremental backup using WAL files
create_incremental_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local wal_dir="/opt/castmatch/wal-archive"
    local backup_dir="${BACKUP_DIR}/incremental/${timestamp}"
    
    log "Starting incremental backup..."
    mkdir -p "${backup_dir}"
    
    # Copy WAL files
    if [[ -d "${wal_dir}" ]]; then
        cp "${wal_dir}"/*.* "${backup_dir}/" 2>/dev/null || log "No WAL files to backup"
    fi
    
    # Create archive
    tar -czf "${backup_dir}.tar.gz" -C "${backup_dir}" .
    rm -rf "${backup_dir}"
    
    # Upload to S3
    aws s3 cp "${backup_dir}.tar.gz" "s3://${S3_BUCKET}/incremental-backups/" \
        --storage-class STANDARD_IA
    
    log "Incremental backup completed: ${backup_dir}.tar.gz"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    log "Verifying backup integrity..."
    
    if [[ "${backup_file}" == *.gpg ]]; then
        # Decrypt and verify
        gpg --decrypt --batch --yes --passphrase "${ENCRYPTION_KEY}" "${backup_file}" | \
        gunzip | head -n 1 | grep -q "PostgreSQL database dump" \
            || error_exit "Backup verification failed"
    elif [[ "${backup_file}" == *.gz ]]; then
        # Verify compressed file
        gunzip -t "${backup_file}" || error_exit "Backup verification failed"
    else
        # Verify uncompressed file
        head -n 1 "${backup_file}" | grep -q "PostgreSQL database dump" \
            || error_exit "Backup verification failed"
    fi
    
    log "Backup verification passed"
}

# Restore database from backup
restore_database() {
    local backup_file="$1"
    local target_db="${2:-${DB_NAME}_restore_$(date '+%Y%m%d_%H%M%S')}"
    
    log "Starting database restore from: $(basename "${backup_file}")"
    
    # Download from S3 if needed
    if [[ "${backup_file}" =~ ^s3:// ]]; then
        local local_file="${BACKUP_DIR}/$(basename "${backup_file}")"
        aws s3 cp "${backup_file}" "${local_file}"
        backup_file="${local_file}"
    fi
    
    # Decrypt if needed
    local temp_file="${backup_file}"
    if [[ "${backup_file}" == *.gpg ]]; then
        temp_file="${backup_file%.gpg}"
        gpg --decrypt --batch --yes --passphrase "${ENCRYPTION_KEY}" \
            "${backup_file}" > "${temp_file}"
    fi
    
    # Decompress if needed
    if [[ "${temp_file}" == *.gz ]]; then
        local uncompressed_file="${temp_file%.gz}"
        gunzip -c "${temp_file}" > "${uncompressed_file}"
        temp_file="${uncompressed_file}"
    fi
    
    # Create target database
    log "Creating target database: ${target_db}"
    PGPASSWORD="${DB_PASSWORD}" createdb \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        "${target_db}" || log "Database may already exist"
    
    # Restore database
    log "Restoring database..."
    PGPASSWORD="${DB_PASSWORD}" pg_restore \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${target_db}" \
        --verbose \
        --clean \
        --if-exists \
        "${temp_file}" || error_exit "Database restore failed"
    
    # Cleanup temporary files
    [[ "${temp_file}" != "${backup_file}" ]] && rm -f "${temp_file}"
    
    log "Database restore completed successfully: ${target_db}"
}

# Point-in-Time Recovery
point_in_time_recovery() {
    local target_time="$1"
    local base_backup="$2"
    
    log "Starting Point-in-Time Recovery to: ${target_time}"
    
    # Stop PostgreSQL
    systemctl stop postgresql
    
    # Restore base backup
    restore_database "${base_backup}"
    
    # Configure recovery
    cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'cp /opt/castmatch/wal-archive/%f %p'
recovery_target_time = '${target_time}'
recovery_target_timeline = 'latest'
EOF
    
    # Start PostgreSQL
    systemctl start postgresql
    
    log "Point-in-Time Recovery initiated"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    # Local cleanup
    find "${BACKUP_DIR}" -name "*.sql*" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    
    # S3 cleanup (using lifecycle policy is recommended)
    aws s3 ls "s3://${S3_BUCKET}/full-backups/" --recursive | \
    while read -r line; do
        create_date=$(echo "$line" | awk '{print $1" "$2}')
        create_date_timestamp=$(date -d "$create_date" +%s)
        cutoff_timestamp=$(date -d "${RETENTION_DAYS} days ago" +%s)
        
        if [[ $create_date_timestamp -lt $cutoff_timestamp ]]; then
            file_path=$(echo "$line" | awk '{$1=$2=$3=""; print $0}' | sed 's/^ *//')
            aws s3 rm "s3://${S3_BUCKET}/${file_path}"
            log "Deleted old backup: ${file_path}"
        fi
    done
    
    log "Cleanup completed"
}

# Health check
health_check() {
    log "Performing database health check..."
    
    # Check connection
    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -c "SELECT version();" > /dev/null || error_exit "Database connection failed"
    
    # Check disk space
    local disk_usage=$(df "${BACKUP_DIR}" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        log "WARNING: Backup disk usage is at ${disk_usage}%"
    fi
    
    # Check S3 connectivity
    aws s3 ls "s3://${S3_BUCKET}/" > /dev/null || error_exit "S3 connectivity failed"
    
    log "Health check completed successfully"
}

# Main function
main() {
    local action="$1"
    shift
    
    check_dependencies
    
    case "$action" in
        "full-backup")
            create_full_backup "$@"
            ;;
        "incremental-backup")
            create_incremental_backup "$@"
            ;;
        "restore")
            restore_database "$@"
            ;;
        "point-in-time-recovery"|"pitr")
            point_in_time_recovery "$@"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "health-check")
            health_check
            ;;
        "verify")
            verify_backup "$@"
            ;;
        *)
            echo "Usage: $0 {full-backup|incremental-backup|restore|point-in-time-recovery|cleanup|health-check|verify}"
            echo ""
            echo "Examples:"
            echo "  $0 full-backup"
            echo "  $0 incremental-backup"
            echo "  $0 restore /path/to/backup.sql.gz"
            echo "  $0 point-in-time-recovery '2024-01-01 12:00:00' /path/to/base/backup.sql"
            echo "  $0 cleanup"
            echo "  $0 health-check"
            echo "  $0 verify /path/to/backup.sql.gz"
            exit 1
            ;;
    esac
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi