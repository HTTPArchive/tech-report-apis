import os
import json
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter, Or

from .result import Result
from .utils import convert_to_array
from .presenters import Presenters

DB = firestore.Client(
    project=os.environ.get("PROJECT"), database=os.environ.get("DATABASE")
)

def list_data(params):
    ref = DB.collection("technologies")

    query = ref.order_by("technology", direction=firestore.Query.ASCENDING)

    if "technology" in params:
        arfilters = []
        params_array = convert_to_array(params["technology"])
        for tech in params_array:
            arfilters.append(FieldFilter("technology", "==", tech))
        query = query.where(filter=Or(filters=arfilters))

    if "category" in params:
        params_array = convert_to_array(params["category"])
        query = query.where(
            filter=FieldFilter("category_obj", "array_contains_any", params_array)
        )

    documents = query.stream()
    data = []

    if "onlyname" in params:
        appended_tech = set()
        for doc in documents:
            tech = doc.get("technology")
            if tech not in appended_tech:
                appended_tech.add(tech)
                data.append(tech)

    else:
        for doc in documents:
            data.append(Presenters.technology(doc.to_dict()))

    return Result(result=data)
