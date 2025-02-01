from .result import Result

class Validator():
  def __init__(self, params):
    self.params = params
    self.errors = []
    self.normalizer_params = self.normalize(params)

  def validate(self):
    result = Result(status="ok", result="()")

    # if 'technology' not in self.params:
    #   self.add_error("technology", "missing technology parameter")

    return Result(errors=self.errors, result=self.params)

  def add_error(self, key, error):
    self.errors.append([key, error])

  def normalize(self, params):
    return ""
