import os
import json
from google.cloud import firestore
from .result import Result 
from .utils import convert_to_array

DB = firestore.Client(project=os.environ.get('PROJECT'))

def list_data(params):
  ref = DB.collection(u'categories')

  query = ref

  data = []

  if 'onlyname' in params:
    documents = query.stream()

    for doc in documents:
      item = doc.to_dict()
      if 'category' in item:
        data.append(item['category'])

  else:

    if 'category' in params:
      category_array = convert_to_array(params['category'])

      for category in category_array:
        results = DB.collection(u'categories').where("category", "==", category).stream()
        for doc in results:
          data.append(doc.to_dict())

  return Result(result=data)
