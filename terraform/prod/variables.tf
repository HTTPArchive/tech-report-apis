variable "project" {
  description = "The project name"
  type        = string
  default     = "httparchive"
}
variable "region" {
  default = "us-central1"
  type    = string
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
variable "google_service_account_cloud_functions" {
  type        = string
  description = "Service account for Cloud Functions"
  default     = "cloud-function@httparchive.iam.gserviceaccount.com"
}
variable "google_service_account_api_gateway" {
  type        = string
  description = "Service account for API Gateway"
  default     = "api-gateway@httparchive.iam.gserviceaccount.com"
}
variable "min_instances" {
  description = "(Optional) The limit on the minimum number of function instances that may coexist at a given time."
  type        = number
  default     = 1
}
