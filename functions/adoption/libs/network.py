
"""
Network

Handles formatting responses to match the tuple pattern required by
the flask/GCP wrapper for Cloud Functions.
"""

PREFLIGHT_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "3600",
  }

HEADERS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}

def respond_cors():
  """
  To be used to return OPTIONS responses to satisfy CORS preflight requests.
  """
  return ("", 204, PREFLIGHT_HEADERS)

def respond(data, status=200):
  """
  To be used to return responses to satisfy CORS requests.
  """
  return (data, status, HEADERS)
