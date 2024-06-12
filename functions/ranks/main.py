import functions_framework

from .libs.utils import output
from .libs.utils import ( RANKS )
from .libs.result import Result
from .libs.network import respond_cors

@functions_framework.http
def dispatcher(request):
  
  if request.method == "OPTIONS":
    return respond_cors()
  
  headers = {
     "Access-Control-Allow-Origin": "*",
     "cache-control": "public, max-age=21600"
    }
  
  response = Result(result=RANKS)

  return output(response, headers)