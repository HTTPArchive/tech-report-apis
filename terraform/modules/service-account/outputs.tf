output "email" {
  description = "Email for the service account"
  value       = google_service_account.service_account.email
}
output "member" {
  description = "The Identity of the service account in the form serviceAccount:{email}. This value is often used to refer to the service account in order to grant IAM permissions."
  value       = google_service_account.service_account.member
}
