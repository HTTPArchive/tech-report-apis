terraform {
  backend "gcs" {
    bucket = "tfstate-httparchive"
    prefix = "tech-report-apis/prod"
  }
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.6.2"
    }
    google = {
      source = "hashicorp/google"
    }
  }
}

provider "google" {
  project         = var.project
  region          = var.region
  request_timeout = "60m"
}

module "endpoints" {
  source           = "./../modules/run-service"
  entry_point      = "app"
  project          = var.project
  environment      = var.environment
  source_directory = "../../src"
  service_name    = "tech-report-api"
  region           = var.region
  min_instances    = var.min_instances
  environment_variables = {
    "PROJECT"  = var.project
    "DATABASE" = var.project_database
  }
}

module "cdn_glb" {
  source = "./../modules/cdn-glb"

  project     = var.project
  region      = var.region
  environment = var.environment

  cloud_run_service_name = module.endpoints.name
  domain                 = var.cdn_domain
  load_balancer_name     = var.load_balancer_name
  name_prefix            = "report-api"

  # Resource name overrides to match existing resources
  neg_name                   = "report-api-prod"
  backend_service_name       = "report-api"
  ssl_cert_name              = "google-managed2"
  https_proxy_name           = "httparchive-load-balancer-target-proxy-2"
  http_proxy_name            = "httparchive-load-balancer-target-proxy"
  https_forwarding_rule_name = "httparchive-load-balancer-forwarding-rule-2"
  http_forwarding_rule_name  = "httparchive-load-balancer-forwarding-rule"
}
