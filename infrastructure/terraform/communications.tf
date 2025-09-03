# Communication Services Infrastructure for CastMatch

# ============================
# Amazon SES Configuration
# ============================

# SES Domain Identity
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# SES Domain Verification
resource "aws_route53_record" "ses_verification" {
  zone_id = var.route53_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = "600"
  records = [aws_ses_domain_identity.main.verification_token]
}

# SES DKIM Configuration
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = var.route53_zone_id
  name    = "${element(aws_ses_domain_dkim.main.dkim_tokens, count.index)}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = "600"
  records = ["${element(aws_ses_domain_dkim.main.dkim_tokens, count.index)}.dkim.amazonses.com"]
}

# SPF Record
resource "aws_route53_record" "ses_spf" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = "600"
  records = ["v=spf1 include:amazonses.com ~all"]
}

# DMARC Record
resource "aws_route53_record" "ses_dmarc" {
  zone_id = var.route53_zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = "600"
  records = ["v=DMARC1; p=quarantine; rua=mailto:dmarc@${var.domain_name}; ruf=mailto:dmarc@${var.domain_name}; fo=1"]
}

# SES Configuration Set
resource "aws_ses_configuration_set" "main" {
  name = "${var.project_name}-${var.environment}"

  reputation_tracking_enabled = true
}

# Event destinations for tracking
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "${var.project_name}-${var.environment}-cloudwatch"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled               = true

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "MessageTag"
    value_source   = "messageTag"
  }

  matching_types = [
    "bounce",
    "complaint",
    "delivery",
    "send",
    "reject",
    "open",
    "click",
    "renderingFailure"
  ]
}

# SNS topic for email bounces and complaints
resource "aws_sns_topic" "email_events" {
  name = "${var.project_name}-${var.environment}-email-events"

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-email-events"
    }
  )
}

resource "aws_ses_identity_notification_topic" "bounce" {
  topic_arn                = aws_sns_topic.email_events.arn
  notification_type        = "Bounce"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = true
}

resource "aws_ses_identity_notification_topic" "complaint" {
  topic_arn                = aws_sns_topic.email_events.arn
  notification_type        = "Complaint"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = true
}

# SES Templates
resource "aws_ses_template" "welcome_email" {
  name    = "${var.project_name}-welcome-email"
  subject = "Welcome to CastMatch!"
  html    = file("${path.module}/email-templates/welcome.html")
  text    = file("${path.module}/email-templates/welcome.txt")
}

resource "aws_ses_template" "password_reset" {
  name    = "${var.project_name}-password-reset"
  subject = "Reset Your CastMatch Password"
  html    = file("${path.module}/email-templates/password-reset.html")
  text    = file("${path.module}/email-templates/password-reset.txt")
}

resource "aws_ses_template" "email_verification" {
  name    = "${var.project_name}-email-verification"
  subject = "Verify Your CastMatch Email"
  html    = file("${path.module}/email-templates/email-verification.html")
  text    = file("${path.module}/email-templates/email-verification.txt")
}

resource "aws_ses_template" "two_factor_auth" {
  name    = "${var.project_name}-2fa-code"
  subject = "Your CastMatch Security Code"
  html    = file("${path.module}/email-templates/2fa-code.html")
  text    = file("${path.module}/email-templates/2fa-code.txt")
}

# ============================
# SMS Configuration (SNS)
# ============================

# SNS SMS Preferences
resource "aws_sns_sms_preferences" "main" {
  default_sms_type                  = "Transactional"
  default_sender_id                 = "CASTMATCH"
  monthly_spend_limit               = var.sms_monthly_spend_limit
  delivery_status_iam_role_arn     = aws_iam_role.sns_feedback.arn
  delivery_status_success_sampling_rate = "100"
  usage_report_s3_bucket            = aws_s3_bucket.sms_usage_reports.id
}

# S3 bucket for SMS usage reports
resource "aws_s3_bucket" "sms_usage_reports" {
  bucket = "${var.project_name}-${var.environment}-sms-usage-reports"

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-sms-usage-reports"
    }
  )
}

resource "aws_s3_bucket_lifecycle_configuration" "sms_usage_reports" {
  bucket = aws_s3_bucket.sms_usage_reports.id

  rule {
    id     = "delete-old-reports"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}

# IAM role for SNS feedback
resource "aws_iam_role" "sns_feedback" {
  name = "${var.project_name}-${var.environment}-sns-feedback"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "sns_feedback" {
  name = "${var.project_name}-${var.environment}-sns-feedback-policy"
  role = aws_iam_role.sns_feedback.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:PutMetricFilter",
          "logs:PutRetentionPolicy"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.sms_usage_reports.arn,
          "${aws_s3_bucket.sms_usage_reports.arn}/*"
        ]
      }
    ]
  })
}

# ============================
# Push Notifications (SNS)
# ============================

# SNS Platform Applications for Mobile Push
resource "aws_sns_platform_application" "ios" {
  count = var.enable_push_notifications ? 1 : 0

  name                = "${var.project_name}-${var.environment}-ios"
  platform            = "APNS"
  platform_credential = var.apns_certificate
  platform_principal  = var.apns_private_key

  success_feedback_role_arn = aws_iam_role.sns_feedback.arn
  failure_feedback_role_arn = aws_iam_role.sns_feedback.arn
  success_feedback_sample_rate = "100"
}

resource "aws_sns_platform_application" "android" {
  count = var.enable_push_notifications ? 1 : 0

  name                = "${var.project_name}-${var.environment}-android"
  platform            = "GCM"
  platform_credential = var.fcm_server_key

  success_feedback_role_arn = aws_iam_role.sns_feedback.arn
  failure_feedback_role_arn = aws_iam_role.sns_feedback.arn
  success_feedback_sample_rate = "100"
}

