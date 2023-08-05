import functions_framework

from .libs.utils import output
from .libs.utils import ( COUNTRIES )
from .libs.result import Result

@functions_framework.http
def dispatcher(request):
  
  response = Result(result=COUNTRIES)

  return output(response)