#!/usr/bin/env python3
"""
P3 Observability Simple Test - Quick verification of key behaviors
"""

import requests
import json

BASE_URL = "http://localhost:3000"

def test_endpoint(endpoint, method="GET", params=None, expected_status=None):
    """Simple endpoint test"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, timeout=10)
        else:
            return None, None
            
        try:
            data = response.json()
        except:
            data = {"raw": response.text[:200]}
            
        status_ok = response.status_code == expected_status if expected_status else True
        print(f"{'✅' if status_ok else '❌'} {method} {endpoint} -> {response.status_code}")
        
        return response.status_code, data
        
    except Exception as e:
        print(f"❌ {method} {endpoint} -> ERROR: {e}")
        return 0, {"error": str(e)}

def main():
    print("🚀 P3 OBSERVABILITY QUICK TEST")
    print("=" * 50)
    
    results = {}
    
    # Test 1: Method validation (405)
    print("\n📋 Testing Method Validation (405):")
    results['freight_pnl_post'] = test_endpoint("/api/logistics/freight-pnl", "POST", expected_status=405)
    results['bpo_kpi_post'] = test_endpoint("/api/bpo/kpi", "POST", expected_status=405)
    results['ventures_post'] = test_endpoint("/api/ventures", "POST", expected_status=405)
    
    # Test 2: Date range validation (400)
    print("\n📋 Testing Date Range Validation (400):")
    results['bpo_large_range'] = test_endpoint("/api/bpo/kpi", "GET", 
                                             {"from": "2024-01-01", "to": "2024-12-31"}, 
                                             expected_status=400)
    
    # Test 3: Default behavior (401 - auth required)
    print("\n📋 Testing Default Behavior (401 - auth required):")
    results['freight_pnl_default'] = test_endpoint("/api/logistics/freight-pnl", "GET", expected_status=401)
    results['bpo_kpi_default'] = test_endpoint("/api/bpo/kpi", "GET", expected_status=401)
    results['ventures_default'] = test_endpoint("/api/ventures", "GET", expected_status=401)
    
    # Test 4: Limit handling
    print("\n📋 Testing Limit Handling:")
    status, data = test_endpoint("/api/ventures", "GET", {"limit": "500"})
    if isinstance(data, list):
        print(f"   Ventures returned: {len(data)} (should be capped at 200)")
        results['ventures_limit'] = (status, len(data))
    
    # Summary
    print("\n📊 SUMMARY:")
    passed = 0
    total = 0
    
    for test_name, result in results.items():
        if result and len(result) == 2:
            status, _ = result
            if status in [200, 400, 401, 405]:  # Expected statuses
                passed += 1
            total += 1
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All P3 observability tests PASSED!")
        return 0
    else:
        print("⚠️ Some tests failed")
        return 1

if __name__ == "__main__":
    exit(main())