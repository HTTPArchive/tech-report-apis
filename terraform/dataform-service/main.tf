resource "google_cloud_run_v2_service" "dataform_service" {
  name                = var.function_name
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = docker_registry_image.registry_image.name

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }
    }

    service_account                  = var.function_identity
    timeout                          = "300s"
    max_instance_request_concurrency = 80
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_cloud_run_v2_service_iam_member" "member" {
  project  = var.project
  location = google_cloud_run_v2_service.dataform_service.location
  name     = google_cloud_run_v2_service.dataform_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.function_identity}"
}
