import os
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter, Or
from .result import Result
from .utils import convert_to_array

DB = firestore.Client(
    project=os.environ.get("PROJECT"), database=os.environ.get("DATABASE")
)

def list_data(params):
    ref = DB.collection("categories")

    query = ref.order_by("category", "asc")

    if "category" in params:
        category_array = convert_to_array(params["category"])
        filter_array = []
        for category in category_array:
            filter_array.append(FieldFilter("category", "==", category))
        query = query.where(filter=Or(filters=filter_array))

    documents = query.stream()
    data = []
    
    if "onlyname" in params:
        for doc in documents:
            data.append(doc.get("category"))

    else:
        for doc in documents:
            data.append(doc.to_dict())

    return Result(result=data)
