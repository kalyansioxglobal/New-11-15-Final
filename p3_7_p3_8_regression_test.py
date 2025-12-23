#!/usr/bin/env python3
"""
P3.7/P3.8 Incentive Backend Regression Testing
Testing specific endpoints after P3.7/P3.8 changes:

1. /api/incentives/commit - Run preview + commit pipeline end-to-end
2. /api/bpo/kpi - Re-run key tests (method validation, default behavior, range limits, response structure)  
3. /api/logistics/customers - Validate normalized pagination and error contract

Focus: Confirming NO REGRESSIONS after incentives P3.7/P3.8 changes
"""

import requests
import json
import sys
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Base URL for the API
BASE_URL = "http://localhost:3000"

class P3IncentiveRegressionTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, endpoint: str, method: str, status_code: int, 
                   response_data: Any, headers: Dict = None, body: Any = None,
                   test_description: str = "", expected_status: int = None):
        """Log test result"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "expected_status": expected_status,
            "response": response_data,
            "test_description": test_description,
            "headers": headers or {},
            "request_body": body,
            "passed": status_code == expected_status if expected_status else status_code < 400
        }
        self.results.append(result)
        
        if expected_status:
            status_emoji = "✅" if status_code == expected_status else "❌"
            print(f"{status_emoji} {method} {endpoint} -> {status_code} (expected {expected_status})")
        else:
            status_emoji = "✅" if status_code < 400 else "❌"
            print(f"{status_emoji} {method} {endpoint} -> {status_code}")
            
        if test_description:
            print(f"   📝 {test_description}")
        print(f"   📤 Request: {json.dumps(body) if body else 'No body'}")
        
        # Truncate long responses for readability
        if isinstance(response_data, dict) and len(str(response_data)) > 500:
            truncated = {k: f"[{len(v)} items]" if isinstance(v, list) else str(v)[:100] + "..." if isinstance(v, str) and len(str(v)) > 100 else v for k, v in response_data.items()}
            print(f"   📥 Response: {json.dumps(truncated, indent=2)}")
        else:
            print(f"   📥 Response: {json.dumps(response_data, indent=2)}")
        print("-" * 80)
        
        return status_code, response_data
        
    def test_endpoint(self, endpoint: str, method: str = "GET", 
                     headers: Dict = None, body: Any = None,
                     test_description: str = "", expected_status: int = None):
        """Test an endpoint and log results"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, params=body if isinstance(body, dict) else None)
            elif method == "POST":
                response = self.session.post(url, json=body, headers=headers)
            elif method == "DELETE":
                response = self.session.delete(url, json=body, headers=headers)
            elif method == "PUT":
                response = self.session.put(url, json=body, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:500] + "..." if len(response.text) > 500 else response.text}
                
            return self.log_result(endpoint, method, response.status_code, 
                          response_data, headers, body, test_description, expected_status)
            
        except Exception as e:
            error_data = {"error": str(e)}
            return self.log_result(endpoint, method, 0, error_data, headers, body, 
                          f"Connection error: {test_description}", expected_status)

    def test_incentives_commit_flow(self):
        """Test /api/incentives/commit - Run preview + commit pipeline end-to-end"""
        print("\n💰 TESTING: /api/incentives/commit - Preview + Commit Pipeline")
        print("=" * 80)
        
        # Step 1: Test method validation
        self.test_endpoint(
            "/api/incentives/commit",
            method="GET",
            test_description="Method validation - GET should return 405",
            expected_status=405
        )
        
        self.test_endpoint(
            "/api/incentives/commit",
            method="PUT",
            test_description="Method validation - PUT should return 405",
            expected_status=405
        )
        
        # Step 2: Test without authentication (should fail in production, but dev mode auto-auths)
        self.test_endpoint(
            "/api/incentives/commit",
            method="POST",
            body={},
            test_description="Unauthenticated request - dev mode should auto-auth as CEO"
        )
        
        # Step 3: Test input validation
        self.test_endpoint(
            "/api/incentives/commit",
            method="POST",
            body={},
            test_description="Missing planId - should return 400",
            expected_status=400
        )
        
        self.test_endpoint(
            "/api/incentives/commit",
            method="POST",
            body={"planId": "invalid"},
            test_description="Invalid planId type - should return 400",
            expected_status=400
        )
        
        self.test_endpoint(
            "/api/incentives/commit",
            method="POST",
            body={"planId": 0},
            test_description="Zero planId - should return 400",
            expected_status=400
        )
        
        self.test_endpoint(
            "/api/incentives/commit",
            method="POST",
            body={"planId": -1},
            test_description="Negative planId - should return 400",
            expected_status=400
        )
        
        # Step 4: Test with valid planId (may fail if no plan exists, but should validate input)
        today = datetime.now().strftime("%Y-%m-%d")
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        self.test_endpoint(
            "/api/incentives/commit",
            method="POST",
            body={"planId": 1},
            test_description="Valid planId=1, default date - should process or return 404/500 if no plan"
        )
        
        self.test_endpoint(
            "/api/incentives/commit",
            method="POST",
            body={"planId": 1, "date": yesterday},
            test_description="Valid planId=1 with specific date - should process or return 404/500 if no plan"
        )
        
        # Step 5: Test preview endpoint first (if it exists)
        print("\n   🔍 Testing preview endpoint /api/incentives/run")
        
        self.test_endpoint(
            "/api/incentives/run",
            method="POST",
            body={"planId": 1},
            test_description="Preview run with planId=1 - should calculate without saving"
        )

    def test_bpo_kpi_regression(self):
        """Test /api/bpo/kpi - Re-run key tests for regressions"""
        print("\n📊 TESTING: /api/bpo/kpi - Regression Tests")
        print("=" * 80)
        
        # Test 1: Method validation (GET allowed, others → 405)
        self.test_endpoint(
            "/api/bpo/kpi",
            method="POST",
            test_description="Method validation - POST should return 405",
            expected_status=405
        )
        
        self.test_endpoint(
            "/api/bpo/kpi",
            method="PUT",
            test_description="Method validation - PUT should return 405",
            expected_status=405
        )
        
        self.test_endpoint(
            "/api/bpo/kpi",
            method="DELETE",
            test_description="Method validation - DELETE should return 405",
            expected_status=405
        )
        
        # Test 2: Default 30-day window behavior (actually 7 days based on code)
        self.test_endpoint(
            "/api/bpo/kpi",
            method="GET",
            test_description="Default behavior - should use last 7 days window"
        )
        
        # Test 3: 90-day range limit enforcement
        today = datetime.now()
        from_date_91_days = (today - timedelta(days=91)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
        
        self.test_endpoint(
            f"/api/bpo/kpi?from={from_date_91_days}&to={to_date}",
            method="GET",
            test_description="Range limit test - 91 days should return 400",
            expected_status=400
        )
        
        # Test 4: Valid range within 90 days
        from_date_30_days = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        
        self.test_endpoint(
            f"/api/bpo/kpi?from={from_date_30_days}&to={to_date}",
            method="GET",
            test_description="Valid range - 30 days should return 200"
        )
        
        # Test 5: Response structure validation
        status_code, response = self.test_endpoint(
            "/api/bpo/kpi",
            method="GET",
            test_description="Response structure validation"
        )
        
        if status_code == 200 and isinstance(response, dict):
            required_fields = ["from", "to", "agents", "totals"]
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing required fields: {missing_fields}")
            else:
                print(f"   ✅ All required fields present: {required_fields}")
                
            # Check totals structure
            if "totals" in response and isinstance(response["totals"], dict):
                totals_fields = ["totalDials", "totalConnects", "totalTalkSeconds", "totalAppointments", "totalDeals", "totalRevenue"]
                missing_totals = [field for field in totals_fields if field not in response["totals"]]
                if missing_totals:
                    print(f"   ⚠️  Missing totals fields: {missing_totals}")
                else:
                    print(f"   ✅ All totals fields present: {totals_fields}")

    def test_logistics_customers_pagination(self):
        """Test /api/logistics/customers - Validate normalized pagination and error contract"""
        print("\n🚚 TESTING: /api/logistics/customers - Normalized Pagination")
        print("=" * 80)
        
        # Test 1: Method validation (GET allowed, POST for creation, others → 405)
        self.test_endpoint(
            "/api/logistics/customers",
            method="PUT",
            test_description="Method validation - PUT should return 405",
            expected_status=405
        )
        
        self.test_endpoint(
            "/api/logistics/customers",
            method="DELETE",
            test_description="Method validation - DELETE should return 405",
            expected_status=405
        )
        
        # Test 2: Default pagination (page=1, pageSize=50)
        status_code, response = self.test_endpoint(
            "/api/logistics/customers",
            method="GET",
            test_description="Default pagination - should use page=1, pageSize=50"
        )
        
        if status_code == 200 and isinstance(response, dict):
            expected_pagination_fields = ["items", "page", "pageSize", "total", "totalPages"]
            missing_fields = [field for field in expected_pagination_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing pagination fields: {missing_fields}")
            else:
                print(f"   ✅ All pagination fields present: {expected_pagination_fields}")
                print(f"   📊 Default values - page: {response.get('page')}, pageSize: {response.get('pageSize')}")
        
        # Test 3: Custom pagination parameters
        self.test_endpoint(
            "/api/logistics/customers?page=1&pageSize=25",
            method="GET",
            test_description="Custom pagination - page=1, pageSize=25"
        )
        
        # Test 4: PageSize > 200 capped at 200
        status_code, response = self.test_endpoint(
            "/api/logistics/customers?page=1&pageSize=500",
            method="GET",
            test_description="PageSize limit - pageSize=500 should be capped at 200"
        )
        
        if status_code == 200 and isinstance(response, dict):
            actual_page_size = response.get("pageSize")
            if actual_page_size == 200:
                print(f"   ✅ PageSize correctly capped at 200")
            elif actual_page_size == 50:
                print(f"   ⚠️  PageSize not capped, using default 50 (may be different implementation)")
            else:
                print(f"   ❌ Unexpected pageSize: {actual_page_size}")
        
        # Test 5: Invalid pagination parameters
        self.test_endpoint(
            "/api/logistics/customers?page=0&pageSize=25",
            method="GET",
            test_description="Invalid page=0 - should default to page=1"
        )
        
        self.test_endpoint(
            "/api/logistics/customers?page=-1&pageSize=25",
            method="GET",
            test_description="Invalid page=-1 - should default to page=1"
        )
        
        self.test_endpoint(
            "/api/logistics/customers?page=1&pageSize=0",
            method="GET",
            test_description="Invalid pageSize=0 - should default to pageSize=50"
        )
        
        # Test 6: Response structure validation
        status_code, response = self.test_endpoint(
            "/api/logistics/customers",
            method="GET",
            test_description="Response structure validation"
        )
        
        if status_code == 200 and isinstance(response, dict):
            # Check response shape {customers, page, pageSize, total, totalPages} or {items, page, pageSize, total, totalPages}
            if "items" in response:
                print(f"   ✅ Using normalized 'items' field")
                items = response["items"]
            elif "customers" in response:
                print(f"   ⚠️  Using legacy 'customers' field (should be 'items')")
                items = response["customers"]
            else:
                print(f"   ❌ No items/customers field found")
                items = []
                
            if isinstance(items, list) and len(items) > 0:
                # Check customer structure
                customer = items[0]
                expected_customer_fields = ["id", "name"]
                present_fields = [field for field in expected_customer_fields if field in customer]
                print(f"   📋 Customer fields present: {present_fields}")

    def run_all_tests(self):
        """Run all P3.7/P3.8 regression tests"""
        print("🚀 Starting P3.7/P3.8 Incentive Backend Regression Tests")
        print("=" * 80)
        print("Focus: Confirming NO REGRESSIONS after incentives P3.7/P3.8 changes")
        print("=" * 80)
        
        # Test each endpoint group
        self.test_incentives_commit_flow()
        self.test_bpo_kpi_regression()
        self.test_logistics_customers_pagination()
        
        # Summary
        print("\n📊 P3.7/P3.8 REGRESSION TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = [r for r in self.results if r['passed']]
        failed_tests = [r for r in self.results if not r['passed']]
        connection_errors = [r for r in self.results if r['status_code'] == 0]
        
        print(f"Total tests: {total_tests}")
        print(f"Passed: {len(passed_tests)}")
        print(f"Failed: {len(failed_tests)}")
        print(f"Connection errors: {len(connection_errors)}")
        
        if connection_errors:
            print("\n❌ CONNECTION ERRORS:")
            for result in connection_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['response'].get('error', 'Unknown error')}")
        
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for result in failed_tests:
                expected = f" (expected {result['expected_status']})" if result['expected_status'] else ""
                print(f"  - {result['method']} {result['endpoint']}: {result['status_code']}{expected}")
                print(f"    📝 {result['test_description']}")
        
        print("\n✅ PASSED TESTS:")
        for result in passed_tests:
            print(f"  - {result['method']} {result['endpoint']}: {result['status_code']}")
        
        # Regression analysis
        print(f"\n🔍 REGRESSION ANALYSIS:")
        
        # Group by endpoint
        endpoints = {}
        for result in self.results:
            endpoint = result['endpoint']
            if endpoint not in endpoints:
                endpoints[endpoint] = {'passed': 0, 'failed': 0, 'total': 0}
            endpoints[endpoint]['total'] += 1
            if result['passed']:
                endpoints[endpoint]['passed'] += 1
            else:
                endpoints[endpoint]['failed'] += 1
        
        for endpoint, stats in endpoints.items():
            status = "✅ STABLE" if stats['failed'] == 0 else "❌ REGRESSION"
            print(f"  {status} {endpoint}: {stats['passed']}/{stats['total']} passed")
        
        # Overall regression status
        critical_regressions = [r for r in failed_tests if r['status_code'] >= 500]
        if len(critical_regressions) == 0:
            print(f"\n🎉 NO CRITICAL REGRESSIONS DETECTED")
            print(f"   All endpoints responding without 5xx errors")
        else:
            print(f"\n💥 CRITICAL REGRESSIONS FOUND: {len(critical_regressions)}")
            for result in critical_regressions:
                print(f"   - {result['method']} {result['endpoint']}: {result['status_code']}")
        
        return len(connection_errors) == 0 and len(critical_regressions) == 0

def main():
    """Main test execution"""
    tester = P3IncentiveRegressionTester()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/p3_7_p3_8_regression_test_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/p3_7_p3_8_regression_test_results.json")
    
    if success:
        print("\n🎉 P3.7/P3.8 regression tests completed - NO CRITICAL REGRESSIONS!")
        return 0
    else:
        print("\n💥 P3.7/P3.8 regression tests found issues - check results above")
        return 1

if __name__ == "__main__":
    sys.exit(main())