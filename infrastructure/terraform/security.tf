# Security Infrastructure for CastMatch Production

# ============================
# SSL/TLS Certificate Management
# ============================

# ACM Certificate for main domain
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}", "api.${var.domain_name}", "www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-main-cert"
    }
  )
}

# DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ============================
# WAF Configuration for DDoS Protection
# ============================

resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project_name}-${var.environment}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"

        scope_down_statement {
          not_statement {
            statement {
              ip_set_reference_statement {
                arn = aws_wafv2_ip_set.whitelist.arn
              }
            }
          }
        }
      }
    }

    action {
      block {
        custom_response {
          response_code = 429
          custom_response_body_key = "rate_limit_exceeded"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitRule"
      sampled_requests_enabled  = true
    }
  }

  # SQL injection protection
  rule {
    name     = "SQLiRule"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "SQLiRule"
      sampled_requests_enabled  = true
    }
  }

  # Known bad inputs
  rule {
    name     = "KnownBadInputsRule"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "KnownBadInputsRule"
      sampled_requests_enabled  = true
    }
  }

  # Common attacks protection
  rule {
    name     = "CommonAttackProtectionRule"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        excluded_rule {
          name = "SizeRestrictions_BODY"
        }

        excluded_rule {
          name = "GenericRFI_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "CommonAttackProtectionRule"
      sampled_requests_enabled  = true
    }
  }

  # Custom response bodies
  custom_response_body {
    key          = "rate_limit_exceeded"
    content      = "{\"error\": \"Rate limit exceeded. Please try again later.\"}"
    content_type = "APPLICATION_JSON"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${var.project_name}-${var.environment}-waf"
    sampled_requests_enabled  = true
  }

  tags = local.common_tags
}

# IP whitelist set
resource "aws_wafv2_ip_set" "whitelist" {
  name               = "${var.project_name}-${var.environment}-whitelist"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.whitelisted_ips

  tags = local.common_tags
}

# ============================
# Secrets Management
# ============================

# OAuth Secrets
resource "aws_secretsmanager_secret" "oauth_google" {
  name                    = "${var.project_name}-${var.environment}-oauth-google"
  recovery_window_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-oauth-google"
      Type = "oauth"
    }
  )
}

resource "aws_secretsmanager_secret_version" "oauth_google" {
  secret_id = aws_secretsmanager_secret.oauth_google.id
  secret_string = jsonencode({
    client_id     = var.google_oauth_client_id
    client_secret = var.google_oauth_client_secret
    redirect_uri  = "https://${var.domain_name}/api/auth/callback/google"
  })
}

resource "aws_secretsmanager_secret" "oauth_linkedin" {
  name                    = "${var.project_name}-${var.environment}-oauth-linkedin"
  recovery_window_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-oauth-linkedin"
      Type = "oauth"
    }
  )
}

resource "aws_secretsmanager_secret_version" "oauth_linkedin" {
  secret_id = aws_secretsmanager_secret.oauth_linkedin.id
  secret_string = jsonencode({
    client_id     = var.linkedin_oauth_client_id
    client_secret = var.linkedin_oauth_client_secret
    redirect_uri  = "https://${var.domain_name}/api/auth/callback/linkedin"
  })
}

# JWT Secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}-${var.environment}-jwt-secret"
  recovery_window_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-jwt-secret"
      Type = "jwt"
    }
  )
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({
    secret         = random_password.jwt_secret.result
    access_expiry  = "15m"
    refresh_expiry = "7d"
  })
}

# API Keys
resource "random_password" "api_key" {
  count   = length(var.api_key_names)
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "api_keys" {
  count                   = length(var.api_key_names)
  name                    = "${var.project_name}-${var.environment}-api-key-${var.api_key_names[count.index]}"
  recovery_window_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-api-key-${var.api_key_names[count.index]}"
      Type = "api-key"
    }
  )
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  count     = length(var.api_key_names)
  secret_id = aws_secretsmanager_secret.api_keys[count.index].id
  secret_string = jsonencode({
    key_name = var.api_key_names[count.index]
    api_key  = random_password.api_key[count.index].result
    created  = timestamp()
  })
}

# ============================
# Security Groups
# ============================

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere (redirect to HTTPS)"
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
      Name = "${var.project_name}-${var.environment}-alb-sg"
    }
  )
}

# Application Security Group
resource "aws_security_group" "app" {
  name        = "${var.project_name}-${var.environment}-app-sg"
  description = "Security group for application containers"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Traffic from ALB"
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
      Name = "${var.project_name}-${var.environment}-app-sg"
    }
  )
}

# ============================
# KMS Keys for Encryption
# ============================

# Application encryption key
resource "aws_kms_key" "app_encryption" {
  description             = "KMS key for application data encryption - ${var.project_name}-${var.environment}"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow services to use the key"
        Effect = "Allow"
        Principal = {
          Service = [
            "s3.amazonaws.com",
            "secretsmanager.amazonaws.com",
            "logs.amazonaws.com"
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-app-kms"
    }
  )
}

resource "aws_kms_alias" "app_encryption" {
  name          = "alias/${var.project_name}-${var.environment}-app"
  target_key_id = aws_kms_key.app_encryption.key_id
}

# ============================
# IAM Roles and Policies
# ============================

# Application IAM Role
resource "aws_iam_role" "app" {
  name = "${var.project_name}-${var.environment}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["ecs-tasks.amazonaws.com", "ec2.amazonaws.com"]
        }
      }
    ]
  })

  tags = local.common_tags
}

# Policy for accessing secrets
resource "aws_iam_policy" "app_secrets" {
  name        = "${var.project_name}-${var.environment}-app-secrets"
  description = "Policy for accessing application secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.oauth_google.arn,
          aws_secretsmanager_secret.oauth_linkedin.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}-${var.environment}-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = [
          aws_kms_key.app_encryption.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_secrets" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.app_secrets.arn
}

# ============================
# Security Headers Configuration
# ============================

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "${var.project_name}-${var.environment}-security-headers"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.${var.domain_name}; frame-ancestors 'none';"
      override               = true
    }
  }

  custom_headers_config {
    items {
      header   = "X-Permitted-Cross-Domain-Policies"
      value    = "none"
      override = true
    }

    items {
      header   = "Permissions-Policy"
      value    = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
      override = true
    }
  }
}

# ============================
# Data Sources
# ============================

data "aws_caller_identity" "current" {}

# ============================
# Outputs
# ============================

output "acm_certificate_arn" {
  value       = aws_acm_certificate.main.arn
  description = "ARN of the ACM certificate"
}

output "waf_web_acl_id" {
  value       = aws_wafv2_web_acl.main.id
  description = "ID of the WAF Web ACL"
}

output "app_security_group_id" {
  value       = aws_security_group.app.id
  description = "ID of the application security group"
}

output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "ID of the ALB security group"
}

output "app_role_arn" {
  value       = aws_iam_role.app.arn
  description = "ARN of the application IAM role"
}

output "kms_key_id" {
  value       = aws_kms_key.app_encryption.id
  description = "ID of the application KMS key"
}