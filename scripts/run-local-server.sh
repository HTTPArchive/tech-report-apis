#!/bin/bash
set -e

# Cleanup function to kill background proxy on exit
cleanup() {
    echo -e "\nCleaning up Auth Proxy..."
    if [ -n "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# Source the common AlloyDB proxy setup script
source ./scripts/setup-alloydb-proxy.sh

echo "Starting API Server locally..."
cd src
npm run function
