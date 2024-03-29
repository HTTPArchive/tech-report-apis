import os
import json
from google.cloud import firestore
from .result import Result 
from .utils import convert_to_array

DB = firestore.Client(project=os.environ.get('PROJECT'), database=os.environ.get('DATABASE'))

def list_data(params):

  technology_array = convert_to_array(params['technology'])
  data = []

  for technology in technology_array:
    query = DB.collection(u'lighthouse')

    if 'start' in params:
      query = query.where('date', '>=', params['start'])
    if 'end' in params:
      query = query.where('date', '<=', params['end'])

    query = query.where('geo', '==', params['geo'])
    query = query.where('rank', '==', params['rank'])
    query = query.where('technology', '==', technology)

    documents = query.stream()

    for doc in documents:
        data.append(doc.to_dict())

  return Result(result=data)
