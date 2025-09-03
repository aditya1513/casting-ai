# CastMatch Disaster Recovery Plan

## Overview
This document outlines the disaster recovery procedures for CastMatch database infrastructure, ensuring business continuity with minimal data loss and downtime.

## Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

| Disaster Type | RTO (Recovery Time) | RPO (Data Loss) | Priority |
|---------------|---------------------|-----------------|----------|
| Database Corruption | 30 minutes | 15 minutes | Critical |
| Hardware Failure | 1 hour | 15 minutes | Critical |
| Data Center Outage | 2 hours | 1 hour | High |
| Regional Outage | 4 hours | 4 hours | Medium |

## Backup Strategy

### 1. Full Backups
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 90 days local, 365 days in S3 Glacier
- **Encryption**: AES-256 encryption before storage
- **Compression**: gzip compression to reduce storage costs
- **Verification**: Automated integrity checks after each backup

### 2. Incremental Backups
- **Frequency**: Every hour
- **Method**: WAL (Write-Ahead Log) archiving
- **Storage**: Local and S3 Standard-IA
- **Purpose**: Point-in-time recovery capability

### 3. Continuous Replication
- **Method**: Streaming replication to read replica
- **Lag**: < 1 second under normal conditions
- **Location**: Different availability zone
- **Purpose**: High availability and load distribution

## Disaster Scenarios and Recovery Procedures

### Scenario 1: Database Corruption
**Symptoms**: Data consistency errors, application failures

**Recovery Steps**:
1. Immediately stop all write operations
2. Assess corruption extent using `pg_dump --schema-only`
3. If corruption is limited, use `VACUUM FULL` and `REINDEX`
4. For extensive corruption, restore from latest backup:
   ```bash
   ./backup-recovery.sh restore s3://castmatch-production-backups/full-backups/latest.sql.gz
   ```
5. Verify data integrity
6. Resume operations

**Estimated Recovery Time**: 30-60 minutes

### Scenario 2: Hardware Failure
**Symptoms**: Database server unresponsive, disk failures

**Recovery Steps**:
1. Promote read replica to master:
   ```sql
   SELECT pg_promote();
   ```
2. Update application configuration to point to new master
3. Verify application connectivity
4. Set up new replica from backup
5. Monitor performance and consistency

**Estimated Recovery Time**: 15-30 minutes

### Scenario 3: Data Center Outage
**Symptoms**: Complete loss of primary data center

**Recovery Steps**:
1. Activate disaster recovery site
2. Restore latest full backup on DR infrastructure
3. Apply incremental backups up to latest available
4. Update DNS records to point to DR site
5. Verify application functionality
6. Communicate status to users

**Estimated Recovery Time**: 1-2 hours

### Scenario 4: Accidental Data Deletion
**Symptoms**: Critical data missing, user reports

**Recovery Steps**:
1. Identify the time of deletion
2. Perform point-in-time recovery:
   ```bash
   ./backup-recovery.sh pitr "2024-01-01 12:00:00" backup-file.sql
   ```
3. Extract only the affected data
4. Merge recovered data with current database
5. Verify data consistency

**Estimated Recovery Time**: 45-90 minutes

## Infrastructure Requirements

### Primary Site
- **Database**: PostgreSQL cluster with streaming replication
- **Storage**: SSD with RAID 10 configuration
- **Backups**: Local NAS + AWS S3 Standard-IA
- **Monitoring**: 24/7 automated monitoring with alerts

### Disaster Recovery Site
- **Infrastructure**: AWS RDS Multi-AZ deployment
- **Storage**: GP3 SSD with automated backups
- **Network**: VPN connection to primary site
- **Capacity**: 100% of production capacity

## Automated Monitoring and Alerting

### Health Checks
```bash
# Database connectivity
*/5 * * * * /opt/castmatch/scripts/db-health-check.sh

# Backup verification
0 3 * * * /opt/castmatch/scripts/backup-verify.sh

# Replication lag monitoring
*/1 * * * * /opt/castmatch/scripts/replication-monitor.sh
```

