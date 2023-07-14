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
  if 'category' in params:
    query = query.where('category', '==', params['category'])
  if 'geo' in params:
    query = query.where('geo', '==', params['geo'])
  if 'app' in params:
    params_array = json.loads(params['app'])
    query = query.where('app', 'in', params_array)
  if 'client' in params:
    query = query.where('client', '==', params['client'])
  if 'rank' in params:
    query = query.where('rank', '==', params['rank'])

  documents = query.stream()

  data = []
  for doc in documents:
      data.append(doc.to_dict())

  return Result(result=data)
