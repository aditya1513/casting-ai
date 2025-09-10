# CloudFront CDN and Application Load Balancer Configuration
# Multi-region content delivery with intelligent caching

# Application Load Balancer for EKS
resource "aws_lb" "castmatch_alb" {
  name               = "castmatch-production-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true
  
  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "castmatch-alb"
    enabled = true
  }

  tags = {
    Name        = "castmatch-production-alb"
    Environment = "production"
    Type        = "public"
  }
}

# Target Group for EKS Ingress
resource "aws_lb_target_group" "castmatch_tg" {
  name     = "castmatch-eks-tg"
  port     = 30080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  deregistration_delay = 30

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = {
    Name        = "castmatch-eks-target-group"
    Environment = "production"
  }
}

# ALB Listeners
resource "aws_lb_listener" "castmatch_https" {
  load_balancer_arn = aws_lb.castmatch_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.castmatch.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.castmatch_tg.arn
  }
}

resource "aws_lb_listener" "castmatch_http" {
  load_balancer_arn = aws_lb.castmatch_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "castmatch_cdn" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = "CastMatch Production CDN"
  default_root_object = "index.html"
  aliases            = ["castmatch.ai", "www.castmatch.ai", "api.castmatch.ai"]
  price_class        = "PriceClass_All"
  
  origin {
    domain_name = aws_lb.castmatch_alb.dns_name
    origin_id   = "ALB-${aws_lb.castmatch_alb.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_keepalive_timeout = 60
      origin_read_timeout      = 60
    }

    origin_shield {
      enabled              = true
      origin_shield_region = var.aws_region
    }
  }

  # S3 origin for static assets
  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = "S3-static-assets"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.static_assets.cloudfront_access_identity_path
    }
  }

  # Default cache behavior for dynamic content
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALB-${aws_lb.castmatch_alb.id}"

    forwarded_values {
      query_string = true
      headers      = ["Host", "Origin", "Accept", "Accept-Language", "Authorization", "CloudFront-Forwarded-Proto"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 31536000
    compress               = true
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-static-assets"

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  # Cache behavior for API endpoints
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${aws_lb.castmatch_alb.id}"

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  # Cache behavior for media files
  ordered_cache_behavior {
    path_pattern     = "/media/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-static-assets"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 604800
    max_ttl                = 31536000
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.castmatch.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  web_acl_id = aws_wafv2_web_acl.castmatch_waf.arn

  logging_config {
    include_cookies = false
    bucket         = aws_s3_bucket.cdn_logs.bucket_domain_name
    prefix         = "cloudfront/"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  tags = {
    Name        = "castmatch-production-cdn"
    Environment = "production"
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "static_assets" {
  comment = "Origin access identity for CastMatch static assets"
}

# S3 Buckets for logs and static assets
resource "aws_s3_bucket" "alb_logs" {
  bucket = "castmatch-alb-logs-${var.environment}"

  tags = {
    Name        = "castmatch-alb-logs"
    Environment = "production"
  }
}

resource "aws_s3_bucket" "cdn_logs" {
  bucket = "castmatch-cdn-logs-${var.environment}"

  tags = {
    Name        = "castmatch-cdn-logs"
    Environment = "production"
  }
}

resource "aws_s3_bucket" "static_assets" {
  bucket = "castmatch-static-assets-${var.environment}"

  tags = {
    Name        = "castmatch-static-assets"
    Environment = "production"
  }
}

# S3 bucket policies
resource "aws_s3_bucket_policy" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.static_assets.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
      }
    ]
  })
}

# Security Group for ALB
resource "aws_security_group" "alb_sg" {
  name        = "castmatch-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "castmatch-alb-sg"
    Environment = "production"
  }
}

# WAF for CloudFront
resource "aws_wafv2_web_acl" "castmatch_waf" {
  name  = "castmatch-production-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = 10000
        aggregate_key_type = "IP"
      }
    }

    action {
      block {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitRule"
      sampled_requests_enabled  = true
    }
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "CommonRuleSet"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "castmatch-waf"
    sampled_requests_enabled  = true
  }

  tags = {
    Name        = "castmatch-production-waf"
    Environment = "production"
  }
}

# Outputs
output "alb_dns_name" {
  value       = aws_lb.castmatch_alb.dns_name
  description = "DNS name of the Application Load Balancer"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.castmatch_cdn.domain_name
  description = "CloudFront distribution domain name"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.castmatch_cdn.id
  description = "CloudFront distribution ID"
}