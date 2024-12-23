import os
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from .result import Result 
from .utils import convert_to_array

DB = firestore.Client(project=os.environ.get('PROJECT'), database=os.environ.get('DATABASE'))
TABLE = 'page_weight'

def get_latest_date():
    """Retrieve the latest date in the collection."""
    query = DB.collection(TABLE).order_by('date', direction=firestore.Query.DESCENDING).limit(1)
    docs = query.stream()
    for doc in docs:
        return doc.to_dict().get('date')
    return None

def list_data(params):

  technology_array = convert_to_array(params['technology'])
  data = []

  if 'start' in params and params['start'] == 'latest':
    params['start'] = get_latest_date()

  for technology in technology_array:
    query = DB.collection(TABLE)

    if 'start' in params:
      query = query.where(filter=FieldFilter('date', '>=', params['start']))

    if 'end' in params:
      query = query.where(filter=FieldFilter('date', '<=', params['end']))

    if 'geo' in params:
      query = query.where(filter=FieldFilter('geo', '==', params['geo']))

    if 'rank' in params:
      query = query.where(filter=FieldFilter('rank', '==', params['rank']))

    query = query.where(filter=FieldFilter('technology', '==', technology))

    documents = query.stream()

    for doc in documents:
        data.append(doc.to_dict())

  return Result(result=data)
