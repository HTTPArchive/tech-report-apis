# Cloud Run service account
resource "google_project_iam_member" "function_identity" {
  for_each = toset(["roles/bigquery.jobUser", "roles/run.invoker", "roles/run.jobsExecutorWithOverrides", "roles/datastore.user", "roles/storage.objectUser"])

  project = var.project
  role    = each.value
  member  = "serviceAccount:${var.function_identity}"
}

resource "google_bigquery_dataset_iam_member" "cloud_function_dataset_reader_role" {
  for_each = toset(var.edit_datasets)

  dataset_id = each.value
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${var.function_identity}"
}

# Dataform service account
resource "google_bigquery_dataset_iam_member" "dataform_dataset_editor_role" {
  for_each = toset(var.edit_datasets)

  dataset_id = each.value
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${var.function_identity}"
}

resource "google_project_iam_member" "dataform_default_roles" {
  for_each = toset(var.dataform_service_account_roles)

  project = var.project
  role    = each.value
  member  = "serviceAccount:${var.function_identity}"
}

resource "google_service_account_iam_member" "dataform_act-as-iam" {
  service_account_id = "projects/${var.project}/serviceAccounts/${var.function_identity}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.dataform_service_account_email}"
}

resource "google_secret_manager_secret_iam_member" "dataform_secret_access" {
  secret_id = "projects/${var.project_number}/secrets/GitHub_max-ostapenko_dataform_PAT"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.dataform_service_account_email}"
}

# Cloud Build custom service account permissions
resource "google_project_iam_member" "cloud_build_bigquery_job_user" {
  project = var.project
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${var.cloud_build_service_account_email}"
}

resource "google_bigquery_dataset_iam_member" "cloud_build_wappalyzer_editor" {
  dataset_id = "wappalyzer"
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${var.cloud_build_service_account_email}"
}

# GitHub Actions CI/CD service account permissions
resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset(var.github_actions_roles)

  project = var.project
  role    = each.value
  member  = "serviceAccount:${var.github_actions_service_account_email}"
}



