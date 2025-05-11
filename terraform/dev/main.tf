terraform {
  backend "gcs" {
    bucket = "tf-state-backingapi-20230314"
    prefix = "dev"
  }
}

provider "google" {
  project         = var.project
  region          = var.region
  request_timeout = "60m"
}

resource "google_api_gateway_api" "api" {
  provider     = google-beta
  api_id       = "api-gw-dev"
  display_name = "The dev API Gateway"
  project      = var.project
}

# A Configuration, consisting of an OpenAPI specification
resource "google_api_gateway_api_config" "api_config" {
  provider             = google-beta
  api                  = google_api_gateway_api.api.api_id
  api_config_id_prefix = "api"
  project              = var.project
  display_name         = "The dev Config"
  openapi_documents {
    document {
      path = "spec.yaml"
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
x-google-backend:
  address: https://us-central1-httparchive.cloudfunctions.net/tech-report-api-dev
  deadline: 60
  path_translation: APPEND_PATH_TO_ADDRESS
  protocol: h2
paths:
  /categories:
    get:
      summary: categories
      operationId: getCategories
      responses:
        200:
          description: String
  /v1/adoption:
    get:
      summary: adoption
      operationId: getadoptionReports
      responses:
        200:
          description: String
  /v1/page-weight:
    get:
      summary: pageWeight
      operationId: getpageWeight
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
      operationId: getCwv
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
# The actual API Gateway
resource "google_api_gateway_gateway" "gateway" {
  provider     = google-beta
  project      = var.project
  region       = var.region
  api_config   = google_api_gateway_api_config.api_config.id
  gateway_id   = "dev-gw"
  display_name = "devApi Gateway"
  labels = {
    owner       = "tech_report_api"
    environment = var.environment
  }
  depends_on = [google_api_gateway_api_config.api_config]
  lifecycle {
    replace_triggered_by = [
      google_api_gateway_api_config.api_config
    ]
  }
}

module "endpoints" {
  source                           = "./../modules/run-service"
  entry_point                      = "app"
  project                          = var.project
  environment                      = var.environment
  source_directory                 = "../../src"
  function_name                    = "tech-report-api"
  region                           = var.region
  service_account_email            = var.google_service_account_cloud_functions
  service_account_api_gateway      = var.google_service_account_api_gateway
  max_instance_request_concurrency = var.max_instance_request_concurrency
  min_instances                    = var.min_instances
  environment_variables = {
    "PROJECT"  = var.project
    "DATABASE" = var.project_database
  }
}
