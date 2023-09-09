import sys
from google.cloud import bigquery
from google.cloud import firestore

def convert_to_float(value):
    con = str(value)
    if con != 'None':
        return float(con)
    else:
        return 0

def execute_query_and_insert_result(start_date, end_date):
    # Set up BigQuery client
    bq_client = bigquery.Client()

    # Set up Firestore client
    firestore_client = firestore.Client()

    query = """
        CREATE TEMPORARY FUNCTION GET_VITALS(
            records ARRAY<STRUCT<
                client STRING,
                origins_with_good_fid INT64,
                origins_with_good_cls INT64,
                origins_with_good_lcp INT64,
                origins_with_good_fcp INT64,
                origins_with_good_ttfb INT64,
                origins_with_good_inp INT64,
                origins_with_any_fid INT64,
                origins_with_any_cls INT64,
                origins_with_any_lcp INT64,
                origins_with_any_fcp INT64,
                origins_with_any_ttfb INT64,
                origins_with_any_inp INT64,
                origins_with_good_cwv INT64,
                origins_eligible_for_cwv INT64
          >>
        ) RETURNS ARRAY<STRUCT<
            name STRING,
            desktop STRUCT<
                good_number INT64,
                tested INT64
        >,
        mobile STRUCT<
            good_number INT64,
            tested INT64
            >
        >> LANGUAGE js AS '''
        const METRIC_MAP = {
            overall: ['origins_with_good_cwv', 'origins_eligible_for_cwv'],
            LCP: ['origins_with_good_lcp', 'origins_with_any_lcp'],
            CLS: ['origins_with_good_cls', 'origins_with_any_cls'],
            FID: ['origins_with_good_fid', 'origins_with_any_fid'],
            FCP: ['origins_with_good_fcp', 'origins_with_any_fcp'],
            TTFB: ['origins_with_good_ttfb', 'origins_with_any_ttfb'],
            INP: ['origins_with_good_inp', 'origins_with_any_inp']
        };

        // Initialize the vitals map.
        const vitals = Object.fromEntries(Object.keys(METRIC_MAP).map(metricName => {
            return [metricName, {name: metricName}];
        }));

        // Populate each client record.
        records.forEach(record => {
            Object.entries(METRIC_MAP).forEach(([metricName, [good_number, tested]]) => {
                vitals[metricName][record.client] = {good_number: record[good_number], tested: record[tested]};
            });
        });

        return Object.values(vitals);
        ''';

        SELECT
            date,
            app AS technology,
            rank,
            geo,
            GET_VITALS(ARRAY_AGG(STRUCT(
                client,
                origins_with_good_fid,
                origins_with_good_cls,
                origins_with_good_lcp,
                origins_with_good_fcp,
                origins_with_good_ttfb,
                origins_with_good_inp,
                origins_with_any_fid,
                origins_with_any_cls,
                origins_with_any_lcp,
                origins_with_any_fcp,
                origins_with_any_ttfb,
                origins_with_any_inp,
                origins_with_good_cwv,
                origins_eligible_for_cwv
            ))) AS vitals
        FROM
            `httparchive.core_web_vitals.technologies`
        WHERE
    """

    # Construct the WHERE clause based on the provided parameters
    if start_date and end_date:
        query += f" date >= '{start_date}' AND date <= '{end_date}'"

    query += " GROUP BY date, app, rank, geo"

    # Execute the BigQuery query
    query_job = bq_client.query(query)
    results = query_job.result()

    # Create a new Firestore document for each result and insert it into the "technologies" collection
    collection_ref = firestore_client.collection('core_web_vitals')
    print(results)
    for row in results:

        item = dict(row.items())
        item['date'] = str(row['date'])

        print(item)

        doc_ref = collection_ref.document()
        doc_ref.set(item)

    print("Data inserted into Firestore successfully.")

# Get command-line arguments
start_date = sys.argv[1] if len(sys.argv) > 1 else None
end_date = sys.argv[2] if len(sys.argv) > 2 else None

# Call the function to execute the query and insert the result into Firestore
execute_query_and_insert_result(start_date, end_date)
