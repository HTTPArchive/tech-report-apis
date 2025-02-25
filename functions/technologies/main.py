import functions_framework

from .libs.validator import Validator
from .libs.queries import list_data
from .libs.network import respond_cors, respond

@functions_framework.http
def dispatcher(request):
  
  if request.method == "OPTIONS":
    return respond_cors()
  
  args = request.args.to_dict()

  validator = Validator(params=args)
  result = validator.validate()

  if result.failure():
    print("error", result.errors)
    return respond(result)
  
  response = list_data(result.result)

  return respond(response)