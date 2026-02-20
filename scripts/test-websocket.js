#!/usr/bin/env node
/**
 * Test script for WebSocket subscription
 * 
 * Usage:
 *   node scripts/test-websocket.js <instanceId> <apiKey> [baseUrl]
 * 
 * Example:
 *   node scripts/test-websocket.js myinstance abc123... ws://localhost:3000
 */

import WebSocket from 'ws';

const [instanceId, apiKey, baseUrl = 'ws://localhost:3000'] = process.argv.slice(2);

if (!instanceId || !apiKey) {
  console.error('Usage: node scripts/test-websocket.js <instanceId> <apiKey> [baseUrl]');
  console.error('Example: node scripts/test-websocket.js myinstance abc123... ws://localhost:3000');
  process.exit(1);
}

console.log(`\n🧪 Testing WebSocket subscription`);
console.log(`📋 Instance ID: ${instanceId}`);
console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
console.log(`🌐 WebSocket URL: ${baseUrl}\n`);

const ws = new WebSocket(baseUrl);
let authenticated = false;
let subscribed = false;
let messageCount = 0;
let eventCount = 0;
const timeout = setTimeout(() => {
  console.log('\n⏱️  Test timeout (30s) - closing connection');
  ws.close();
  process.exit(0);
}, 30000);

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  console.log('📤 Authenticating with API key...');
  ws.send(JSON.stringify({
    type: 'auth',
    apiKey: apiKey
  }));
});

ws.on('message', (data) => {
  try {
    const event = JSON.parse(data.toString());
    eventCount++;
    
    console.log(`\n📨 Event #${eventCount}: ${event.type}`);
    
    if (event.type === 'auth_success') {
      authenticated = true;
      console.log(`   ✅ Authentication successful`);
      if (event.instanceId) {
        console.log(`   📋 Instance ID: ${event.instanceId}`);
        if (event.instanceId !== instanceId) {
          console.log(`   ⚠️  Warning: Instance ID mismatch (expected ${instanceId})`);
        }
      }
      console.log(`   📤 Subscribing to instance: ${instanceId}...`);
      ws.send(JSON.stringify({
        type: 'subscribe',
        instanceId: instanceId
      }));
    } else if (event.type === 'status') {
      subscribed = true;
      console.log(`   ✅ Subscription successful`);
      console.log(`   📊 Status: ${event.status}`);
      if (event.qr) {
        console.log(`   📱 QR code available (length: ${event.qr.length} chars)`);
      }
    } else if (event.type === 'message') {
      messageCount++;
      console.log(`   📨 Message #${messageCount} received:`);
      console.log(`      From: ${event.message.from}`);
      console.log(`      Sender: ${event.message.senderDisplay}`);
      console.log(`      Body: "${event.message.body}"`);
      console.log(`      Timestamp: ${new Date(event.message.timestamp * 1000).toISOString()}`);
    } else if (event.type === 'qr') {
      console.log(`   📱 New QR code generated`);
    } else if (event.type === 'ready') {
      console.log(`   ✅ Instance is ready`);
    } else if (event.type === 'authenticated') {
      console.log(`   ✅ Instance authenticated`);
    } else if (event.type === 'disconnected') {
      console.log(`   ⚠️  Instance disconnected: ${event.reason || 'unknown reason'}`);
    } else if (event.type === 'error') {
      console.log(`   ❌ Error: ${event.message}`);
    } else {
      console.log(`   📦 Data: ${JSON.stringify(event, null, 2)}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Failed to parse message: ${error.message}`);
    console.log(`   Raw: ${data.toString().substring(0, 100)}...`);
  }
});

ws.on('error', (error) => {
  console.error(`\n❌ WebSocket error: ${error.message}`);
  clearTimeout(timeout);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`\n\n📊 Test Summary:`);
  console.log(`   ✅ Authenticated: ${authenticated ? 'Yes' : 'No'}`);
  console.log(`   ✅ Subscribed: ${subscribed ? 'Yes' : 'No'}`);
  console.log(`   📨 Messages received: ${messageCount}`);
  console.log(`   📦 Total events: ${eventCount}`);
  console.log(`   🔌 Close code: ${code}`);
  if (reason) {
    console.log(`   📝 Reason: ${reason.toString()}`);
  }
  clearTimeout(timeout);
  process.exit(0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Interrupted - closing connection');
  ws.close();
});
