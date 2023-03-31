import os
from google.cloud import firestore
from .result import Result 

DB = firestore.Client(project=os.environ.get('PROJECT'))

def list_data(params):
  ref = DB.collection(u'reports')

  query = ref

  if 'start' in params:
    query = query.where('date', '>=', params['start'])
  if 'end' in params:
    query = query.where('date', '<', params['end'])
  if 'category' in params:
    query = query.where('category', '==', params['category'])
  if 'geo' in params:
    query = query.where('geo', '==', params['geo'])
  
  documents = query.stream()

  data = {}

  for doc in documents:
    data[doc.id] = doc.to_dict()

  return Result(result=data)
