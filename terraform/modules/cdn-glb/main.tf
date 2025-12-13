# Serverless Network Endpoint Group (NEG) for Cloud Run
resource "google_compute_region_network_endpoint_group" "serverless_neg" {
  name                  = coalesce(var.neg_name, "${var.name_prefix}-${var.environment}")
  region                = var.region
  project               = var.project
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = var.cloud_run_service_name
  }
}

# Backend Service with CDN
resource "google_compute_backend_service" "backend" {
  name                            = coalesce(var.backend_service_name, var.name_prefix)
  project                         = var.project
  compression_mode                = "AUTOMATIC"
  protocol                        = "HTTPS"
  load_balancing_scheme           = "EXTERNAL_MANAGED"
  timeout_sec                     = 30
  connection_draining_timeout_sec = 0
  locality_lb_policy              = "ROUND_ROBIN"
  security_policy                 = google_compute_security_policy.security_policy.id

  enable_cdn = var.enable_cdn

  dynamic "cdn_policy" {
    for_each = var.enable_cdn ? [1] : []
    content {
      cache_mode                   = var.cdn_cache_mode
      default_ttl                  = var.cdn_default_ttl
      max_ttl                      = var.cdn_max_ttl
      client_ttl                   = var.cdn_client_ttl
      serve_while_stale            = var.cdn_serve_while_stale
      negative_caching             = var.cdn_negative_caching
      signed_url_cache_max_age_sec = 0

      cache_key_policy {
        include_host         = false
        include_protocol     = false
        include_query_string = true
      }
    }
  }

  backend {
    group                        = google_compute_region_network_endpoint_group.serverless_neg.id
    balancing_mode               = "UTILIZATION"
    capacity_scaler              = 1
    max_connections              = 0
    max_connections_per_endpoint = 0
    max_connections_per_instance = 0
    max_rate                     = 0
    max_rate_per_endpoint        = 0
    max_rate_per_instance        = 0
    max_utilization              = 0
  }

  log_config {
    enable      = true
    sample_rate = 0.1
  }
}

# URL Map (Load Balancer)
resource "google_compute_url_map" "url_map" {
  name            = var.load_balancer_name
  project         = var.project
  default_service = google_compute_backend_service.backend.id
}

# Google-managed SSL Certificate
resource "google_compute_managed_ssl_certificate" "ssl_cert" {
  name    = coalesce(var.ssl_cert_name, "${var.name_prefix}-ssl-cert")
  project = var.project

  managed {
    domains = [var.domain]
  }
}

# HTTPS Target Proxy
resource "google_compute_target_https_proxy" "https_proxy" {
  name             = coalesce(var.https_proxy_name, "${var.load_balancer_name}-target-proxy")
  project          = var.project
  url_map          = google_compute_url_map.url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.ssl_cert.id]
  quic_override    = "ENABLE"
}


# Global Forwarding Rule for HTTPS
# Org constraint: Forwarding Rule projects/httparchive/global/forwardingRules/httparchive-load-balancer-http-forwarding-rule of type EXTERNAL_HTTP_HTTPS is not allowed
resource "google_compute_global_forwarding_rule" "https_forwarding_rule" {
  name                                                         = coalesce(var.https_forwarding_rule_name, "${var.load_balancer_name}-https-forwarding-rule")
  project                                                      = var.project
  target                                                       = google_compute_target_https_proxy.https_proxy.id
  port_range                                                   = "443-443"
  ip_protocol                                                  = "TCP"
  ip_address                                                   = "35.190.12.254"
  ip_version                                                   = "IPV4"
  source_ip_ranges                                             = []
  load_balancing_scheme                                        = "EXTERNAL_MANAGED"
  external_managed_backend_bucket_migration_testing_percentage = 0
  network_tier                                                 = "PREMIUM"

  lifecycle {
    prevent_destroy = true
  }
}
