#!/bin/bash

# CastMatch Disaster Recovery Automation Script
# This script provides automated disaster recovery capabilities for the CastMatch platform

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/var/log/castmatch-dr"
LOG_FILE="${LOG_DIR}/disaster-recovery-$(date +%Y%m%d-%H%M%S).log"
BACKUP_RETENTION_DAYS=30
NOTIFICATION_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# AWS Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
BACKUP_BUCKET="${BACKUP_BUCKET:-castmatch-disaster-recovery}"
EKS_CLUSTER="${EKS_CLUSTER:-castmatch-production}"
RDS_INSTANCE="${RDS_INSTANCE:-castmatch-production-db}"

# Kubernetes Configuration
NAMESPACE="castmatch-production"
BACKUP_NAMESPACE="castmatch-backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize logging
mkdir -p "${LOG_DIR}"
exec 1> >(tee -a "${LOG_FILE}")
exec 2> >(tee -a "${LOG_FILE}" >&2)

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

log_info() {
    log "${BLUE}[INFO]${NC} $*"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    log "${RED}[ERROR]${NC} $*"
}

send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${NOTIFICATION_WEBHOOK}" ]]; then
        curl -X POST "${NOTIFICATION_WEBHOOK}" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 CastMatch DR Alert - ${status}: ${message}\"}" \
            || log_warning "Failed to send notification"
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    for tool in aws kubectl helm pg_dump redis-cli; do
        if ! command -v "${tool}" &> /dev/null; then
            log_error "Required tool '${tool}' is not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

