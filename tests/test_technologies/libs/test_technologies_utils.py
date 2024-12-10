from functions.technologies.libs.utils import *
from functions.technologies.libs.result import Result
import json

def test_convert_to_hashes():
    input_arr = [["geo", "missing geo parameters"], ["app", "missing geo parameters"]]
    expected_output_arr = [{'geo': 'missing geo parameters'}, {'app': 'missing geo parameters'}]
    assert convert_to_hashes(input_arr) == expected_output_arr
