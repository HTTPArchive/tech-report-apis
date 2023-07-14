import json
import uuid
from google.cloud import firestore
from google.cloud import storage

storage_client = storage.Client()
db = firestore.Client()

# Note: Client.list_blobs requires at least package version 1.17.0.
blobs = storage_client.list_blobs("reports-table-exports")

# Note: The call returns a response only when the iterator is consumed.
for blob in blobs:
  print(blob.path )
  blob.download_to_filename(blob.name)
  data = []

  for line in open(blob.name, 'r'):
      data.append(json.loads(line))

  idx = 0
  # # Loop over each row in the JSON data and insert it into the Firestore collection
  # doc_ref = db.collection('reports').document()
  # for row in data:
  #     doc_ref.set(row)

  doc_ref = db.collection('reports')
  batch = db.batch()
  for row in data:
      record_ref = doc_ref.document(uuid.uuid4().hex)
      batch.set(record_ref, row)
      idx += 1

      # Commit the batch at every 500th record.
      if idx == 499:
          print('Committing..')
          batch.commit()
          # Start a new batch for the next iteration.
          batch = db.batch()
          idx = 0

  print('Committing..')
  batch.commit()