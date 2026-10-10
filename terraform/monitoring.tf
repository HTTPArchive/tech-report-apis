resource "google_monitoring_alert_policy" "dataform_service_error" {
  combiner              = "OR"
  display_name          = "Dataform Service Error"
  enabled               = true
  notification_channels = ["projects/${var.project}/notificationChannels/${var.notification_channel_id}"]
  project               = var.project
  severity              = "CRITICAL"
  user_labels           = {}
  alert_strategy {
    notification_prompts = ["OPENED"]
    notification_rate_limit {
      period = "3600s"
    }
    auto_close = "604800s"
  }
  conditions {
    display_name = "Log match condition"
    condition_matched_log {
      filter           = <<EOF
resource.type="cloud_run_revision"
resource.labels.service_name="dataform-service"
(severity>=ERROR OR (severity=WARNING AND log_id("run.googleapis.com/stderr")))
EOF
      label_extractors = {}
    }
  }
  documentation {
    content = "Function source: https://github.com/HTTPArchive/tech-report-apis/tree/main/apps/dataform-service"
  }
}

resource "google_monitoring_alert_policy" "bigquery_export_error" {
  combiner              = "OR"
  display_name          = "BigQuery Export Error"
  enabled               = true
  notification_channels = ["projects/${var.project}/notificationChannels/${var.notification_channel_id}"]
  project               = var.project
  severity              = "CRITICAL"
  user_labels           = {}
  alert_strategy {
    notification_prompts = ["OPENED"]
    notification_rate_limit {
      period = "3600s"
    }
    auto_close = "604800s"
  }
  conditions {
    display_name = "Log match condition"
    condition_matched_log {
      filter           = <<EOF
resource.type="cloud_run_job"
resource.labels.job_name="bigquery-export"
severity>=ERROR
EOF
      label_extractors = {}
    }
  }
  documentation {
    content = "Function source: https://github.com/HTTPArchive/tech-report-apis/tree/main/apps/bigquery-export"
  }
}

resource "google_monitoring_alert_policy" "dataform_workflow" {
  combiner              = "OR"
  display_name          = "BigQuery Workflow Failed"
  enabled               = true
  notification_channels = ["projects/${var.project}/notificationChannels/${var.notification_channel_id}"]
  project               = var.project
  severity              = "CRITICAL"
  documentation {
    content = "Workflows source: https://github.com/HTTPArchive/dataform/tree/main/"
  }
  user_labels = {}
  alert_strategy {
    notification_prompts = ["OPENED"]
    notification_rate_limit {
      period = "21600s"
    }
    auto_close = "604800s"
  }
  conditions {
    display_name = "Log match condition"
    condition_matched_log {
      filter           = <<EOF
resource.type="dataform.googleapis.com/Repository"
jsonPayload.@type="type.googleapis.com/google.cloud.dataform.logging.v1.WorkflowInvocationCompletionLogEntry"
jsonPayload.terminalState="FAILED"
resource.labels.repository_id="crawl-data"
EOF
      label_extractors = {}
    }
  }
}

resource "google_monitoring_alert_policy" "dataform_workflow_complete" {
  combiner              = "OR"
  display_name          = "BigQuery Workflow Complete (CrUX or crawl)"
  enabled               = true
  notification_channels = ["projects/${var.project}/notificationChannels/${var.notification_channel_id}"]
  project               = var.project
  user_labels           = {}
  alert_strategy {
    notification_prompts = ["OPENED"]
    notification_rate_limit {
      period = "1800s"
    }
    auto_close = "1800s"
  }
  conditions {
    display_name = "Log match condition"
    condition_matched_log {
      filter           = <<EOF
resource.type="dataform.googleapis.com/Repository"
resource.labels.repository_id="crawl-data"
jsonPayload.@type="type.googleapis.com/google.cloud.dataform.logging.v1.WorkflowInvocationCompletionLogEntry"
jsonPayload.terminalState="SUCCEEDED"
EOF
      label_extractors = {}
    }
  }
  documentation {
    content = "See details here: https://console.cloud.google.com/bigquery/dataform/locations/us-central1/repositories/crawl-data/details/workflows\n\nCrUX Firestore exports may still require up to 1 hour to finish."
  }
}

