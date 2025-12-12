terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.6.2"
    }
    google = {
      source = "hashicorp/google"
    }
    archive = {
      source = "hashicorp/archive"
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

locals {
  bucketName = "gcf-v2-uploads-226352634162-us-central1"
}

data "archive_file" "source" {
  count       = var.environment != "dev" ? 1 : 0
  type        = "zip"
  source_dir  = var.source_directory
  output_path = "/tmp/${var.function_name}.zip"
}
resource "google_storage_bucket_object" "zip" {
  count  = var.environment != "dev" ? 1 : 0
  name   = "${var.environment}-${var.function_name}-${data.archive_file.source[0].output_sha}"
  bucket = local.bucketName
  source = data.archive_file.source[0].output_path
}

resource "google_cloudfunctions2_function" "function" {
  count    = var.environment != "dev" ? 1 : 0
  name     = "${var.function_name}-${var.environment}"
  location = var.region

  build_config {
    runtime     = "nodejs22"
    entry_point = var.entry_point

    source {
      storage_source {
        bucket = local.bucketName
        object = google_storage_bucket_object.zip[0].name
      }
    }
  }

  service_config {
    all_traffic_on_latest_revision = true
    available_memory               = var.available_memory
    available_cpu                  = var.available_cpu
    ingress_settings               = var.ingress_settings

    environment_variables = var.environment_variables

    min_instance_count               = var.min_instances
    max_instance_count               = var.max_instances
    timeout_seconds                  = 60
    max_instance_request_concurrency = var.max_instance_request_concurrency
    service_account_email            = var.service_account_email
  }

  labels = {
    owner       = var.service_name
    environment = var.environment
  }

  depends_on = [
    google_storage_bucket_object.zip
  ]
}

data "google_cloud_run_service" "run-service" {
  count      = var.environment != "dev" ? 1 : 0
  name       = google_cloudfunctions2_function.function[0].name
  location   = var.region
  depends_on = [google_cloudfunctions2_function.function]
}


resource "google_cloud_run_v2_service_iam_member" "allow_unauthenticated" {
  count    = var.environment != "dev" ? 1 : 0
  project  = var.project
  location = var.region
  name     = data.google_cloud_run_service.run-service[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Native run service


# Calculate hash of source files to determine if rebuild is needed
locals {
  source_files = fileset(path.root, "${var.source_directory}/*")
  source_hash  = substr(sha1(join("", [for f in local.source_files : filesha1(f)])), 0, 8)
}

# Build Docker image
resource "docker_image" "function_image" {
  name = "${var.region}-docker.pkg.dev/${var.project}/report-api/${var.service_name}:${local.source_hash}"

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
