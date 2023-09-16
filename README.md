# tech-report-apis

APIs for the HTTP Archive Technology Report


## Script list

- script_adoption: Query BQ httparchive.core_web_vitals.technologies table and append data to Firestore table 'adoption'
- script_categories: Query BQ httparchive.core_web_vitals.technologies table and append data to Firestore table 'categories'
- script_core_web_vitals: Query BQ httparchive.core_web_vitals.technologies table and append data to Firestore table 'core_web_vitals'
- script_create_descriptions_json: Take all the techonlogies description from the webappalizer repo and create the file static/tech_descriptin.josn
- script_lighthouse: Query BQ httparchive.core_web_vitals.technologies table and append data to Firestore table 'lighthouse'
- script_save_tech_descriptions: Read the file static/tech_descriptin.josn and append the data to Firetsore table 'technologies-list'
- script_technologies: Query BQ httparchive.core_web_vitals.technologies table and append data to Firestore table 'technolgies' appending the technology description from 'technologies-list' table

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


### `GET /technologies`

#### Parameters

The following parameters can be used to filter the data:

- `technology` (`required`): A comma-separated string representing the technology name(s).
- `start` (optional): A string representing the start date in the format `YYYY-MM-DD`.
- `end` (optional): A string representing the end date in the format `YYYY-MM-DD`.
- `geo` (optional): A string representing the geographic location.
- `rank` (optional): An string representing the rank.
- `category` (optional): A comma-separated string representing the category name(s).

#### Response

```bash
curl --request GET \
  --url 'https://{{HOST}}/v1/technologies?start=2022-02-01&end=2022-04-01&category=Live%20chat%2C%20blog&technology=Smartsupp&client=mobile'
```

Returns a JSON object with the following schema:

```json
[
	{
		"client": "mobile",
		"similar_technologies": null,
		"date": "2022-02-01",
		"description": "Smartsupp is a live chat tool that offers visitor recording feature.",
		"technology": "Smartsupp",
		"category": "Live chat",
		"origins": 16840
	},
  ...
]
```