#!/bin/bash

# CastMatch Database Restore Script
# This script performs PostgreSQL database restoration from backups

set -euo pipefail

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
RESTORE_TYPE="${1:-latest}" # latest, specific, or point-in-time
BACKUP_NAME="${2:-}"
RESTORE_DIR="/var/restore/postgres"
S3_BUCKET="${S3_BACKUP_BUCKET}"
AWS_REGION="${AWS_REGION:-us-east-1}"
TARGET_DB="${3:-}" # Optional: restore to different database

# Database connection details from AWS Secrets Manager
SECRET_NAME="castmatch-${ENVIRONMENT}-db-master-password"
DB_CREDENTIALS=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "$AWS_REGION" --query SecretString --output text)
DB_HOST=$(echo "$DB_CREDENTIALS" | jq -r '.host')
DB_PORT=$(echo "$DB_CREDENTIALS" | jq -r '.port')
DB_NAME="${TARGET_DB:-$(echo "$DB_CREDENTIALS" | jq -r '.dbname')}"
DB_USER=$(echo "$DB_CREDENTIALS" | jq -r '.username')
DB_PASSWORD=$(echo "$DB_CREDENTIALS" | jq -r '.password')

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/database-restore.log
}

# Error handling
error_exit() {
    log "ERROR: $1"
    # Send alert to monitoring system
    aws sns publish \
        --topic-arn "${SNS_ALERT_TOPIC}" \
        --subject "Database Restore Failed - ${ENVIRONMENT}" \
        --message "Restore failed at $(date): $1" \
        --region "$AWS_REGION" 2>/dev/null || true
    exit 1
}

# Create restore directory if it doesn't exist
mkdir -p "$RESTORE_DIR"

log "Starting ${RESTORE_TYPE} restore for ${ENVIRONMENT} environment"

# Determine which backup to restore
if [[ "$RESTORE_TYPE" == "latest" ]]; then
    log "Finding latest backup"
    BACKUP_KEY=$(aws s3api list-objects-v2 \
        --bucket "$S3_BUCKET" \
        --prefix "database-backups/${ENVIRONMENT}/scheduled/" \
        --query 'sort_by(Contents[?ends_with(Key, `.dump.gz`)], &LastModified)[-1].Key' \
        --output text)
    
    if [[ -z "$BACKUP_KEY" ]]; then
        error_exit "No backups found in S3"
    fi
    
    BACKUP_NAME=$(basename "$BACKUP_KEY" .dump.gz)
    log "Latest backup found: $BACKUP_NAME"
    
elif [[ "$RESTORE_TYPE" == "specific" ]]; then
    if [[ -z "$BACKUP_NAME" ]]; then
        error_exit "Backup name must be specified for specific restore"
    fi
    BACKUP_KEY="database-backups/${ENVIRONMENT}/scheduled/${BACKUP_NAME}.dump.gz"
    
elif [[ "$RESTORE_TYPE" == "point-in-time" ]]; then
    # For point-in-time recovery, use AWS RDS automated backups
    log "Initiating point-in-time recovery"
    RESTORE_TIME="${BACKUP_NAME}" # In this case, BACKUP_NAME contains the timestamp
    
    aws rds restore-db-instance-to-point-in-time \
        --source-db-instance-identifier "castmatch-${ENVIRONMENT}-primary" \
        --target-db-instance-identifier "castmatch-${ENVIRONMENT}-pitr-$(date +%Y%m%d%H%M%S)" \
        --restore-time "$RESTORE_TIME" \
        --region "$AWS_REGION"
    
    log "Point-in-time recovery initiated. Monitor AWS console for progress."
    exit 0
else
    error_exit "Invalid restore type: $RESTORE_TYPE"
fi

# Download backup from S3
log "Downloading backup from S3: $BACKUP_KEY"
aws s3 cp "s3://${S3_BUCKET}/${BACKUP_KEY}" "${RESTORE_DIR}/${BACKUP_NAME}.dump.gz" \
    --region "$AWS_REGION" || error_exit "Failed to download backup from S3"

# Download and verify metadata
aws s3 cp "s3://${S3_BUCKET}/${BACKUP_KEY%.dump.gz}.metadata.json" \
    "${RESTORE_DIR}/${BACKUP_NAME}.metadata.json" \
    --region "$AWS_REGION" 2>/dev/null || log "Warning: Metadata file not found"