resource "google_monitoring_alert_policy" "report_api_endpoint" {
  combiner              = "OR"
  display_name          = "Report API Endpoint"
  enabled               = true
  notification_channels = ["projects/${var.project}/notificationChannels/${var.notification_channel_id}"]
  project               = var.project
  severity              = "WARNING"
  user_labels           = {}

  alert_strategy {
    notification_prompts = ["OPENED"]
    notification_rate_limit {
      period = "172800s"
    }
    auto_close = "604800s"
  }

  conditions {
    display_name = "Log match condition"
    condition_matched_log {
      filter           = <<EOF
(resource.type = "cloud_run_revision" AND resource.labels.service_name = "report-api-prod")
OR logName = "projects/httparchive/logs/requests"
severity >= WARNING
-httpRequest.status = (400 OR 404 OR 405)
-jsonPayload.statusCode = (400 OR 404 OR 405)
-jsonPayload.statusDetails = ("denied_by_security_policy" OR "handled_by_cloud_armor" OR "response_from_cache" OR "backend_timeout")
-textPayload = "Truncated response body. Usually implies that the request timed out or the application exited before the response was finished."
-httpRequest.userAgent =~ "(?i)(bot|crawler|spider|slurp|archiver|scraper|research|baiduspider|googlebot|facebookexternalhit|meta-externalagent|mj12bot|petalbot|ccbot|censysinspect|worker|python)"
-protoPayload.userAgent =~ "(?i)(bot|crawler|spider|slurp|archiver|scraper|research|baiduspider|googlebot|facebookexternalhit|meta-externalagent|mj12bot|petalbot|ccbot|censysinspect|worker|python)"
EOF
      label_extractors = {}
    }
  }

  documentation {
    content   = "https://console.cloud.google.com/run/detail/us-central1/report-api-prod/metrics?authuser=2&inv=1&invt=AbzTCA&project=httparchive"
    mime_type = "text/markdown"
  }
}

# ------------------------------------------------------------------------------
# Report API SLO & Burn Rate Alert (excl. /mcp and /v1/geo-breakdown)
# ------------------------------------------------------------------------------

resource "google_logging_metric" "report_api_requests_count" {
  name    = "report_api_requests_count"
  project = var.project
  filter  = <<EOF
resource.type="cloud_run_revision"
resource.labels.service_name="report-api-prod"
logName="projects/httparchive/logs/run.googleapis.com%2Frequests"
-httpRequest.requestUrl =~ "(?i)(/mcp|/v1/geo-breakdown)"
EOF
  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "Report API requests count (excl. MCP and Geo-Breakdown)"
  }
}

resource "google_logging_metric" "report_api_fast_requests_count" {
  name    = "report_api_fast_requests_count"
  project = var.project
  filter  = <<EOF
resource.type="cloud_run_revision"
resource.labels.service_name="report-api-prod"
logName="projects/httparchive/logs/run.googleapis.com%2Frequests"
httpRequest.latency < "1s"
-httpRequest.requestUrl =~ "(?i)(/mcp|/v1/geo-breakdown)"
EOF
  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "Report API fast requests (<1s) count (excl. MCP and Geo-Breakdown)"
  }
}

resource "google_monitoring_slo" "report_api_windowed_latency" {
  project             = var.project
  service             = var.report_api_monitoring_service_id
  slo_id              = "RDURm8i2Rk-nH2tMBceDyg"
  display_name        = "95% - Windowed Latency - Rolling 30 days"
  goal                = 0.95
  rolling_period_days = 30

  windows_based_sli {
    window_period = "14400s"
    good_total_ratio_threshold {
      threshold = 0.99
      performance {
        good_total_ratio {
          good_service_filter  = "metric.type=\"logging.googleapis.com/user/report_api_fast_requests_count\" resource.type=\"cloud_run_revision\""
          total_service_filter = "metric.type=\"logging.googleapis.com/user/report_api_requests_count\" resource.type=\"cloud_run_revision\""
        }
      }
    }
  }

  depends_on = [
    google_logging_metric.report_api_requests_count,
    google_logging_metric.report_api_fast_requests_count,
  ]
}

