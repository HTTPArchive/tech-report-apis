import functions_framework
from .libs.validator import Validator
from .libs.utils import output
from .libs.queries import list_data

@functions_framework.http
def dispatcher(request):
  args = request.args.to_dict()

  validator = Validator(params=args)
  result = validator.validate()

  if result.failure():
    print("error", result.errors)
    return output(result)
  
  response = list_data(result.result)

  return output(response)