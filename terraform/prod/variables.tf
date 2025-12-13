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
  default     = "prod"
}
variable "project_database" {
  type        = string
  description = "The database name"
  default     = "tech-report-api-prod"
}
