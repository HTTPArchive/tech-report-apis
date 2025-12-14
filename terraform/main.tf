terraform {
  required_version = ">=1.11.0"

  backend "gcs" {}

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = ">=3.6.2"
    }
    google = {
      source  = "hashicorp/google"
      version = ">=7.13.0"
    }
  }
}

provider "google" {
  project = var.project
  region  = var.region
}

module "endpoints" {
  source           = "./run-service"
  project          = var.project
  environment      = var.environment
  source_directory = "../src"
  service_name     = "report-api"
  region           = var.region
  min_instances    = var.environment == "prod" ? 1 : 0
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
  name_prefix            = "report-api"

  neg_name                   = "report-api-${var.environment}"
  backend_service_name       = "report-api"
  ssl_cert_name              = "google-managed2"
  https_proxy_name           = "httparchive-load-balancer-target-proxy-2"
  https_forwarding_rule_name = "httparchive-load-balancer-forwarding-rule-2"
}
