# Used to expose Internal resources to external sources, such as web applications
# See https://cloud.google.com/api-gateway/docs for more information

terraform {
  required_providers {
    docker = {
      source  = "hashicorp/google-beta"
      version = ">= 6.38.0"
    }
  }
}

# The API used by the Gateway
resource "google_api_gateway_api" "api" {
  provider     = google-beta
  api_id       = "reports-api-${var.environment}"
  display_name = "Reports API Gateway ${var.environment}"
  project      = var.project
}

# A Configuration, consisting of an OpenAPI specification
resource "google_api_gateway_api_config" "api_config" {
  provider             = google-beta
  api                  = google_api_gateway_api.api.api_id
  api_config_id_prefix = "reports-api-config-${var.environment}"
  project              = var.project
  display_name         = "Reports API Config ${var.environment}"
  openapi_documents {
    document {
      path     = "spec.yaml"
      contents = base64encode(var.spec_yaml)
    }
  }
  gateway_config {
    backend_config {
      google_service_account = var.service_account_email
    }
  }
}
# The actual API Gateway
resource "google_api_gateway_gateway" "gateway" {
  provider     = google-beta
  project      = var.project
  region       = var.region
  api_config   = google_api_gateway_api_config.api_config.id
  gateway_id   = "reports-${var.environment}"
  display_name = "Reports API Gateway ${var.environment}"
  labels = {
    owner       = "tech_report_api"
    environment = var.environment
  }

  lifecycle {
    replace_triggered_by = [
      google_api_gateway_api_config.api_config
    ]
  }
}
