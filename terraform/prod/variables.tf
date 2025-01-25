variable "google_service_account_cloud_functions" {
  type        = string
  description = "Service account for Cloud Functions"
}

variable "google_service_account_api_gateway" {
  type        = string
  description = "Service account for API Gateway"
}

variable "project_database" {
  type        = string
  description = "The database name"

}

variable "min_instances" {
  description = "(Optional) The limit on the minimum number of function instances that may coexist at a given time."
  type        = number
  default     = 1
}
