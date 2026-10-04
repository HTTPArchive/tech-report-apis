# Dataform Service & Infrastructure

The [dataform-service](https://console.cloud.google.com/run/detail/us-central1/dataform-service?authuser=7&project=httparchive) Cloud Run service provides BigQuery export capabilities.

## `/` Trigger data exports

[exportReport](https://console.cloud.google.com/functions/details/us-central1/bqExport?env=gen2&authuser=7&project=httparchive) Cloud Run Function

This function triggers a job to export data to GCS or Firestore.

Request body example:

```json
{
  "calls": [[{
    "destination": "gs://httparchive-reports/tech-report-2024",
    "config": {
      "format": "PARQUET",
      "compression": "SNAPPY"
    },
    "query": "SELECT * FROM httparchive.reports.tech_report_categories WHERE _TABLE_SUFFIX = '2024_01_01'"
  }]]
}
```

Request example for local development:

```bash
curl -X POST http://localhost:8080/ \
  -H "Content-Type: application/json" \
  -d '{
  "calls": [[{
    "destination": "gs://httparchive-reports/tech-report-2024",
    "config": {
      "format": "PARQUET",
      "compression": "SNAPPY"
    },
    "query": "SELECT * FROM httparchive.reports.tech_report_categories WHERE _TABLE_SUFFIX = '2024_01_01'"
  }]]
}'
```

## Cloud Run Job for exporting data

[exportData](https://console.cloud.google.com/run/detail/us-central1/export-data?authuser=7&project=httparchive) Cloud Run Job

This job exports data to GCS or Firestore based on the provided configuration.

Input parameters:

- `EXPORT_CONFIG` - JSON string with the export configuration.

Example values:

```plaintext
{"dataform_trigger":"report_cwv_tech_complete","name":"technologies","type":"dict"}
{"dataform_trigger":"report_cwv_tech_complete","date":"2024-11-01","name":"page_weight","type":"report"}
{"dataform_trigger":"report_complete","name":"bytesTotal","type":"timeseries"}
{"dataform_trigger":"report_complete","date":"2024-11-01","name":"bytesTotal","type":"histogram"}
```

## Monitoring

Pipeline and export issues are tracked using Cloud Monitoring alerting policies:

- [Dataform Service Error](https://console.cloud.google.com/monitoring/alerting/policies/570799173843203905?authuser=2&project=httparchive)
- [BigQuery Export Error](https://console.cloud.google.com/monitoring/alerting/policies/2588749473925942477?authuser=2&project=httparchive)

Error notifications are sent to the [#10x-infra](https://httparchive.slack.com/archives/C030V4WAVL3) Slack channel.

## Local development

To test the `dataform-service` locally, run from `apps/dataform-service/`:

```bash
npm run start_dev
```

To test the `bigquery-export` service locally, run from `apps/bigquery-export/`:

```bash
npm run start_dev
```

Then, in a separate terminal, run the command with the test trigger payload.

## Deployment

From the project root directory run:

```bash
make tf_plan ENV=prod
make tf_apply ENV=prod
```
