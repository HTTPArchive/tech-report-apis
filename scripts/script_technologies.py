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

    # Define the BigQuery query with optional parameters
    query = """
        SELECT
          *
        FROM
          `httparchive.core_web_vitals.technologies`
        WHERE
          1=1
    """

    # Construct the WHERE clause based on the provided parameters
    if start_date and end_date:
        query += f" AND date >= '{start_date}' AND date <= '{end_date}'"

    query += " ORDER BY date DESC LIMIT 10"

    # Execute the BigQuery query
    query_job = bq_client.query(query)
    results = query_job.result()

    # Create a new Firestore document for each result and insert it into the "technologies" collection
    collection_ref = firestore_client.collection('technologies')
    print(results)
    for row in results:

        item = dict(row.items())
        item['date'] = str(row['date'])
        item['median_lighthouse_score_accessibility'] = convert_to_float(row['median_lighthouse_score_accessibility'])
        item['median_lighthouse_score_performance'] = convert_to_float(row['median_lighthouse_score_performance'])
        item['median_lighthouse_score_pwa'] = convert_to_float(row['median_lighthouse_score_pwa'])
        item['median_lighthouse_score_seo'] = convert_to_float(row['median_lighthouse_score_seo'])

        print(item)

        doc_ref = collection_ref.document()
        doc_ref.set(item)

    print("Data inserted into Firestore successfully.")

# Get command-line arguments
start_date = sys.argv[1] if len(sys.argv) > 1 else None
end_date = sys.argv[2] if len(sys.argv) > 2 else None

# Call the function to execute the query and insert the result into Firestore
execute_query_and_insert_result(start_date, end_date)
