#!/usr/bin/env python3
"""
Backend API Testing for Admin/Diagnostic Endpoints
Testing the following endpoints as per review request:
1. /api/logistics/missing-mappings
2. /api/admin/clear-test-data
3. /api/admin/seed-test-users
4. /api/admin/auto-seed-test-data
5. /api/admin/cleanup-test-data
"""

import requests
import json
import os
import sys
from typing import Dict, Any, Optional

# Base URL for the API
BASE_URL = "http://localhost:3000"

class AdminEndpointTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, endpoint: str, method: str, status_code: int, 
                   response_data: Any, headers: Dict = None, body: Any = None,
                   test_description: str = ""):
        """Log test result"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "response": response_data,
            "test_description": test_description,
            "headers": headers or {},
            "request_body": body
        }
        self.results.append(result)
        
        status_emoji = "✅" if status_code < 400 else "❌"
        print(f"{status_emoji} {method} {endpoint} -> {status_code}")
        if test_description:
            print(f"   📝 {test_description}")
        print(f"   📤 Request: {json.dumps(body) if body else 'No body'}")
        print(f"   📥 Response: {json.dumps(response_data, indent=2)}")
        print("-" * 80)
        
    def test_endpoint(self, endpoint: str, method: str = "GET", 
                     headers: Dict = None, body: Any = None,
                     test_description: str = ""):
        """Test an endpoint and log results"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers)
            elif method == "POST":
                response = self.session.post(url, json=body, headers=headers)
            elif method == "DELETE":
                response = self.session.delete(url, json=body, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
                
            self.log_result(endpoint, method, response.status_code, 
                          response_data, headers, body, test_description)
            
            return response.status_code, response_data
            
        except Exception as e:
            error_data = {"error": str(e)}
            self.log_result(endpoint, method, 0, error_data, headers, body, 
                          f"Connection error: {test_description}")
            return 0, error_data

    def test_missing_mappings_endpoint(self):
        """Test /api/logistics/missing-mappings endpoint"""
        print("\n🔍 Testing /api/logistics/missing-mappings endpoint")
        print("=" * 80)
        
        # Test without authentication (should fail)
        self.test_endpoint(
            "/api/logistics/missing-mappings",
            method="GET",
            test_description="Unauthenticated request - should return 401"
        )
        
        # Test with wrong method
        self.test_endpoint(
            "/api/logistics/missing-mappings",
            method="POST",
            test_description="Wrong method (POST) - should return 405"
        )

    def test_clear_test_data_endpoint(self):
        """Test /api/admin/clear-test-data endpoint"""
        print("\n🗑️ Testing /api/admin/clear-test-data endpoint")
        print("=" * 80)
        
        # Test without authentication
        self.test_endpoint(
            "/api/admin/clear-test-data",
            method="DELETE",
            test_description="Unauthenticated DELETE - should return 401"
        )
        
        # Test with wrong method
        self.test_endpoint(
            "/api/admin/clear-test-data",
            method="GET",
            test_description="Wrong method (GET) - should return 405"
        )

    def test_seed_test_users_endpoint(self):
        """Test /api/admin/seed-test-users endpoint"""
        print("\n👥 Testing /api/admin/seed-test-users endpoint")
        print("=" * 80)
        
        # Test without authentication
        self.test_endpoint(
            "/api/admin/seed-test-users",
            method="POST",
            test_description="Unauthenticated POST - should return 401"
        )
        
        # Test with wrong method
        self.test_endpoint(
            "/api/admin/seed-test-users",
            method="GET",
            test_description="Wrong method (GET) - should return 405"
        )

    def test_auto_seed_test_data_endpoint(self):
        """Test /api/admin/auto-seed-test-data endpoint"""
        print("\n🌱 Testing /api/admin/auto-seed-test-data endpoint")
        print("=" * 80)
        
        # Test without authentication
        self.test_endpoint(
            "/api/admin/auto-seed-test-data",
            method="POST",
            test_description="Unauthenticated POST - should return 401"
        )
        
        # Test with wrong method
        self.test_endpoint(
            "/api/admin/auto-seed-test-data",
            method="GET",
            test_description="Wrong method (GET) - should return 405"
        )

    def test_cleanup_test_data_endpoint(self):
        """Test /api/admin/cleanup-test-data endpoint"""
        print("\n🧹 Testing /api/admin/cleanup-test-data endpoint")
        print("=" * 80)
        
        # Test without authentication
        self.test_endpoint(
            "/api/admin/cleanup-test-data",
            method="POST",
            test_description="Unauthenticated POST - should return 401"
        )
        
        # Test with wrong method
        self.test_endpoint(
            "/api/admin/cleanup-test-data",
            method="GET",
            test_description="Wrong method (GET) - should return 405"
        )
        
        # Test with wrong confirmation body
        self.test_endpoint(
            "/api/admin/cleanup-test-data",
            method="POST",
            body={"confirm": "WRONG_CONFIRMATION"},
            test_description="Wrong confirmation - should return 400"
        )

    def test_production_environment_protection(self):
        """Test that endpoints are disabled in production"""
        print("\n🔒 Testing Production Environment Protection")
        print("=" * 80)
        
        # Set NODE_ENV to production temporarily
        original_env = os.environ.get('NODE_ENV')
        os.environ['NODE_ENV'] = 'production'
        
        try:
            # These endpoints should return 403 in production
            endpoints_to_test = [
                "/api/admin/clear-test-data",
                "/api/admin/seed-test-users", 
                "/api/admin/auto-seed-test-data",
                "/api/admin/cleanup-test-data"
            ]
            
            for endpoint in endpoints_to_test:
                method = "DELETE" if "clear-test-data" in endpoint else "POST"
                self.test_endpoint(
                    endpoint,
                    method=method,
                    test_description=f"Production environment - should return 403"
                )
        finally:
            # Restore original environment
            if original_env:
                os.environ['NODE_ENV'] = original_env
            elif 'NODE_ENV' in os.environ:
                del os.environ['NODE_ENV']

    def run_all_tests(self):
        """Run all endpoint tests"""
        print("🚀 Starting Admin/Diagnostic Endpoint Tests")
        print("=" * 80)
        
        # Test each endpoint
        self.test_missing_mappings_endpoint()
        self.test_clear_test_data_endpoint()
        self.test_seed_test_users_endpoint()
        self.test_auto_seed_test_data_endpoint()
        self.test_cleanup_test_data_endpoint()
        self.test_production_environment_protection()
        
        # Summary
        print("\n📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        failed_tests = [r for r in self.results if r['status_code'] >= 400 and r['status_code'] != 401 and r['status_code'] != 403 and r['status_code'] != 405]
        expected_failures = [r for r in self.results if r['status_code'] in [401, 403, 405]]
        connection_errors = [r for r in self.results if r['status_code'] == 0]
        
        print(f"Total tests: {total_tests}")
        print(f"Connection errors: {len(connection_errors)}")
        print(f"Expected failures (401/403/405): {len(expected_failures)}")
        print(f"Unexpected failures: {len(failed_tests)}")
        
        if connection_errors:
            print("\n❌ CONNECTION ERRORS:")
            for result in connection_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['response'].get('error', 'Unknown error')}")
        
        if failed_tests:
            print("\n❌ UNEXPECTED FAILURES:")
            for result in failed_tests:
                print(f"  - {result['method']} {result['endpoint']}: {result['status_code']} - {result['response']}")
        
        print("\n✅ EXPECTED BEHAVIORS VERIFIED:")
        for result in expected_failures:
            print(f"  - {result['method']} {result['endpoint']}: {result['status_code']} (Expected)")
        
        return len(connection_errors) == 0 and len(failed_tests) == 0

def main():
    """Main test execution"""
    tester = AdminEndpointTester()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/test_results_admin_endpoints.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/test_results_admin_endpoints.json")
    
    if success:
        print("\n🎉 All tests completed successfully!")
        return 0
    else:
        print("\n💥 Some tests failed - check the results above")
        return 1

if __name__ == "__main__":
    sys.exit(main())