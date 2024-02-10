
provider "google" {
  project         = "httparchive"
  region          = "us-east1"
  request_timeout = "60m"
}

terraform {
  backend "gcs" {
    bucket = var.project_bucket
    prefix = "dev"
  }
}

module "backend-api" {
  source = "./../modules/api-gateway"
  environment = "dev"
  project = "httparchive"
  region = "us-east1"
  service_account_email = var.google_service_account_api_gateway
}

module "cwvtech" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "dev"
  source_directory = "../../functions/cwvtech"
  function_name = "cwvtech"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}

module "lighthouse" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "dev"
  source_directory = "../../functions/lighthouse"
  function_name = "lighthouse"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}

module "adoption" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "dev"
  source_directory = "../../functions/adoption"
  function_name = "adoption"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}

module "page-weight" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "dev"
  source_directory = "../../functions/page-weight"
  function_name = "page-weight"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}

module "categories" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "dev"
  source_directory = "../../functions/categories"
  function_name = "categories"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}

module "technologies" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "dev"
  source_directory = "../../functions/technologies"
  function_name = "technologies"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}

module "ranks" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "dev"
  source_directory = "../../functions/ranks"
  function_name = "ranks"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}

module "geos" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "dev"
  source_directory = "../../functions/geos"
  function_name = "geos"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}
