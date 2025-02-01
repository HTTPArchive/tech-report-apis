import os
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from .result import Result
from .utils import convert_to_array

DB = firestore.Client(project=os.environ.get('PROJECT'), database=os.environ.get('DATABASE'))
TABLE = 'categories'

def list_data(params):
  ref = DB.collection(TABLE)

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
        results = query.where(filter=FieldFilter("category", "==", category)).stream()
        for doc in results:
          data.append(doc.to_dict())

    else:
      documents = query.stream()

      for doc in documents:
        data.append(doc.to_dict())

  return Result(result=data)
