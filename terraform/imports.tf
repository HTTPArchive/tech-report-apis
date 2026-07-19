# Declarative imports to bring existing GCP resources into tech-report-apis state safely.
# Verified against the production tfstate on 2026-07-16.

# ==========================================
# 1. Cloud Run apps & triggers
# ==========================================

import {
  to = module.bigquery_export[0].google_cloud_run_v2_job.bigquery_export
  id = "projects/httparchive/locations/us-central1/jobs/bigquery-export"
}

import {
  to = module.dataform_service[0].google_cloud_run_v2_service.dataform_service
  id = "projects/httparchive/locations/us-central1/services/dataform-service"
}

import {
  to = module.dataform_service[0].google_cloud_run_service_iam_member.member
  id = "projects/httparchive/locations/us-central1/services/dataform-service roles/run.invoker serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = module.dataform_service[0].google_pubsub_topic.dataform_crawl_complete
  id = "projects/httparchive/topics/crawl-complete"
}

import {
  to = module.dataform_service[0].google_pubsub_subscription.dataform_crawl_complete
  id = "projects/httparchive/subscriptions/dataform-service-crawl-complete"
}

import {
  to = module.dataform_service[0].google_cloud_scheduler_job.bq-poller-crux-ready
  id = "projects/httparchive/locations/us-central1/jobs/bq-poller-crux-ready"
}

# ==========================================
# 2. BigQuery Connection & Routines
# ==========================================

import {
  to = module.dataform_service[0].google_bigquery_connection.cloud-resources
  id = "projects/httparchive/locations/us/connections/cloud-resources"
}

import {
  to = module.dataform_service[0].google_project_iam_member.bigquery-connection-cloud-resources["roles/run.invoker"]
  id = "httparchive roles/run.invoker serviceAccount:bqcx-226352634162-ytei@gcp-sa-bigquery-condel.iam.gserviceaccount.com"
}

import {
  to = module.dataform_service[0].google_bigquery_routine.run_export_job
  id = "projects/httparchive/datasets/reports/routines/run_export_job"
}

# ==========================================
# 3. Dataform Repository (Prod only)
# ==========================================

import {
  to = google_dataform_repository.crawl_data[0]
  id = "projects/httparchive/locations/us-central1/repositories/crawl-data"
}

import {
  to = google_dataform_repository_release_config.crawl_data_production[0]
  id = "projects/httparchive/locations/us-central1/repositories/crawl-data/releaseConfigs/production"
}

# ==========================================
# 4. Analytics Hub Data Exchange (Prod only)
# ==========================================

import {
  to = google_bigquery_analytics_hub_data_exchange.default[0]
  id = "projects/httparchive/locations/us/dataExchanges/httparchive"
}

import {
  to = google_bigquery_analytics_hub_data_exchange_iam_member.member[0]
  id = "projects/httparchive/locations/us/dataExchanges/httparchive roles/analyticshub.viewer allUsers"
}

import {
  to = google_bigquery_analytics_hub_listing.crawl[0]
  id = "projects/httparchive/locations/us/dataExchanges/httparchive/listings/crawl"
}

import {
  to = google_bigquery_analytics_hub_listing_iam_member.member["roles/analyticshub.subscriber"]
  id = "projects/httparchive/locations/us/dataExchanges/httparchive/listings/crawl roles/analyticshub.subscriber allUsers"
}

import {
  to = google_bigquery_analytics_hub_listing_iam_member.member["roles/analyticshub.viewer"]
  id = "projects/httparchive/locations/us/dataExchanges/httparchive/listings/crawl roles/analyticshub.viewer allUsers"
}

# ==========================================
# 5. Cloud Monitoring Alert Policies
# ==========================================

import {
  to = google_monitoring_alert_policy.bigquery_export_error[0]
  id = "projects/httparchive/alertPolicies/9702532347841615800"
}

import {
  to = google_monitoring_alert_policy.dataform_service_error[0]
  id = "projects/httparchive/alertPolicies/18136735558875975308"
}

import {
  to = google_monitoring_alert_policy.dataform_workflow[0]
  id = "projects/httparchive/alertPolicies/16526940745374967367"
}

import {
  to = google_monitoring_alert_policy.dataform_workflow_complete[0]
  id = "projects/httparchive/alertPolicies/7794577393322114934"
}

# ==========================================
# 6. Global IAM Member Bindings
# ==========================================

