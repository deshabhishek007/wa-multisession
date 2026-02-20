#!/usr/bin/env python3
"""
Test script for webhook endpoint (Python version)

Usage:
    python scripts/test-webhook.py <instanceId> <apiKey> [baseUrl]

Example:
    python scripts/test-webhook.py myinstance abc123... http://localhost:3000
"""

import sys
import json
import requests
from typing import Dict, Any

def test_webhook(base_url: str, instance_id: str, api_key: str, payload: Dict[str, Any], description: str) -> tuple:
    """Test webhook endpoint with given payload"""
    url = f"{base_url}/webhook/wahub/{instance_id}"
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': api_key
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        result = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        return response.status_code, result
    except Exception as e:
        return None, str(e)

def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/test-webhook.py <instanceId> <apiKey> [baseUrl]")
        print("Example: python scripts/test-webhook.py myinstance abc123... http://localhost:3000")
        sys.exit(1)
    
    instance_id = sys.argv[1]
    api_key = sys.argv[2]
    base_url = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:3000'
    
    print(f"\n🧪 Testing webhook endpoint: {base_url}/webhook/wahub/{instance_id}")
    print(f"📋 Instance ID: {instance_id}")
    print(f"🔑 API Key: {api_key[:8]}...\n")
    
    tests = [
        {
            'name': 'Option A: Event wrapper (single message)',
            'payload': {
                'event': 'message',
                'data': {
                    'from': '919876543210',
                    'body': 'Hello from webhook test',
                    'id': 'test-msg-1'
                }
            }
        },
        {
            'name': 'Option B: Multiple messages',
            'payload': {
                'event': 'messages',
                'data': [
                    {'from': '919876543210', 'body': 'Message 1', 'id': 'test-msg-2'},
                    {'from': '919876543210', 'body': 'Message 2', 'id': 'test-msg-3'}
                ]
            }
        },
        {
            'name': 'Option C: Flat message',
            'payload': {
                'message': {
                    'from': '919876543210',
                    'body': 'Flat message format',
                    'id': 'test-msg-4'
                }
            }
        },
        {
            'name': 'Alternative: payload.payload',
            'payload': {
                'payload': {
                    'from': '919876543210',
                    'body': 'Nested payload format',
                    'id': 'test-msg-5'
                }
            }
        },
        {
            'name': 'Top-level from/body (fallback)',
            'payload': {
                'from': '919876543210',
                'body': 'Direct format',
                'id': 'test-msg-6'
            }
        },
        {
            'name': 'With text instead of body',
            'payload': {
                'event': 'message',
                'data': {
                    'from': '919876543210',
                    'text': 'Using text field',
                    'id': 'test-msg-7'
                }
            }
        },
        {
            'name': 'Config payload (should be ignored)',
            'payload': {
                'webhookUrl': 'https://example.com/webhook'
            }
        }
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        print(f"\n📤 Test: {test['name']}")
        status, result = test_webhook(base_url, instance_id, api_key, test['payload'], test['name'])
        
        if status == 200 and isinstance(result, dict) and result.get('success') == True:
            print(f"   ✅ PASSED (200) - {json.dumps(result)}")
            passed += 1
        elif status == 200 and 'Config' in test['name']:
            print(f"   ✅ PASSED (200) - Config payload correctly ignored")
            passed += 1
        else:
            print(f"   ⚠️  Status: {status}")
            print(f"   Response: {json.dumps(result) if isinstance(result, dict) else result}")
            failed += 1
    
    print(f"\n\n📊 Results: {passed} passed, {failed} failed")
    
    if failed > 0:
        print('\n💡 Tip: Check server logs for detailed error messages')
        sys.exit(1)

if __name__ == '__main__':
    main()
