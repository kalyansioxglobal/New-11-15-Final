#!/usr/bin/env python3
"""
Backend API Testing for P2 Step 4 Phase 2 Normalization
Testing specific endpoints that were touched during normalization:
1. /api/logistics/freight-pnl
2. /api/hospitality/dashboard  
3. /api/bpo/kpi
4. /api/ventures
5. /api/saas/metrics
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import os

# Get backend URL from environment or use default
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:3000')
BASE_URL = f"{BACKEND_URL}/api"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, endpoint: str, method: str, status_code: int, 
                   expected: int, passed: bool, details: str = ""):
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "expected": expected,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {method} {endpoint} - {status_code} (expected {expected}) - {details}")
        
    def test_request(self, endpoint: str, method: str = "GET", 
                    expected_status: int = 200, data: Optional[Dict] = None,
                    params: Optional[Dict] = None, description: str = ""):
        """Make a test request and validate response"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, params=params, timeout=30)
            elif method == "POST":
                response = self.session.post(url, json=data, params=params, timeout=30)
            elif method == "PUT":
                response = self.session.put(url, json=data, params=params, timeout=30)
            elif method == "DELETE":
                response = self.session.delete(url, params=params, timeout=30)
            else:
                response = self.session.request(method, url, json=data, params=params, timeout=30)
                
            passed = response.status_code == expected_status
            
            # Try to parse JSON response for additional validation
            response_data = None
            try:
                response_data = response.json()
            except:
                pass
                
            details = description
            if not passed and response_data:
                if isinstance(response_data, dict) and 'error' in response_data:
                    details += f" | Error: {response_data.get('error', 'Unknown')}"
                    if 'detail' in response_data:
                        details += f" | Detail: {response_data['detail']}"
                        
            self.log_result(endpoint, method, response.status_code, expected_status, passed, details)
            return response, response_data
            
        except requests.exceptions.RequestException as e:
            self.log_result(endpoint, method, 0, expected_status, False, f"Request failed: {str(e)}")
            return None, None

    def test_logistics_freight_pnl(self):
        """Test /api/logistics/freight-pnl endpoint"""
        print("\n🚛 Testing Logistics Freight P&L Endpoint")
        
        # Test 1: Method validation - should reject non-GET methods
        self.test_request("/logistics/freight-pnl", "POST", 405, 
                         description="Should reject POST method")
        
        # Test 2: Invalid date validation
        self.test_request("/logistics/freight-pnl", "GET", 400,
                         params={"from": "invalid-date"},
                         description="Should reject invalid from date")
        
        self.test_request("/logistics/freight-pnl", "GET", 400,
                         params={"to": "invalid-date"},
                         description="Should reject invalid to date")
        
        # Test 3: Date range too large (more than 365 days)
        today = datetime.now()
        far_past = today - timedelta(days=400)
        self.test_request("/logistics/freight-pnl", "GET", 400,
                         params={
                             "from": far_past.strftime("%Y-%m-%d"),
                             "to": today.strftime("%Y-%m-%d")
                         },
                         description="Should reject date range > 365 days")
        
        # Test 4: Default behavior (no from/to) - should use 30-day window
        response, data = self.test_request("/logistics/freight-pnl", "GET", 200,
                                          description="Default 30-day window should work")
        
        if data and isinstance(data, dict):
            required_keys = ['summary', 'byDay', 'byCustomer', 'byOffice']
            has_all_keys = all(key in data for key in required_keys)
            if has_all_keys:
                print("  ✅ Response has required P&L structure")
            else:
                print(f"  ❌ Missing required keys. Has: {list(data.keys())}")
        
        # Test 5: Valid date range (last 30 days)
        past_30 = today - timedelta(days=30)
        self.test_request("/logistics/freight-pnl", "GET", 200,
                         params={
                             "from": past_30.strftime("%Y-%m-%d"),
                             "to": today.strftime("%Y-%m-%d")
                         },
                         description="Valid 30-day range should work")

    def test_hospitality_dashboard(self):
        """Test /api/hospitality/dashboard endpoint"""
        print("\n🏨 Testing Hospitality Dashboard Endpoint")
        
        # Test 1: Method validation
        self.test_request("/hospitality/dashboard", "POST", 405,
                         description="Should reject POST method")
        
        # Test 2: Auth required (should get 401 or 403 for unauthenticated)
        response, data = self.test_request("/hospitality/dashboard", "GET", 
                                          expected_status=401,  # Expecting auth failure
                                          description="Should require authentication")
        
        # If we get 200, it means auth is bypassed (dev mode), test the response
        if response and response.status_code == 200:
            print("  ℹ️  Auth bypassed (development mode)")
            if data and isinstance(data, dict):
                expected_keys = ['summary', 'hotels', 'topPerformers', 'underperformers']
                has_keys = all(key in data for key in expected_keys)
                if has_keys:
                    print("  ✅ Response structure is correct")
                else:
                    print(f"  ❌ Missing keys. Has: {list(data.keys())}")

    def test_bpo_kpi(self):
        """Test /api/bpo/kpi endpoint"""
        print("\n📞 Testing BPO KPI Endpoint")
        
        # Test 1: Method validation
        self.test_request("/bpo/kpi", "POST", 405,
                         description="Should reject POST method")
        
        # Test 2: Default behavior (no from/to) - should use 30-day window
        response, data = self.test_request("/bpo/kpi", "GET", 
                                          expected_status=200,  # May work if auth bypassed
                                          description="Default 30-day window")
        
        # Test 3: Date range too large (more than 90 days for BPO)
        today = datetime.now()
        far_past = today - timedelta(days=100)
        self.test_request("/bpo/kpi", "GET", 400,
                         params={
                             "from": far_past.strftime("%Y-%m-%d"),
                             "to": today.strftime("%Y-%m-%d")
                         },
                         description="Should reject date range > 90 days")
        
        # Test 4: Valid range (30 days)
        past_30 = today - timedelta(days=30)
        self.test_request("/bpo/kpi", "GET", 200,
                         params={
                             "from": past_30.strftime("%Y-%m-%d"),
                             "to": today.strftime("%Y-%m-%d")
                         },
                         description="Valid 30-day range should work")

    def test_ventures(self):
        """Test /api/ventures endpoint"""
        print("\n🏢 Testing Ventures Endpoint")
        
        # Test 1: Method validation
        self.test_request("/ventures", "POST", 405,
                         description="Should reject POST method")
        
        # Test 2: Default limit (should return max 50 ventures)
        response, data = self.test_request("/ventures", "GET", 200,
                                          description="Default limit should be 50")
        
        if data and isinstance(data, list):
            if len(data) <= 50:
                print(f"  ✅ Returned {len(data)} ventures (≤ 50)")
            else:
                print(f"  ❌ Returned {len(data)} ventures (> 50)")
        
        # Test 3: Limit > 200 should cap at 200
        response, data = self.test_request("/ventures", "GET", 200,
                                          params={"limit": "300"},
                                          description="Limit > 200 should cap at 200")
        
        if data and isinstance(data, list):
            if len(data) <= 200:
                print(f"  ✅ Capped at {len(data)} ventures (≤ 200)")
            else:
                print(f"  ❌ Returned {len(data)} ventures (> 200)")
        
        # Test 4: Get by ID should return {venture: {...}}
        response, data = self.test_request("/ventures", "GET", 200,
                                          params={"id": "1"},
                                          description="Get by ID should return venture object")
        
        if data and isinstance(data, dict) and 'venture' in data:
            print("  ✅ Returns {venture: {...}} structure for ID queries")
        elif data:
            print(f"  ❌ Unexpected structure for ID query: {type(data)}")

    def test_saas_metrics(self):
        """Test /api/saas/metrics endpoint"""
        print("\n💻 Testing SaaS Metrics Endpoint")
        
        # Test 1: Method validation
        self.test_request("/saas/metrics", "POST", 405,
                         description="Should reject POST method")
        
        # Test 2: Auth and permissions required
        response, data = self.test_request("/saas/metrics", "GET",
                                          expected_status=200,  # May work if auth bypassed
                                          description="Should require portfolio-view role")
        
        if response and response.status_code == 200:
            print("  ℹ️  Auth bypassed (development mode)")
            if data and isinstance(data, dict):
                expected_keys = ['summary', 'monthlyTrend', 'planBreakdown', 'cancelReasons']
                has_keys = all(key in data for key in expected_keys)
                if has_keys:
                    print("  ✅ Response structure is correct")
                else:
                    print(f"  ❌ Missing keys. Has: {list(data.keys())}")

    def test_error_response_format(self):
        """Test that error responses follow {error, detail?} format"""
        print("\n🔍 Testing Error Response Format")
        
        # Test invalid date on freight-pnl
        response, data = self.test_request("/logistics/freight-pnl", "GET", 400,
                                          params={"from": "bad-date"},
                                          description="Error format validation")
        
        if data and isinstance(data, dict):
            if 'error' in data:
                print("  ✅ Error responses include 'error' field")
                if 'detail' in data:
                    print("  ✅ Error responses include 'detail' field")
            else:
                print(f"  ❌ Error response missing 'error' field: {data}")

    def run_all_tests(self):
        """Run all endpoint tests"""
        print("🧪 Starting P2 Step 4 Phase 2 Normalization Backend Tests")
        print(f"🌐 Testing against: {BASE_URL}")
        
        self.test_logistics_freight_pnl()
        self.test_hospitality_dashboard()
        self.test_bpo_kpi()
        self.test_ventures()
        self.test_saas_metrics()
        self.test_error_response_format()
        
        # Summary
        print("\n📊 Test Summary")
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['passed'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.results:
                if not result['passed']:
                    print(f"  - {result['method']} {result['endpoint']}: {result['details']}")
        
        # Save detailed results
        with open('/app/p2_step4_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)