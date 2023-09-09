import os
import json
from google.cloud import firestore
from .result import Result 

DB = firestore.Client(project=os.environ.get('PROJECT'))

def list_data(params):
  ref = DB.collection(u'technologies')

  query = ref
  print("params", params)
  if 'start' in params:
    query = query.where('date', '>=', params['start'])
  if 'end' in params:
    query = query.where('date', '<=', params['end'])
  if 'geo' in params:
    query = query.where('geo', '==', params['geo'])
  if 'technology' in params:
    params_array = json.loads(params['technology'])
    query = query.where('technology', 'in', params_array)
  if 'rank' in params:
    query = query.where('rank', '==', params['rank'])
  if 'category' in params:
    params_array = json.loads(params['category'])
    query = query.where('category', 'in', params_array)

  documents = query.stream()

  data = []
  for doc in documents:
      data.append(doc.to_dict())

  return Result(result=data)
