locals {
  bucketName = "gcf-v2-uploads-226352634162-us-central1"
}
data "archive_file" "source" {
  type        = "zip"
  source_dir  = var.source_directory
  output_path = "/tmp/${var.function_name}.zip"
}
resource "google_storage_bucket_object" "zip" {
  name   = "${var.environment}-${var.function_name}-${data.archive_file.source.output_sha}"
  bucket = local.bucketName
  source = data.archive_file.source.output_path
}

resource "google_cloudfunctions2_function" "function" {
  name     = "${var.function_name}-${var.environment}"
  location = var.region

  build_config {
    runtime     = "nodejs22"
    entry_point = var.entry_point

    source {
      storage_source {
        bucket = local.bucketName
        object = google_storage_bucket_object.zip.name
      }
    }
  }

  service_config {
    all_traffic_on_latest_revision = true
    available_memory               = var.available_memory_mb
    available_cpu                  = var.available_cpu
    ingress_settings               = var.ingress_settings

    environment_variables = var.environment_variables

    min_instance_count               = var.min_instances
    max_instance_count               = var.max_instances
    timeout_seconds                  = var.timeout
    max_instance_request_concurrency = var.max_instance_request_concurrency
    service_account_email            = var.service_account_email
  }

  labels = {
    owner       = "tech_report_api"
    environment = var.environment
  }

  depends_on = [
    google_storage_bucket_object.zip
  ]
}

resource "google_cloudfunctions2_function_iam_member" "variable_service_account_function_invoker" {
  project        = google_cloudfunctions2_function.function.project
  location       = google_cloudfunctions2_function.function.location
  cloud_function = google_cloudfunctions2_function.function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${var.service_account_email}"
  depends_on     = [google_cloudfunctions2_function.function]
}
data "google_cloud_run_service" "run-service" {
  name       = google_cloudfunctions2_function.function.name
  location   = var.region
  depends_on = [google_cloudfunctions2_function.function]
}
resource "google_cloud_run_v2_service_iam_member" "variable_service_account_run_invoker" {
  project  = var.project
  location = var.region
  name     = data.google_cloud_run_service.run-service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.service_account_email}"
}

resource "google_cloudfunctions2_function_iam_member" "api_gw_variable_service_account_function_invoker" {
  project        = google_cloudfunctions2_function.function.project
  location       = google_cloudfunctions2_function.function.location
  cloud_function = google_cloudfunctions2_function.function.name
  role           = "roles/cloudfunctions.invoker"
  member     = "serviceAccount:${var.service_account_api_gateway}"
  depends_on = [google_cloudfunctions2_function.function]
}

resource "google_cloud_run_v2_service_iam_member" "api_gw_variable_service_account_run_invoker" {
  project  = var.project
  location = var.region
  name     = data.google_cloud_run_service.run-service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.service_account_api_gateway}"
}







