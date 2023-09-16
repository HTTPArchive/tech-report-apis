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

### Endpoitns