### Alert Thresholds
- **Replication Lag**: > 10 seconds (Warning), > 60 seconds (Critical)
- **Backup Failure**: Immediate critical alert
- **Disk Space**: > 80% (Warning), > 90% (Critical)
- **Connection Failures**: > 5% error rate (Warning), > 10% (Critical)

## Recovery Testing Schedule

### Monthly Tests
- Restore test database from backup
- Verify data integrity and completeness
- Test application connectivity to restored database
- Document any issues or improvements

### Quarterly Tests
- Full disaster recovery simulation
- Failover to read replica
- DNS failover testing
- End-to-end application testing

### Annual Tests
- Complete data center failover
- Cross-region recovery testing
- Security and compliance verification
- Staff training and documentation updates

## Communication Plan

### Internal Notifications
1. **Incident Detection**: Automated alerts to on-call team
2. **Initial Response**: Notify engineering leadership within 15 minutes
3. **Progress Updates**: Every 30 minutes during active recovery
4. **Resolution**: Final status report and post-mortem scheduling

### External Communications
1. **Service Status Page**: Real-time updates on status.castmatch.com
2. **Email Notifications**: Critical issues to all users
3. **Social Media**: Major outages on @CastMatchSupport
4. **Customer Success**: Direct outreach to enterprise customers

## Post-Recovery Procedures

### Immediate Actions (0-2 hours)
- [ ] Verify all systems are operational
- [ ] Check data integrity and consistency
- [ ] Monitor application performance
- [ ] Review error logs for anomalies
- [ ] Confirm backup systems are functioning

### Short-term Actions (2-24 hours)
- [ ] Conduct team debriefing
- [ ] Document lessons learned
- [ ] Update recovery procedures if needed
- [ ] Communicate resolution to stakeholders
- [ ] Schedule post-mortem meeting

### Long-term Actions (1-7 days)
- [ ] Complete formal post-mortem report
- [ ] Implement process improvements
- [ ] Update disaster recovery documentation
- [ ] Review and update RTO/RPO objectives
- [ ] Conduct knowledge transfer sessions

## Emergency Contacts

### Internal Team
| Role | Primary | Secondary | Phone |
|------|---------|-----------|-------|
| Database Admin | John Smith | Jane Doe | +1-555-0001 |
| DevOps Lead | Mike Johnson | Sarah Wilson | +1-555-0002 |
| Engineering Manager | Bob Chen | Lisa Park | +1-555-0003 |
| CTO | Alex Rodriguez | - | +1-555-0000 |

### External Vendors
| Service | Contact | Phone | Support Level |
|---------|---------|-------|---------------|
| AWS Support | Enterprise | +1-206-266-4064 | 24/7 |
| Database Consultant | DBExperts Inc | +1-555-0100 | Business Hours |

## Compliance and Security

### Data Protection
- All backups encrypted with AES-256
- Access controls with multi-factor authentication
- Audit logging for all recovery operations
- GDPR compliance for EU user data

### Regulatory Requirements
- SOC 2 Type II compliance maintained
- ISO 27001 security standards followed
- Regular third-party security audits
- Data residency requirements respected

## Budget and Cost Management

### Annual Costs (Estimated)
- **Primary Infrastructure**: $50,000
- **Disaster Recovery**: $25,000
- **Backup Storage**: $10,000
- **Monitoring Tools**: $15,000
- **Staff Training**: $5,000
- **Total**: $105,000

### Cost Optimization
- Use S3 lifecycle policies for backup retention
- Implement automated resource scaling
- Regular review of storage classes
- Monitor and optimize data transfer costs

## Document Control

- **Version**: 1.0
- **Last Updated**: 2024-01-01
- **Next Review**: 2024-04-01
- **Owner**: DevOps Team
- **Approver**: CTO