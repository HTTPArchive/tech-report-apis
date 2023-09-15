import os
import json
from google.cloud import firestore
from .result import Result 

DB = firestore.Client(project=os.environ.get('PROJECT'))

def list_data(params):
  ref = DB.collection(u'categories')

  query = ref

  if 'category' in params:
    category_array = json.loads(params['category'])
    query = query.where('category', 'in', category_array)
    
  if 'technologies' in params:
    params_array = json.loads(params['technologies'])
    query = query.where('technologies', 'in', params_array)

  documents = query.stream()

  data = []

  if 'onlyname' in params:

    for doc in documents:
        item = doc.to_dict()
        if 'category' in item:
          data.append(item['category'])

  else:

    for doc in documents:
      data.append(doc.to_dict())

  return Result(result=data)
