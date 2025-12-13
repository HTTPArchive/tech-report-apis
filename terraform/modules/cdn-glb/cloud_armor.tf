# Cloud Armor Security Policy
resource "google_compute_security_policy" "security_policy" {
  name        = "${var.name_prefix}-backend-security-policy"
  project     = var.project
  description = "Backend security policy for ${var.name_prefix}"
  type        = "CLOUD_ARMOR"
}

# Deny non-GET methods - priority 2147483625
resource "google_compute_security_policy_rule" "deny_non_get" {
  security_policy = google_compute_security_policy.security_policy.name
  project         = var.project
  action          = "deny(403)"
  priority        = 2147483625
  preview         = false
  description     = "Deny non-GET methods"

  match {
    expr {
      expression = "request.method.upper() != 'GET'"
    }
  }
}

# Block requests except whitelisted hosts - priority 2147483635
resource "google_compute_security_policy_rule" "block_non_whitelisted_hosts" {
  security_policy = google_compute_security_policy.security_policy.name
  project         = var.project
  action          = "deny(403)"
  priority        = 2147483635
  preview         = false
  description     = "Block requests except whitelisted hosts"

  match {
    expr {
      expression = "request.headers['host'].lower() != '${var.domain}'"
    }
  }
}

# Blacklisted user-agents - priority 2147483640
resource "google_compute_security_policy_rule" "block_user_agents" {
  security_policy = google_compute_security_policy.security_policy.name
  project         = var.project
  action          = "deny(403)"
  priority        = 2147483640
  preview         = false
  description     = "Black-listed user-agents"

  match {
    expr {
      expression = <<-EOT
        has(request.headers['user-agent']) && (
            request.headers['user-agent'].contains('GenomeCrawler') ||
            request.headers['user-agent'].contains('AhrefsBot')
        )
      EOT
    }
  }
}

# Default rate limiting rule - priority 2147483646
resource "google_compute_security_policy_rule" "rate_limit" {
  security_policy = google_compute_security_policy.security_policy.name
  project         = var.project
  action          = "throttle"
  priority        = 2147483646
  preview         = false
  description     = "Default rate limiting rule"

  match {
    versioned_expr = "SRC_IPS_V1"
    config {
      src_ip_ranges = ["*"]
    }
  }

  rate_limit_options {
    conform_action = "allow"
    exceed_action  = "deny(403)"
    enforce_on_key = "IP"
    rate_limit_threshold {
      count        = 500
      interval_sec = 60
    }
  }
}
