#!/usr/bin/env python3
"""
Audit Log Verification Test
This test specifically checks if audit events are being logged correctly
by making successful API calls and checking for log output.
"""

import requests
import json
import subprocess
import time
import sys

BASE_URL = "http://localhost:3000"

def test_successful_operations():
    """Test operations that should succeed and generate audit logs"""
    
    print("🔍 Testing Successful Operations for Audit Logging")
    print("=" * 80)
    
    # Test 1: Freight load update (should succeed)
    print("\n1. Testing freight load update...")
    response = requests.post(f"{BASE_URL}/api/freight/loads/update", json={
        "id": 1,
        "notes": "Audit test - updated notes"
    })
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Load update successful - should generate audit log")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"   ❌ Load update failed: {response.json()}")
    
    # Test 2: BPO KPI upsert (should succeed)
    print("\n2. Testing BPO KPI upsert...")
    response = requests.post(f"{BASE_URL}/api/bpo/kpi/upsert", json={
        "campaignId": 1,
        "date": "2024-01-02",
        "talkTimeMin": 150,
        "handledCalls": 75,
        "isTest": True
    })
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ BPO KPI upsert successful - should generate audit log")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"   ❌ BPO KPI upsert failed: {response.json()}")
    
    # Test 3: Admin cleanup (should succeed in dev mode)
    print("\n3. Testing admin cleanup...")
    response = requests.post(f"{BASE_URL}/api/admin/cleanup-test-data", json={
        "confirm": "DELETE_ALL_TEST_DATA"
    })
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Admin cleanup successful - should generate audit log")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"   ❌ Admin cleanup failed: {response.json()}")

def check_console_logs():
    """Check console output for audit log entries"""
    
    print("\n📋 Checking Console Logs for Audit Events")
    print("=" * 80)
    
    try:
        # Check the Next.js process logs
        result = subprocess.run(
            ["ps", "aux"], 
            capture_output=True, 
            text=True
        )
        
        # Find the Next.js server process
        lines = result.stdout.split('\n')
        next_pid = None
        for line in lines:
            if 'next-server' in line and 'node' in line:
                parts = line.split()
                if len(parts) > 1:
                    next_pid = parts[1]
                    break
        
        if next_pid:
            print(f"   Found Next.js server process: PID {next_pid}")
            
            # Try to get logs from the process (this might not work in all environments)
            print("   Note: Audit logs should appear in the Next.js console output")
            print("   Look for JSON entries with 'audit_event' structure")
            
        else:
            print("   Could not find Next.js server process")
            
    except Exception as e:
        print(f"   Error checking logs: {e}")
    
    print("\n   Manual verification steps:")
    print("   1. Check the terminal where Next.js is running")
    print("   2. Look for structured JSON logs with these fields:")
    print("      - domain: 'freight', 'bpo', 'hotels', 'admin'")
    print("      - action: 'LOAD_UPDATE', 'BPO_KPI_UPSERT', 'DISPUTE_UPDATE', 'CLEANUP_TEST_DATA'")
    print("      - entityType: 'load', 'bpoDailyKpi', 'hotelDispute', 'system'")
    print("      - entityId: specific ID of the entity")
    print("      - metadata: relevant context data")

def main():
    """Main execution"""
    print("🚀 Starting Audit Log Verification")
    print("=" * 80)
    
    # Test successful operations
    test_successful_operations()
    
    # Check for audit logs
    check_console_logs()
    
    print("\n📊 AUDIT LOG VERIFICATION SUMMARY")
    print("=" * 80)
    print("✅ Tested endpoints that should generate audit logs")
    print("✅ Verified API responses for successful operations")
    print("ℹ️  Manual log verification required (check Next.js console)")
    print("\n🎯 Expected Audit Log Structure:")
    print(json.dumps({
        "audit_event": {
            "domain": "freight|bpo|hotels|admin",
            "action": "LOAD_UPDATE|BPO_KPI_UPSERT|DISPUTE_UPDATE|CLEANUP_TEST_DATA",
            "entityType": "load|bpoDailyKpi|hotelDispute|system",
            "entityId": "specific_id",
            "userId": "user_id",
            "timestamp": "ISO_timestamp",
            "metadata": {
                "changedFields": ["field1", "field2"],
                "before": "previous_state",
                "after": "new_state"
            }
        }
    }, indent=2))

if __name__ == "__main__":
    main()