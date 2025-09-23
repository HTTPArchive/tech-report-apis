variable "region" {
  default = "us-central1"
  type    = string
}
variable "environment" {
  description = "The 'Environment' that is being created/deployed. Applied as a suffix to many resources."
  type        = string
  default     = "dev"
}
variable "source_directory" {
  description = "The folder of the package containing function that will be executed when the Google Cloud Function is triggered!"
  type        = string
}
variable "service_name" {
  description = "Optional: Can be used to create more than function from the same package"
  type        = string
}
variable "available_memory_gb" {
  default     = "2Gi"
  type        = string
  description = "The amount of memory for the Cloud Function"
}
variable "available_cpu" {
  default     = "2"
  type        = string
  description = "The amount of CPU for the Cloud Function"
}
variable "project" {
  description = "The ID of the project in which the resource belongs. If it is not provided, the provider project is used."
  type        = string
  default     = "httparchive"
}
variable "timeout" {
  default     = "60s"
  type        = string
  description = "Timeout for the service. Default value is 60 seconds. Cannot be more than 540 seconds."
}
variable "service_account_email" {
  type        = string
  description = "Service account who can invoke this function. This is required!"
}
variable "service_account_api_gateway" {
  type        = string
  description = "API Gateway service account who can invoke this function. This is required!"
}

variable "min_instances" {
  description = "(Optional) The limit on the minimum number of function instances that may coexist at a given time."
  type        = number
  default     = 1
}
variable "max_instance_request_concurrency" {
  description = "(Optional) The limit on the maximum number of requests that an instance can handle simultaneously. This can be used to control costs when scaling. Defaults to 1."
  type        = number
  default     = 80
}
variable "environment_variables" {
  description = "environment_variables"
  default     = {}
  type        = map(string)
}
