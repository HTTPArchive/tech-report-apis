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

  echo "$body" | jq . | head -10
  echo "Status code: $http_code"

  if [[ $http_code -ne 200 ]]; then
    echo "Error: Endpoint returned non-200 status code"
    exit 1
  fi

  echo ""
  echo "----------------------"
  echo ""
}

# Function to test an endpoint with filter verification
test_filter() {
  local endpoint=$1
  local params=$2
  local filter_check=$3
  local description=$4
  local url="http://localhost:8080${endpoint}${params}"

  echo "Testing filter: ${description}"
  echo "URL: ${url}"
  
  response=$(curl -s -w "\n%{http_code}" "${url}")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [[ $http_code -ne 200 ]]; then
    echo "Error: Endpoint returned status code $http_code"
    echo "$body" | jq .
    exit 1
  fi

  # Run the verification check using jq
  # The check should return "true" if it passes
  check_result=$(echo "$body" | jq "${filter_check}")
  
  if [[ "$check_result" != "true" ]]; then
    echo "Error: Filter verification failed for ${description}"
    echo "Verification expression: ${filter_check}"
    echo "Actual result: ${check_result}"
    echo "Sample data:"
    echo "$body" | jq . | head -20
    exit 1
  fi

  echo "✓ Filter verification passed"
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
test_endpoint "/v1/technologies" "?onlyname=true"
test_endpoint "/v1/technologies" "?technology=WordPress&onlyname=true"
test_endpoint "/v1/technologies" "?technology=WordPress&onlyname=true&fields=technology,icon"
test_endpoint "/v1/technologies" "?technology=WordPress&category=CMS&fields=technology,icon"

# Test categories endpoint
test_cors_preflight "/v1/categories"
test_endpoint "/v1/categories" "?category=CMS&onlyname=true"
test_endpoint "/v1/categories" "?category=CMS&fields=category"

# Test ranks endpoint
test_endpoint "/v1/ranks" ""

# Test geos endpoint
test_endpoint "/v1/geos" ""

# Test filter correspondences
echo "Testing Filter Correspondences..."
echo "----------------------"
echo ""

# Test adoption defaults (tech=ALL)
test_filter "/v1/adoption" "" \
  "all(.[]; .technology == \"ALL\") and length > 0" \
  "Adoption defaults (technology=ALL)"

# Test adoption specific technology
test_filter "/v1/adoption" "?technology=WordPress" \
  "all(.[]; .technology == \"WordPress\") and length > 0" \
  "Adoption specific technology (WordPress)"

# Test adoption specific geo and rank (verifying it returns data)
test_filter "/v1/adoption" "?technology=WordPress&geo=Mexico&rank=Top%201M" \
  "all(.[]; .technology == \"WordPress\") and length > 0" \
  "Adoption specific geo and rank (returns WordPress data)"

# Test CWV defaults (tech=ALL)
test_filter "/v1/cwv" "" \
  "all(.[]; .technology == \"ALL\") and length > 0" \
  "CWV defaults (technology=ALL)"

# Test technologies default
test_filter "/v1/technologies" "" \
  "length > 0" \
  "Technologies list is not empty"

# Test categories default
test_filter "/v1/categories" "" \
  "length > 0" \
  "Categories list is not empty"

echo "API tests complete! All endpoints returned 200 and data corresponds to filters."
