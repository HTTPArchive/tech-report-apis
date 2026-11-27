# BigQuery Slot Reservations and Assignments

import {
  to = google_bigquery_reservation.pipeline
  id = "projects/httparchive/locations/US/reservations/pipeline"
}

import {
  to = google_bigquery_reservation.pipeline_s
  id = "projects/httparchive/locations/US/reservations/pipeline-s"
}

import {
  to = google_bigquery_reservation.interactive
  id = "projects/httparchive/locations/US/reservations/interactive"
}

import {
  to = google_bigquery_reservation_assignment.interactive_default
  id = "projects/httparchive/locations/US/reservations/interactive/assignments/10835436541367092611"
}

import {
  to = google_bigquery_reservation_assignment.pipeline_s_cloud_function
  id = "projects/httparchive/locations/US/reservations/pipeline-s/assignments/14362641573286619651"
}

resource "google_bigquery_reservation" "pipeline" {
  name              = "pipeline"
  project           = var.project
  location          = upper(var.location)
  edition           = "ENTERPRISE"
  slot_capacity     = 0
  ignore_idle_slots = false

  autoscale {
    max_slots = 7000
  }

  labels = {
    cost_center = "etl"
  }
}

resource "google_bigquery_reservation" "pipeline_s" {
  name              = "pipeline-s"
  project           = var.project
  location          = upper(var.location)
  edition           = "STANDARD"
  slot_capacity     = 0
  ignore_idle_slots = true

  autoscale {
    max_slots = 1600
  }

  labels = {
    cost_center = "etl"
  }
}

resource "google_bigquery_reservation" "interactive" {
  name              = "interactive"
  project           = var.project
  location          = upper(var.location)
  edition           = "STANDARD"
  slot_capacity     = 0
  ignore_idle_slots = true

  autoscale {
    max_slots = 400
  }

  labels = {
    cost_center = "studio"
  }
}

# Project default assignment: routes interactive / unassigned queries to 400-slot Standard reservation
resource "google_bigquery_reservation_assignment" "interactive_default" {
  project     = var.project
  location    = upper(var.location)
  reservation = google_bigquery_reservation.interactive.name
  assignee    = "projects/${var.project}"
  job_type    = "QUERY"
}

resource "google_bigquery_reservation_assignment" "pipeline_s_cloud_function" {
  project     = var.project
  location    = upper(var.location)
  reservation = google_bigquery_reservation.pipeline_s.name
  assignee    = "projects/${var.project}"
  job_type    = "QUERY"
  principal   = "principal://iam.googleapis.com/projects/-/serviceAccounts/${var.function_identity}"
}

resource "google_bigquery_reservation_assignment" "pipeline_s_composer_worker" {
  project     = var.project
  location    = upper(var.location)
  reservation = google_bigquery_reservation.pipeline_s.name
  assignee    = "projects/${var.project}"
  job_type    = "QUERY"
  principal   = "principal://iam.googleapis.com/projects/-/serviceAccounts/${google_service_account.composer.email}"
}

# Fluid autoscaling (per-second slot billing without 1-minute minimum) is enabled
# at the admin-project/region level via ALTER PROJECT rather than on individual
# reservation resources.
locals {
  fluid_autoscaling_reservations = sort([
    google_bigquery_reservation.interactive.name,
    google_bigquery_reservation.pipeline.name,
    google_bigquery_reservation.pipeline_s.name,
  ])

  fluid_autoscaling_query = <<-SQL
    ALTER PROJECT `${var.project}`
    SET OPTIONS (
      `region-${lower(var.location)}.preflight_fluid_autoscaling_reservations` = [${join(", ", [for r in local.fluid_autoscaling_reservations : "'${r}'"])}]
    );
  SQL
}

resource "google_bigquery_job" "enable_fluid_autoscaling" {
  job_id   = "tf_fluid_autoscaling_${substr(sha256(local.fluid_autoscaling_query), 0, 16)}"
  project  = var.project
  location = upper(var.location)

  query {
    query              = local.fluid_autoscaling_query
    use_legacy_sql     = false
    create_disposition = ""
    write_disposition  = ""
  }

  lifecycle {
    create_before_destroy = true
  }
}