# Verify backup integrity
if [[ -f "${RESTORE_DIR}/${BACKUP_NAME}.metadata.json" ]]; then
    EXPECTED_CHECKSUM=$(jq -r '.backup.checksum' "${RESTORE_DIR}/${BACKUP_NAME}.metadata.json")
    ACTUAL_CHECKSUM=$(sha256sum "${RESTORE_DIR}/${BACKUP_NAME}.dump.gz" | cut -d' ' -f1)
    
    if [[ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]]; then
        error_exit "Backup checksum verification failed"
    fi
    log "Backup integrity verified"
fi

# Create restore point before proceeding
log "Creating pre-restore backup"
./database-backup.sh pre-restore || log "Warning: Pre-restore backup failed"

# Confirm restoration
if [[ "${FORCE_RESTORE:-false}" != "true" ]]; then
    read -p "This will restore database ${DB_NAME}. Are you sure? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log "Restore cancelled by user"
        exit 0
    fi
fi

export PGPASSWORD="$DB_PASSWORD"

# Check if database exists and has active connections
log "Checking database status"
ACTIVE_CONNECTIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -c \
    "SELECT count(*) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid != pg_backend_pid();" 2>/dev/null || echo "0")

if [[ "$ACTIVE_CONNECTIONS" -gt 0 ]]; then
    log "Found $ACTIVE_CONNECTIONS active connections to database"
    
    # Terminate active connections
    log "Terminating active connections"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid != pg_backend_pid();" || true
    
    sleep 5
fi

# Drop and recreate database
log "Dropping existing database"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" || error_exit "Failed to drop database"

log "Creating new database"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME} WITH ENCODING='UTF8' LC_COLLATE='en_US.utf8' LC_CTYPE='en_US.utf8';" || error_exit "Failed to create database"

# Restore database
log "Restoring database from backup"
pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -v \
    --no-owner \
    --no-acl \
    --if-exists \
    --clean \
    "${RESTORE_DIR}/${BACKUP_NAME}.dump.gz" 2>&1 | tee -a /var/log/database-restore.log || error_exit "Database restore failed"

# Run post-restore validations
log "Running post-restore validations"

# Check table count
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
log "Restored $TABLE_COUNT tables"

if [[ "$TABLE_COUNT" -eq 0 ]]; then
    error_exit "No tables found after restore"
fi

# Check for critical tables
CRITICAL_TABLES=("users" "projects" "roles" "permissions")
for table in "${CRITICAL_TABLES[@]}"; do
    TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null || echo "f")
    
    if [[ "$TABLE_EXISTS" != "t" ]]; then
        error_exit "Critical table '$table' not found after restore"
    fi
done

# Update sequences
log "Updating sequences"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            schemaname,
            tablename,
            pg_get_serial_sequence(schemaname||'.'||tablename, 'id') as seq
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND pg_get_serial_sequence(schemaname||'.'||tablename, 'id') IS NOT NULL
    LOOP
        EXECUTE format('SELECT setval(%L, COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM %I.%I',
            r.seq, r.schemaname, r.tablename);
    END LOOP;
END\$\$;
EOF

# Run ANALYZE to update statistics
log "Updating database statistics"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;" || log "Warning: ANALYZE failed"

# Send success notification
aws cloudwatch put-metric-data \
    --namespace "CastMatch/Restore" \
    --metric-name "RestoreSuccess" \
    --value 1 \
    --dimensions Environment="${ENVIRONMENT}",Type="${RESTORE_TYPE}" \
    --region "$AWS_REGION"

log "Database restore completed successfully"

# Cleanup
unset PGPASSWORD
rm -f "${RESTORE_DIR}/${BACKUP_NAME}.dump.gz"
rm -f "${RESTORE_DIR}/${BACKUP_NAME}.metadata.json"

# Notify applications to reconnect
if [[ -n "${APPLICATION_RESTART_COMMAND:-}" ]]; then
    log "Restarting application"
    eval "$APPLICATION_RESTART_COMMAND"
fi

log "Restore process completed. Database ${DB_NAME} is ready for use."

exit 0