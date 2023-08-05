from functions.geos.libs.utils import *
from functions.geos.libs.result import Result
import json

def test_output():
    # Create a mock result object with a successful status
    result_success = Result(status="success", result={"message": "Hello, world!"})
    
    # Call the output function with the mock result object
    output_result_success = output(result_success)
    
    # Verify that the output has the correct HTTP status code and payload
    assert output_result_success[1] == 200
    assert json.loads(output_result_success[0]) == {"message": "Hello, world!"}
    
    # Create a mock result object with an error status
    result_error = Result(status="error", errors=[["param", "Invalid request"]])
    
    # Call the output function with the mock result object
    output_result_error = output(result_error)
    
    # Verify that the output has the correct HTTP status code and payload
    assert output_result_error[1] == 400
    assert json.loads(output_result_error[0]) == [{"param": "Invalid request"}]

def test_convert_to_hashes():
    input_arr = [["geo", "missing geo parameters"], ["app", "missing geo parameters"]]
    expected_output_arr = [{'geo': 'missing geo parameters'}, {'app': 'missing geo parameters'}]
    assert convert_to_hashes(input_arr) == expected_output_arr
