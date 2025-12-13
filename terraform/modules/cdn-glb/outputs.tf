output "load_balancer_ip_http" {
  description = "The IP address of the HTTP load balancer"
  value       = google_compute_global_forwarding_rule.http_forwarding_rule.ip_address
}

output "load_balancer_ip_https" {
  description = "The IP address of the HTTPS load balancer"
  value       = google_compute_global_forwarding_rule.https_forwarding_rule.ip_address
}

output "backend_service_id" {
  description = "The ID of the backend service"
  value       = google_compute_backend_service.backend.id
}

output "url_map_id" {
  description = "The ID of the URL map"
  value       = google_compute_url_map.url_map.id
}

output "ssl_certificate_id" {
  description = "The ID of the SSL certificate"
  value       = google_compute_managed_ssl_certificate.ssl_cert.id
}

output "neg_id" {
  description = "The ID of the serverless NEG"
  value       = google_compute_region_network_endpoint_group.serverless_neg.id
}

output "security_policy_id" {
  description = "The ID of the Cloud Armor security policy"
  value       = google_compute_security_policy.security_policy.id
}
