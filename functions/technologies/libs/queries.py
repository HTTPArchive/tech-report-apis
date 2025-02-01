import os
import json
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter, Or

from .result import Result
from .utils import convert_to_array
from .presenters import Presenters

DB = firestore.Client(project=os.environ.get('PROJECT'), database=os.environ.get('DATABASE'))

def list_data(params):
  onlyname = False
  ref = DB.collection('technologies')

  query = ref

  if 'technology' in params:
    arfilters = []
    params_array = convert_to_array(params['technology'])
    for tech in params_array:
      arfilters.append(FieldFilter('technology', '==', tech))

    or_filter = Or(filters=arfilters)

    query = query.where(filter=or_filter)

  if 'category' in params:
    params_array = convert_to_array(params['category'])
    query = query.where(filter=FieldFilter('category_obj', 'array_contains_any', params_array))

  if 'client' in params:
    query = query.where(filter=FieldFilter('client', '==', params['client']))

  if 'onlyname' in params:
    onlyname = True

  if 'sort' not in params:
    query = query.order_by('technology', direction=firestore.Query.ASCENDING)
  else:
    if params['sort'] == 'origins':
      query = query.order_by('origins', direction=firestore.Query.DESCENDING)


  documents = query.stream()

  data = []
  if onlyname and 'client' not in params:
    appended_technologies = set()
    for doc in documents:
      technology = doc.get('technology')
      if technology not in appended_technologies:
        appended_technologies.add(technology)
        data.append(technology)

  else:
    for doc in documents:
      data.append(Presenters.technology(doc.to_dict()))

  return Result(result=data)
