variable "aws_region" {
  description = "The AWS region to deploy into"
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  default     = "hks-data-pipeline"
}

variable "db_username" {
  description = "Database administrator username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "The secret API key to authenticate the Lambda function with the FastAPI backend"
  type        = string
  sensitive   = true
  default     = "hks-demo-key-2026" # Default for demo purposes
}