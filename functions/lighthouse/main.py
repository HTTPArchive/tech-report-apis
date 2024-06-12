import functions_framework
from .libs.validator import Validator
from .libs.utils import output
from .libs.queries import list_data

@functions_framework.http
def dispatcher(request):
  # For more information about CORS and CORS preflight requests, see:
  # https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request

  # Set CORS headers for the preflight request
  if request.method == "OPTIONS":
      # Allows GET requests from any origin with the Content-Type
      # header and caches preflight response for an 3600s
      headers = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "3600",
      }

      return ("", 204, headers)

  # Set CORS headers for the main request
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