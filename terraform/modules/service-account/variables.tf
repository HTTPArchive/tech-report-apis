variable "project" {
  description = "The ID of the project in which the resource belongs. If it is not provided, the provider project is used."
  type        = string
}
variable "name" {
  type        = string
  description = "The Name of the Service Account"
}
variable "display_name" {
  type        = string
  description = "Display Name of the Service Account"
}
variable "permissions" {
  default     = []
  type        = list(string)
  description = "A list of IAM Permissions for the Service Account"
}