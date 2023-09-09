import os
import json
from google.cloud import firestore
from .result import Result 

DB = firestore.Client(project=os.environ.get('PROJECT'))

def list_data(params):
  ref = DB.collection(u'categories')

  query = ref
  print("params", params)
  if 'category' in params:
    query = query.where('category', '==', params['category'])
  if 'technologies' in params:
    params_array = json.loads(params['technologies'])
    query = query.where('technologies', 'in', params_array)

  documents = query.stream()

  data = []
  for doc in documents:
      data.append(doc.to_dict())

  return Result(result=data)
