data "google_project" "project" {
  project_id = var.project
}

resource "google_alloydb_cluster" "default" {
  cluster_id       = "default"
  location         = var.region
  project          = var.project
  cluster_type     = "PRIMARY"
  database_version = "POSTGRES_17"

  psc_config {
    psc_enabled = true
  }

  dataplex_config {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      subscription_type,
      automated_backup_policy,
      continuous_backup_config,
      encryption_config
    ]
  }
}

resource "google_alloydb_instance" "primary" {
  cluster           = google_alloydb_cluster.default.name
  instance_id       = "primary"
  instance_type     = "PRIMARY"
  availability_type = "ZONAL"

  machine_config {
    cpu_count    = 2
    machine_type = "n2-highmem-2"
  }

  database_flags = {
    "alloydb.iam_authentication"                         = "on"
    "bigquery_fdw.enabled"                               = "on"
    "password.enforce_complexity"                        = "on"
    "google_columnar_engine.enabled"                     = "on"
    "google_columnar_engine.enable_columnar_scan"        = "on"
    "google_columnar_engine.enable_auto_columnarization" = "on"
  }

  client_connection_config {
    require_connectors = false
    ssl_config {
      ssl_mode = "ENCRYPTED_ONLY"
    }
  }

  network_config {
    enable_public_ip = true
  }

  lifecycle {
    prevent_destroy = true
  }
}

locals {
  alloydb_sa = "c-${data.google_project.project.number}-${substr(google_alloydb_cluster.default.uid, 0, 8)}@gcp-sa-alloydb.iam.gserviceaccount.com"
}

moved {
  from = google_project_iam_member.alloydb_bq_data_viewer
  to   = google_project_iam_member.alloydb_bq_access["roles/bigquery.dataViewer"]
}

moved {
  from = google_project_iam_member.alloydb_bq_read_session_user
  to   = google_project_iam_member.alloydb_bq_access["roles/bigquery.readSessionUser"]
}

resource "google_project_iam_member" "alloydb_bq_access" {
  for_each = toset([
    "roles/bigquery.dataViewer",
    "roles/bigquery.readSessionUser",
    "roles/bigquery.jobUser",
  ])

  project = var.project
  role    = each.key
  member  = "serviceAccount:${local.alloydb_sa}"
}
