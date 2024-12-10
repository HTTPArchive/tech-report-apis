import functions_framework

from .libs.utils import ( COUNTRIES )
from .libs.result import Result
from .libs.network import respond_cors, respond

@functions_framework.http
def dispatcher(request):
  
  if request.method == "OPTIONS":
    return respond_cors()
 
  response = Result(result=COUNTRIES)

  return respond(response)