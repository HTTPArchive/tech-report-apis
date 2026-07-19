resource "google_dataform_repository" "crawl_data" {
  count                                      = var.environment == "prod" ? 1 : 0
  provider                                   = google-beta
  display_name                               = null
  kms_key_name                               = null
  labels                                     = {}
  name                                       = "crawl-data"
  npmrc_environment_variables_secret_version = null
  project                                    = var.project
  region                                     = var.region
  service_account                            = var.function_identity
  git_remote_settings {
    authentication_token_secret_version = "projects/${var.project}/secrets/GitHub_max-ostapenko_dataform_PAT/versions/latest"
    default_branch                      = "main"
    url                                 = "https://github.com/HTTPArchive/dataform.git"
  }
  workspace_compilation_overrides {
    default_database = var.project
  }
}

resource "google_dataform_repository_release_config" "crawl_data_production" {
  count         = var.environment == "prod" ? 1 : 0
  provider      = google-beta
  name          = "production"
  project       = var.project
  region        = var.region
  repository    = google_dataform_repository.crawl_data[0].name
  git_commitish = "main"
  time_zone     = "Etc/UTC"
  cron_schedule = null
}
