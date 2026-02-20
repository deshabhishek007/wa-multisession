# Test Scripts

Test scripts for webhook and API endpoints. Available in Node.js and Python.

## Prerequisites

**Node.js scripts:**
- Node.js 16+ (already installed for this project)
- No additional dependencies (uses built-in modules)

**Python scripts:**
- Python 3.6+
- `requests` library: `pip install requests`

## Quick Start

### 1. Get your instance API key

```bash
# Via session (login first)
curl -X GET "http://localhost:3000/api/instances/YOUR_INSTANCE_ID/api-key" \
  -H "Cookie: session=..."

# Or via dashboard UI
# Navigate to instance card → View API Key
```

### 2. Run tests

**Node.js (recommended):**
```bash
# Test webhook
node scripts/test-webhook.js YOUR_INSTANCE_ID YOUR_API_KEY

# Test REST API
node scripts/test-api.js YOUR_INSTANCE_ID YOUR_API_KEY

# Test WebSocket subscription
node scripts/test-websocket.js YOUR_INSTANCE_ID YOUR_API_KEY

# Run all tests
chmod +x scripts/test-all.sh
./scripts/test-all.sh YOUR_INSTANCE_ID YOUR_API_KEY
```

**Python:**
```bash
# Test webhook
python scripts/test-webhook.py YOUR_INSTANCE_ID YOUR_API_KEY

# Test REST API
python scripts/test-api.py YOUR_INSTANCE_ID YOUR_API_KEY
```

## Scripts

### `test-webhook.js` / `test-webhook.py`

Tests the webhook endpoint (`POST /webhook/wahub/:instanceId`) with various payload formats:

- Event wrapper format
- Multiple messages
- Flat message format
- Nested payloads
- Fallback formats
- Config payloads (should be ignored)

**Usage:**
```bash
node scripts/test-webhook.js <instanceId> <apiKey> [baseUrl]
```

**Example:**
```bash
node scripts/test-webhook.js myinstance abc123def456... http://localhost:3000
```

### `test-api.js` / `test-api.py`

Tests REST API endpoints for an instance:

- Get API key
- Get message history
- Send text message
- Send file with caption
- Regenerate API key (skipped by default)

**Usage:**
```bash
node scripts/test-api.js <instanceId> <apiKey> [baseUrl]
```

**Example:**
```bash
node scripts/test-api.js myinstance abc123def456... http://localhost:3000
```

**Note:** Send message/file tests will fail with `503` if the instance is not ready (WhatsApp not connected). This is expected.

### `test-websocket.js`

Tests WebSocket subscription for real-time message events:

- Connects via WebSocket
- Authenticates with API key
- Subscribes to instance
- Listens for incoming messages and status events
- Runs for 30 seconds or until interrupted

**Usage:**
```bash
node scripts/test-websocket.js <instanceId> <apiKey> [wsUrl]
```

**Example:**
```bash
node scripts/test-websocket.js myinstance abc123def456... ws://localhost:3000
```

**Output:** Shows all received events (auth_success, status, message, qr, ready, etc.)

### `test-all.sh`

Runs all tests in sequence:

1. Webhook tests
2. REST API tests
3. WebSocket test (10 seconds)

**Usage:**
```bash
chmod +x scripts/test-all.sh
./scripts/test-all.sh <instanceId> <apiKey> [baseUrl]
```

## Customization

### Change test phone number

Edit the scripts and replace `919876543210` with your test number:

**Node.js:**
```javascript
to: 'YOUR_PHONE_NUMBER'  // digits only, with country code
```

**Python:**
```python
'to': 'YOUR_PHONE_NUMBER'  # digits only, with country code
```

### Use different base URL

Pass as third argument:
```bash
node scripts/test-api.js myinstance abc123... https://your-server.com
```

### Test with session auth

Modify scripts to use session cookies instead of API key:

**Node.js:**
```javascript
headers: {
  'Cookie': 'session=YOUR_SESSION_COOKIE'
}
```

**Python:**
```python
headers = {
    'Cookie': 'session=YOUR_SESSION_COOKIE'
}
```

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"

- Ensure the server is running: `npm start` or `node server.js`
- Check the base URL (default: `http://localhost:3000`)

### "401 Unauthorized" or "Invalid API key"

- Verify the API key belongs to the instance ID
- Get a fresh API key: `GET /api/instances/:instanceId/api-key`
- Check API key format (64-character hex string)

### "503 Service Unavailable" (send-message)

- Instance is not ready (WhatsApp not connected)
- Check instance status: `GET /api/instances`
- Wait for status to be `ready` before sending

### WebSocket connection fails

- Use `ws://` for HTTP, `wss://` for HTTPS
- Check firewall/proxy settings
- Verify WebSocket upgrade is allowed

### Python "ModuleNotFoundError: No module named 'requests'"

```bash
pip install requests
```

## Examples

### Test webhook with custom payload

```bash
# Create a test file
cat > test-payload.json << EOF
{
  "event": "message",
  "data": {
    "from": "919876543210",
    "body": "Custom test message",
    "id": "custom-test-1"
  }
}
EOF

# Send it
curl -X POST "http://localhost:3000/webhook/wahub/myinstance" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d @test-payload.json
```

### Monitor WebSocket events continuously

```bash
# Run WebSocket test and pipe to file
node scripts/test-websocket.js myinstance YOUR_API_KEY > websocket-events.log 2>&1

# Or watch in real-time
node scripts/test-websocket.js myinstance YOUR_API_KEY | tee websocket-events.log
```

## Integration with CI/CD

Example GitHub Actions workflow:

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Start server
        run: npm start &
      - name: Wait for server
        run: sleep 5
      - name: Run tests
        run: |
          INSTANCE_ID="test-instance"
          API_KEY="test-key"
          node scripts/test-webhook.js $INSTANCE_ID $API_KEY
          node scripts/test-api.js $INSTANCE_ID $API_KEY
```
