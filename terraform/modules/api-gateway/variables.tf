variable "environment" {
  description = "The 'Environment' that is being created/deployed. Applied as a suffix to many resources."
  type        = string
  default = "dev"
}
variable "project" {
  description = "The ID of the project in which the resource belongs. If it is not provided, the provider project is used."
  type        = string
}
variable "region" {
  description = "The Region of this resource"
  type        = string
}
variable "service_account_email" {
  description = "Email of the service account associated with and to run the API Gateway"
  type        = string
}
variable "spec_yaml" {
  description = "The OpenAPI specification for the API Gateway"
  type        = string
}
