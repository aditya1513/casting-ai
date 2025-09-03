#!/bin/bash

# CastMatch Database Backup Script
# This script performs automated PostgreSQL backups with retention management

set -euo pipefail

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_TYPE="${1:-scheduled}" # scheduled, manual, or pre-deployment
BACKUP_DIR="/var/backups/postgres"
S3_BUCKET="${S3_BACKUP_BUCKET}"
AWS_REGION="${AWS_REGION:-us-east-1}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="castmatch_${ENVIRONMENT}_${BACKUP_TYPE}_${TIMESTAMP}"

# Database connection details from AWS Secrets Manager
SECRET_NAME="castmatch-${ENVIRONMENT}-db-master-password"
DB_CREDENTIALS=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "$AWS_REGION" --query SecretString --output text)
DB_HOST=$(echo "$DB_CREDENTIALS" | jq -r '.host')
DB_PORT=$(echo "$DB_CREDENTIALS" | jq -r '.port')
DB_NAME=$(echo "$DB_CREDENTIALS" | jq -r '.dbname')
DB_USER=$(echo "$DB_CREDENTIALS" | jq -r '.username')
DB_PASSWORD=$(echo "$DB_CREDENTIALS" | jq -r '.password')

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/database-backup.log
}

# Error handling
error_exit() {
    log "ERROR: $1"
    # Send alert to monitoring system
    aws sns publish \
        --topic-arn "${SNS_ALERT_TOPIC}" \
        --subject "Database Backup Failed - ${ENVIRONMENT}" \
        --message "Backup failed at $(date): $1" \
        --region "$AWS_REGION" 2>/dev/null || true
    exit 1
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "Starting ${BACKUP_TYPE} backup for ${ENVIRONMENT} environment"

# Perform database backup
log "Backing up database ${DB_NAME} from ${DB_HOST}"

export PGPASSWORD="$DB_PASSWORD"

# Use pg_dump with custom format for better compression and parallel restore
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -Fc \
    -v \
    --no-owner \
    --no-acl \
    -f "${BACKUP_DIR}/${BACKUP_NAME}.dump" 2>&1 | tee -a /var/log/database-backup.log || error_exit "pg_dump failed"

# Compress the backup
log "Compressing backup"
gzip -9 "${BACKUP_DIR}/${BACKUP_NAME}.dump"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.dump.gz"

# Calculate backup size and checksum
BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
BACKUP_CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)

log "Backup completed. Size: $(numfmt --to=iec-i --suffix=B $BACKUP_SIZE), Checksum: $BACKUP_CHECKSUM"

# Upload to S3 with server-side encryption
log "Uploading backup to S3"
aws s3 cp "$BACKUP_FILE" \
    "s3://${S3_BUCKET}/database-backups/${ENVIRONMENT}/${BACKUP_TYPE}/${BACKUP_NAME}.dump.gz" \
    --sse aws:kms \
    --metadata "checksum=${BACKUP_CHECKSUM},size=${BACKUP_SIZE},type=${BACKUP_TYPE}" \
    --storage-class STANDARD_IA \
    --region "$AWS_REGION" || error_exit "S3 upload failed"

# Create backup metadata
cat > "${BACKUP_DIR}/${BACKUP_NAME}.metadata.json" <<EOF
{
    "backup_name": "${BACKUP_NAME}",
    "environment": "${ENVIRONMENT}",
    "type": "${BACKUP_TYPE}",
    "timestamp": "${TIMESTAMP}",
    "database": {
        "host": "${DB_HOST}",
        "port": ${DB_PORT},
        "name": "${DB_NAME}"
    },
    "backup": {
        "size_bytes": ${BACKUP_SIZE},
        "checksum": "${BACKUP_CHECKSUM}",
        "compression": "gzip",
        "format": "custom"
    },
    "s3": {
        "bucket": "${S3_BUCKET}",
        "key": "database-backups/${ENVIRONMENT}/${BACKUP_TYPE}/${BACKUP_NAME}.dump.gz"
    }
}
EOF

# Upload metadata
aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.metadata.json" \
    "s3://${S3_BUCKET}/database-backups/${ENVIRONMENT}/${BACKUP_TYPE}/${BACKUP_NAME}.metadata.json" \
    --region "$AWS_REGION"

# Clean up local backup files older than 7 days
log "Cleaning up old local backups"
find "$BACKUP_DIR" -name "*.dump.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.metadata.json" -mtime +7 -delete

# Clean up S3 backups based on retention policy
log "Managing S3 backup retention (${RETENTION_DAYS} days)"

# Keep daily backups for 7 days
aws s3api list-objects-v2 \
    --bucket "$S3_BUCKET" \
    --prefix "database-backups/${ENVIRONMENT}/scheduled/" \
    --query "Contents[?LastModified<='$(date -d "${RETENTION_DAYS} days ago" -Iseconds)'].Key" \
    --output text | xargs -n1 -I{} aws s3 rm "s3://${S3_BUCKET}/{}"

# For production, also create a monthly archive
if [[ "$ENVIRONMENT" == "production" ]] && [[ $(date +%d) == "01" ]]; then
    log "Creating monthly archive"
    MONTHLY_NAME="castmatch_${ENVIRONMENT}_monthly_$(date +%Y%m)"
    aws s3 cp "$BACKUP_FILE" \
        "s3://${S3_BUCKET}/database-backups/${ENVIRONMENT}/monthly/${MONTHLY_NAME}.dump.gz" \
        --sse aws:kms \
        --storage-class GLACIER \
        --region "$AWS_REGION"
fi

# Verify backup integrity
log "Verifying backup integrity"
pg_restore --list "${BACKUP_DIR}/${BACKUP_NAME}.dump.gz" > /dev/null 2>&1 || error_exit "Backup verification failed"

# Send success notification
if [[ "$BACKUP_TYPE" == "scheduled" ]]; then
    aws cloudwatch put-metric-data \
        --namespace "CastMatch/Backup" \
        --metric-name "BackupSuccess" \
        --value 1 \
        --dimensions Environment="${ENVIRONMENT}",Type="${BACKUP_TYPE}" \
        --region "$AWS_REGION"
    
    aws cloudwatch put-metric-data \
        --namespace "CastMatch/Backup" \
        --metric-name "BackupSize" \
        --value "$BACKUP_SIZE" \
        --unit Bytes \
        --dimensions Environment="${ENVIRONMENT}",Type="${BACKUP_TYPE}" \
        --region "$AWS_REGION"
fi

log "Backup completed successfully"

# Cleanup
unset PGPASSWORD
rm -f "$BACKUP_FILE"
rm -f "${BACKUP_DIR}/${BACKUP_NAME}.metadata.json"

exit 0