import {
  to = google_project_iam_member.function_identity["roles/bigquery.jobUser"]
  id = "httparchive roles/bigquery.jobUser serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.function_identity["roles/dataform.serviceAgent"]
  id = "httparchive roles/dataform.serviceAgent serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.function_identity["roles/datastore.user"]
  id = "httparchive roles/datastore.user serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.function_identity["roles/run.invoker"]
  id = "httparchive roles/run.invoker serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.function_identity["roles/run.jobsExecutorWithOverrides"]
  id = "httparchive roles/run.jobsExecutorWithOverrides serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.function_identity["roles/storage.objectUser"]
  id = "httparchive roles/storage.objectUser serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.dataform_default_roles["roles/bigquery.connectionUser"]
  id = "httparchive roles/bigquery.connectionUser serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.dataform_default_roles["roles/bigquery.dataViewer"]
  id = "httparchive roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.dataform_default_roles["roles/bigquery.resourceAdmin"]
  id = "httparchive roles/bigquery.resourceAdmin serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_project_iam_member.dataform_default_roles["roles/bigquery.user"]
  id = "httparchive roles/bigquery.user serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_service_account_iam_member.dataform_act-as-iam[0]
  id = "projects/httparchive/serviceAccounts/cloud-function@httparchive.iam.gserviceaccount.com roles/iam.serviceAccountUser serviceAccount:service-226352634162@gcp-sa-dataform.iam.gserviceaccount.com"
}

import {
  to = google_secret_manager_secret_iam_member.dataform_secret_access[0]
  id = "projects/226352634162/secrets/GitHub_max-ostapenko_dataform_PAT roles/secretmanager.secretAccessor serviceAccount:service-226352634162@gcp-sa-dataform.iam.gserviceaccount.com"
}

# ==========================================
# 7. Dataset-level IAM Roles
# ==========================================

import {
  to = google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role["blink_features"]
  id = "projects/httparchive/datasets/blink_features roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role["crawl"]
  id = "projects/httparchive/datasets/crawl roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role["crawl_staging"]
  id = "projects/httparchive/datasets/crawl_staging roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role["dataform_assertions"]
  id = "projects/httparchive/datasets/dataform_assertions roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role["f1"]
  id = "projects/httparchive/datasets/f1 roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role["latest"]
  id = "projects/httparchive/datasets/latest roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role["reports"]
  id = "projects/httparchive/datasets/reports roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role["sample_data"]
  id = "projects/httparchive/datasets/sample_data roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.cloud_function_dataset_reader_role["wappalyzer"]
  id = "projects/httparchive/datasets/wappalyzer roles/bigquery.dataViewer serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.dataform_dataset_editor_role["blink_features"]
  id = "projects/httparchive/datasets/blink_features roles/bigquery.dataEditor serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.dataform_dataset_editor_role["crawl"]
  id = "projects/httparchive/datasets/crawl roles/bigquery.dataEditor serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.dataform_dataset_editor_role["crawl_staging"]
  id = "projects/httparchive/datasets/crawl_staging roles/bigquery.dataEditor serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.dataform_dataset_editor_role["dataform_assertions"]
  id = "projects/httparchive/datasets/dataform_assertions roles/bigquery.dataEditor serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.dataform_dataset_editor_role["f1"]
  id = "projects/httparchive/datasets/f1 roles/bigquery.dataEditor serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.dataform_dataset_editor_role["latest"]
  id = "projects/httparchive/datasets/latest roles/bigquery.dataEditor serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.dataform_dataset_editor_role["reports"]
  id = "projects/httparchive/datasets/reports roles/bigquery.dataEditor serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.dataform_dataset_editor_role["sample_data"]
  id = "projects/httparchive/datasets/sample_data roles/bigquery.dataEditor serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_dataset_iam_member.dataform_dataset_editor_role["wappalyzer"]
  id = "projects/httparchive/datasets/wappalyzer roles/bigquery.dataEditor serviceAccount:cloud-function@httparchive.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.analytics_hub[0].google_project_iam_custom_role.analyticshub_custom_role_project["httparchive"]
  id = "projects/httparchive/roles/mastheadAnalyticsHubCustomRole"
}

import {
  to = module.masthead_agent[0].module.analytics_hub[0].google_project_iam_member.masthead_analyticshub_project_roles["httparchive-custom"]
  id = "httparchive projects/httparchive/roles/mastheadAnalyticsHubCustomRole serviceAccount:masthead-data@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.analytics_hub[0].google_project_iam_member.masthead_analyticshub_project_roles["httparchive-viewer"]
  id = "httparchive roles/analyticshub.viewer serviceAccount:masthead-data@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.bigquery[0].google_project_iam_custom_role.masthead_bigquery_custom_role_project["httparchive"]
  id = "projects/httparchive/roles/mastheadBigQueryCustomRole"
}

