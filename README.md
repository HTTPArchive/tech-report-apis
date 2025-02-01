# tech-report-apis

APIs for the HTTP Archive Technology Report

## API

## Endpoints

### `GET /adoption`

#### Parameters

The following parameters can be used to filter the data:

- `geo` (`required`): A string representing the geographic location.
- `technology` (`required`): A comma-separated string representing the technology name(s).
- `rank` (`required`): An string representing the rank.
- `start` (optional): A string representing the start date in the format `YYYY-MM-DD`.
- `end` (optional): A string representing the end date in the format `YYYY-MM-DD`.

#### Response

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

### `GET /categories`

This endpoint can return a full list of categories names or a categories with all the associated technologies

#### Parameters

The following parameters can be used to filter the data:

- `category` (optional): A comma-separated string representing the category name(s).
- `onlyname` (optional): No value required. If present, only the category names will be returned.

#### Response

```bash
curl --request GET \
  --url 'https://d{{HOST}}/v1/categories?category=Domain%20parking%2CCI'
```

```json
[
  {
    "description": "Solutions that redirect domains to a different location or page",
    "technologies": [
      "Arsys Domain Parking"
    ],
    "origins": {
      "mobile": 14,
      "desktop": 8
    },
    "category": "Domain parking"
  },
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
  }
]
```

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/categories?onlyname=true'
```

```json
[
    "Blogs",
    "LMS",
    "CI",
    "Cross border ecommerce",
    "Cart abandonment",
    "Domain parking",
  ...
]

```

### `GET /cwv`

#### Parameters

The following parameters can be used to filter the data:

- `geo` (`required`): A string representing the geographic location.
- `technology` (`required`): A string representing the technology name.
- `rank` (`required`): An string representing the rank.
- `start` (optional): A string representing the start date in the format `YYYY-MM-DD`.
- `end` (optional): A string representing the end date in the format `YYYY-MM-DD`.

#### Response

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

#### Parameters

The following parameters can be used to filter the data:

- `technology` (`required`): A comma-separated string representing the technology name(s).
- `geo` (`required`): A string representing the geographic location.
- `rank` (`required`): An string representing the rank.
- `start` (optional): A string representing the start date in the format `YYYY-MM-DD`.
- `end` (optional): A string representing the end date in the format `YYYY-MM-DD`.

#### Response

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

#### Parameters

The following parameters can be used to filter the data:

- `geo` (`required`): A string representing the geographic location.
- `technology` (`required`): A comma-separated string representing the technology name(s).
- `rank` (`required`): An string representing the rank.
- `start` (optional): A string representing the start date in the format `YYYY-MM-DD`.
- `end` (optional): A string representing the end date in the format `YYYY-MM-DD`.

#### Response

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

### `GET /technologies`

#### Parameters

The following parameters can be used to filter the data:

- `client` (optional): A string with the client: `mobile` or `desktop`.
- `technology` (optional): A comma-separated string representing the technology name(s) or `ALL`.
- `category` (optional): A comma-separated string representing the category name(s).
- `onlyname` (optional): No value required. If present, only the technology names will be returned.

#### Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/technologies?category=Live%20chat%2C%20blog&technology=Smartsupp&client=mobile'
```

Returns a JSON object with the following schema:

```json
[
  {
    "client": "mobile",
    "similar_technologies": null,
    "description": "Smartsupp is a live chat tool that offers visitor recording feature.",
    "origins": 25649,
    "technology": "Smartsupp",
    "category": "Live chat"
  }
]
```
