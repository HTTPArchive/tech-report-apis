variable "project" {
  description = "The project name"
  type        = string
  default     = "httparchive"
}
variable "region" {
  type    = string
  default = "us-central1"
}
variable "environment" {
  description = "The environment name"
  type        = string
  default     = "prod"
}
variable "project_database" {
  type        = string
  description = "The database name"
  default     = "tech-report-api-prod"
}

variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
  default     = "report-api"
}

variable "ssl_cert_name" {
  description = "Name of the SSL certificate"
  type        = string
  default     = "google-managed2"
}
