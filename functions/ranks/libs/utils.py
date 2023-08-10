import json

def output(result):
  status = 200 if result.success() else 400
  payload = result.result if result.success() else convert_to_hashes(result.errors)
  return (json.dumps(payload), status)

def convert_to_hashes(arr):
    hashes_arr = []
    for inner_arr in arr:
        hash_dict = {inner_arr[0]: inner_arr[1]}
        hashes_arr.append(hash_dict)
    return hashes_arr

RANKS = [ { "num_origins": "9731427", "rank": "ALL" }, { "num_origins": "7232806", "rank": "Top 10M" }, { "num_origins": "881817", "rank": "Top 1M" }, { "num_origins": "91410", "rank": "Top 100k" }, { "num_origins": "9524", "rank": "Top 10k" }, { "num_origins": "965", "rank": "Top 1k" } ]
