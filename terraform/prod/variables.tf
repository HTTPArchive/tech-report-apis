variable "project" {
  description = "The project name"
  type        = string
  default     = "httparchive"
}
variable "region" {
  default = "us-east1"
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
  default     = "tech-report-apis-prod"
}

variable "google_service_account_cloud_functions" {
  type        = string
  description = "Service account for Cloud Functions"
}
variable "google_service_account_api_gateway" {
  type        = string
  description = "Service account for API Gateway"
}

variable "max_instances" {
  default     = 5
  type        = number
  description = "(Optional) The limit on the maximum number of function instances that may coexist at a given time."
}
variable "min_instances" {
  description = "(Optional) The limit on the minimum number of function instances that may coexist at a given time."
  type        = number
  default     = 1
}
variable "max_instance_request_concurrency" {
  description = "(Optional) The limit on the maximum number of requests that an instance can handle simultaneously. This can be used to control costs when scaling. Defaults to 1."
  type        = number
  default     = 5
}
