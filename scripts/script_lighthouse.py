import sys
import uuid
from google.cloud import bigquery
from google.cloud import firestore
from decimal import Decimal

def convert_decimal_to_float(data):
    if isinstance(data, Decimal):
        return float(data)
    elif isinstance(data, dict):
        new_dict = {}
        for key, value in data.items():
            new_dict[key] = convert_decimal_to_float(value)
        return new_dict
    elif isinstance(data, list):
        new_list = []
        for item in data:
            new_list.append(convert_decimal_to_float(item))
        return new_list
    else:
        return data

def execute_query_and_insert_result(start_date, end_date):
    # Set up BigQuery client
    bq_client = bigquery.Client()

    # Set up Firestore client
    firestore_client = firestore.Client()

    query = """
        CREATE TEMPORARY FUNCTION GET_LIGHTHOUSE(
            records ARRAY<STRUCT<
                client STRING,
                median_lighthouse_score_accessibility NUMERIC,
                median_lighthouse_score_best_practices NUMERIC,
                median_lighthouse_score_performance NUMERIC,
                median_lighthouse_score_pwa NUMERIC,
                median_lighthouse_score_seo NUMERIC
        >>
        ) RETURNS ARRAY<STRUCT<
        name STRING,
        desktop STRUCT<
            median_score NUMERIC
        >,
        mobile STRUCT<
            median_score NUMERIC
        >
        >> LANGUAGE js AS '''
        const METRIC_MAP = {
            accessibility: 'median_lighthouse_score_accessibility',
            best_practices: 'median_lighthouse_score_best_practices',
            performance: 'median_lighthouse_score_performance',
            pwa: 'median_lighthouse_score_pwa',
            seo: 'median_lighthouse_score_seo',
        };

        // Initialize the Lighthouse map.
        const lighthouse = Object.fromEntries(Object.keys(METRIC_MAP).map(metricName => {
            return [metricName, {name: metricName}];
        }));

        // Populate each client record.
        records.forEach(record => {
            Object.entries(METRIC_MAP).forEach(([metricName, median_score]) => {
                lighthouse[metricName][record.client] = {median_score: record[median_score]};
            });
        });

        return Object.values(lighthouse);
        ''';

        SELECT
            date,
            app AS technology,
            rank,
            geo,
            GET_LIGHTHOUSE(ARRAY_AGG(STRUCT(
                client,
                median_lighthouse_score_accessibility,
                median_lighthouse_score_best_practices,
                median_lighthouse_score_performance,
                median_lighthouse_score_pwa,
                median_lighthouse_score_seo

            ))) AS lighthouse
        FROM
            `httparchive.core_web_vitals.technologies`
        
    """

    # Construct the WHERE clause based on the provided parameters
    if start_date and end_date:
        query += f"WHERE date >= '{start_date}' AND date <= '{end_date}'"

    query += " GROUP BY date, app, rank, geo"

    # Execute the BigQuery query
    query_job = bq_client.query(query)
    results = query_job.result()

    collection_ref = firestore_client.collection('lighthouse')

    idx = 0
    batch = firestore_client.batch()
    print("Data insert process started.")
    for row in results:
        # Convert date
        #
        item = dict(row.items())
        item['date'] = str(row['date'])
        item = convert_decimal_to_float(item)

        record_ref = collection_ref.document(uuid.uuid4().hex)
        batch.set(record_ref, item)
        idx += 1

        # Commit the batch at every 500th record.
        if idx == 499:
            batch.commit()
            # Start a new batch for the next iteration.
            batch = firestore_client.batch()
            idx = 0

    batch.commit()
    print("Data inserted into Firestore successfully.")

# Get command-line arguments
start_date = sys.argv[1] if len(sys.argv) > 1 else None
end_date = sys.argv[2] if len(sys.argv) > 2 else None

# Call the function to execute the query and insert the result into Firestore
execute_query_and_insert_result(start_date, end_date)
