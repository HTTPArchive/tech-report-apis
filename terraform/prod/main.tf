
provider "google" {
  project         = "httparchive"
  region          = "us-east1"
  request_timeout = "60m"
}

terraform {
  backend "gcs" {
    bucket = "tf-state-backingapi-20230314"
    prefix = "prod"
  }
}

resource "google_api_gateway_api" "api" {
  provider     = google-beta
  api_id       = "api-gw-prod"
  display_name = "The prod API Gateway"
  project      = "httparchive"
}

resource "google_api_gateway_api_config" "api_config" {
  provider             = google-beta
  api                  = google_api_gateway_api.api.api_id
  api_config_id_prefix = "api"
  project              = "httparchive"
  display_name         = "The prod Config"
  openapi_documents {
    document {
      path     = "spec.yaml"
      contents = base64encode(<<-EOF
swagger: "2.0"
info:
  title: reports-backend-api
  description: API tech report
  version: 1.0.0
schemes:
  - https
produces:
  - application/json
paths:
  /v1/categories:
    get:
      summary: categories
      operationId: getCategories
      x-google-backend:
        address: https://us-east1-httparchive.cloudfunctions.net/categories-prod
        deadline: 60
      # security:
      #   - api_key: []
      responses:
        200:
          description: String
  /v1/adoption:
    get:
      summary: adoption
      operationId: getadoptionReports
      x-google-backend:
        address: https://us-east1-httparchive.cloudfunctions.net/adoption-prod
        deadline: 60
      # security:
      #   - api_key: []
      responses:
        200:
          description: String
  /v1/page-weight:
    get:
      summary: pageWeight
      operationId: getpageWeight
      x-google-backend:
        address: https://us-east1-httparchive.cloudfunctions.net/page-weight-prod
        deadline: 60
      # security:
      #   - api_key: []
      responses:
        200:
          description: String
  /v1/lighthouse:
    get:
      summary: lighthouse
      operationId: getLighthouseReports
      x-google-backend:
        address: https://us-east1-httparchive.cloudfunctions.net/lighthouse-prod
        deadline: 60
      # security:
      #   - api_key: []
      responses:
        200:
          description: String
  /v1/cwv:
    get:
      summary: cwv
      operationId: getCwv
      x-google-backend:
        address: https://us-east1-httparchive.cloudfunctions.net/cwvtech-prod
        deadline: 60
      # security:
      #   - api_key: []
      responses:
        200:
          description: String
  /v1/ranks:
    get:
      summary: ranks
      operationId: getRanks
      x-google-backend:
        address: https://us-east1-httparchive.cloudfunctions.net/ranks-prod
        deadline: 60
      # security:
      #   - api_key: []
      responses:
        200:
          description: String
  /v1/geos:
    get:
      summary: geos
      operationId: getGeos
      x-google-backend:
        address: https://us-east1-httparchive.cloudfunctions.net/geos-prod
        deadline: 60
      # security:
      #   - api_key: []
      responses:
        200:
          description: String
  /v1/technologies:
    get:
      summary: geos
      operationId: getTechnologies
      x-google-backend:
        address: https://us-east1-httparchive.cloudfunctions.net/technologies-prod
        deadline: 60
      # security:
      #   - api_key: []
      responses:
        200:
          description: String
EOF
      )
    }
  }
  gateway_config {
    backend_config {
      google_service_account = var.google_service_account_api_gateway
    }
  }
}

resource "google_api_gateway_gateway" "gateway" {
  provider     = google-beta
  project      = "httparchive"
  region       = "us-east1"
  api_config   = google_api_gateway_api_config.api_config.id
  gateway_id   = "prod-gw"
  display_name = "prod Api Gateway"
  labels = {
    owner       = "tech_report_api"
    environment = "prod"
  }
  depends_on = [google_api_gateway_api_config.api_config]
  lifecycle {
    replace_triggered_by = [
      google_api_gateway_api_config.api_config
    ]
  }
}

module "cwvtech" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "prod"
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
  environment = "prod"
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
  environment = "prod"
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
  environment = "prod"
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
  environment = "prod"
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
  environment = "prod"
  source_directory = "../../functions/technologies"
  function_name = "technologies"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  min_instances = var.min_instances
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}

module "ranks" {
  source = "./../modules/cloud-function"
  entry_point = "dispatcher"
  project = "httparchive"
  environment = "prod"
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
  environment = "prod"
  source_directory = "../../functions/geos"
  function_name = "geos"
  service_account_email = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  environment_variables = {
    "PROJECT" = "httparchive",
    "DATABASE" = var.project_database
  }
}
