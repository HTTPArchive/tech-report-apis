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
  project = var.project
  region  = var.region
}

module "endpoints" {
  source           = "./../modules/run-service"
  project          = var.project
  environment      = var.environment
  source_directory = "../../src"
  service_name     = "report-api"
  region           = var.region
  min_instances    = 1
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
  domain                 = "cdn.httparchive.org"
  load_balancer_name     = "httparchive-load-balancer"
  name_prefix            = var.name_prefix

  neg_name                   = "report-api-prod"
  backend_service_name       = "report-api"
  ssl_cert_name              = var.ssl_cert_name
  https_proxy_name           = "httparchive-load-balancer-target-proxy-2"
  https_forwarding_rule_name = "httparchive-load-balancer-forwarding-rule-2"
}
