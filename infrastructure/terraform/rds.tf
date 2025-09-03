# RDS PostgreSQL Configuration for CastMatch Production

resource "aws_db_parameter_group" "castmatch_pg" {
  name   = "${var.project_name}-${var.environment}-pg-params"
  family = "postgres14"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pgaudit"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking more than 1 second
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}" # 25% of RAM
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}" # 75% of RAM
  }

  parameter {
    name  = "work_mem"
    value = "16384" # 16MB
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "2097152" # 2GB
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1" # SSD optimized
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200" # SSD optimized
  }

  parameter {
    name  = "wal_buffers"
    value = "16384" # 16MB
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "autovacuum_max_workers"
    value = "4"
  }

  parameter {
    name  = "autovacuum_naptime"
    value = "30"
  }

  tags = local.common_tags
}

resource "aws_db_subnet_group" "castmatch_db" {
  name       = "${var.project_name}-${var.environment}-db-subnet"
  subnet_ids = var.private_subnet_ids

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-db-subnet-group"
    }
  )
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "Allow PostgreSQL from application layer"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-rds-sg"
    }
  )
}

resource "aws_db_instance" "castmatch_primary" {
  identifier     = "${var.project_name}-${var.environment}-primary"
  engine         = "postgres"
  engine_version = "14.9"

  # Instance configuration
  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds_encryption.arn
  iops                 = var.rds_iops
  storage_throughput   = var.rds_storage_throughput

  # Database configuration
  db_name  = "castmatch_${var.environment}"
  username = var.db_master_username
  password = random_password.db_master_password.result
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.castmatch_db.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.castmatch_pg.name

  # Backup configuration
  backup_retention_period   = var.backup_retention_days
  backup_window            = "03:00-04:00"
  maintenance_window       = "sun:04:00-sun:05:00"
  skip_final_snapshot      = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  copy_tags_to_snapshot    = true

  # High availability
  multi_az               = var.environment == "production" ? true : false
  deletion_protection    = var.environment == "production" ? true : false
  
  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]
  monitoring_interval            = 60
  monitoring_role_arn           = aws_iam_role.rds_enhanced_monitoring.arn
  performance_insights_enabled   = true
  performance_insights_retention_period = 7

  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  apply_immediately         = var.environment != "production"

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-primary-db"
    }
  )
}

# Read Replica for production
resource "aws_db_instance" "castmatch_read_replica" {
  count = var.environment == "production" ? var.read_replica_count : 0

  identifier             = "${var.project_name}-${var.environment}-read-replica-${count.index + 1}"
  replicate_source_db    = aws_db_instance.castmatch_primary.identifier
  instance_class         = var.rds_replica_instance_class
  
  # Storage configuration
  storage_encrypted = true
  kms_key_id       = aws_kms_key.rds_encryption.arn
  
  # Network configuration
  publicly_accessible = false
  
  # Monitoring
  monitoring_interval            = 60
  monitoring_role_arn           = aws_iam_role.rds_enhanced_monitoring.arn
  performance_insights_enabled   = true
  performance_insights_retention_period = 7
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-read-replica-${count.index + 1}"
    }
  )
}

# KMS key for RDS encryption
resource "aws_kms_key" "rds_encryption" {
  description             = "KMS key for RDS encryption - ${var.project_name}-${var.environment}"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-rds-kms"
    }
  )
}

resource "aws_kms_alias" "rds_encryption" {
  name          = "alias/${var.project_name}-${var.environment}-rds"
  target_key_id = aws_kms_key.rds_encryption.key_id
}

# IAM role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Database master password
resource "random_password" "db_master_password" {
  length  = 32
  special = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store master password in Secrets Manager
resource "aws_secretsmanager_secret" "db_master_password" {
  name = "${var.project_name}-${var.environment}-db-master-password"
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_master_password" {
  secret_id = aws_secretsmanager_secret.db_master_password.id
  secret_string = jsonencode({
    username = var.db_master_username
    password = random_password.db_master_password.result
    engine   = "postgres"
    host     = aws_db_instance.castmatch_primary.address
    port     = aws_db_instance.castmatch_primary.port
    dbname   = aws_db_instance.castmatch_primary.db_name
  })
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors RDS CPU utilization"
  alarm_actions      = [var.sns_alert_topic_arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.castmatch_primary.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name        = "FreeStorageSpace"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "10737418240" # 10GB in bytes
  alarm_description  = "This metric monitors RDS free storage"
  alarm_actions      = [var.sns_alert_topic_arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.castmatch_primary.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseConnections"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "150"
  alarm_description  = "This metric monitors RDS connection count"
  alarm_actions      = [var.sns_alert_topic_arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.castmatch_primary.id
  }

  tags = local.common_tags
}

# Outputs
output "rds_endpoint" {
  value       = aws_db_instance.castmatch_primary.endpoint
  description = "RDS instance endpoint"
}

output "rds_read_replica_endpoints" {
  value       = aws_db_instance.castmatch_read_replica[*].endpoint
  description = "RDS read replica endpoints"
}

output "rds_security_group_id" {
  value       = aws_security_group.rds.id
  description = "RDS security group ID"
}

output "db_secret_arn" {
  value       = aws_secretsmanager_secret.db_master_password.arn
  description = "ARN of the database credentials secret"
  sensitive   = true
}