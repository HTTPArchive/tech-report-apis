terraform {
  required_version = ">=1.11.0"

  backend "gcs" {}

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = ">=4.2.0"
    }
    google = {
      source  = "hashicorp/google"
      version = ">=7.28.0"
    }
    external = {
      source  = "hashicorp/external"
      version = ">=2.3.5"
    }
  }
}

provider "google" {
  project = var.project
  region  = var.region
}

module "endpoints" {
  source                = "./run-service"
  project               = var.project
  environment           = var.environment
  source_directory      = "../"
  dockerfile            = "apps/report-api/Dockerfile"
  service_name          = "report-api"
  service_account_email = var.service_account_email
  region                = var.region
  min_instances         = var.environment == "prod" ? 1 : 0
  ingress_settings      = var.environment == "prod" ? "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER" : "INGRESS_TRAFFIC_ALL"
  timeout               = "3600s"

  artifact_registry_repository_uri = google_artifact_registry_repository.report_api.registry_uri

  environment_variables = {
    "PROJECT"  = var.project
    "DATABASE" = "${var.project_database}prod" // TODO: Update this to use ${var.environment}
  }
}

module "cdn_glb" {
  count = var.environment == "prod" ? 1 : 0

  source = "./cdn-glb"

  project     = var.project
  region      = var.region
  environment = var.environment

  cloud_run_service_name = module.endpoints.name
  domain                 = "cdn.httparchive.org"
  load_balancer_name     = "httparchive-load-balancer"
  name_prefix            = var.name_prefix

  neg_name                   = "report-api-${var.environment}"
  backend_service_name       = "report-api"
  ssl_cert_name              = var.ssl_cert_name
  https_proxy_name           = "httparchive-load-balancer-target-proxy-2"
  https_forwarding_rule_name = "httparchive-load-balancer-forwarding-rule-2"
}

resource "google_alloydb_user" "cloud_run_service_account" {
  count = var.environment == "prod" ? 1 : 0

  cluster   = "projects/${var.project}/locations/${var.region}/clusters/default"
  user_id   = replace(var.service_account_email, ".gserviceaccount.com", "")
  user_type = "ALLOYDB_IAM_USER"

  # IAM users don't require passwords
  database_roles = ["alloydbiamuser"]
}

module "database" {
  count       = var.environment == "prod" ? 1 : 0
  source      = "./database"
  project     = var.project
  region      = var.region
  environment = var.environment
}

moved {
  from = module.endpoints.google_artifact_registry_repository.report_api
  to   = google_artifact_registry_repository.report_api
}

resource "google_artifact_registry_repository" "report_api" {
  provider      = google
  project       = var.project
  location      = var.region
  repository_id = "report-api"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"

    condition {
      older_than = "2592000s" # 30 days
    }
  }

  cleanup_policies {
    id     = "keep-recent-tags"
    action = "KEEP"

    most_recent_versions {
      keep_count = 5
    }
  }
}

module "bigquery_export" {
  count                             = var.environment == "prod" ? 1 : 0
  source                            = "./bigquery-export"
  project                           = var.project
  region                            = var.region
  function_identity                 = var.function_identity
  function_name                     = "bigquery-export"
  source_directory                  = "${path.module}/../"
  artifact_registry_repository_name = google_artifact_registry_repository.report_api.repository_id

  depends_on = [google_artifact_registry_repository.report_api]
}

module "dataform_service" {
  count                             = var.environment == "prod" ? 1 : 0
  source                            = "./dataform-service"
  project                           = var.project
  region                            = var.region
  location                          = var.location
  function_identity                 = var.function_identity
  function_name                     = "dataform-service"
  source_directory                  = "${path.module}/../"
  artifact_registry_repository_name = google_artifact_registry_repository.report_api.repository_id

  depends_on = [google_artifact_registry_repository.report_api]
}

module "masthead_agent" {
  count  = var.environment == "prod" ? 1 : 0
  source = "github.com/masthead-data/terraform-google-masthead-agent?ref=httparchive"

  project_id = var.project

  enable_privatelogviewer_role = false
  enable_apis                  = false

  # Enable only specific modules
  enable_modules = {
    bigquery      = true
    dataform      = true
    dataplex      = true
    analytics_hub = true
  }
}