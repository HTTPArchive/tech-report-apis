from functions.report.libs.utils import *
from functions.report.libs.result import Result
import json

def test_output():
    # Create a mock result object with a successful status
    result_success = Result(status="success", result={"message": "Hello, world!"})
    
    # Call the output function with the mock result object
    output_result_success = output(result_success)
    
    # Verify that the output has the correct HTTP status code and payload
    assert output_result_success[0] == 200
    assert json.loads(output_result_success[1]) == {"message": "Hello, world!"}
    
    # Create a mock result object with an error status
    result_error = Result(status="error", errors=["Invalid request"])
    
    # Call the output function with the mock result object
    output_result_error = output(result_error)
    
    # Verify that the output has the correct HTTP status code and payload
    assert output_result_error[0] == 400
    assert json.loads(output_result_error[1]) == ["Invalid request"]