resource "google_monitoring_alert_policy" "report_api_slo_burn_rate" {
  combiner     = "OR"
  display_name = "Burn rate on 95% - Windowed Latency - Rolling 30 days"
  enabled      = true
  notification_channels = [
    "projects/${var.project}/notificationChannels/${var.notification_channel_id}",
    "projects/${var.project}/notificationChannels/${var.notification_channel_email_id}",
  ]
  project     = var.project
  user_labels = {}

  alert_strategy {
    auto_close = "604800s"
  }

  conditions {
    display_name = "Burn rate on 95% - Windowed Latency - Rolling 30 days"
    condition_threshold {
      filter          = "select_slo_burn_rate(\"${google_monitoring_slo.report_api_windowed_latency.name}\", \"3600s\")"
      comparison      = "COMPARISON_GT"
      threshold_value = 10.0
      duration        = "0s"
      trigger {
        count = 1
      }
    }
  }
}

# ------------------------------------------------------------------------------
# Build & BigQuery Infrastructure Alerts
# ------------------------------------------------------------------------------

resource "google_monitoring_alert_policy" "deployment_error" {
  combiner              = "OR"
  display_name          = "Deployment error"
  enabled               = true
  notification_channels = ["projects/${var.project}/notificationChannels/${var.notification_channel_id}"]
  project               = var.project
  user_labels           = {}

  alert_strategy {
    notification_prompts = ["OPENED"]
    notification_rate_limit {
      period = "3600s"
    }
    auto_close = "604800s"
  }

  conditions {
    display_name = "Log match condition"
    condition_matched_log {
      filter           = <<EOF
log_name="projects/httparchive/logs/cloudbuild" resource.type="build"
severity>=ERROR
EOF
      label_extractors = {}
    }
  }

  documentation {
    content   = "https://github.com/HTTPArchive/wappalyzer/blob/main/cloudbuild.yaml"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "queries_over_210tb" {
  combiner              = "OR"
  display_name          = "Queries >210TB"
  enabled               = true
  notification_channels = ["projects/${var.project}/notificationChannels/${var.notification_channel_id}"]
  project               = var.project
  severity              = "WARNING"
  user_labels           = {}

  alert_strategy {
    notification_prompts = ["OPENED"]
    notification_rate_limit {
      period = "3600s"
    }
    auto_close = "1800s"
  }

  conditions {
    display_name = "Log match condition"
    condition_matched_log {
      filter           = <<EOF
protoPayload.serviceName="bigquery.googleapis.com"
protoPayload.methodName="jobservice.jobcompleted"
protoPayload.serviceData.jobCompletedEvent.job.jobStatus.state="DONE"
CAST(protoPayload.serviceData.jobCompletedEvent.job.jobStatistics.totalBilledBytes, INT64)>=(230897441832960) -- 1024*1024*1024*1024*210 or 210TB
-protoPayload.authenticationInfo.principalEmail="service-226352634162@gcp-sa-dataform.iam.gserviceaccount.com"
-protoPayload.authenticationInfo.principalEmail="cloud-function@httparchive.iam.gserviceaccount.com"
--(protoPayload.authenticationInfo.principalEmail=~"@httparchive.org" OR protoPayload.authenticationInfo.principalEmail=~"@google.com" OR protoPayload.authenticationInfo.principalEmail=~".iam.gserviceaccount.com")
EOF
      label_extractors = {}
    }
  }
}

resource "google_monitoring_alert_policy" "bigquery_slot_usage" {
  combiner              = "OR"
  display_name          = "Slot Usage - Reservation projects/httparchive/locations/US/reservations/enterprise Slot Usage Too High"
  enabled               = true
  notification_channels = ["projects/${var.project}/notificationChannels/${var.notification_channel_email_id}"]
  project               = var.project
  user_labels           = {}

  alert_strategy {
    auto_close = "604800s"
  }

  conditions {
    display_name = "Slot Usage - Reservation projects/httparchive/locations/US/reservations/enterprise Slot Usage Too High"
    condition_prometheus_query_language {
      duration = "3600s"
      query    = "max by (location) (label_replace(avg_over_time(bigquery_googleapis_com:slots_allocated{monitored_resource =\"bigquery_project\", reservation=~\"projects/.*/enterprise\"}[1h]), \"reservation\", \"$1\", \"reservation\", \".*/.*/(.*)\" )) / ignoring(reservation, job_type) max by (location)(avg_over_time(bigquery_googleapis_com:slots_assigned{monitored_resource = \"bigquery_project\", reservation=\"enterprise\"}[1h])) > 0.95"
    }
  }

  documentation {
    content   = "This alert fires when the slot usage of reservation projects/httparchive/locations/US/reservations/enterprise exceeds 95% of the assigned slots."
    mime_type = "text/markdown"
  }
}
