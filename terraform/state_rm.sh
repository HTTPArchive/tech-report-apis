#!/usr/bin/env bash
# state_rm.sh
# Run this script inside the dataform/infra/tf/ directory (source workspace)
# to safely remove the migrated resources from its state.
# This prevents the source workspace from trying to destroy/delete them.

set -euo pipefail

echo "Removing migrated resources from the dataform state..."

# 1. Cloud Run apps & triggers
terraform state rm google_pubsub_subscription.dataform_crawl_complete || true
terraform state rm google_cloud_scheduler_job.bq-poller-crux-ready || true
terraform state rm google_cloud_run_v2_service.dataform_service || true
terraform state rm google_cloud_run_service_iam_member.member || true
terraform state rm google_cloud_run_v2_job.bigquery_export || true

# 2. BigQuery Connection, Routine & IAM
terraform state rm google_bigquery_connection.cloud-resources || true
terraform state rm google_bigquery_routine.run_export_job || true
terraform state rm google_project_iam_member.bigquery-connection-cloud-resources || true

# 3. Dataform Repository & Release configs
terraform state rm google_dataform_repository.crawl_data || true
terraform state rm google_dataform_repository_release_config.crawl_data_production || true

# 4. Analytics Hub data exchange & listings
terraform state rm google_bigquery_analytics_hub_data_exchange.default || true
terraform state rm google_bigquery_analytics_hub_data_exchange_iam_member.member || true
terraform state rm google_bigquery_analytics_hub_listing.crawl || true
terraform state rm google_bigquery_analytics_hub_listing_iam_member.member || true

# 5. Monitoring Alert Policies
terraform state rm google_monitoring_alert_policy.bigquery_export_error || true
terraform state rm google_monitoring_alert_policy.dataform_service_error || true
terraform state rm google_monitoring_alert_policy.dataform_workflow || true
terraform state rm google_monitoring_alert_policy.dataform_workflow_complete || true

# 6. Global & Service IAM Roles
terraform state rm google_project_iam_member.function_identity || true
terraform state rm google_project_iam_member.dataform_default_roles || true
terraform state rm google_service_account_iam_member.dataform_act-as-iam || true
terraform state rm google_secret_manager_secret_iam_member.dataform_secret_access || true

# 7. Dataset-level IAM Roles
terraform state rm google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role || true
terraform state rm google_bigquery_dataset_iam_member.dataform_dataset_editor_role || true

echo "Removal complete! The resources are now safe from destruction in the source workspace."
