# CastMatch Database Disaster Recovery Runbook

## Table of Contents
1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Disaster Scenarios](#disaster-scenarios)
4. [Recovery Procedures](#recovery-procedures)
5. [Testing & Validation](#testing--validation)
6. [Contact Information](#contact-information)

## Overview

This runbook provides step-by-step procedures for recovering the CastMatch database infrastructure in various disaster scenarios. All procedures have been tested and validated in our staging environment.

### Critical Systems
- **Primary Database**: PostgreSQL 15.x on AWS RDS
- **Read Replicas**: 2x cross-AZ replicas
- **Connection Pooler**: PgBouncer
- **Backup Storage**: AWS S3 (cross-region replication enabled)
- **Monitoring**: Prometheus + Grafana + PagerDuty

## Recovery Objectives

| Metric | Target | Maximum |
|--------|--------|---------|
| **RTO (Recovery Time Objective)** | 1 hour | 4 hours |
| **RPO (Recovery Point Objective)** | 15 minutes | 1 hour |
| **Data Loss Tolerance** | 0% for committed transactions | - |
| **Service Availability** | 99.9% monthly | - |

## Disaster Scenarios

### Scenario 1: Primary Database Failure
**Symptoms:**
- Connection timeouts to primary database
- PgBouncer health checks failing
- Application errors in logs

### Scenario 2: Data Corruption
**Symptoms:**
- Inconsistent query results
- Constraint violations
- Application logic errors

### Scenario 3: Regional Outage
**Symptoms:**
- Multiple AWS services unavailable
- Network connectivity issues
- Complete service outage

### Scenario 4: Accidental Data Deletion
**Symptoms:**
- Missing records or tables
- Application features broken
- User complaints about missing data

## Recovery Procedures

### Procedure 1: Primary Database Failover

**Time Estimate:** 15-30 minutes  
**Data Loss Risk:** Minimal (up to last replication lag)

#### Prerequisites
- AWS CLI access configured
- Database admin credentials
- PagerDuty access for incident management

#### Steps

1. **Confirm Primary Failure** (2 minutes)
```bash
# Check database connectivity
psql -h castmatch-prod-cluster.cluster-xxxxx.us-west-2.rds.amazonaws.com \
     -U admin -d castmatch_production -c "SELECT 1"

# Check RDS cluster status
aws rds describe-db-clusters \
    --db-cluster-identifier castmatch-prod-cluster \
    --query 'DBClusters[0].Status'

# Check replication lag on replicas
aws rds describe-db-instances \
    --filters "Name=db-cluster-id,Values=castmatch-prod-cluster" \
    --query 'DBInstances[*].[DBInstanceIdentifier,StatusInfos]'
```

2. **Initiate Failover** (5-10 minutes)
```bash
# Trigger automatic failover to best replica
aws rds failover-db-cluster \
    --db-cluster-identifier castmatch-prod-cluster \
    --target-db-instance-identifier castmatch-prod-replica-1

# Monitor failover progress
watch -n 5 'aws rds describe-db-clusters \
    --db-cluster-identifier castmatch-prod-cluster \
    --query "DBClusters[0].[Status,DBClusterMembers[?IsClusterWriter==\`true\`].DBInstanceIdentifier]"'
```

3. **Update Application Configuration** (5 minutes)
```bash
# Update environment variables
kubectl set env deployment/castmatch-api \
    DATABASE_HOST=castmatch-prod-replica-1.xxxxx.us-west-2.rds.amazonaws.com \
    -n production

# Restart application pods
kubectl rollout restart deployment/castmatch-api -n production
kubectl rollout status deployment/castmatch-api -n production
```

4. **Verify Recovery** (3 minutes)
```bash
# Test database connectivity
./scripts/health-check.sh production

# Check application logs
kubectl logs -f deployment/castmatch-api -n production --tail=100

# Verify key metrics
curl -s http://prometheus:9090/api/v1/query?query=up{job="postgresql"} | jq '.data.result'
```

5. **Post-Recovery Actions** (10 minutes)
```bash
# Create incident report
./scripts/create-incident-report.sh --severity=high --type=database-failover

# Notify stakeholders
./scripts/send-notification.sh --channel=ops --message="Database failover completed successfully"

# Schedule root cause analysis
echo "RCA Meeting: $(date -d '+2 days' '+%Y-%m-%d 14:00')" >> /var/log/incidents/rca-schedule.txt
```

### Procedure 2: Point-in-Time Recovery (PITR)

**Time Estimate:** 1-2 hours  
**Data Loss Risk:** Up to specified recovery point

#### Prerequisites
- Specific timestamp for recovery
- Sufficient storage for restored database
- Maintenance window approved

#### Steps

1. **Identify Recovery Point** (10 minutes)
```bash
# List available automated backups
aws rds describe-db-cluster-snapshots \
    --db-cluster-identifier castmatch-prod-cluster \
    --snapshot-type automated \
    --query 'DBClusterSnapshots[*].[DBClusterSnapshotIdentifier,SnapshotCreateTime]' \
    --output table

# Verify transaction logs availability
aws rds describe-db-log-files \
    --db-instance-identifier castmatch-prod-primary \
    --filename-contains postgres \
    --output table
```

2. **Create Recovery Cluster** (30-45 minutes)
```bash
# Restore to new cluster at specific time
aws rds restore-db-cluster-to-point-in-time \
    --source-db-cluster-identifier castmatch-prod-cluster \
    --db-cluster-identifier castmatch-recovery-$(date +%Y%m%d) \
    --restore-to-time "2025-09-02T10:30:00.000Z" \
    --use-latest-restorable-time false

# Create instance in recovered cluster
aws rds create-db-instance \
    --db-instance-identifier castmatch-recovery-instance \
    --db-cluster-identifier castmatch-recovery-$(date +%Y%m%d) \
    --db-instance-class db.r6g.2xlarge \
    --engine postgres \
    --engine-version 15.4

# Monitor recovery progress
watch -n 30 'aws rds describe-db-clusters \
    --db-cluster-identifier castmatch-recovery-$(date +%Y%m%d) \
    --query "DBClusters[0].Status"'
```

3. **Validate Recovered Data** (15 minutes)
```bash
# Connect to recovered database
psql -h castmatch-recovery-$(date +%Y%m%d).cluster-xxxxx.us-west-2.rds.amazonaws.com \
     -U admin -d castmatch_production

# Run validation queries
cat <<SQL | psql -h [recovered-host] -U admin -d castmatch_production
-- Check row counts
SELECT schemaname, tablename, n_live_tup 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC LIMIT 20;

-- Verify critical data integrity
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as casting_count FROM castings WHERE status = 'active';
SELECT MAX(created_at) as latest_transaction FROM audit_logs;
SQL
```

4. **Switchover to Recovered Database** (20 minutes)
```bash
# Put application in maintenance mode
kubectl scale deployment castmatch-api --replicas=0 -n production

# Final data sync (if needed)
pg_dump -h [current-primary] -d castmatch_production --data-only \
    --table=audit_logs --where="created_at > '2025-09-02 10:30:00'" \
    | psql -h [recovered-cluster] -d castmatch_production

# Update DNS/connection strings
aws route53 change-resource-record-sets \
    --hosted-zone-id Z123456789 \
    --change-batch file://dns-update.json

# Restart application with new database
kubectl set env deployment/castmatch-api \
    DATABASE_HOST=castmatch-recovery-$(date +%Y%m%d).cluster-xxxxx.us-west-2.rds.amazonaws.com \
    -n production
    
kubectl scale deployment castmatch-api --replicas=6 -n production
```

### Procedure 3: Cross-Region Disaster Recovery

**Time Estimate:** 2-4 hours  
**Data Loss Risk:** Up to last cross-region replication

#### Prerequisites
- Secondary region infrastructure provisioned
- Cross-region read replica active
- DNS failover configured

#### Steps

1. **Assess Regional Failure** (5 minutes)
```bash
# Check AWS Service Health Dashboard
aws health describe-events --region us-west-2

# Test connectivity to primary region
for service in rds ec2 s3; do
    echo "Testing $service..."
    aws $service describe-regions --region us-west-2 2>&1 | head -1
done

# Check cross-region replica status
aws rds describe-db-instances \
    --db-instance-identifier castmatch-xregion-replica \
    --region us-east-1
```

2. **Promote Cross-Region Replica** (30 minutes)
```bash
# Promote read replica to standalone database
aws rds promote-read-replica \
    --db-instance-identifier castmatch-xregion-replica \
    --backup-retention-period 7 \
    --region us-east-1

# Wait for promotion to complete
aws rds wait db-instance-available \
    --db-instance-identifier castmatch-xregion-replica \
    --region us-east-1

# Enable automated backups
aws rds modify-db-instance \
    --db-instance-identifier castmatch-xregion-replica \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00" \
    --region us-east-1
```

3. **Deploy Application Stack in Secondary Region** (45 minutes)
```bash
# Deploy using pre-configured Terraform
cd infrastructure/terraform/disaster-recovery
terraform init
terraform plan -var="region=us-east-1" -var="environment=dr"
terraform apply -auto-approve

# Deploy application to secondary EKS cluster
kubectl config use-context castmatch-dr-us-east-1
kubectl apply -f k8s/production/ -n production

# Scale up pods
kubectl scale deployment castmatch-api --replicas=12 -n production
```

4. **Update Global Load Balancer** (10 minutes)
```bash
# Update Route53 health checks
aws route53 update-health-check \
    --health-check-id abc123 \
    --ip-address [new-alb-ip] \
    --port 443

# Initiate DNS failover
aws route53 change-resource-record-sets \
    --hosted-zone-id Z123456789 \
    --change-batch '{
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "api.castmatch.com",
                "Type": "A",
                "SetIdentifier": "Primary",
                "Failover": "PRIMARY",
                "AliasTarget": {
                    "HostedZoneId": "Z215JYRZR8TBV5",
                    "DNSName": "castmatch-dr-alb.us-east-1.elb.amazonaws.com",
                    "EvaluateTargetHealth": true
                }
            }
        }]
    }'
```

### Procedure 4: Restore from S3 Backup

**Time Estimate:** 2-3 hours  
**Data Loss Risk:** Up to last backup

#### Steps

1. **Locate and Download Backup** (15 minutes)
```bash
# List available backups
aws s3 ls s3://castmatch-backups/backups/production/daily/ \
    --recursive \
    | sort -r \
    | head -20

# Download latest backup
LATEST_BACKUP=$(aws s3 ls s3://castmatch-backups/backups/production/daily/ \
    | sort -r | head -1 | awk '{print $4}')
    
aws s3 cp s3://castmatch-backups/backups/production/daily/$LATEST_BACKUP \
    /tmp/restore/

# Verify backup integrity
sha256sum /tmp/restore/$LATEST_BACKUP
aws s3api head-object \
    --bucket castmatch-backups \
    --key backups/production/daily/$LATEST_BACKUP \
    --query 'Metadata.checksum' \
    --output text
```

2. **Decrypt and Decompress** (10 minutes)
```bash
cd /tmp/restore

# Decrypt backup
gpg --decrypt \
    --output ${LATEST_BACKUP%.gpg} \
    $LATEST_BACKUP

# Decompress
gunzip ${LATEST_BACKUP%.gpg}

# Verify SQL file
head -100 ${LATEST_BACKUP%.gpg.gz} | grep "PostgreSQL database dump"
```

3. **Provision New Database Instance** (30 minutes)
```bash
# Create new RDS instance
aws rds create-db-instance \
    --db-instance-identifier castmatch-restore-$(date +%Y%m%d) \
    --db-instance-class db.r6g.4xlarge \
    --engine postgres \
    --engine-version 15.4 \
    --master-username admin \
    --master-user-password [secure-password] \
    --allocated-storage 500 \
    --storage-type gp3 \
    --iops 12000 \
    --vpc-security-group-ids sg-12345678 \
    --db-subnet-group-name castmatch-private \
    --backup-retention-period 7 \
    --multi-az

# Wait for instance to be available
aws rds wait db-instance-available \
    --db-instance-identifier castmatch-restore-$(date +%Y%m%d)
```

4. **Restore Database** (60-90 minutes)
```bash
# Get connection endpoint
RESTORE_HOST=$(aws rds describe-db-instances \
    --db-instance-identifier castmatch-restore-$(date +%Y%m%d) \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

# Restore database
psql -h $RESTORE_HOST -U admin -d postgres < ${LATEST_BACKUP%.gpg.gz}

# Verify restoration
psql -h $RESTORE_HOST -U admin -d castmatch_production <<SQL
-- Check database size
SELECT pg_database_size('castmatch_production')/1024/1024/1024 as size_gb;

-- Verify table counts
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Check recent data
SELECT MAX(created_at) FROM audit_logs;
SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 day';
SQL
```

## Testing & Validation

### Monthly DR Drills

Execute these tests monthly in staging environment:

1. **Failover Test** (1st Tuesday)
```bash
./scripts/dr-test.sh --scenario=failover --environment=staging
```

2. **Backup Restoration Test** (2nd Tuesday)
```bash
./scripts/dr-test.sh --scenario=restore --environment=staging --backup=latest
```

3. **Cross-Region Test** (3rd Tuesday)
```bash
./scripts/dr-test.sh --scenario=regional --environment=staging
```

### Validation Checklist

After any recovery procedure:

- [ ] Database connectivity verified
- [ ] Application health checks passing
- [ ] Data integrity validated
- [ ] Performance metrics normal
- [ ] Monitoring alerts cleared
- [ ] Backup jobs running
- [ ] Replication configured
- [ ] Security groups correct
- [ ] SSL certificates valid
- [ ] DNS resolution working

## Contact Information

### Escalation Matrix

| Level | Role | Name | Contact | Availability |
|-------|------|------|---------|--------------|
| L1 | On-Call Engineer | Rotation | PagerDuty | 24/7 |
| L2 | Database Admin | DBA Team | dba@castmatch.com | 24/7 |
| L3 | Infrastructure Lead | John Smith | +1-555-0100 | Business Hours |
| L4 | CTO | Jane Doe | +1-555-0101 | Emergency Only |

### External Contacts

| Service | Contact | Account # | Support Level |
|---------|---------|-----------|---------------|
| AWS Support | 1-800-xxx-xxxx | 123456789 | Enterprise |
| PagerDuty | support@pagerduty.com | PD-12345 | Business |
| Datadog | support@datadog.com | DD-67890 | Pro |

### Communication Channels

- **Incident Channel**: #incidents (Slack)
- **Status Page**: https://status.castmatch.com
- **War Room**: https://meet.castmatch.com/warroom
- **Runbook Updates**: https://github.com/castmatch/runbooks

## Appendix

### Required Tools

Ensure these tools are installed on recovery workstations:

```bash
# Install required tools
brew install postgresql@15 awscli gnupg jq kubectl terraform

# Configure AWS CLI
aws configure set region us-west-2
aws configure set output json

# Setup kubectl contexts
kubectl config get-contexts
```

### Environment Variables

```bash
# Source recovery environment
source /etc/castmatch/dr-env.sh

# Required variables
export PGPASSWORD="${DB_ADMIN_PASSWORD}"
export AWS_PROFILE="castmatch-prod"
export KUBECONFIG="/etc/castmatch/kubeconfig"
```

### Useful Queries

```sql
-- Check replication status
SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    sync_state,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) as lag
FROM pg_stat_replication;

-- Find blocking queries
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    backend_start,
    state,
    wait_event_type,
    wait_event,
    query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY backend_start;

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

---

**Document Version:** 2.0  
**Last Updated:** 2025-09-02  
**Next Review:** 2025-10-02  
**Owner:** Infrastructure Team