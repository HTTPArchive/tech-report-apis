import functions_framework

from .libs.utils import output
from .libs.utils import ( TECHNOLOGIES )
from .libs.result import Result

@functions_framework.http
def dispatcher(request):
  
  response = Result(result=TECHNOLOGIES)

  return output(response)