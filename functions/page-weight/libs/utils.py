import json
from urllib.parse import unquote

def convert_to_hashes(arr):
    hashes_arr = []
    for inner_arr in arr:
        hash_dict = {inner_arr[0]: inner_arr[1]}
        hashes_arr.append(hash_dict)
    return hashes_arr

def convert_to_array(data_string):
    decoded_data = unquote(data_string)
    list = decoded_data.split(',')
    return list
