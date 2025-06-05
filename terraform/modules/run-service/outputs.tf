
output "name" {
  description = "Name of the Cloud Function"
  value       = google_cloudfunctions2_function.function.name
}
