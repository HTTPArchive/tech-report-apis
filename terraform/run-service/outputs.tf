output "name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.service.name
}
