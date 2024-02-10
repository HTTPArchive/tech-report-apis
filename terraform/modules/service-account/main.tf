locals {
  service_account = trim(substr(replace(var.name, "_", "-"), 0, 28), "-")
}
resource "google_service_account" "service_account" {
  account_id   = local.service_account
  display_name = var.display_name
}
resource "google_project_iam_member" "permissions" {
  for_each = toset(var.permissions)
  project  = var.project
  role     = each.key
  member = google_service_account.service_account.member
  depends_on = [google_service_account.service_account]
}
