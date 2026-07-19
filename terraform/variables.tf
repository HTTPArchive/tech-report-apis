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
}
variable "project_database" {
  type        = string
  description = "The database name"
  default     = "tech-report-api-"
}
variable "service_account_email" {
  type        = string
  description = "Service account who can invoke the endpoint and is admin of the DB. This is required!"
  default     = "cloud-function@httparchive.iam.gserviceaccount.com"
}
variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
  default     = "report-api"
}

variable "ssl_cert_name" {
  description = "Name of the SSL certificate"
  type        = string
  default     = "google-managed2"
}

# Migrated from dataform infra variables
variable "project_number" {
  description = "GCP project number"
  type        = string
  default     = "226352634162"
}

variable "location" {
  description = "GCP location"
  type        = string
  default     = "us"
}

variable "function_identity" {
  default = "cloud-function@httparchive.iam.gserviceaccount.com"
  type    = string
}

variable "dataform_service_account_email" {
  default = "service-226352634162@gcp-sa-dataform.iam.gserviceaccount.com"
  type    = string
}

variable "edit_datasets" {
  default = [
    "crawl_staging",
    "crawl",
    "sample_data",
    "latest",
    "wappalyzer",

    // Reports
    "blink_features",
    "reports",

    // Flattened tables for F1
    "f1",

    // Service
    "dataform_assertions",
  ]
  type = list(string)
}

variable "dataform_service_account_roles" {
  type = list(string)
  default = [
    "roles/bigquery.user",
    "roles/bigquery.connectionUser",
    "roles/bigquery.dataViewer",
    "roles/bigquery.resourceAdmin",
  ]
}

variable "notification_channel_id" {
  description = "GCP monitoring notification channel ID"
  type        = string
  default     = "1661619523289991065"
}
