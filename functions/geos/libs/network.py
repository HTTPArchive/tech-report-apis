
"""
Network

Handles formatting responses to match the tuple pattern required by
the flask/GCP wrapper for Cloud Functions.
"""
import json
from .utils import convert_to_hashes

PREFLIGHT_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type, Timing-Allow-Origin",
    "Access-Control-Max-Age": "3600",
  }

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "cache-control": "public, max-age=21600",
    "Timing-Allow-Origin": "*"
  }

def respond_cors():
  """
  To be used to return OPTIONS responses to satisfy CORS preflight requests.
  """
  return ("", 204, PREFLIGHT_HEADERS)

def respond(result, headers=HEADERS):
  """
  To be used to return responses to satisfy CORS requests.
  """
  status = 200 if result.success() else 400
  payload = result.result if result.success() else convert_to_hashes(result.errors)
  return (json.dumps(payload), status, headers)