import {
  to = module.masthead_agent[0].module.bigquery[0].google_project_iam_member.masthead_bigquery_project_custom_role["httparchive"]
  id = "httparchive projects/httparchive/roles/mastheadBigQueryCustomRole serviceAccount:masthead-data@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.bigquery[0].google_project_iam_member.masthead_bigquery_project_roles["httparchive-roles/bigquery.metadataViewer"]
  id = "httparchive roles/bigquery.metadataViewer serviceAccount:masthead-data@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.bigquery[0].google_project_iam_member.masthead_bigquery_project_roles["httparchive-roles/bigquery.resourceViewer"]
  id = "httparchive roles/bigquery.resourceViewer serviceAccount:masthead-data@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.bigquery[0].module.logging_infrastructure.google_logging_project_sink.project_sinks["httparchive"]
  id = "projects/httparchive/sinks/masthead-agent-sink"
}

import {
  to = module.masthead_agent[0].module.bigquery[0].module.logging_infrastructure.google_pubsub_subscription.logs_subscription
  id = "projects/httparchive/subscriptions/masthead-agent-subscription"
}

import {
  to = module.masthead_agent[0].module.bigquery[0].module.logging_infrastructure.google_pubsub_subscription_iam_member.masthead_subscription_subscriber
  id = "projects/httparchive/subscriptions/masthead-agent-subscription roles/pubsub.subscriber serviceAccount:masthead-data@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.bigquery[0].module.logging_infrastructure.google_pubsub_topic.logs_topic
  id = "projects/httparchive/topics/masthead-topic"
}

import {
  to = module.masthead_agent[0].module.bigquery[0].module.logging_infrastructure.google_pubsub_topic_iam_member.project_sinks_publisher["httparchive"]
  id = "projects/httparchive/topics/masthead-topic roles/pubsub.publisher serviceAccount:service-226352634162@gcp-sa-logging.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.dataform[0].google_project_iam_member.masthead_dataform_project_roles["httparchive-roles/dataform.viewer"]
  id = "httparchive roles/dataform.viewer serviceAccount:masthead-dataform@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.dataform[0].module.logging_infrastructure.google_logging_project_sink.project_sinks["httparchive"]
  id = "projects/httparchive/sinks/masthead-dataform-sink"
}

import {
  to = module.masthead_agent[0].module.dataform[0].module.logging_infrastructure.google_pubsub_subscription.logs_subscription
  id = "projects/httparchive/subscriptions/masthead-dataform-subscription"
}

import {
  to = module.masthead_agent[0].module.dataform[0].module.logging_infrastructure.google_pubsub_subscription_iam_member.masthead_subscription_subscriber
  id = "projects/httparchive/subscriptions/masthead-dataform-subscription roles/pubsub.subscriber serviceAccount:masthead-dataform@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.dataform[0].module.logging_infrastructure.google_pubsub_topic.logs_topic
  id = "projects/httparchive/topics/masthead-dataform-topic"
}

import {
  to = module.masthead_agent[0].module.dataform[0].module.logging_infrastructure.google_pubsub_topic_iam_member.project_sinks_publisher["httparchive"]
  id = "projects/httparchive/topics/masthead-dataform-topic roles/pubsub.publisher serviceAccount:service-226352634162@gcp-sa-logging.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.dataplex[0].google_project_iam_member.masthead_dataplex_project_roles["httparchive-roles/dataplex.dataProductsViewer"]
  id = "httparchive roles/dataplex.dataProductsViewer serviceAccount:masthead-dataplex@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.dataplex[0].google_project_iam_member.masthead_dataplex_project_roles["httparchive-roles/dataplex.dataScanDataViewer"]
  id = "httparchive roles/dataplex.dataScanDataViewer serviceAccount:masthead-dataplex@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.dataplex[0].module.logging_infrastructure.google_logging_project_sink.project_sinks["httparchive"]
  id = "projects/httparchive/sinks/masthead-dataplex-sink"
}

import {
  to = module.masthead_agent[0].module.dataplex[0].module.logging_infrastructure.google_pubsub_subscription.logs_subscription
  id = "projects/httparchive/subscriptions/masthead-dataplex-subscription"
}

import {
  to = module.masthead_agent[0].module.dataplex[0].module.logging_infrastructure.google_pubsub_subscription_iam_member.masthead_subscription_subscriber
  id = "projects/httparchive/subscriptions/masthead-dataplex-subscription roles/pubsub.subscriber serviceAccount:masthead-dataplex@masthead-prod.iam.gserviceaccount.com"
}

import {
  to = module.masthead_agent[0].module.dataplex[0].module.logging_infrastructure.google_pubsub_topic.logs_topic
  id = "projects/httparchive/topics/masthead-dataplex-topic"
}

import {
  to = module.masthead_agent[0].module.dataplex[0].module.logging_infrastructure.google_pubsub_topic_iam_member.project_sinks_publisher["httparchive"]
  id = "projects/httparchive/topics/masthead-dataplex-topic roles/pubsub.publisher serviceAccount:service-226352634162@gcp-sa-logging.iam.gserviceaccount.com"
}

