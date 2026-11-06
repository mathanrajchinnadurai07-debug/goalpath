terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "production"
}

# VPC Configuration
resource "aws_vpc" "goalpath_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "goalpath-${var.environment}-vpc"
    Environment = var.environment
  }
}

# PostgreSQL Database (RDS Aurora Serverless v2)
resource "aws_db_subnet_group" "db_subnet" {
  name       = "goalpath-db-subnets"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_rds_cluster" "postgresql_cluster" {
  cluster_identifier     = "goalpath-postgres-cluster"
  engine                 = "aurora-postgresql"
  engine_mode            = "provisioned"
  engine_version         = "16.1"
  database_name          = "goalpath_db"
  master_username        = "goalpath_admin"
  manage_master_user_password = true
  db_subnet_group_name   = aws_db_subnet_group.db_subnet.name
  storage_encrypted      = true
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "goalpath-final-backup"

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16.0
  }
}

# Redis Cache Cluster (ElastiCache)
resource "aws_elasticache_cluster" "redis_cluster" {
  cluster_id           = "goalpath-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}

# S3 Storage Bucket for Avatars & Encrypted Exports
resource "aws_s3_bucket" "asset_storage" {
  bucket = "goalpath-${var.environment}-assets"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "s3_encryption" {
  bucket = aws_s3_bucket.asset_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "block_public" {
  bucket                  = aws_s3_bucket.asset_storage.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Subnet placeholders
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.goalpath_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.goalpath_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}b"
}
