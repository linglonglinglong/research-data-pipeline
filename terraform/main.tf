terraform {
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

# ==========================================
# 1. NETWORKING (The Secure Foundation)
# ==========================================
# Using the official AWS VPC module for a production-grade network topology.
# It automatically creates Public subnets (for Load Balancers) and 
# Private subnets (for your Database and Containers).
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "${var.project_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true # Saves money for the demo
}

# ==========================================
# 2. SECURITY GROUPS (The Firewalls)
# ==========================================
# Load Balancer SG: Accepts all web traffic from the internet
resource "aws_security_group" "alb_sg" {
  name        = "${var.project_name}-alb-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# App SG: Only accepts traffic from the Load Balancer
resource "aws_security_group" "app_sg" {
  name        = "${var.project_name}-app-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 3000 # Frontend Port
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  ingress {
    from_port       = 8000 # Backend Port
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Database SG: Only accepts traffic from the App containers
resource "aws_security_group" "db_sg" {
  name        = "${var.project_name}-db-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }
}

# ==========================================
# 3. DATABASE (Amazon RDS)
# ==========================================
# Replaces your local Docker Postgres with a managed AWS database.
resource "aws_db_instance" "postgres" {
  identifier             = "${var.project_name}-db"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  db_name                = "sensor_data"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true # True for demo purposes
}

# ==========================================
# 4. STORAGE (Amazon S3 Data Lake)
# ==========================================
# The raw storage bucket for massive CSV ingestion
resource "aws_s3_bucket" "data_lake" {
  bucket = "${var.project_name}-raw-data-lake-2026"
}

# ==========================================
# 5. IAM ROLES (Security & Permissions)
# ==========================================
# Grants ECS permission to pull Docker images and write logs
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ==========================================
# 6. COMPUTE (AWS ECS Fargate)
# ==========================================
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

# Note: In a full deployment, you would define aws_ecs_service and aws_ecs_task_definition 
# here, referencing your Docker images pushed to Amazon ECR.

# ==========================================
# 7. SERVERLESS AUTOMATION (Lambda & EventBridge)
# ==========================================

# A. The IAM Role for the Lambda Function
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.project_name}-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
      Effect = "Allow"
    }]
  })
}

# Grant Lambda permission to write logs to CloudWatch
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# B. Package the Python Code on the fly
# This script simply makes an authenticated POST request to your FastAPI backend
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda_function.py"
  output_path = "${path.module}/lambda_function.zip"
}

# C. The Lambda Function
resource "aws_lambda_function" "pull_trigger" {
  function_name    = "${var.project_name}-pull-trigger"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.10" # Standard AWS Python runtime
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      # This tells the Lambda where to send the request
      API_URL = "http://internal-hks-alb-123456.us-east-1.elb.amazonaws.com/api" 
      API_KEY = var.api_key
    }
  }
}

# D. Amazon EventBridge (The Cron Job)
# Fires every hour to trigger the Lambda
resource "aws_cloudwatch_event_rule" "hourly_pull" {
  name                = "${var.project_name}-hourly-pull"
  description         = "Triggers the HKS data pull ingestion every hour"
  schedule_expression = "rate(1 hour)"
}

# Link the Rule to the Lambda
resource "aws_cloudwatch_event_target" "trigger_lambda" {
  rule      = aws_cloudwatch_event_rule.hourly_pull.name
  target_id = "TriggerIngestionLambda"
  arn       = aws_lambda_function.pull_trigger.arn
}

# Grant EventBridge permission to execute the Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pull_trigger.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.hourly_pull.arn
}