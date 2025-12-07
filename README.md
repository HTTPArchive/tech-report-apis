# Reports API

This is an HTTP Archive Reporting API that provides reporting data via various endpoints.

## Setup

### Prerequisites

- Node.js 22+
- npm
- Google Cloud account with necessary permissions
- Set environment variables:

    ```bash
    export DATABASE=tech-report-api-prod
    ```

### Local Development

  ```bash
  npm install
  npm run start
  ```

The API will be available at <http://localhost:3000>

## API Endpoints

- **CORS Enabled**: Cross-origin requests are supported
- **Cache Headers**: 6-hour cache control for static data
- **Health Check**: GET `/` returns health status
- **RESTful API**: All endpoints follow REST conventions

### `GET /`

Health check endpoint that returns the current status of the API.

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/health'
```

Returns a JSON object with the following schema:

```json
{
    "status": "ok"
}
```

### `GET /categories`

Lists available categories.

#### Categories Parameters

- `category` (optional): Filter by category name(s) - comma-separated list
- `onlyname` (optional): If present, returns only category names
- `fields` (optional): Comma-separated list of fields to include in the response (see [Field Selection API Documentation](#field-selection-api-documentation) for details)

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

### `GET /technologies`

Lists available technologies with optional filtering.

#### Parameters

- `technology` (optional): Filter by technology name(s) - comma-separated list
- `category` (optional): Filter by category - comma-separated list
- `onlyname` (optional): If present, returns only technology names
- `fields` (optional): Comma-separated list of fields to include in the response (see [Field Selection API Documentation](#field-selection-api-documentation) for details)

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

### `GET /versions`

Lists available versions.

#### Versions Parameters

- `technology` (optional): Filter by technology name(s) - comma-separated list
- `category` (optional): Filter by category - comma-separated list
- `version` (optional): Filter by version name(s) - comma-separated list
- `onlyname` (optional): If present, returns only version names
- `fields` (optional): Comma-separated list of fields to include in the response (see [Field Selection API Documentation](#field-selection-api-documentation) for details)

#### Versions Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/versions?technology=WordPress&version=6.2.2'
```

Returns a JSON object with the following schema:

```json
[
    {
        "technology": "WordPress",
        "version": "6.2.2",
        "origins": {
            "mobile": 123456,
            "desktop": 654321
        }
    }
]
```

### `GET /adoption`

Provides technology adoption data.

#### Adoption Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `geo` (required): Filter by geographic location
- `rank` (required): Filter by rank
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)

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
        "date": "2023-06-01",
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
        "date": "2023-06-01",
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
        "date": "2023-06-01",
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
- `geo` (required): Filter by geographic location
- `rank` (required): Filter by rank
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
        "date": "2020-06-01",
        "pageWeight": [
            {
                "desktop": {
                    "median_bytes": 2428028
                },
                "mobile": {
                    "median_bytes": 2430912
                },
                "name": "total"
            },
            {
                "desktop": {
                    "median_bytes": 490451
                },
                "mobile": {
                    "median_bytes": 477218
                },
                "name": "js"
            },
            {
                "desktop": {
                    "median_bytes": 1221876
                },
                "mobile": {
                    "median_bytes": 1296673
                },
                "name": "images"
            }
        ],
        "technology": "WordPress"
    },
    ...
]
```


### `GET /audits`

Provides Lighthouse audits for technologies.

#### Audits Parameters

- `technology` (required): Filter by technology name(s) - comma-separated list
- `geo` (required): Filter by geographic location
- `rank` (required): Filter by rank
- `start` (optional): Filter by date range start (YYYY-MM-DD or 'latest')
- `end` (optional): Filter by date range end (YYYY-MM-DD)

#### Audits Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/audits?start=latest&geo=ALL&technology=WordPress&rank=ALL'
```

Returns a JSON object with the following schema:

```json
[
    {
        "date": "2025-06-01",
        "audits": [
            {
                "desktop": {
                    "pass_origins": 2428028
                },
                "mobile": {
                    "pass_origins": 2430912
                },
                "id": "first-contentful-paint",
                "category": "performance"
            },
            {
                "desktop": {
                    "pass_origins": 490451
                },
                "mobile": {
                    "pass_origins": 477218
                },
                "id": "largest-contentful-paint",
                "category": "performance"
            },
            {
                "desktop": {
                    "pass_origins": 1221876
                },
                "mobile": {
                    "pass_origins": 1296673
                },
                "id": "cumulative-layout-shift",
                "category": "performance"
            }
        ],
        "technology": "WordPress"
    },
    ...
]
```

### `GET /ranks`

Lists all available ranks.

#### Ranks Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/ranks'
```

Returns a JSON object with the following schema:

```json
[
    {
        "rank": "ALL"
    },
    {
        "rank": "Top 10M"
    },
    ...
]
```

### `GET /geos`

Lists all available geographic locations.

#### Geos Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/geos'
```

Returns a JSON object with the following schema:

```json
[
    {
        "geo": "ALL"
    },
    {
        "geo": "United States of America"
    },
    ...
]
```

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

## Field Selection API Documentation

### Overview

The categories and technologies endpoints now support custom field selection, allowing clients to specify exactly which fields they want in the response. This feature helps reduce payload size and improves API performance by returning only the needed data.

### Categories Endpoint

- `category` - Category name
- `description` - Category description
- `technologies` - Array of technology names in the category
- `origins` - Array of origin companies/organizations

Get only category names:

```http
GET /v1/categories?fields=category
```

Get categories with descriptions:

```http
GET /v1/categories?fields=category,description
```

### Technologies Endpoint

- `technology` - Technology name
- `category` - Category name
- `description` - Technology description
- `icon` - Icon filename
- `origins` - Array of origin companies/organizations

Get only technology names and categories:

```http
GET /v1/technologies?fields=technology,category
```

Response:

```json
{
  "data": [
    {
      "technology": "React",
      "category": "JavaScript Frameworks"
    },
    {
      "technology": "Angular",
      "category": "JavaScript Frameworks"
    }
  ]
}
```

Combine with existing filters:

```http
GET /v1/technologies?category=JavaScript%20Frameworks&fields=technology,icon
```

### Versions Endpoint

- `technology` - Technology name
- `version` - Version name
- `origins` - Mobile and desktop origins

Get only technology and version names:

```http
GET /v1/versions?fields=technology,version
```

Response:

```json
{
  {
    "technology": "React",
    "version": "18.2.0"
  },
  {
    "technology": "Angular",
    "version": "12.0.0"
  },
  ...
}
```


