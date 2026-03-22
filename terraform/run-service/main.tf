terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
    }
  }
}

# Get access token for Artifact Registry authentication
data "google_client_config" "default" {}

# Configure Docker provider with GCP Artifact Registry authentication
provider "docker" {
  registry_auth {
    address  = "${var.region}-docker.pkg.dev"
    username = "oauth2accesstoken"
    password = data.google_client_config.default.access_token
  }
}

# Calculate hash of source files using git (respects .gitignore)
data "external" "source_hash" {
  program = ["bash", "-c", "cd ${var.source_directory} && echo '{\"hash\":\"'$(git ls-files -s | sha1sum | cut -c1-8)'\"}'"]
}

# Build Docker image
resource "docker_image" "function_image" {
  # hash added to image tag to force rebuilds ans service image updates when source changes
  name = "${var.region}-docker.pkg.dev/${var.project}/report-api/${var.service_name}:${data.external.source_hash.result.hash}"

  build {
    context    = var.source_directory
    dockerfile = "Dockerfile"
    platform   = "linux/amd64"
  }
}

resource "docker_registry_image" "registry_image" {
  name = docker_image.function_image.name
}

resource "google_cloud_run_v2_service" "service" {
  name     = "${var.service_name}-${var.environment}"
  location = var.region

  deletion_protection = false
  ingress             = var.ingress_settings

  template {
    service_account = var.service_account_email
    timeout                          = var.timeout
    max_instance_request_concurrency = var.max_instance_request_concurrency

    containers {
      image = docker_registry_image.registry_image.name
      resources {
        cpu_idle = var.environment == "prod" ? false : true
        limits = {
          cpu    = var.available_cpu
          memory = var.available_memory
        }
      }
      dynamic "env" {
        for_each = var.environment_variables
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }
  scaling {
    scaling_mode       = "AUTOMATIC"
    min_instance_count = var.min_instances
  }
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
  labels = {
    owner       = var.service_name
    environment = var.environment
  }
}

resource "google_cloud_run_v2_service_iam_member" "allow_unauthenticated_report_api" {
  project  = var.project
  location = var.region
  name     = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
