#!/bin/bash

# Function to test an endpoint
test_endpoint() {
  local endpoint=$1
  local params=$2
  local url="http://localhost:8080${endpoint}${params}"

  echo "Testing endpoint: ${url}"
  response=$(curl -s -w "\n%{http_code}" "${url}")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  echo "$body" | jq .
  echo "Status code: $http_code"

  if [[ $http_code -ne 200 ]]; then
    echo "Error: Endpoint returned non-200 status code"
    exit 1
  fi

  echo ""
  echo "----------------------"
  echo ""
}

# Function to test CORS preflight with OPTIONS request
test_cors_preflight() {
  local endpoint=$1
  local url="http://localhost:8080${endpoint}"

  echo "Testing CORS preflight for: ${url}"

  # Send OPTIONS request with CORS headers
  response=$(curl -s -X OPTIONS -w "\n%{http_code}" \
    -H "Origin: http://example.com" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "${url}")

  http_code=$(echo "$response" | tail -n1)
  headers=$(curl -s -X OPTIONS -I \
    -H "Origin: http://example.com" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "${url}")

  # Check for CORS headers
  echo "CORS Headers:"
  echo "$headers" | grep -i "access-control"

  echo "Status code: $http_code"

  # OPTIONS preflight should return 204 (No Content) or 200
  if [[ $http_code -ne 204 && $http_code -ne 200 ]]; then
    echo "Error: CORS preflight failed with non-200/204 status code"
    exit 1
  fi

  # Check for required CORS headers
  if ! echo "$headers" | grep -q "Access-Control-Allow-Origin"; then
    echo "Error: Missing Access-Control-Allow-Origin header"
    exit 1
  fi

  if ! echo "$headers" | grep -q "Access-Control-Allow-Methods"; then
    echo "Error: Missing Access-Control-Allow-Methods header"
    exit 1
  fi

  echo "CORS preflight check passed!"
  echo ""
  echo "----------------------"
  echo ""
}

# Start tests
echo "Testing API endpoints..."
echo "----------------------"
echo ""

# Test health check
test_cors_preflight "/"
test_endpoint "/" ""

# Test technologies endpoint
test_cors_preflight "/v1/technologies"
test_endpoint "/v1/technologies" "?technology=WordPress&onlyname=true"
test_endpoint "/v1/technologies" "?technology=WordPress&onlyname=true&fields=technology,icon"
test_endpoint "/v1/technologies" "?technology=WordPress&fields=technology,icon"

# Test categories endpoint
test_cors_preflight "/v1/categories"
test_endpoint "/v1/categories" "?category=CMS&onlyname=true"
test_endpoint "/v1/categories" "?category=CMS&fields=category"

# Test ranks endpoint
test_endpoint "/v1/ranks" ""

# Test geos endpoint
test_endpoint "/v1/geos" ""

# Test adoption endpoint
test_endpoint "/v1/adoption" "?technology=WordPress&geo=ALL&rank=ALL&start=latest"

# Test cwv endpoint
test_endpoint "/v1/cwv" "?technology=WordPress,Drupal&geo=ALL&rank=ALL&start=latest"

# Test lighthouse endpoint
test_endpoint "/v1/lighthouse" "?technology=WordPress&geo=ALL&rank=ALL&start=latest"

# Test page-weight endpoint
test_endpoint "/v1/page-weight" "?technology=WordPress&geo=ALL&rank=ALL&start=latest"

echo "API tests complete! All endpoints returned 200 status code and CORS is properly configured."
