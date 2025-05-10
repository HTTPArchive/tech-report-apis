# Technology Reports API (Node.js)

This is a unified Google Cloud Run function that provides technology metrics and information via various endpoints.

## Setup

### Prerequisites

- Node.js 18+
- npm
- Google Cloud account with necessary permissions

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export PROJECT=your-gcp-project-id
export DATABASE=your-firestore-database
```

3. Run the application locally:
```bash
npm start
```

The API will be available at http://localhost:8080

## Deployment

### Using Google Cloud Build

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/tech-report-api
gcloud run deploy tech-report-api --image gcr.io/PROJECT_ID/tech-report-api --platform managed
```

## API Endpoints

### `GET /technologies`

Lists available technologies with optional filtering.

#### Parameters

- `technology` (optional): Filter by technology name(s) - comma-separated list
- `category` (optional): Filter by category - comma-separated list
- `onlyname` (optional): If present, returns only technology names

### `GET /categories`

Lists available categories.

#### Parameters

- `category` (optional): Filter by category name(s) - comma-separated list
- `onlyname` (optional): If present, returns only category names

### `GET /adoption`

Provides technology adoption data.

#### Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)
- `geo` (optional): Filter by geographic location
- `rank` (optional): Filter by rank

### `GET /cwvtech` (Core Web Vitals)

Provides Core Web Vitals metrics for technologies.

#### Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `geo` (required): Filter by geographic location
- `rank` (required): Filter by rank
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)

### `GET /lighthouse`

Provides Lighthouse scores for technologies.

#### Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `geo` (required): Filter by geographic location
- `rank` (required): Filter by rank
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)

### `GET /page-weight`

Provides Page Weight metrics for technologies.

#### Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `geo` (optional): Filter by geographic location
- `rank` (optional): Filter by rank
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)

### `GET /ranks`

Lists all available ranks.

### `GET /geos`

Lists all available geographic locations.

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "result": [
    // Array of data objects
  ]
}
```

Or in case of an error:

```json
{
  "success": false,
  "errors": [
    {"key": "error message"}
  ]
}
```
