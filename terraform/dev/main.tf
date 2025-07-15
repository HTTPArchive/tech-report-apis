terraform {
  backend "gcs" {
    bucket = "tfstate-httparchive"
    prefix = "tech-report-apis/dev"
  }

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = ">= 3.6.2"
    }
  }
}

provider "google" {
  project         = var.project
  region          = var.region
  request_timeout = "60m"
}

provider "google-beta" {
  project         = var.project
  region          = var.region
}

# Get current Google Cloud access token
data "google_client_config" "default" {}

# Configure Docker provider with Artifact Registry authentication
provider "docker" {
  registry_auth {
    address  = "${var.region}-docker.pkg.dev"
    username = "oauth2accesstoken"
    password = data.google_client_config.default.access_token
  }
}

module "gateway" {
  source                      = "./../modules/api-gateway"
  project                     = var.project
  environment                 = var.environment
  region                      = var.region
  service_account_email       = var.google_service_account_api_gateway
  spec_yaml                   = <<EOF
swagger: "2.0"
info:
  title: reports_api_config_dev
  version: 1.0.0
schemes:
  - https
produces:
  - application/json
x-google-backend:
  address: https://us-central1-httparchive.cloudfunctions.net/tech-report-api-dev
  deadline: 60
  path_translation: APPEND_PATH_TO_ADDRESS
  protocol: h2
paths:
  /v1/categories:
    get:
      summary: categories
      operationId: getCategories
      responses:
        200:
          description: String
  /v1/adoption:
    get:
      summary: adoption
      operationId: getAdoptionReports
      responses:
        200:
          description: String
  /v1/page-weight:
    get:
      summary: pageWeight
      operationId: getPageWeightReports
      responses:
        200:
          description: String
  /v1/lighthouse:
    get:
      summary: lighthouse
      operationId: getLighthouseReports
      responses:
        200:
          description: String
  /v1/cwv:
    get:
      summary: cwv
      operationId: getCWVReports
      responses:
        200:
          description: String
  /v1/ranks:
    get:
      summary: ranks
      operationId: getRanks
      responses:
        200:
          description: String
  /v1/geos:
    get:
      summary: geos
      operationId: getGeos
      responses:
        200:
          description: String
  /v1/technologies:
    get:
      summary: technologies
      operationId: getTechnologies
      responses:
        200:
          description: String
  /v1/versions:
    get:
      summary: versions
      operationId: getVersions
      responses:
        200:
          description: String
  /v1/audits:
    get:
      summary: audits
      operationId: getAuditReports
      responses:
        200:
          description: String
EOF
}

module "endpoints" {
  source                      = "./../modules/run-service"
  entry_point                 = "app"
  project                     = var.project
  environment                 = var.environment
  source_directory            = "../../src"
  function_name               = "tech-report-api"
  region                      = var.region
  service_account_email       = var.google_service_account_cloud_functions
  service_account_api_gateway = var.google_service_account_api_gateway
  min_instances               = var.min_instances
  environment_variables = {
    "PROJECT"  = var.project
    "DATABASE" = var.project_database
  }
}

moved {
  from = google_api_gateway_api.api
  to = module.gateway.google_api_gateway_api.api
}

moved {
  from = google_api_gateway_api_config.api_config
  to = module.gateway.google_api_gateway_api_config.api_config
}

moved {
  from = google_api_gateway_gateway.gateway
  to = module.gateway.google_api_gateway_gateway.gateway
}
