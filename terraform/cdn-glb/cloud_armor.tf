# Cloud Armor Security Policy
resource "google_compute_security_policy" "security_policy" {
  name        = "${var.name_prefix}-backend-security-policy"
  project     = var.project
  description = "Backend security policy for ${var.name_prefix}"
  type        = "CLOUD_ARMOR"
}

# Block direct IP access and unrecognized Host headers - priority 100
resource "google_compute_security_policy_rule" "enforce_valid_host" {
  security_policy = google_compute_security_policy.security_policy.name
  project         = var.project
  action          = "deny(403)"
  priority        = 100
  preview         = false
  description     = "Block direct IP access and vulnerability scanners probing raw IP"

  match {
    expr {
      expression = "!has(request.headers['host']) || !request.headers['host'].matches('^(cdn|api)\\\\.(dev\\\\.)?httparchive\\\\.org(:[0-9]+)?$')"
    }
  }
}

# Block known vulnerability scanner signatures - priority 200
resource "google_compute_security_policy_rule" "block_scanners" {
  security_policy = google_compute_security_policy.security_policy.name
  project         = var.project
  action          = "deny(403)"
  priority        = 200
  preview         = false
  description     = "Block known vulnerability scanner signatures"

  match {
    expr {
      expression = "evaluatePreconfiguredExpr('scannerdetection-v33')"
    }
  }
}

# Block local file inclusion and path traversal attacks - priority 300
resource "google_compute_security_policy_rule" "block_lfi" {
  security_policy = google_compute_security_policy.security_policy.name
  project         = var.project
  action          = "deny(403)"
  priority        = 300
  preview         = false
  description     = "Block local file inclusion and path traversal attacks"

  match {
    expr {
      expression = "evaluatePreconfiguredExpr('lfi-v33')"
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

# Allow traffic for static icons path - priority 1000, rate limited to 2000 req/60s
resource "google_compute_security_policy_rule" "allow_static_icons" {
  security_policy = google_compute_security_policy.security_policy.name
  project         = var.project
  action          = "throttle"
  priority        = 1000
  preview         = false
  description     = "Allow traffic for static icons path with higher rate limit threshold"

  match {
    expr {
      expression = "request.path.startsWith('/v1/static/icons/')"
    }
  }

  rate_limit_options {
    conform_action = "allow"
    exceed_action  = "deny(403)"
    enforce_on_key = "IP"
    rate_limit_threshold {
      count        = 2000
      interval_sec = 60
    }
  }
}