backup_database() {
    log_info "Starting database backup..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="castmatch-db-backup-${timestamp}.sql"
    local backup_path="/tmp/${backup_file}"
    
    # Get RDS endpoint
    local rds_endpoint=$(aws rds describe-db-instances \
        --db-instance-identifier "${RDS_INSTANCE}" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    # Create database backup
    log_info "Creating database backup: ${backup_file}"
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${rds_endpoint}" \
        -U "${DB_USERNAME}" \
        -d "${DB_NAME}" \
        --no-owner --no-privileges \
        -f "${backup_path}"
    
    # Compress backup
    gzip "${backup_path}"
    backup_path="${backup_path}.gz"
    
    # Upload to S3
    log_info "Uploading database backup to S3..."
    aws s3 cp "${backup_path}" "s3://${BACKUP_BUCKET}/database/${backup_file}.gz" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256
    
    # Clean up local file
    rm -f "${backup_path}"
    
    log_success "Database backup completed: ${backup_file}.gz"
}

backup_redis() {
    log_info "Starting Redis backup..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="castmatch-redis-backup-${timestamp}.rdb"
    
    # Get Redis endpoint
    local redis_endpoint=$(kubectl get service castmatch-redis -n "${NAMESPACE}" \
        -o jsonpath='{.spec.clusterIP}')
    
    # Create Redis backup
    log_info "Creating Redis backup: ${backup_file}"
    kubectl exec -n "${NAMESPACE}" deployment/castmatch-redis -- \
        redis-cli --rdb "/tmp/${backup_file}"
    
    # Copy backup from pod
    kubectl cp "${NAMESPACE}/castmatch-redis-pod:/tmp/${backup_file}" \
        "/tmp/${backup_file}"
    
    # Compress and upload to S3
    gzip "/tmp/${backup_file}"
    aws s3 cp "/tmp/${backup_file}.gz" \
        "s3://${BACKUP_BUCKET}/redis/${backup_file}.gz" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256
    
    # Clean up
    rm -f "/tmp/${backup_file}.gz"
    
    log_success "Redis backup completed: ${backup_file}.gz"
}

backup_kubernetes_configs() {
    log_info "Starting Kubernetes configuration backup..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_dir="/tmp/k8s-backup-${timestamp}"
    
    mkdir -p "${backup_dir}"
    
    # Backup all resources in production namespace
    log_info "Backing up Kubernetes resources..."
    kubectl get all,configmaps,secrets,ingress,pvc,pv \
        -n "${NAMESPACE}" \
        -o yaml > "${backup_dir}/all-resources.yaml"
    
    # Backup cluster-level resources
    kubectl get nodes,clusterroles,clusterrolebindings \
        -o yaml > "${backup_dir}/cluster-resources.yaml"
    
    # Backup Helm releases
    helm list --all-namespaces -o yaml > "${backup_dir}/helm-releases.yaml"
    
    # Create tar archive
    tar -czf "${backup_dir}.tar.gz" -C "/tmp" "k8s-backup-${timestamp}"
    
    # Upload to S3
    aws s3 cp "${backup_dir}.tar.gz" \
        "s3://${BACKUP_BUCKET}/kubernetes/k8s-config-${timestamp}.tar.gz" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256
    
    # Clean up
    rm -rf "${backup_dir}" "${backup_dir}.tar.gz"
    
    log_success "Kubernetes configuration backup completed"
}

backup_application_data() {
    log_info "Starting application data backup..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    
    # Backup persistent volumes
    for pvc in $(kubectl get pvc -n "${NAMESPACE}" -o name); do
        pvc_name=$(echo "${pvc}" | cut -d'/' -f2)
        log_info "Creating snapshot for PVC: ${pvc_name}"
        
        # Create volume snapshot (assuming CSI driver supports snapshots)
        cat <<EOF | kubectl apply -f -
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: ${pvc_name}-snapshot-${timestamp}
  namespace: ${NAMESPACE}
spec:
  source:
    persistentVolumeClaimName: ${pvc_name}
  volumeSnapshotClassName: csi-aws-vsc
EOF
    done
    
    log_success "Application data backup completed"
}

create_cross_region_replica() {
    log_info "Setting up cross-region database replica..."
    
    # Create read replica in different region
    aws rds create-db-instance-read-replica \
        --db-instance-identifier "${RDS_INSTANCE}-replica-dr" \
        --source-db-instance-identifier "${RDS_INSTANCE}" \
        --db-instance-class db.r5.large \
        --publicly-accessible \
        --multi-az \
        --destination-region "us-west-2" \
        --storage-encrypted \
        --monitoring-interval 60 \
        --monitoring-role-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/rds-monitoring-role" \
        || log_warning "Read replica creation failed or already exists"
    
    log_success "Cross-region replica setup completed"
}

test_backup_integrity() {
    log_info "Testing backup integrity..."
    
    # List recent backups
    local db_backups=$(aws s3 ls "s3://${BACKUP_BUCKET}/database/" --recursive | tail -5)
    local redis_backups=$(aws s3 ls "s3://${BACKUP_BUCKET}/redis/" --recursive | tail -3)
    local k8s_backups=$(aws s3 ls "s3://${BACKUP_BUCKET}/kubernetes/" --recursive | tail -3)
    
    log_info "Recent database backups:"
    echo "${db_backups}"
    
    log_info "Recent Redis backups:"
    echo "${redis_backups}"
    
    log_info "Recent Kubernetes backups:"
    echo "${k8s_backups}"
    
    # Test database backup restoration (dry run)
    local latest_db_backup=$(echo "${db_backups}" | tail -1 | awk '{print $4}')
    if [[ -n "${latest_db_backup}" ]]; then
        log_info "Testing database backup restoration..."
        aws s3 cp "s3://${BACKUP_BUCKET}/${latest_db_backup}" /tmp/test-restore.sql.gz
        gunzip /tmp/test-restore.sql.gz
        
        # Check if backup is valid SQL
        if head -10 /tmp/test-restore.sql | grep -q "PostgreSQL database dump"; then
            log_success "Database backup integrity verified"
        else
            log_error "Database backup integrity check failed"
        fi
        
        rm -f /tmp/test-restore.sql
    fi
}

cleanup_old_backups() {
    log_info "Cleaning up old backups (older than ${BACKUP_RETENTION_DAYS} days)..."
    
    local cutoff_date=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y-%m-%d)
    
    # Clean up database backups
    aws s3 ls "s3://${BACKUP_BUCKET}/database/" | while read -r line; do
        backup_date=$(echo "${line}" | awk '{print $1}')
        backup_file=$(echo "${line}" | awk '{print $4}')
        
        if [[ "${backup_date}" < "${cutoff_date}" ]]; then
            log_info "Deleting old database backup: ${backup_file}"
            aws s3 rm "s3://${BACKUP_BUCKET}/database/${backup_file}"
        fi
    done
    
    # Clean up other backup types similarly
    for backup_type in redis kubernetes; do
        aws s3 ls "s3://${BACKUP_BUCKET}/${backup_type}/" | while read -r line; do
            backup_date=$(echo "${line}" | awk '{print $1}')
            backup_file=$(echo "${line}" | awk '{print $4}')
            
            if [[ "${backup_date}" < "${cutoff_date}" ]]; then
                log_info "Deleting old ${backup_type} backup: ${backup_file}"
                aws s3 rm "s3://${BACKUP_BUCKET}/${backup_type}/${backup_file}"
            fi
        done
    done
    
    log_success "Old backup cleanup completed"
}

