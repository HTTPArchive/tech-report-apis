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
  default     = "dev"
}
variable "project_database" {
  type        = string
  description = "The database name"
  default     = "tech-report-apis-prod" // TODO: Update this to the correct database name
}

variable "google_service_account_cloud_functions" {
  type        = string
  description = "Service account for Cloud Functions"
}
variable "google_service_account_api_gateway" {
  type        = string
  description = "Service account for API Gateway"
}
