import os
import json
from google.cloud import firestore
from .result import Result 
from .utils import convert_to_array

DB = firestore.Client(project=os.environ.get('PROJECT'))

def list_data(params):
  ref = DB.collection(u'adoption')

  query = ref
  print("params", params)
  if 'start' in params:
    query = query.where('date', '>=', params['start'])
  if 'end' in params:
    query = query.where('date', '<=', params['end'])
  if 'geo' in params:
    query = query.where('geo', '==', params['geo'])
  if 'technology' in params:
    params_array = convert_to_array(params['technology'])
    query = query.where('technology', 'in', params_array)
  if 'rank' in params:
    query = query.where('rank', '==', params['rank'])

  documents = query.stream()

  data = []
  for doc in documents:
      data.append(doc.to_dict())

  return Result(result=data)
