resource "google_monitoring_alert_policy" "dataform_service_error" {
  count                 = var.environment == "prod" ? 1 : 0
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
severity=ERROR
EOF
      label_extractors = {}
    }
  }
  documentation {
    content = "Function source: https://github.com/HTTPArchive/tech-report-apis/tree/main/apps/dataform-service"
  }
}

resource "google_monitoring_alert_policy" "bigquery_export_error" {
  count                 = var.environment == "prod" ? 1 : 0
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
severity=ERROR
EOF
      label_extractors = {}
    }
  }
  documentation {
    content = "Function source: https://github.com/HTTPArchive/tech-report-apis/tree/main/apps/bigquery-export"
  }
}

resource "google_monitoring_alert_policy" "dataform_workflow" {
  count                 = var.environment == "prod" ? 1 : 0
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
  count                 = var.environment == "prod" ? 1 : 0
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
  count                 = var.environment == "prod" ? 1 : 0
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
httpRequest.requestUrl =~ "https:\/\/cdn\.httparchive\.org"
-httpRequest.status = (400 OR 404 OR 405)
-jsonPayload.statusDetails = ("denied_by_security_policy" OR "handled_by_cloud_armor" OR "response_from_cache" OR "backend_timeout")
-textPayload = "Truncated response body. Usually implies that the request timed out or the application exited before the response was finished."
-httpRequest.userAgent =~ "(?i)(curl|bot|crawler|spider|slurp|archiver|scraper|research|baiduspider|googlebot|facebookexternalhit|meta-externalagent|mj12bot|petalbot|ccbot|censysinspect|worker|python|http-|-http)"
-protoPayload.userAgent =~ "(?i)(curl|bot|crawler|spider|slurp|archiver|scraper|research|baiduspider|googlebot|facebookexternalhit|meta-externalagent|mj12bot|petalbot|ccbot|censysinspect|worker|python|http-|-http)"
EOF
      label_extractors = {}
    }
  }

  documentation {
    content   = "https://console.cloud.google.com/run/detail/us-central1/report-api-prod/metrics?authuser=2&inv=1&invt=AbzTCA&project=httparchive"
    mime_type = "text/markdown"
  }
}

