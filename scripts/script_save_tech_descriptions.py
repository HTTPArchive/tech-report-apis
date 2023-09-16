import os
import json
from google.cloud import firestore

# Initialize Firestore client
# Replace 'your-project-id' with your actual Firestore project ID
# You must also set up authentication for your project.
db = firestore.Client()

# Define the path to the JSON file
json_file_path = "key_description.json"

# Read the JSON data from the file
with open(json_file_path, 'r', encoding='utf-8') as json_file:
    data = json.load(json_file)

# Define the Firestore collection reference
collection_ref = db.collection(u'technologies-list')

# Loop through the data and save it to Firestore
for key, description in data.items():
    document_data = {
        'name': key,       
        'description': description
    }

    collection_ref.document().set(document_data)

print("Data has been saved to Firestore.")