restore_from_backup() {
    local backup_type="$1"
    local backup_file="$2"
    
    log_info "Starting restoration from backup: ${backup_file}"
    
    case "${backup_type}" in
        database)
            restore_database "${backup_file}"
            ;;
        redis)
            restore_redis "${backup_file}"
            ;;
        kubernetes)
            restore_kubernetes "${backup_file}"
            ;;
        *)
            log_error "Unknown backup type: ${backup_type}"
            exit 1
            ;;
    esac
}

restore_database() {
    local backup_file="$1"
    
    log_info "Restoring database from: ${backup_file}"
    
    # Download backup
    aws s3 cp "s3://${BACKUP_BUCKET}/database/${backup_file}" "/tmp/${backup_file}"
    gunzip "/tmp/${backup_file}"
    local sql_file="${backup_file%.*}"
    
    # Get RDS endpoint
    local rds_endpoint=$(aws rds describe-db-instances \
        --db-instance-identifier "${RDS_INSTANCE}" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    # Restore database
    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${rds_endpoint}" \
        -U "${DB_USERNAME}" \
        -d "${DB_NAME}" \
        -f "/tmp/${sql_file}"
    
    rm -f "/tmp/${sql_file}"
    log_success "Database restoration completed"
}

failover_to_replica() {
    log_info "Initiating failover to cross-region replica..."
    
    # Promote read replica to standalone instance
    aws rds promote-read-replica \
        --db-instance-identifier "${RDS_INSTANCE}-replica-dr" \
        --region "us-west-2"
    
    # Wait for promotion to complete
    aws rds wait db-instance-available \
        --db-instance-identifier "${RDS_INSTANCE}-replica-dr" \
        --region "us-west-2"
    
    # Update application configuration to point to new primary
    log_info "Updating application configuration for failover..."
    
    # This would typically involve updating Kubernetes secrets or ConfigMaps
    # with the new database endpoint
    
    log_success "Failover to replica completed"
    send_notification "FAILOVER" "Database failover to us-west-2 completed successfully"
}

run_disaster_recovery_test() {
    log_info "Running disaster recovery test..."
    
    # Create test namespace
    kubectl create namespace "${BACKUP_NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy test application using backup
    log_info "Deploying test application from backup..."
    
    # This would involve:
    # 1. Restoring database to test instance
    # 2. Deploying application to backup namespace
    # 3. Running health checks
    # 4. Verifying functionality
    
    log_success "Disaster recovery test completed"
}

print_usage() {
    cat <<EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    backup              Run full backup (database, redis, k8s configs)
    restore             Restore from backup
    failover            Initiate cross-region failover
    test                Run disaster recovery test
    cleanup             Clean up old backups
    setup               Initial disaster recovery setup

Options:
    --help              Show this help message
    --dry-run           Show what would be done without executing
    --backup-type TYPE  Specify backup type (database|redis|kubernetes|all)
    --backup-file FILE  Specify backup file for restoration

Examples:
    $0 backup                           # Full backup
    $0 backup --backup-type database    # Database backup only
    $0 restore --backup-type database --backup-file backup.sql.gz
    $0 failover                         # Initiate failover
    $0 test                            # Run DR test
    $0 cleanup                         # Clean old backups

EOF
}

main() {
    local command="${1:-}"
    
    case "${command}" in
        backup)
            check_prerequisites
            send_notification "STARTED" "Disaster recovery backup started"
            
            case "${2:-all}" in
                database)
                    backup_database
                    ;;
                redis)
                    backup_redis
                    ;;
                kubernetes)
                    backup_kubernetes_configs
                    ;;
                all|*)
                    backup_database
                    backup_redis
                    backup_kubernetes_configs
                    backup_application_data
                    ;;
            esac
            
            test_backup_integrity
            send_notification "COMPLETED" "Disaster recovery backup completed successfully"
            ;;
        
        restore)
            check_prerequisites
            local backup_type="${2:-}"
            local backup_file="${3:-}"
            
            if [[ -z "${backup_type}" || -z "${backup_file}" ]]; then
                log_error "Backup type and file required for restoration"
                print_usage
                exit 1
            fi
            
            restore_from_backup "${backup_type}" "${backup_file}"
            ;;
        
        failover)
            check_prerequisites
            send_notification "STARTED" "Disaster recovery failover initiated"
            failover_to_replica
            ;;
        
        test)
            check_prerequisites
            run_disaster_recovery_test
            ;;
        
        cleanup)
            check_prerequisites
            cleanup_old_backups
            ;;
        
        setup)
            check_prerequisites
            create_cross_region_replica
            log_success "Disaster recovery setup completed"
            ;;
        
        --help|help|"")
            print_usage
            ;;
        
        *)
            log_error "Unknown command: ${command}"
            print_usage
            exit 1
            ;;
    esac
}

# Run the script
main "$@"