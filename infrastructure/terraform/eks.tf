# AWS EKS Cluster Configuration for CastMatch Production
# Multi-AZ deployment with auto-scaling for 20K+ concurrent users

# EKS Cluster
resource "aws_eks_cluster" "castmatch_production" {
  name     = "castmatch-production-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs    = ["0.0.0.0/0"]
    
    security_group_ids = [aws_security_group.eks_cluster_sg.id]
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks_encryption.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  tags = {
    Name        = "castmatch-production-cluster"
    Environment = "production"
    ManagedBy   = "terraform"
    SLA         = "99.99"
  }
}

# EKS Node Groups for Multi-AZ deployment
resource "aws_eks_node_group" "castmatch_workers" {
  for_each = {
    general = {
      instance_types = ["t3.xlarge", "t3a.xlarge"]
      min_size      = 3
      max_size      = 30
      desired_size  = 6
      disk_size     = 100
    }
    compute_optimized = {
      instance_types = ["c5.2xlarge", "c5a.2xlarge"]
      min_size      = 2
      max_size      = 20
      desired_size  = 4
      disk_size     = 150
    }
    memory_optimized = {
      instance_types = ["r5.xlarge", "r5a.xlarge"]
      min_size      = 2
      max_size      = 15
      desired_size  = 3
      disk_size     = 100
    }
  }

  cluster_name    = aws_eks_cluster.castmatch_production.name
  node_group_name = "castmatch-${each.key}-nodes"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private[*].id
  version         = aws_eks_cluster.castmatch_production.version

  instance_types = each.value.instance_types
  
  scaling_config {
    min_size     = each.value.min_size
    max_size     = each.value.max_size
    desired_size = each.value.desired_size
  }

  disk_size = each.value.disk_size

  remote_access {
    ec2_ssh_key               = var.ssh_key_name
    source_security_group_ids = [aws_security_group.bastion_sg.id]
  }

  update_config {
    max_unavailable_percentage = 33
  }

  labels = {
    Environment = "production"
    NodeType    = each.key
    ManagedBy   = "terraform"
  }

  tags = {
    Name                                          = "castmatch-${each.key}-node"
    Environment                                   = "production"
    "kubernetes.io/cluster/castmatch-production" = "owned"
    "k8s.io/cluster-autoscaler/enabled"         = "true"
    "k8s.io/cluster-autoscaler/castmatch-production" = "owned"
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes       = [scaling_config[0].desired_size]
  }
}

# Fargate Profile for serverless workloads
resource "aws_eks_fargate_profile" "castmatch_fargate" {
  cluster_name           = aws_eks_cluster.castmatch_production.name
  fargate_profile_name   = "castmatch-fargate-profile"
  pod_execution_role_arn = aws_iam_role.eks_fargate_role.arn
  subnet_ids            = aws_subnet.private[*].id

  selector {
    namespace = "castmatch-jobs"
    labels = {
      workload = "batch"
    }
  }

  selector {
    namespace = "castmatch-ai"
    labels = {
      workload = "ai-processing"
    }
  }

  tags = {
    Name        = "castmatch-fargate-profile"
    Environment = "production"
  }
}

# EKS Addons
resource "aws_eks_addon" "addons" {
  for_each = {
    "vpc-cni" = {
      version = "v1.15.0-eksbuild.2"
    }
    "kube-proxy" = {
      version = "v1.28.2-eksbuild.2"
    }
    "coredns" = {
      version = "v1.10.1-eksbuild.5"
    }
    "aws-ebs-csi-driver" = {
      version = "v1.24.0-eksbuild.1"
    }
  }

  cluster_name             = aws_eks_cluster.castmatch_production.name
  addon_name               = each.key
  addon_version           = each.value.version
  resolve_conflicts        = "OVERWRITE"
  service_account_role_arn = each.key == "aws-ebs-csi-driver" ? aws_iam_role.ebs_csi_driver_role.arn : null

  tags = {
    Name        = "${each.key}-addon"
    Environment = "production"
  }
}

# IAM Roles for EKS
resource "aws_iam_role" "eks_cluster_role" {
  name = "castmatch-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name        = "castmatch-eks-cluster-role"
    Environment = "production"
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role_policy_attachment" "eks_service_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role" "eks_node_role" {
  name = "castmatch-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = {
    Name        = "castmatch-eks-node-role"
    Environment = "production"
  }
}

resource "aws_iam_role_policy_attachment" "eks_node_policies" {
  for_each = {
    "AmazonEKSWorkerNodePolicy"          = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
    "AmazonEKS_CNI_Policy"               = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
    "AmazonEC2ContainerRegistryReadOnly" = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
    "AmazonSSMManagedInstanceCore"       = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  }

  policy_arn = each.value
  role       = aws_iam_role.eks_node_role.name
}

# Auto-scaling policies
resource "aws_iam_policy" "cluster_autoscaler" {
  name = "castmatch-cluster-autoscaler-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeTags",
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup",
          "ec2:DescribeLaunchTemplateVersions",
          "ec2:DescribeInstanceTypes"
        ]
        Resource = "*"
      }
    ]
  })
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks_encryption" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 10
  enable_key_rotation    = true

  tags = {
    Name        = "castmatch-eks-encryption-key"
    Environment = "production"
  }
}

resource "aws_kms_alias" "eks_encryption" {
  name          = "alias/castmatch-eks-encryption"
  target_key_id = aws_kms_key.eks_encryption.key_id
}

# Security Groups
resource "aws_security_group" "eks_cluster_sg" {
  name        = "castmatch-eks-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name                                          = "castmatch-eks-cluster-sg"
    Environment                                   = "production"
    "kubernetes.io/cluster/castmatch-production" = "owned"
  }
}

# Outputs
output "eks_cluster_endpoint" {
  value       = aws_eks_cluster.castmatch_production.endpoint
  description = "EKS cluster endpoint"
}

output "eks_cluster_name" {
  value       = aws_eks_cluster.castmatch_production.name
  description = "EKS cluster name"
}

output "eks_cluster_certificate_authority" {
  value       = aws_eks_cluster.castmatch_production.certificate_authority[0].data
  description = "EKS cluster certificate authority"
  sensitive   = true
}

output "eks_cluster_version" {
  value       = aws_eks_cluster.castmatch_production.version
  description = "EKS cluster version"
}