variable "project" {
  type = string
}

variable "region" {
  type = string
}

variable "function_identity" {
  type = string
}

variable "function_name" {
  type = string
}

variable "source_directory" {
  type = string
}

variable "artifact_registry_repository_name" {
  type        = string
  description = "The name of the Artifact Registry repository to use for Docker images"
  default     = "report-api"
}

