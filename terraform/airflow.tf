resource "google_service_account" "composer" {
  count        = var.environment == "prod" ? 1 : 0
  account_id   = var.composer_service_account_id
  display_name = "Cloud Composer Service Account for ${var.composer_environment_name}"
  project      = var.project
}

# Core Composer worker role
resource "google_project_iam_member" "composer_worker" {
  count   = var.environment == "prod" ? 1 : 0
  project = var.project
  role    = "roles/composer.worker"
  member  = "serviceAccount:${google_service_account.composer[0].email}"
}

# Pipeline execution roles for DAGs
resource "google_project_iam_member" "composer_pipeline_roles" {
  for_each = var.environment == "prod" ? toset([
    "roles/bigquery.jobUser",
    "roles/dataform.editor",
    "roles/storage.objectUser",
    "roles/pubsub.subscriber",
  ]) : []

  project = var.project
  role    = each.value
  member  = "serviceAccount:${google_service_account.composer[0].email}"
}

# BigQuery dataset editor permissions for managed datasets
resource "google_bigquery_dataset_iam_member" "composer_dataset_editor_role" {
  for_each = var.environment == "prod" ? toset(var.edit_datasets) : []

  dataset_id = each.value
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.composer[0].email}"
}

# Cloud Composer 3 environment (smallest footprint for testing)
resource "google_composer_environment" "airflow" {
  count   = var.environment == "prod" ? 1 : 0
  name    = var.composer_environment_name
  project = var.project
  region  = var.region

  config {
    environment_size = "ENVIRONMENT_SIZE_SMALL"

    software_config {
      image_version = var.composer_image_version
    }

    workloads_config {
      scheduler {
        cpu        = 0.5
        memory_gb  = 2
        storage_gb = 1
        count      = 1
      }
      triggerer {
        cpu       = 0.5
        memory_gb = 1
        count     = 1
      }
      worker {
        cpu        = 0.5
        memory_gb  = 2
        storage_gb = 1
        min_count  = 1
        max_count  = 1
      }
    }

    node_config {
      service_account = google_service_account.composer[0].email
    }

    web_server_network_access_control {
      allowed_ip_range {
        value       = "0.0.0.0/0"
        description = "Allow all IPv4 (Google IAM authenticated)"
      }
      allowed_ip_range {
        value       = "::/0"
        description = "Allow all IPv6 (Google IAM authenticated)"
      }
    }
  }

  depends_on = [
    google_project_iam_member.composer_worker,
  ]
}

# Pub/Sub topic and pull subscription for Airflow crawl_complete DAG
resource "google_pubsub_topic" "crawl_complete" {
  count   = var.environment == "prod" ? 1 : 0
  name    = "crawl-complete"
  project = var.project
}

moved {
  from = module.dataform_service[0].google_pubsub_topic.dataform_crawl_complete
  to   = google_pubsub_topic.crawl_complete[0]
}

resource "google_pubsub_subscription" "airflow_crawl_complete" {
  count   = var.environment == "prod" ? 1 : 0
  name    = "airflow-crawl-complete"
  project = var.project
  topic   = google_pubsub_topic.crawl_complete[0].id

  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = false
  ack_deadline_seconds       = 300

  expiration_policy {
    ttl = "" # Never expire
  }

  enable_message_ordering = false
}

output "composer_environment_name" {
  description = "Cloud Composer environment name"
  value       = try(google_composer_environment.airflow[0].name, null)
}

output "composer_airflow_uri" {
  description = "Airflow web UI URI"
  value       = try(google_composer_environment.airflow[0].config[0].airflow_uri, null)
}

output "composer_dag_gcs_prefix" {
  description = "Cloud Storage prefix to the DAGs folder used by Cloud Composer"
  value       = try(google_composer_environment.airflow[0].config[0].dag_gcs_prefix, null)
}

output "composer_service_account" {
  description = "Service account email running Cloud Composer workloads"
  value       = try(google_service_account.composer[0].email, null)
}

output "composer_crawl_complete_subscription" {
  description = "Pub/Sub subscription for the crawl_complete Airflow DAG"
  value       = try(google_pubsub_subscription.airflow_crawl_complete[0].id, null)
}
