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
  ref = DB.collection(u'technologies')

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

  if 'onlyname' in params:
    onlyname = True

  documents = query.stream()

  data = []
  for doc in documents:
      item = doc.to_dict()
      if onlyname:
        data.append(item['technology'])
      else:
        data.append(Presenters.technology(doc.to_dict()))

  return Result(result=data)
