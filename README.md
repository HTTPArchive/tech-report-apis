# Tech Report APIs & Pipelines Monorepo

Welcome to the **Tech Report APIs & Pipelines** monorepo. This central repository (powered by [Turborepo](https://turbo.build/)) handles both the HTTP Archive dataset processing pipelines and the public reporting API endpoints.

---

## Repository Structure

This workspace is organized into separate applications (`apps/`) and reusable packages (`packages/`):

```
tech-report-apis/
├── apps/
│   ├── report-api/          # REST and MCP Reporting API for CrUX, Lighthouse, and CWV metrics
│   ├── dataform-service/    # Cloud Run service for BigQuery dataset exports to Cloud Storage
│   └── bigquery-export/     # Cloud Run Job for exporting aggregated dataset results from BigQuery
├── packages/
│   ├── shared/              # Common utility functions, database connectors, and logging modules
│   ├── eslint-config/       # Unified ESLint configurations
│   └── jest-config/         # Shared Jest configuration defaults
├── terraform/               # Production IaC (Infrastructure-as-Code) Terraform configurations
└── .github/                 # Workflows for linting, testing, and automated deployment
```

---

## Architecture & Infrastructure

Detailed system architecture diagrams, Google Cloud resource mappings, and pipeline trigger flows are documented in **[Infrastructure Overview](docs/infra.md)**.

For Dataform batch transformation models, development workspaces, and Apache Airflow DAG definitions, refer to **[`dataform/docs/dataform.md`](../dataform/docs/dataform.md)**.

---

## Monorepo Development Setup

### Prerequisites
* **Node.js**: 24+
* **Package Manager**: npm

### Installation
Install dependencies globally for the workspace to link internal packages (like `@httparchive/shared`):
```bash
npm install
```

### Global Commands (Turborepo)
Run tasks across all applications and workspaces concurrently:

* **Build all workspaces**:
  ```bash
  npx turbo run build
  ```
* **Lint the whole codebase**:
  ```bash
  npx turbo run lint
  ```
* **Run all unit tests**:
  ```bash
  npx turbo run test
  ```

---

## Applications & Infrastructure Documentation

Refer to component documentation for detailed service configurations:
* [Report API (REST/MCP Endpoints)](./apps/report-api/README.md)
* [Dataform Service (GCS Export)](./terraform/README.md#trigger-data-exports)
* [BigQuery Export (Cloud Run Job Setup)](./terraform/README.md#cloud-run-job-for-exporting-data)
* [Terraform Infrastructure-as-Code Configuration](./terraform/README.md)
