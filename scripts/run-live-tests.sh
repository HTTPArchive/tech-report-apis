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

# Download proxy if it doesn't exist
PROXY_BIN="./scripts/alloydb-auth-proxy"
if [ ! -f "$PROXY_BIN" ]; then
    echo "alloydb-auth-proxy not found, downloading..."
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        curl -s -o "$PROXY_BIN" https://storage.googleapis.com/alloydb-auth-proxy/v1.10.1/alloydb-auth-proxy.darwin.arm64
    else
        curl -s -o "$PROXY_BIN" https://storage.googleapis.com/alloydb-auth-proxy/v1.10.1/alloydb-auth-proxy.darwin.amd64
    fi
    chmod +x "$PROXY_BIN"
fi

# Proxy was downloaded to the root directory. We use ADC to authenticate.
$PROXY_BIN "projects/httparchive/locations/us-central1/clusters/default/instances/primary" --auto-iam-authn --public-ip &
PROXY_PID=$!

echo "Waiting for Auth Proxy to be ready (5 seconds)..."
sleep 5

echo "Starting API Server in the background..."
cd src
# Automatically use the active ADC email
export ALLOYDB_USER=$(gcloud config get-value account)
export ALLOYDB_HOST="127.0.0.1"

echo "Using ALLOYDB_USER: $ALLOYDB_USER"
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
