#!/bin/bash
# Example usage of test scripts
#
# This file demonstrates how to use the test scripts.
# Copy and modify as needed for your testing.

# Configuration
INSTANCE_ID="myinstance"
API_KEY="your-64-character-api-key-here"
BASE_URL="http://localhost:3000"
WS_URL="ws://localhost:3000"

echo "=========================================="
echo "Example: Testing Webhook"
echo "=========================================="
node scripts/test-webhook.js "$INSTANCE_ID" "$API_KEY" "$BASE_URL"

echo ""
echo "=========================================="
echo "Example: Testing REST API"
echo "=========================================="
node scripts/test-api.js "$INSTANCE_ID" "$API_KEY" "$BASE_URL"

echo ""
echo "=========================================="
echo "Example: Testing WebSocket (10 seconds)"
echo "=========================================="
timeout 10 node scripts/test-websocket.js "$INSTANCE_ID" "$API_KEY" "$WS_URL" || true

echo ""
echo "=========================================="
echo "Example: Run all tests"
echo "=========================================="
./scripts/test-all.sh "$INSTANCE_ID" "$API_KEY" "$BASE_URL"
