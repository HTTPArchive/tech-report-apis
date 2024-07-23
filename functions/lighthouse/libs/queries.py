import os
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from .result import Result 
from .utils import convert_to_array

DB = firestore.Client(project=os.environ.get('PROJECT'), database=os.environ.get('DATABASE'))
TABLE = 'lighthouse'

def list_data(params):

  technology_array = convert_to_array(params['technology'])
  data = []

  query = DB.collection(TABLE)

  if 'start' in params:
    query = query.where(filter=FieldFilter('date', '>=', params['start']))
  if 'end' in params:
    query = query.where(filter=FieldFilter('date', '<=', params['end']))

  query = query.where(filter=FieldFilter('geo', '==', params['geo']))
  query = query.where(filter=FieldFilter('rank', '==', params['rank']))
  
  for technology in technology_array:
    query = query.where(filter=FieldFilter('technology', '==', technology))

  documents = query.stream()

  for doc in documents:
      data.append(doc.to_dict())

  return Result(result=data)
