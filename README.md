# Technology Reports API (Node.js)

This is a unified Google Cloud Run function that provides technology metrics and information via various endpoints.

## Setup

### Prerequisites

- Node.js 18+
- npm
- Google Cloud account with necessary permissions
- Set environment variables:

    ```bash
    export PROJECT=httparchive
    export DATABASE=tech-report-apis-prod
    ```

### Local Development

  ```bash
  npm install
  npm start:functions
  ```

The API will be available at <http://localhost:8080>

### Google Cloud Functions Mode

  ```bash
  npm install
  npm run start:functions
  ```

The function will run on `http://localhost:8080`

## Deployment

### Deploy to Google Cloud Run Function

```bash
# Deploy to Google Cloud Functions
gcloud functions deploy tech-report-api \
  --runtime nodejs22 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point api \
  --source .
```

## API Endpoints

## Features

- **ETag Support**: All endpoints include ETag headers for efficient caching
- **CORS Enabled**: Cross-origin requests are supported
- **Cache Headers**: 6-hour cache control for static data
- **Health Check**: GET `/` returns health status
- **RESTful API**: All endpoints follow REST conventions

### `GET /`

Health check

### `GET /technologies`

Lists available technologies with optional filtering.

#### Parameters

- `technology` (optional): Filter by technology name(s) - comma-separated list
- `category` (optional): Filter by category - comma-separated list
- `onlyname` (optional): If present, returns only technology names

#### Example Request & Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/technologies?category=Live%20chat%2C%20blog&technology=Smartsupp'
```

Returns a JSON object with the following schema:

```json
[
  {
    "technology": "Smartsupp",
    "category": "Live chat",
    "description": "Smartsupp is a live chat tool that offers visitor recording feature.",
    "icon": "Smartsupp.svg",
    "origins": {
      "mobile": 24115,
      "desktop": 20250
    }
  }
]
```

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/technologies?onlyname'
```

Returns a JSON object with the following schema:

```json
[
    "1C-Bitrix",
    "2B Advice",
    "33Across",
    "34SP.com",
    "4-Tell",
    "42stores",
    "51.LA",
    "5centsCDN",
    ...
}
```

### `GET /categories`

Lists available categories.

#### Categories Parameters

- `category` (optional): Filter by category name(s) - comma-separated list
- `onlyname` (optional): If present, returns only category names

#### Categories Response

```bash
curl --request GET \
  --url 'https://d{{HOST}}/v1/categories?category=Domain%20parking%2CCI'
```

```json
[
    {
        "description": "Systems that automate building, testing, and deploying code",
        "technologies": [
            "Jenkins",
            "TeamCity"
        ],
        "origins": {
            "mobile": 22,
            "desktop": 35
        },
        "category": "CI"
    },
    {
        "description": "Solutions that redirect domains to a different location or page",
        "technologies": [
          "Cloudflare",
          "Arsys Domain Parking"
        ],
        "origins": {
            "mobile": 14,
            "desktop": 8
        },
        "category": "Domain parking"
    }
]
```

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/categories?onlyname'
```

```json
[
    "A/B Testing",
    "Accessibility",
    "Accounting",
    "Advertising",
    "Affiliate programs",
    "Analytics",
  ...
]
```

### `GET /adoption`

Provides technology adoption data.

#### Adoption Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)
- `geo` (optional): Filter by geographic location
- `rank` (optional): Filter by rank

#### Adoption Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/adoption?start=2023-01-01&end=2023-09-01&geo=Mexico&technology=GoCache&rank=ALL'
```

Returns a JSON object with the following schema:

```json
[
    {
        "technology": "GoCache",
        "geo": "Mexico",
        "date": "2023-06-01",
        "rank": "ALL",
        "adoption": {
            "mobile": 19,
            "desktop": 11
        }
    },
    ...
]
```

### `GET /cwv` (Core Web Vitals)

Provides Core Web Vitals metrics for technologies.

#### CWV Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `geo` (required): Filter by geographic location
- `rank` (required): Filter by rank
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)

#### CWV Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/cwv?start=2023-01-01&end=2023-09-01&geo=Uruguay&technology=DomainFactory&rank=ALL'

```

```json
[
    {
        "geo": "Uruguay",
        "date": "2023-06-01",
        "rank": "ALL",
        "technology": "DomainFactory",
        "vitals": [
            {
                "mobile": {
                    "good_number": 1,
                    "tested": 4
                },
                "desktop": {
                    "good_number": 0,
                    "tested": 2
                },
                "name": "overall"
            },
      ...
        ]
    }
]
```

### `GET /lighthouse`

Provides Lighthouse scores for technologies.

#### Lighthouse Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `geo` (required): Filter by geographic location
- `rank` (required): Filter by rank
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)

#### Lighthouse Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/lighthouse?start=2023-01-01&end=2023-09-01&geo=Maldives&technology=Oracle%20HTTP%20Server%2C%20Google%20Optimize%2C%20Searchanise&rank=ALL'
```

Returns a JSON object with the following schema:

```json
[
    {
        "geo": "Maldives",
        "date": "2023-06-01",
        "rank": "ALL",
        "technology": "Oracle HTTP Server",
        "lighthouse": [
            {
                "mobile": {
                    "median_score": 0.945
                },
                "desktop": null,
                "name": "accessibility"
            },
            {
                "mobile": {
                    "median_score": 0.915
                },
                "desktop": null,
                "name": "best_practices"
            },
            ...
        ]
    }
]
```

### `GET /page-weight`

Provides Page Weight metrics for technologies.

#### Page Weight Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `geo` (optional): Filter by geographic location
- `rank` (optional): Filter by rank
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)

#### Page Weight Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/page-weight?geo=ALL&technology=WordPress&rank=ALL'
```

Returns a JSON object with the following schema:

```json
[
    {
        "client": "desktop",
        "date": "2023-07-01",
        "geo": "ALL",
        "median_bytes_image": "1048110",
        "technology": "WordPress",
        "median_bytes_total": "2600099",
        "median_bytes_js": "652651",
        "rank": "ALL"
    }
    ...
]
```

### `GET /ranks`

Lists all available ranks.

### `GET /geos`

Lists all available geographic locations.

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test
```

## Response Format

All API responses follow this format:

```json
[
  // Array of data objects
]
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
