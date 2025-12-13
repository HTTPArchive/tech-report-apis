terraform {
  backend "gcs" {
    bucket = "tfstate-httparchive"
    prefix = "tech-report-apis/dev"
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
