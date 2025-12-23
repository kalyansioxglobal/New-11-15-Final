#!/usr/bin/env python3
"""
P2.5 Normalization Backend API Testing
Testing the following endpoints as per review request:

1. /api/hotels/disputes (index)
   - GET: Accepts optional status, propertyId, includeTest, page, pageSize
   - POST: Creates disputes (with permission checks)
   - Non-GET/POST: Returns 405

2. /api/meta/hotel-properties
   - GET: Accepts optional page, pageSize
   - Non-GET: Returns 405

3. /api/bpo/campaigns
   - GET: Supports pagination via page, pageSize
   - POST: Creates campaigns (super-admin only)
   - Non-GET/POST: Returns 405

Focus: status codes, JSON shapes, pagination caps, and method validation
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Base URL for the API - using localhost as per environment
BASE_URL = "http://localhost:3000"

class P25NormalizationTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, endpoint: str, method: str, status_code: int, 
                   response_data: Any, headers: Dict = None, body: Any = None,
                   test_description: str = "", expected_status: int = None):
        """Log test result with pass/fail indication"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "response": response_data,
            "test_description": test_description,
            "headers": headers or {},
            "request_body": body,
            "expected_status": expected_status,
            "passed": expected_status is None or status_code == expected_status
        }
        self.results.append(result)
        
        # Determine status emoji
        if expected_status:
            status_emoji = "✅" if status_code == expected_status else "❌"
            status_text = f"{status_code} (expected {expected_status})"
        else:
            status_emoji = "✅" if status_code < 400 else "❌"
            status_text = str(status_code)
            
        print(f"{status_emoji} {method} {endpoint} -> {status_text}")
        if test_description:
            print(f"   📝 {test_description}")
        if body:
            print(f"   📤 Request: {json.dumps(body, indent=2)}")
        print(f"   📥 Response: {json.dumps(response_data, indent=2)}")
        print("-" * 80)
        
    def test_endpoint(self, endpoint: str, method: str = "GET", 
                     headers: Dict = None, body: Any = None,
                     test_description: str = "", expected_status: int = None,
                     params: Dict = None):
        """Test an endpoint and log results"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, params=params)
            elif method == "POST":
                response = self.session.post(url, json=body, headers=headers, params=params)
            elif method == "DELETE":
                response = self.session.delete(url, json=body, headers=headers, params=params)
            elif method == "PUT":
                response = self.session.put(url, json=body, headers=headers, params=params)
            elif method == "PATCH":
                response = self.session.patch(url, json=body, headers=headers, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:500]}  # Truncate long responses
                
            self.log_result(endpoint, method, response.status_code, 
                          response_data, headers, body, test_description, expected_status)
            
            return response.status_code, response_data
            
        except Exception as e:
            error_data = {"error": str(e)}
            self.log_result(endpoint, method, 0, error_data, headers, body, 
                          f"Connection error: {test_description}", expected_status)
            return 0, error_data

    def validate_pagination_response(self, response_data: Dict, expected_keys: list) -> bool:
        """Validate pagination response structure"""
        if not isinstance(response_data, dict):
            return False
        
        for key in expected_keys:
            if key not in response_data:
                print(f"   ❌ Missing key: {key}")
                return False
        
        # Validate pagination fields are numbers
        pagination_fields = ['page', 'pageSize', 'total', 'totalPages']
        for field in pagination_fields:
            if field in response_data and not isinstance(response_data[field], int):
                print(f"   ❌ {field} should be integer, got {type(response_data[field])}")
                return False
        
        return True

    def test_hotels_disputes_endpoint(self):
        """Test /api/hotels/disputes endpoint"""
        print("\n🏨 Testing /api/hotels/disputes endpoint")
        print("=" * 80)
        
        # Test GET without parameters
        status, response = self.test_endpoint(
            "/api/hotels/disputes",
            method="GET",
            test_description="GET disputes without parameters",
            expected_status=200
        )
        
        if status == 200:
            expected_keys = ['disputes', 'page', 'pageSize', 'total', 'totalPages']
            if self.validate_pagination_response(response, expected_keys):
                print("   ✅ Response structure valid")
            else:
                print("   ❌ Response structure invalid")
        
        # Test GET with pagination parameters
        self.test_endpoint(
            "/api/hotels/disputes",
            method="GET",
            params={"page": "2", "pageSize": "25"},
            test_description="GET disputes with pagination (page=2, pageSize=25)",
            expected_status=200
        )
        
        # Test GET with pageSize > 200 (should be capped at 200)
        status, response = self.test_endpoint(
            "/api/hotels/disputes",
            method="GET",
            params={"page": "1", "pageSize": "300"},
            test_description="GET disputes with pageSize=300 (should cap at 200)",
            expected_status=200
        )
        
        if status == 200 and isinstance(response, dict):
            actual_page_size = response.get('pageSize', 0)
            if actual_page_size == 200:
                print("   ✅ PageSize correctly capped at 200")
            else:
                print(f"   ❌ PageSize not capped correctly: got {actual_page_size}, expected 200")
        
        # Test GET with filters
        self.test_endpoint(
            "/api/hotels/disputes",
            method="GET",
            params={"status": "OPEN", "propertyId": "1", "includeTest": "true"},
            test_description="GET disputes with filters (status, propertyId, includeTest)",
            expected_status=200
        )
        
        # Test POST with valid enum values (should succeed with proper permissions)
        self.test_endpoint(
            "/api/hotels/disputes",
            method="POST",
            body={
                "propertyId": 1,
                "type": "CHARGEBACK",
                "channel": "OTA",
                "guestName": "Test Guest",
                "disputedAmount": 100.00,
                "originalAmount": 120.00,
                "reason": "Test dispute for P2.5 normalization testing"
            },
            test_description="POST create dispute with valid data"
        )
        
        # Test unsupported methods
        for method in ["PUT", "DELETE", "PATCH"]:
            self.test_endpoint(
                "/api/hotels/disputes",
                method=method,
                test_description=f"{method} method should return 405",
                expected_status=405
            )

    def test_meta_hotel_properties_endpoint(self):
        """Test /api/meta/hotel-properties endpoint"""
        print("\n🏢 Testing /api/meta/hotel-properties endpoint")
        print("=" * 80)
        
        # Test GET without parameters
        status, response = self.test_endpoint(
            "/api/meta/hotel-properties",
            method="GET",
            test_description="GET hotel properties without parameters",
            expected_status=200
        )
        
        if status == 200:
            expected_keys = ['properties', 'page', 'pageSize', 'total', 'totalPages']
            if self.validate_pagination_response(response, expected_keys):
                print("   ✅ Response structure valid")
            else:
                print("   ❌ Response structure invalid")
        
        # Test GET with pagination parameters
        self.test_endpoint(
            "/api/meta/hotel-properties",
            method="GET",
            params={"page": "1", "pageSize": "10"},
            test_description="GET hotel properties with pagination (page=1, pageSize=10)",
            expected_status=200
        )
        
        # Test GET with pageSize > 200 (should be capped at 200)
        status, response = self.test_endpoint(
            "/api/meta/hotel-properties",
            method="GET",
            params={"page": "1", "pageSize": "500"},
            test_description="GET hotel properties with pageSize=500 (should cap at 200)",
            expected_status=200
        )
        
        if status == 200 and isinstance(response, dict):
            actual_page_size = response.get('pageSize', 0)
            if actual_page_size == 200:
                print("   ✅ PageSize correctly capped at 200")
            else:
                print(f"   ❌ PageSize not capped correctly: got {actual_page_size}, expected 200")
        
        # Test unsupported methods
        for method in ["POST", "PUT", "DELETE", "PATCH"]:
            self.test_endpoint(
                "/api/meta/hotel-properties",
                method=method,
                test_description=f"{method} method should return 405",
                expected_status=405
            )

    def test_bpo_campaigns_endpoint(self):
        """Test /api/bpo/campaigns endpoint"""
        print("\n📞 Testing /api/bpo/campaigns endpoint")
        print("=" * 80)
        
        # Test GET without parameters
        status, response = self.test_endpoint(
            "/api/bpo/campaigns",
            method="GET",
            test_description="GET BPO campaigns without parameters",
            expected_status=200
        )
        
        if status == 200:
            expected_keys = ['items', 'total', 'page', 'pageSize', 'totalPages']
            if self.validate_pagination_response(response, expected_keys):
                print("   ✅ Response structure valid")
            else:
                print("   ❌ Response structure invalid")
        
        # Test GET with pagination parameters
        self.test_endpoint(
            "/api/bpo/campaigns",
            method="GET",
            params={"page": "1", "pageSize": "20"},
            test_description="GET BPO campaigns with pagination (page=1, pageSize=20)",
            expected_status=200
        )
        
        # Test GET with pageSize > 200 (should be capped at 200)
        status, response = self.test_endpoint(
            "/api/bpo/campaigns",
            method="GET",
            params={"page": "1", "pageSize": "250"},
            test_description="GET BPO campaigns with pageSize=250 (should cap at 200)",
            expected_status=200
        )
        
        if status == 200 and isinstance(response, dict):
            actual_page_size = response.get('pageSize', 0)
            if actual_page_size == 200:
                print("   ✅ PageSize correctly capped at 200")
            else:
                print(f"   ❌ PageSize not capped correctly: got {actual_page_size}, expected 200")
        
        # Test POST (should fail without super-admin permissions)
        self.test_endpoint(
            "/api/bpo/campaigns",
            method="POST",
            body={
                "name": "Test Campaign",
                "clientName": "Test Client",
                "ventureId": 1,
                "vertical": "CUSTOMER_SERVICE",
                "description": "Test campaign description"
            },
            test_description="POST create campaign (likely to fail due to permissions)"
        )
        
        # Test unsupported methods
        for method in ["PUT", "DELETE", "PATCH"]:
            self.test_endpoint(
                "/api/bpo/campaigns",
                method=method,
                test_description=f"{method} method should return 405",
                expected_status=405
            )

    def test_error_response_format(self):
        """Test that error responses follow the expected JSON format"""
        print("\n🚨 Testing Error Response Format")
        print("=" * 80)
        
        # Test 405 responses have proper JSON format
        endpoints_methods = [
            ("/api/hotels/disputes", "PUT"),
            ("/api/meta/hotel-properties", "POST"),
            ("/api/bpo/campaigns", "DELETE")
        ]
        
        for endpoint, method in endpoints_methods:
            status, response = self.test_endpoint(
                endpoint,
                method=method,
                test_description=f"Verify {method} {endpoint} returns proper JSON error",
                expected_status=405
            )
            
            if status == 405 and isinstance(response, dict):
                if 'error' in response:
                    print(f"   ✅ {endpoint} returns proper JSON error format")
                else:
                    print(f"   ❌ {endpoint} missing 'error' key in response")

    def run_all_tests(self):
        """Run all P2.5 normalization tests"""
        print("🚀 Starting P2.5 Normalization Backend Tests")
        print("=" * 80)
        
        # Test each endpoint
        self.test_hotels_disputes_endpoint()
        self.test_meta_hotel_properties_endpoint()
        self.test_bpo_campaigns_endpoint()
        self.test_error_response_format()
        
        # Summary
        print("\n📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = [r for r in self.results if r.get('passed', False)]
        failed_tests = [r for r in self.results if not r.get('passed', False)]
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
                expected = result.get('expected_status', 'N/A')
                actual = result['status_code']
                print(f"  - {result['method']} {result['endpoint']}: Expected {expected}, got {actual}")
                print(f"    Description: {result['test_description']}")
        
        if passed_tests:
            print(f"\n✅ PASSED TESTS: {len(passed_tests)}")
        
        return len(connection_errors) == 0 and len(failed_tests) == 0

def main():
    """Main test execution"""
    tester = P25NormalizationTester()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/p2_5_normalization_test_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/p2_5_normalization_test_results.json")
    
    if success:
        print("\n🎉 All tests completed successfully!")
        return 0
    else:
        print("\n💥 Some tests failed - check the results above")
        return 1

if __name__ == "__main__":
    sys.exit(main())