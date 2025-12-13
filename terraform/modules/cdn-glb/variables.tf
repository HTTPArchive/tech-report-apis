variable "project" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for the Cloud Run service"
  type        = string
  default     = "us-central1"
}
variable "environment" {
  description = "The 'Environment' that is being created/deployed. Applied as a suffix to many resources."
  type        = string
}

variable "cloud_run_service_name" {
  description = "The name of the Cloud Run service to route traffic to"
  type        = string
}

variable "domain" {
  description = "The domain name for the SSL certificate"
  type        = string
}

variable "name_prefix" {
  description = "Prefix for naming resources"
  type        = string
  default     = "report-api"
}

variable "load_balancer_name" {
  description = "Name for the load balancer (URL map)"
  type        = string
}

# CDN Configuration
variable "enable_cdn" {
  description = "Whether to enable CDN for the backend service"
  type        = bool
  default     = true
}

variable "cdn_cache_mode" {
  description = "CDN cache mode (CACHE_ALL_STATIC, USE_ORIGIN_HEADERS, FORCE_CACHE_ALL)"
  type        = string
  default     = "CACHE_ALL_STATIC"
}

variable "cdn_default_ttl" {
  description = "Default TTL for cached content in seconds"
  type        = number
  default     = 2592000 # 30 days
}

variable "cdn_max_ttl" {
  description = "Maximum TTL for cached content in seconds"
  type        = number
  default     = 2592000 # 30 days
}

variable "cdn_client_ttl" {
  description = "Client TTL for cached content in seconds (browser cache)"
  type        = number
  default     = 28800 # 8 hours
}

variable "cdn_serve_while_stale" {
  description = "Time to serve stale content while revalidating in seconds"
  type        = number
  default     = 0
}

variable "cdn_negative_caching" {
  description = "Whether to enable negative caching"
  type        = bool
  default     = false
}

# Resource naming overrides (for importing existing resources)
variable "neg_name" {
  description = "Name for the serverless NEG (overrides name_prefix-neg)"
  type        = string
  default     = null
}

variable "backend_service_name" {
  description = "Name for the backend service (overrides name_prefix)"
  type        = string
  default     = null
}

variable "ssl_cert_name" {
  description = "Name for the SSL certificate (overrides name_prefix-ssl-cert)"
  type        = string
  default     = null
}

variable "https_proxy_name" {
  description = "Name for the HTTPS proxy (overrides load_balancer_name-target-proxy)"
  type        = string
  default     = null
}

variable "http_proxy_name" {
  description = "Name for the HTTP proxy"
  type        = string
  default     = null
}

variable "https_forwarding_rule_name" {
  description = "Name for the HTTPS forwarding rule"
  type        = string
  default     = null
}

variable "http_forwarding_rule_name" {
  description = "Name for the HTTP forwarding rule"
  type        = string
  default     = null
}
