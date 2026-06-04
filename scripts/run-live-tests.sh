#!/bin/bash

# Ensure we exit if any command fails
set -e

# Cleanup function to kill background processes on exit
cleanup() {
    echo -e "\nCleaning up background processes..."
    if [ -n "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null || true
    fi
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# Source the common AlloyDB proxy setup script
source ./scripts/setup-alloydb-proxy.sh

echo "Starting API Server in the background..."
export PORT=8081
cd src
npm run function &
SERVER_PID=$!
cd ..

echo "Waiting for API Server to be ready (5 seconds)..."
sleep 5

echo "Running Live Tests..."
cd src
npm run test:live
TEST_EXIT_CODE=$?

# The trap will run the cleanup automatically
exit $TEST_EXIT_CODE
