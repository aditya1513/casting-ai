# CastMatch Infrastructure - Variables
# This file defines all input variables for the Terraform configuration

################################################################################
# Project Configuration
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "castmatch"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "development", "staging", "production", "prod"], var.environment)
    error_message = "Environment must be one of: dev, development, staging, production, prod."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.aws_region))
    error_message = "AWS region must be a valid AWS region identifier."
  }
}

################################################################################
# Networking Configuration
################################################################################

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnets are required for high availability."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least 2 private subnets are required for high availability."
  }
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]

  validation {
    condition     = length(var.database_subnet_cidrs) >= 2
    error_message = "At least 2 database subnets are required for RDS Multi-AZ."
  }
}

################################################################################
# EKS Configuration
################################################################################

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.27"

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.kubernetes_version))
    error_message = "Kubernetes version must be in format X.Y (e.g., 1.27)."
  }
}

variable "cluster_public_access_cidrs" {
  description = "CIDR blocks that can access EKS cluster API endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "eks_admin_users" {
  description = "List of IAM users to grant EKS admin access"
  type = list(object({
    userarn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}

################################################################################
# Database Configuration
################################################################################

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"

  validation {
    condition = contains([
      "db.t3.micro", "db.t3.small", "db.t3.medium", "db.t3.large",
      "db.r6g.large", "db.r6g.xlarge", "db.r6g.2xlarge", "db.r6g.4xlarge"
    ], var.db_instance_class)
    error_message = "DB instance class must be a valid RDS instance type."
  }
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS instance (GB)"
  type        = number
  default     = 20

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 65536
    error_message = "DB allocated storage must be between 20 and 65536 GB."
  }
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling (GB)"
  type        = number
  default     = 100

  validation {
    condition     = var.db_max_allocated_storage >= var.db_allocated_storage
    error_message = "DB max allocated storage must be greater than or equal to allocated storage."
  }
}

variable "db_backup_retention_period" {
  description = "Number of days to retain DB backups"
  type        = number
  default     = 7

  validation {
    condition     = var.db_backup_retention_period >= 0 && var.db_backup_retention_period <= 35
    error_message = "DB backup retention period must be between 0 and 35 days."
  }
}

variable "db_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"

  validation {
    condition     = can(regex("^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$", var.db_backup_window))
    error_message = "DB backup window must be in format HH:MM-HH:MM."
  }
}

variable "db_maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "Sun:04:00-Sun:05:00"

  validation {
    condition = can(regex("^(Mon|Tue|Wed|Thu|Fri|Sat|Sun):[0-9]{2}:[0-9]{2}-(Mon|Tue|Wed|Thu|Fri|Sat|Sun):[0-9]{2}:[0-9]{2}$", var.db_maintenance_window))
    error_message = "DB maintenance window must be in format Day:HH:MM-Day:HH:MM."
  }
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = false
}

variable "db_performance_insights_enabled" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = false
}

variable "db_monitoring_interval" {
  description = "Enhanced monitoring interval for RDS (0, 1, 5, 10, 15, 30, 60 seconds)"
  type        = number
  default     = 0

  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.db_monitoring_interval)
    error_message = "DB monitoring interval must be 0, 1, 5, 10, 15, 30, or 60 seconds."
  }
}

variable "db_deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = false
}

################################################################################
# Redis Configuration
################################################################################

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"

  validation {
    condition = contains([
      "cache.t3.micro", "cache.t3.small", "cache.t3.medium",
      "cache.r6g.large", "cache.r6g.xlarge", "cache.r6g.2xlarge"
    ], var.redis_node_type)
    error_message = "Redis node type must be a valid ElastiCache instance type."
  }
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in Redis cluster"
  type        = number
  default     = 1

  validation {
    condition     = var.redis_num_cache_nodes >= 1 && var.redis_num_cache_nodes <= 20
    error_message = "Redis number of cache nodes must be between 1 and 20."
  }
}

variable "redis_parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7.x"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379

  validation {
    condition     = var.redis_port >= 1024 && var.redis_port <= 65535
    error_message = "Redis port must be between 1024 and 65535."
  }
}

variable "redis_maintenance_window" {
  description = "Redis maintenance window"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 5

  validation {
    condition     = var.redis_snapshot_retention_limit >= 0 && var.redis_snapshot_retention_limit <= 35
    error_message = "Redis snapshot retention limit must be between 0 and 35 days."
  }
}

variable "redis_snapshot_window" {
  description = "Redis snapshot window (UTC)"
  type        = string
  default     = "03:00-05:00"
}

