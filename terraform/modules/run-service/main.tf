terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = ">= 3.6.2"
    }
  }
}

# Calculate hash of source files to determine if rebuild is needed
locals {
  source_files = fileset(path.root, "${var.source_directory}/*")
  source_hash  = substr(sha1(join("", [for f in local.source_files : filesha1(f)])), 0, 8)
}

# Build Docker image
resource "docker_image" "function_image" {
  name = "${var.region}-docker.pkg.dev/${var.project}/tech-report-api/${var.service_name}:${local.source_hash}"

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
  ingress             = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = var.service_account_email

    containers {
      image = docker_registry_image.registry_image.name
      resources {
        limits = {
          cpu    = var.available_cpu
          memory = var.available_memory_gb
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
    timeout                          = var.timeout
    max_instance_request_concurrency = var.max_instance_request_concurrency
  }
  scaling {
    min_instance_count = var.min_instances
  }
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
  labels = {
    owner       = "tech_report_api"
    environment = var.environment
  }
}

resource "google_cloud_run_v2_service_iam_member" "variable_service_account_run_invoker" {
  project  = var.project
  location = var.region
  name     = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.service_account_email}"
}

resource "google_cloud_run_v2_service_iam_member" "api_gw_variable_service_account_run_invoker" {
  project  = var.project
  location = var.region
  name     = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.service_account_api_gateway}"
}
