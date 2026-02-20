#!/usr/bin/env python3
"""
Test script for instance API endpoints (Python version)

Usage:
    python scripts/test-api.py <instanceId> <apiKey> [baseUrl]

Example:
    python scripts/test-api.py myinstance abc123... http://localhost:3000
"""

import sys
import json
import requests
from typing import Dict, Any, Optional

def make_request(base_url: str, path: str, method: str = 'GET', api_key: str = None, body: Optional[Dict] = None) -> tuple:
    """Make HTTP request"""
    url = f"{base_url}{path}"
    headers = {}
    
    if api_key:
        headers['X-API-Key'] = api_key
    
    if body:
        headers['Content-Type'] = 'application/json'
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=body, headers=headers, timeout=10)
        else:
            return None, f"Unsupported method: {method}"
        
        result = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        return response.status_code, result
    except Exception as e:
        return None, str(e)

def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/test-api.py <instanceId> <apiKey> [baseUrl]")
        print("Example: python scripts/test-api.py myinstance abc123... http://localhost:3000")
        sys.exit(1)
    
    instance_id = sys.argv[1]
    api_key = sys.argv[2]
    base_url = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:3000'
    
    print(f"\n🧪 Testing API endpoints for instance: {instance_id}")
    print(f"🔑 API Key: {api_key[:8]}...")
    print(f"🌐 Base URL: {base_url}\n")
    
    tests = []
    
    # Test 1: Get API key
    tests.append({
        'name': 'GET /api/instances/:instanceId/api-key',
        'run': lambda: make_request(base_url, f'/api/instances/{instance_id}/api-key', 'GET', api_key)
    })
    
    # Test 2: Get messages
    tests.append({
        'name': 'GET /api/instances/:instanceId/messages',
        'run': lambda: make_request(base_url, f'/api/instances/{instance_id}/messages?limit=10', 'GET', api_key)
    })
    
    # Test 3: Send message
    tests.append({
        'name': 'POST /api/instances/:instanceId/send-message',
        'run': lambda: make_request(
            base_url,
            f'/api/instances/{instance_id}/send-message',
            'POST',
            api_key,
            {'to': '919876543210', 'message': f'Test message {int(__import__("time").time())}'}
        )
    })
    
    # Test 4: Send file
    tests.append({
        'name': 'POST /api/instances/:instanceId/send-file',
        'run': lambda: make_request(
            base_url,
            f'/api/instances/{instance_id}/send-file',
            'POST',
            api_key,
            {
                'to': '919876543210',
                'filename': 'test.txt',
                'fileBase64': __import__('base64').b64encode(b'Test file content').decode(),
                'caption': 'Test file from API'
            }
        )
    })
    
    passed = 0
    failed = 0
    
    for test in tests:
        print(f"\n📤 Test: {test['name']}")
        try:
            status, result = test['run']()
            
            if status is None:
                print(f"   ❌ ERROR: {result}")
                failed += 1
                continue
            
            if status == 200:
                if isinstance(result, dict):
                    if 'apiKey' in result:
                        print(f"   ✅ API Key retrieved: {result['apiKey'][:16]}...")
                    elif 'success' in result and result['success']:
                        print(f"   ✅ Success: {json.dumps(result)}")
                    elif isinstance(result, list):
                        print(f"   ✅ Retrieved {len(result)} message(s)")
                        if len(result) > 0:
                            latest = result[0]
                            print(f"   📨 Latest: \"{latest.get('body', '')}\" from {latest.get('senderDisplay', '')}")
                    else:
                        print(f"   ✅ Response: {json.dumps(result)}")
                else:
                    print(f"   ✅ Response: {result}")
                passed += 1
            elif status == 503:
                print(f"   ⚠️  Instance not ready (503) - {result.get('error', result) if isinstance(result, dict) else result}")
                print(f"   ℹ️  This is expected if WhatsApp is not connected")
                passed += 1  # Not a failure
            else:
                print(f"   ❌ Failed: {status} - {json.dumps(result) if isinstance(result, dict) else result}")
                failed += 1
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            failed += 1
    
    print(f"\n\n📊 Results: {passed} passed, {failed} failed")
    
    if failed > 0:
        print('\n💡 Tip: Check server logs and ensure instance is ready (status: ready)')
        sys.exit(1)

if __name__ == '__main__':
    main()
