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
}
variable "project_database" {
  type        = string
  description = "The database name"
  default     = "tech-report-api-"
}
variable "service_account_email" {
  type        = string
  description = "Service account who can invoke the endpoint and is admin of the DB. This is required!"
  default     = "cloud-function@httparchive.iam.gserviceaccount.com"
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