# ============================
# Third-party Service Secrets
# ============================

# Resend Configuration (Alternative to SES)
resource "aws_secretsmanager_secret" "resend" {
  count                   = var.use_resend ? 1 : 0
  name                    = "${var.project_name}-${var.environment}-resend"
  recovery_window_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-resend"
      Type = "email-service"
    }
  )
}

resource "aws_secretsmanager_secret_version" "resend" {
  count     = var.use_resend ? 1 : 0
  secret_id = aws_secretsmanager_secret.resend[0].id
  secret_string = jsonencode({
    api_key         = var.resend_api_key
    from_email      = "noreply@${var.domain_name}"
    from_name       = "CastMatch"
    webhook_secret  = random_password.resend_webhook[0].result
  })
}

resource "random_password" "resend_webhook" {
  count   = var.use_resend ? 1 : 0
  length  = 32
  special = false
}

# Twilio Configuration for SMS/WhatsApp
resource "aws_secretsmanager_secret" "twilio" {
  name                    = "${var.project_name}-${var.environment}-twilio"
  recovery_window_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-twilio"
      Type = "sms-service"
    }
  )
}

resource "aws_secretsmanager_secret_version" "twilio" {
  secret_id = aws_secretsmanager_secret.twilio.id
  secret_string = jsonencode({
    account_sid          = var.twilio_account_sid
    auth_token          = var.twilio_auth_token
    phone_number        = var.twilio_phone_number
    whatsapp_number     = var.twilio_whatsapp_number
    messaging_service_sid = var.twilio_messaging_service_sid
  })
}

# ============================
# Lambda Functions for Communication
# ============================

# Lambda for processing email events
resource "aws_lambda_function" "email_processor" {
  filename         = "${path.module}/lambda/email-processor.zip"
  function_name    = "${var.project_name}-${var.environment}-email-processor"
  role            = aws_iam_role.lambda_email.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      ENVIRONMENT        = var.environment
      SES_CONFIGURATION_SET = aws_ses_configuration_set.main.name
      SNS_TOPIC_ARN     = aws_sns_topic.email_events.arn
      DATABASE_SECRET_ARN = var.database_secret_arn
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = local.common_tags
}

# SNS subscription for email events
resource "aws_sns_topic_subscription" "email_processor" {
  topic_arn = aws_sns_topic.email_events.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.email_processor.arn
}

resource "aws_lambda_permission" "email_processor_sns" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_processor.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.email_events.arn
}

# Lambda IAM Role
resource "aws_iam_role" "lambda_email" {
  name = "${var.project_name}-${var.environment}-lambda-email"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_email_basic" {
  role       = aws_iam_role.lambda_email.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_email_custom" {
  name = "${var.project_name}-${var.environment}-lambda-email-policy"
  role = aws_iam_role.lambda_email.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendTemplatedEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.email_events.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          var.database_secret_arn,
          aws_secretsmanager_secret.twilio.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# Security group for Lambda
resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-${var.environment}-lambda-sg"
  description = "Security group for Lambda functions"
  vpc_id      = var.vpc_id

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
      Name = "${var.project_name}-${var.environment}-lambda-sg"
    }
  )
}

# ============================
# CloudWatch Alarms
# ============================

resource "aws_cloudwatch_metric_alarm" "email_bounce_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-high-email-bounce-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "Bounce"
  namespace          = "AWS/SES"
  period             = "300"
  statistic          = "Average"
  threshold          = "0.05" # 5% bounce rate
  alarm_description  = "Email bounce rate is too high"
  alarm_actions      = [var.sns_alert_topic_arn]

  dimensions = {
    MessageTag = "default"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "email_complaint_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-high-email-complaint-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "Complaint"
  namespace          = "AWS/SES"
  period             = "300"
  statistic          = "Average"
  threshold          = "0.001" # 0.1% complaint rate
  alarm_description  = "Email complaint rate is too high"
  alarm_actions      = [var.sns_alert_topic_arn]

  dimensions = {
    MessageTag = "default"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "sms_spend" {
  alarm_name          = "${var.project_name}-${var.environment}-high-sms-spend"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name        = "SMSMonthToDateSpentUSD"
  namespace          = "AWS/SNS"
  period             = "86400" # Daily
  statistic          = "Maximum"
  threshold          = var.sms_monthly_spend_limit * 0.8 # Alert at 80% of limit
  alarm_description  = "SMS monthly spend approaching limit"
  alarm_actions      = [var.sns_alert_topic_arn]

  tags = local.common_tags
}

# ============================
# Outputs
# ============================

output "ses_domain_identity_arn" {
  value       = aws_ses_domain_identity.main.arn
  description = "ARN of the SES domain identity"
}

output "ses_configuration_set_name" {
  value       = aws_ses_configuration_set.main.name
  description = "Name of the SES configuration set"
}

output "email_events_topic_arn" {
  value       = aws_sns_topic.email_events.arn
  description = "ARN of the email events SNS topic"
}

output "resend_secret_arn" {
  value       = var.use_resend ? aws_secretsmanager_secret.resend[0].arn : null
  description = "ARN of the Resend secret"
}

output "twilio_secret_arn" {
  value       = aws_secretsmanager_secret.twilio.arn
  description = "ARN of the Twilio secret"
}

output "email_processor_function_name" {
  value       = aws_lambda_function.email_processor.function_name
  description = "Name of the email processor Lambda function"
}