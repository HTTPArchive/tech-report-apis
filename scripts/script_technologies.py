################################################################################
# Description: This script queries the BigQuery table "technologies" 
# and inserts the result into 
# the Firestore collection "technologies".
#
# Parameters: start_date (optional), end_date (optional)
# Usage example: python scripts/script_technologies.py 2020-01-01 2020-12-31
################################################################################

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
        SELECT
            client,
            app AS technology,
            description,
            # CSV format
            category,
            NULL AS similar_technologies,
            origins
        FROM
            `httparchive.core_web_vitals.technologies`
        JOIN
            `httparchive.core_web_vitals.technology_descriptions`
        ON
            app = technology
        WHERE
            geo = 'ALL' AND
            rank = 'ALL'
    """

    # Construct the WHERE clause based on the provided parameters
    if start_date and end_date:
        query += f" AND date >= '{start_date}' AND date <= '{end_date}'"

    query += " ORDER BY origins DESC"

    # Execute the BigQuery query
    query_job = bq_client.query(query)
    results = query_job.result()

    # Create a new Firestore document for each result and insert it into the "technologies" collection
    collection_ref = firestore_client.collection(u'technologies')
    
    for row in results:
        item = dict(row.items())
        # overriding BQ fields
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
