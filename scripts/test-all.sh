#!/bin/bash
# Comprehensive test script for webhook and API endpoints
#
# Usage:
#   ./scripts/test-all.sh <instanceId> <apiKey> [baseUrl]
#
# Example:
#   ./scripts/test-all.sh myinstance abc123... http://localhost:3000

set -e

INSTANCE_ID=$1
API_KEY=$2
BASE_URL=${3:-"http://localhost:3000"}

if [ -z "$INSTANCE_ID" ] || [ -z "$API_KEY" ]; then
    echo "Usage: $0 <instanceId> <apiKey> [baseUrl]"
    echo "Example: $0 myinstance abc123... http://localhost:3000"
    exit 1
fi

WS_URL=$(echo "$BASE_URL" | sed 's|^http://|ws://|' | sed 's|^https://|wss://|')

echo "=========================================="
echo "🧪 Comprehensive API Test Suite"
echo "=========================================="
echo "Instance ID: $INSTANCE_ID"
echo "API Key: ${API_KEY:0:8}..."
echo "Base URL: $BASE_URL"
echo "WebSocket URL: $WS_URL"
echo "=========================================="
echo ""

# Test 1: Webhook
echo "📡 Test 1: Webhook Endpoint"
echo "----------------------------------------"
node scripts/test-webhook.js "$INSTANCE_ID" "$API_KEY" "$BASE_URL"
echo ""

# Test 2: REST API
echo "📡 Test 2: REST API Endpoints"
echo "----------------------------------------"
node scripts/test-api.js "$INSTANCE_ID" "$API_KEY" "$BASE_URL"
echo ""

# Test 3: WebSocket (run in background, kill after 10s)
echo "📡 Test 3: WebSocket Subscription"
echo "----------------------------------------"
echo "Starting WebSocket test (will run for 10 seconds)..."
timeout 10 node scripts/test-websocket.js "$INSTANCE_ID" "$API_KEY" "$WS_URL" || true
echo ""

echo "=========================================="
echo "✅ All tests completed!"
echo "=========================================="
