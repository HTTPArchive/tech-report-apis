import os
import json
from google.cloud import firestore
from .result import Result 
from .utils import convert_to_array

DB = firestore.Client(project=os.environ.get('PROJECT'))

def list_data(params):
  ref = DB.collection(u'categories')

  query = ref

  if 'technology' in params:
    params_array = convert_to_array(params['technology'])
    query = query.where('technology', 'in', params_array)

  if 'category' in params:
    params_array = convert_to_array(params['category'])
    query = query.where('category', 'in', params_array)

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
