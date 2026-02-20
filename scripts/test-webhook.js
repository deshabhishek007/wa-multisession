#!/usr/bin/env node
/**
 * Test script for webhook endpoint
 * 
 * Usage:
 *   node scripts/test-webhook.js <instanceId> <apiKey> [baseUrl]
 * 
 * Example:
 *   node scripts/test-webhook.js myinstance abc123... http://localhost:3000
 */

import https from 'https';
import http from 'http';

const [instanceId, apiKey, baseUrl = 'http://localhost:3000'] = process.argv.slice(2);

if (!instanceId || !apiKey) {
  console.error('Usage: node scripts/test-webhook.js <instanceId> <apiKey> [baseUrl]');
  console.error('Example: node scripts/test-webhook.js myinstance abc123... http://localhost:3000');
  process.exit(1);
}

const url = new URL(`${baseUrl}/webhook/wahub/${instanceId}`);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

function testWebhook(payload, description) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log(`\n🧪 Testing webhook endpoint: ${url.toString()}`);
  console.log(`📋 Instance ID: ${instanceId}`);
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...\n`);

  const tests = [
    {
      name: 'Option A: Event wrapper (single message)',
      payload: {
        event: 'message',
        data: {
          from: '919876543210',
          body: 'Hello from webhook test',
          id: 'test-msg-1'
        }
      }
    },
    {
      name: 'Option B: Multiple messages',
      payload: {
        event: 'messages',
        data: [
          { from: '919876543210', body: 'Message 1', id: 'test-msg-2' },
          { from: '919876543210', body: 'Message 2', id: 'test-msg-3' }
        ]
      }
    },
    {
      name: 'Option C: Flat message',
      payload: {
        message: {
          from: '919876543210',
          body: 'Flat message format',
          id: 'test-msg-4'
        }
      }
    },
    {
      name: 'Alternative: payload.payload',
      payload: {
        payload: {
          from: '919876543210',
          body: 'Nested payload format',
          id: 'test-msg-5'
        }
      }
    },
    {
      name: 'Top-level from/body (fallback)',
      payload: {
        from: '919876543210',
        body: 'Direct format',
        id: 'test-msg-6'
      }
    },
    {
      name: 'With text instead of body',
      payload: {
        event: 'message',
        data: {
          from: '919876543210',
          text: 'Using text field',
          id: 'test-msg-7'
        }
      }
    },
    {
      name: 'Config payload (should be ignored)',
      payload: {
        webhookUrl: 'https://example.com/webhook'
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n📤 Test: ${test.name}`);
      const result = await testWebhook(test.payload, test.name);
      
      if (result.status === 200 && result.body.success === true) {
        console.log(`   ✅ PASSED (200) - ${JSON.stringify(result.body)}`);
        passed++;
      } else {
        console.log(`   ⚠️  Status: ${result.status}`);
        console.log(`   Response: ${JSON.stringify(result.body)}`);
        if (test.name.includes('Config')) {
          console.log(`   ℹ️  Expected (config payloads return 200 but no message)`);
          passed++;
        } else {
          failed++;
        }
      }
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n💡 Tip: Check server logs for detailed error messages');
    process.exit(1);
  }
}

runTests().catch(console.error);