variable "redis_at_rest_encryption_enabled" {
  description = "Enable at-rest encryption for Redis"
  type        = bool
  default     = true
}

variable "redis_transit_encryption_enabled" {
  description = "Enable in-transit encryption for Redis"
  type        = bool
  default     = true
}

################################################################################
# Security Configuration
################################################################################

variable "bastion_allowed_cidrs" {
  description = "CIDR blocks allowed to access bastion host"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_bastion" {
  description = "Enable bastion host for SSH access"
  type        = bool
  default     = false
}

variable "ec2_key_pair_name" {
  description = "Name of EC2 key pair for bastion host"
  type        = string
  default     = null
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for CloudFront"
  type        = string
  default     = null
}

################################################################################
# Monitoring Configuration
################################################################################

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 14

  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.cloudwatch_log_retention_days)
    error_message = "CloudWatch log retention days must be a valid retention period."
  }
}

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights for EKS"
  type        = bool
  default     = false
}

################################################################################
# Backup Configuration
################################################################################

variable "backup_schedule_expressions" {
  description = "Cron expressions for backup schedules"
  type = object({
    daily   = string
    weekly  = string
    monthly = string
  })
  default = {
    daily   = "cron(0 2 * * ? *)"   # Daily at 2 AM UTC
    weekly  = "cron(0 3 ? * SUN *)" # Weekly on Sunday at 3 AM UTC
    monthly = "cron(0 4 1 * ? *)"   # Monthly on 1st at 4 AM UTC
  }
}

variable "backup_cold_storage_after_days" {
  description = "Number of days before moving backups to cold storage"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_cold_storage_after_days >= 1
    error_message = "Backup cold storage transition must be at least 1 day."
  }
}

variable "backup_delete_after_days" {
  description = "Number of days before deleting backups"
  type        = number
  default     = 365

  validation {
    condition     = var.backup_delete_after_days >= var.backup_cold_storage_after_days
    error_message = "Backup deletion period must be greater than cold storage transition period."
  }
}

################################################################################
# Cost Optimization
################################################################################

variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization (non-production environments)"
  type        = bool
  default     = false
}

variable "spot_instance_types" {
  description = "List of spot instance types to use"
  type        = list(string)
  default     = ["t3.medium", "t3.large", "t3.xlarge"]
}

variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling for non-production environments"
  type        = bool
  default     = false
}

################################################################################
# Feature Flags
################################################################################

variable "enable_waf" {
  description = "Enable AWS WAF for application protection"
  type        = bool
  default     = false
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced for DDoS protection"
  type        = bool
  default     = false
}

variable "enable_secrets_manager" {
  description = "Use AWS Secrets Manager for secret storage"
  type        = bool
  default     = true
}

variable "enable_parameter_store" {
  description = "Use AWS Systems Manager Parameter Store for configuration"
  type        = bool
  default     = true
}

variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray for distributed tracing"
  type        = bool
  default     = false
}

################################################################################
# Environment-specific Configurations
################################################################################

variable "environment_configs" {
  description = "Environment-specific configuration overrides"
  type = map(object({
    instance_types        = list(string)
    min_size             = number
    max_size             = number
    desired_size         = number
    db_instance_class    = string
    redis_node_type      = string
    enable_multi_az      = bool
    backup_retention     = number
    monitoring_enabled   = bool
    performance_insights = bool
  }))
  default = {
    development = {
      instance_types        = ["t3.small"]
      min_size             = 1
      max_size             = 3
      desired_size         = 1
      db_instance_class    = "db.t3.micro"
      redis_node_type      = "cache.t3.micro"
      enable_multi_az      = false
      backup_retention     = 1
      monitoring_enabled   = false
      performance_insights = false
    }
    staging = {
      instance_types        = ["t3.medium"]
      min_size             = 2
      max_size             = 6
      desired_size         = 2
      db_instance_class    = "db.t3.small"
      redis_node_type      = "cache.t3.small"
      enable_multi_az      = false
      backup_retention     = 3
      monitoring_enabled   = true
      performance_insights = false
    }
    production = {
      instance_types        = ["t3.large", "t3.xlarge"]
      min_size             = 3
      max_size             = 20
      desired_size         = 6
      db_instance_class    = "db.r6g.large"
      redis_node_type      = "cache.r6g.large"
      enable_multi_az      = true
      backup_retention     = 30
      monitoring_enabled   = true
      performance_insights = true
    }
  }
}

################################################################################
# Tags
################################################################################

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "cost_center" {
  description = "Cost center for resource tagging"
  type        = string
  default     = "Engineering"
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "Infrastructure Team"
}