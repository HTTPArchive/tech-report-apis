terraform {
  required_version = ">=1.11.0"

  backend "gcs" {
    bucket = "tfstate-httparchive"
    prefix = "tech-report-apis/dev"
  }
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
  source           = "./../modules/run-service"
  project          = var.project
  environment      = var.environment
  source_directory = "../../src"
  service_name     = "report-api"
  region           = var.region
  environment_variables = {
    "PROJECT"  = var.project
    "DATABASE" = var.project_database
  }
}
