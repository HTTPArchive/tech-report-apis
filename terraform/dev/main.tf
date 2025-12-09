terraform {
  backend "gcs" {
    bucket = "tfstate-httparchive"
    prefix = "tech-report-apis/dev"
  }
}

provider "google" {
  project         = var.project
  region          = var.region
  request_timeout = "60m"
}

module "endpoints" {
  source                      = "./../modules/run-service"
  entry_point                 = "app"
  project                     = var.project
  environment                 = var.environment
  source_directory            = "../../src"
  function_name               = "tech-report-api"
  region                      = var.region
  min_instances               = var.min_instances
  environment_variables = {
    "PROJECT"  = var.project
    "DATABASE" = var.project_database
  }
}
