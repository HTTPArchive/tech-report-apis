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
  default     = "tech-report-api-dev"
}

variable "google_service_account_cloud_functions" {
  type        = string
  description = "Service account for Cloud Functions"
}
variable "google_service_account_api_gateway" {
  type        = string
  description = "Service account for API Gateway"
}

variable "min_instances" {
  description = "(Optional) The limit on the minimum number of function instances that may coexist at a given time."
  type        = number
  default     = 0
}
