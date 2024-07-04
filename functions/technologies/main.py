import functions_framework

from .libs.validator import Validator
from .libs.utils import output
from .libs.queries import list_data
from .libs.network import respond_cors

@functions_framework.http
def dispatcher(request):
  
  if request.method == "OPTIONS":
    return respond_cors()
  
  headers = {
     "Access-Control-Allow-Origin": "*",
     "cache-control": "public, max-age=21600"
     }
  args = request.args.to_dict()

  validator = Validator(params=args)
  result = validator.validate()

  if result.failure():
    print("error", result.errors)
    return output(result)
  
  response = list_data(result.result)

  return output(response, headers)