
class Result():
  def __init__(self, status=None, result=None, errors=[]):
    self._status = status
    self.result = result
    self.errors = errors

  def success(self) -> bool:
    return not self.failure()

  def failure(self) -> bool:
    return len(self.errors) > 0
  
  @property
  def status(self):
    if self._status != None:
      return self._status
  
    return "ok" if self.success else "error"
    