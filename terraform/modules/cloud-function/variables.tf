variable "secrets" {
  default = []
}
variable "region" {
  default = "us-east1"
  type = string
}
variable "environment" {
  description = "The 'Environment' that is being created/deployed. Applied as a suffix to many resources."
  type        = string
}
variable "source_directory" {
  description = "The folder of the package containing function that will be executed when the Google Cloud Function is triggered!"
  type        = string
}
variable "function_name" {
  description = "Optional: Can be used to create more than function from the same package"
  type        = string
}
variable "entry_point" {
  description = "The entry point; This is either what is registered with 'http' or exported from the code as a handler!"
  type        = string
}
variable "available_memory_mb" {
  default     = "1GiB"
  type        = string
  description = "The amount of memory for the Cloud Function"
}
variable "ingress_settings" {
  type        = string
  default     = "ALLOW_ALL"
  description = "String value that controls what traffic can reach the function. Allowed values are ALLOW_ALL, ALLOW_INTERNAL_AND_GCLB and ALLOW_INTERNAL_ONLY. Check ingress documentation to see the impact of each settings value. Changes to this field will recreate the cloud function."
}
variable "vpc_connector_egress_settings" {
  type        = string
  default     = null
  description = "The egress settings for the connector, controlling what traffic is diverted through it. Allowed values are ALL_TRAFFIC and PRIVATE_RANGES_ONLY. Defaults to PRIVATE_RANGES_ONLY. If unset, this field preserves the previously set value."
}
variable "project" {
  description = "The ID of the project in which the resource belongs. If it is not provided, the provider project is used."
  type        = string
}
variable "timeout" {
  default     = 60
  type        = number
  description = "Timeout (in seconds) for the function. Default value is 60 seconds. Cannot be more than 540 seconds."
}
variable "service_account_email" {
  type        = string
  description = "Service account who can invoke this function. This is required!"
}
variable "service_account_api_gateway" {
  type        = string
  description = "API Gateway service account who can invoke this function. This is required!"
}
variable "max_instances" {
  default     = 5
  type        = number
  description = "(Optional) The limit on the maximum number of function instances that may coexist at a given time."
}
variable "min_instances" {
  description = "(Optional) The limit on the minimum number of function instances that may coexist at a given time."
  type        = number
  default     = 0
}
variable "max_instance_request_concurrency" {
  description = "(Optional) The limit on the maximum number of requests that an instance can handle simultaneously. This can be used to control costs when scaling. Defaults to 1."
  type        = number
  default     = 5
}
variable "environment_variables" {
  description = "environment_variables"
  default     = {}
  type        = map(string)
}
