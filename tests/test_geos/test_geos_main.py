import unittest
import json
from unittest.mock import Mock

from functions.geos.main import dispatcher 
from functions.geos.libs.utils import COUNTRIES

class TestCloudFunction(unittest.TestCase):

    def test_success(self):
        request = Mock()
        response = dispatcher(request)
        expected_data = json.dumps(COUNTRIES)

        self.assertEqual(response[1], 200)
        self.assertEqual(response[0], expected_data)

if __name__ == '__main__':
    unittest.main()

