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
variable "min_instances" {
  description = "(Optional) The limit on the minimum number of function instances that may coexist at a given time."
  type        = number
  default     = 1
}

variable "cdn_domain" {
  description = "The domain name for the CDN SSL certificate"
  type        = string
  default     = "cdn.httparchive.org"
}

variable "load_balancer_name" {
  description = "The name for the load balancer (URL map)"
  type        = string
  default     = "httparchive-load-balancer"
}
