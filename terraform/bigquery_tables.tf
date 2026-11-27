# BigQuery Table Retention & Partition Configuration

import {
  to = google_bigquery_table.crawl_parsed_css
  id = "projects/httparchive/datasets/crawl/tables/parsed_css"
}

resource "google_bigquery_table" "crawl_parsed_css" {
  project                  = var.project
  dataset_id               = "crawl"
  table_id                 = "parsed_css"
  require_partition_filter = true
  deletion_protection      = true

  time_partitioning {
    type          = "DAY"
    field         = "date"
    expiration_ms = 47347200000 # 548 days (~18 months)
  }

  clustering = [
    "client",
    "is_root_page",
    "rank",
    "page",
  ]

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      schema,
      labels,
    ]
  }
}
