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
    "urls",

    // Reports
    "blink_features",
    "reports",
    "performance",

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

variable "cloud_build_service_account_email" {
  description = "Cloud Build custom service account email"
  type        = string
  default     = "cloud-build@httparchive.iam.gserviceaccount.com"
}

# Cloud Composer (Airflow) variables
variable "composer_environment_name" {
  description = "Name of the Cloud Composer environment"
  type        = string
  default     = "httparchive-pipelines"
}

variable "composer_image_version" {
  description = "Cloud Composer 3 image version"
  type        = string
  default     = "composer-3-airflow-2"
}

variable "composer_service_account_id" {
  description = "Service account ID for Cloud Composer workloads"
  type        = string
  default     = "composer-worker"
}

variable "github_actions_service_account_email" {
  description = "GitHub Actions service account email for CI/CD deployments"
  type        = string
  default     = "github-actions@httparchive.iam.gserviceaccount.com"
}

variable "github_actions_roles" {
  description = "IAM roles for GitHub Actions service account"
  type        = list(string)
  default = [
    "roles/alloydb.admin",
    "roles/appengine.deployer",
    "roles/appengine.serviceAdmin",
    "roles/artifactregistry.admin",
    "roles/artifactregistry.repoAdmin",
    "roles/cloudbuild.builds.builder",
    "roles/compute.loadBalancerAdmin",
    "roles/firebasehosting.admin",
    "roles/iam.networkAdmin",
    "roles/iam.serviceAccountUser",
    "roles/run.admin",
    "roles/serviceusage.serviceUsageConsumer",
    "roles/storage.objectUser",
    "roles/viewer",
  ]
}

variable "notification_channel_email_id" {
  description = "GCP monitoring email notification channel ID (max@httparchive.org)"
  type        = string
  default     = "2962704572107492637"
}

variable "report_api_monitoring_service_id" {
  description = "Cloud Monitoring Service ID for report-api-prod"
  type        = string
  default     = "ObpWvlN7Tt-qYzcMbOIkag"
}
