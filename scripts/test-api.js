#!/usr/bin/env node
/**
 * Test script for instance API endpoints
 * 
 * Usage:
 *   node scripts/test-api.js <instanceId> <apiKey> [baseUrl]
 * 
 * Example:
 *   node scripts/test-api.js myinstance abc123... http://localhost:3000
 */

import https from 'https';
import http from 'http';

const [instanceId, apiKey, baseUrl = 'http://localhost:3000'] = process.argv.slice(2);

if (!instanceId || !apiKey) {
  console.error('Usage: node scripts/test-api.js <instanceId> <apiKey> [baseUrl]');
  console.error('Example: node scripts/test-api.js myinstance abc123... http://localhost:3000');
  process.exit(1);
}

const url = new URL(baseUrl);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: path,
      method: method,
      headers: {
        'X-API-Key': apiKey
      }
    };

    if (body) {
      const postData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

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

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log(`\n🧪 Testing API endpoints for instance: ${instanceId}`);
  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`🌐 Base URL: ${baseUrl}\n`);

  const tests = [];

  // Test 1: Get API key
  tests.push({
    name: 'GET /api/instances/:instanceId/api-key',
    run: async () => {
      const result = await makeRequest(`/api/instances/${instanceId}/api-key`);
      if (result.status === 200 && result.body.apiKey) {
        console.log(`   ✅ API Key retrieved: ${result.body.apiKey.substring(0, 16)}...`);
        return true;
      }
      console.log(`   ❌ Failed: ${result.status} - ${JSON.stringify(result.body)}`);
      return false;
    }
  });

  // Test 2: Get messages
  tests.push({
    name: 'GET /api/instances/:instanceId/messages',
    run: async () => {
      const result = await makeRequest(`/api/instances/${instanceId}/messages?limit=10`);
      if (result.status === 200 && Array.isArray(result.body)) {
        console.log(`   ✅ Retrieved ${result.body.length} message(s)`);
        if (result.body.length > 0) {
          const latest = result.body[0];
          console.log(`   📨 Latest: "${latest.body}" from ${latest.senderDisplay}`);
        }
        return true;
      }
      console.log(`   ❌ Failed: ${result.status} - ${JSON.stringify(result.body)}`);
      return false;
    }
  });

  // Test 3: Send message
  tests.push({
    name: 'POST /api/instances/:instanceId/send-message',
    run: async () => {
      const testMessage = `Test message ${Date.now()}`;
      const result = await makeRequest(
        `/api/instances/${instanceId}/send-message`,
        'POST',
        {
          to: '919876543210', // Replace with a test number
          message: testMessage
        }
      );
      if (result.status === 200 && result.body.success) {
        console.log(`   ✅ Message sent: ${result.body.messageId || 'N/A'}`);
        console.log(`   📤 Content: "${testMessage}"`);
        return true;
      } else if (result.status === 503) {
        console.log(`   ⚠️  Instance not ready (503) - ${result.body.error}`);
        console.log(`   ℹ️  This is expected if WhatsApp is not connected`);
        return true; // Not a failure, just not ready
      }
      console.log(`   ❌ Failed: ${result.status} - ${JSON.stringify(result.body)}`);
      return false;
    }
  });

  // Test 4: Send file
  tests.push({
    name: 'POST /api/instances/:instanceId/send-file',
    run: async () => {
      const testFileBase64 = Buffer.from('Test file content').toString('base64');
      const result = await makeRequest(
        `/api/instances/${instanceId}/send-file`,
        'POST',
        {
          to: '919876543210', // Replace with a test number
          filename: 'test.txt',
          fileBase64: testFileBase64,
          caption: 'Test file from API'
        }
      );
      if (result.status === 200 && result.body.success) {
        console.log(`   ✅ File sent: ${result.body.messageId || 'N/A'}`);
        return true;
      } else if (result.status === 503) {
        console.log(`   ⚠️  Instance not ready (503) - ${result.body.error}`);
        return true; // Not a failure
      }
      console.log(`   ❌ Failed: ${result.status} - ${JSON.stringify(result.body)}`);
      return false;
    }
  });

  // Test 5: Regenerate API key
  tests.push({
    name: 'POST /api/instances/:instanceId/api-key/regenerate',
    run: async () => {
      const result = await makeRequest(
        `/api/instances/${instanceId}/api-key/regenerate`,
        'POST'
      );
      if (result.status === 200 && result.body.apiKey) {
        console.log(`   ✅ New API key generated: ${result.body.apiKey.substring(0, 16)}...`);
        console.log(`   ⚠️  Old API key is now invalid!`);
        return true;
      }
      console.log(`   ❌ Failed: ${result.status} - ${JSON.stringify(result.body)}`);
      return false;
    },
    skip: true // Skip by default to avoid invalidating the key
  });

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of tests) {
    if (test.skip) {
      console.log(`\n⏭️  SKIPPED: ${test.name}`);
      skipped++;
      continue;
    }

    try {
      console.log(`\n📤 Test: ${test.name}`);
      const success = await test.run();
      if (success) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n\n📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  
  if (failed > 0) {
    console.log('\n💡 Tip: Check server logs and ensure instance is ready (status: ready)');
    process.exit(1);
  }
}

runTests().catch(console.error);
