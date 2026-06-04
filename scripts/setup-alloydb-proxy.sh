# This script is sourced by other scripts to download and start the AlloyDB Auth Proxy in the background.
# Do not run this script directly.

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

echo "Starting AlloyDB Auth Proxy..."
$PROXY_BIN "projects/httparchive/locations/us-central1/clusters/default/instances/primary" --auto-iam-authn --public-ip &
PROXY_PID=$!

echo "Waiting for Auth Proxy to be ready..."
sleep 3

export ALLOYDB_USER=$(gcloud config get-value account)
export ALLOYDB_HOST="127.0.0.1"
export PROJECT="httparchive"

echo "Using ALLOYDB_USER: $ALLOYDB_USER"

