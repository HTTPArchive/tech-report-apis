import json

def output(result):
  status = 200 if result.success() else 400
  payload = result.result if result.success() else result.errors
  return (json.dumps(payload), status)