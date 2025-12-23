#!/usr/bin/env python3
"""
P2.5 Normalization Backend API Testing
Testing the following endpoints as per review request:
1. /api/freight/loads - Freight Loads list with normalized pagination
2. /api/saas/customers - SaaS Customers list with normalized pagination  
3. /api/hospitality/reviews - Hospitality Reviews list with normalized pagination
4. Error shape consistency verification for all three endpoints
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Base URL for the API
BASE_URL = "http://localhost:3000"

class P25NormalizationTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, endpoint: str, method: str, status_code: int, 
                   response_data: Any, headers: Dict = None, body: Any = None,
                   test_description: str = "", params: Dict = None):
        """Log test result"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "response": response_data,
            "test_description": test_description,
            "headers": headers or {},
            "request_body": body,
            "query_params": params
        }
        self.results.append(result)
        
        status_emoji = "✅" if status_code < 400 else "❌"
        print(f"{status_emoji} {method} {endpoint} -> {status_code}")
        if test_description:
            print(f"   📝 {test_description}")
        if params:
            print(f"   🔗 Params: {json.dumps(params)}")
        if body:
            print(f"   📤 Request: {json.dumps(body)}")
        print(f"   📥 Response: {json.dumps(response_data, indent=2)}")
        print("-" * 80)
        
    def test_endpoint(self, endpoint: str, method: str = "GET", 
                     headers: Dict = None, body: Any = None,
                     params: Dict = None, test_description: str = ""):
        """Test an endpoint and log results"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, params=params)
            elif method == "POST":
                response = self.session.post(url, json=body, headers=headers, params=params)
            elif method == "PUT":
                response = self.session.put(url, json=body, headers=headers, params=params)
            elif method == "DELETE":
                response = self.session.delete(url, json=body, headers=headers, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
                
            self.log_result(endpoint, method, response.status_code, 
                          response_data, headers, body, test_description, params)
            
            return response.status_code, response_data
            
        except Exception as e:
            error_data = {"error": str(e)}
            self.log_result(endpoint, method, 0, error_data, headers, body, 
                          f"Connection error: {test_description}", params)
            return 0, error_data

    def verify_pagination_shape(self, response_data: Dict, endpoint: str) -> bool:
        """Verify the normalized pagination response shape"""
        required_fields = ["items", "page", "pageSize", "total", "totalPages"]
        
        for field in required_fields:
            if field not in response_data:
                print(f"❌ Missing required field '{field}' in {endpoint} response")
                return False
        
        # Verify data types
        if not isinstance(response_data["items"], list):
            print(f"❌ 'items' should be a list in {endpoint} response")
            return False
            
        if not isinstance(response_data["page"], int):
            print(f"❌ 'page' should be an integer in {endpoint} response")
            return False
            
        if not isinstance(response_data["pageSize"], int):
            print(f"❌ 'pageSize' should be an integer in {endpoint} response")
            return False
            
        if not isinstance(response_data["total"], int):
            print(f"❌ 'total' should be an integer in {endpoint} response")
            return False
            
        if not isinstance(response_data["totalPages"], int):
            print(f"❌ 'totalPages' should be an integer in {endpoint} response")
            return False
        
        print(f"✅ Pagination shape verified for {endpoint}")
        return True

    def verify_error_shape(self, response_data: Dict, endpoint: str) -> bool:
        """Verify error response follows standard {error, detail?} format"""
        if "error" not in response_data:
            print(f"❌ Missing 'error' field in error response from {endpoint}")
            return False
            
        if not isinstance(response_data["error"], str):
            print(f"❌ 'error' field should be a string in {endpoint} response")
            return False
        
        # detail field is optional
        if "detail" in response_data and not isinstance(response_data["detail"], str):
            print(f"❌ 'detail' field should be a string in {endpoint} response")
            return False
            
        print(f"✅ Error shape verified for {endpoint}")
        return True

    def test_freight_loads_endpoint(self):
        """Test /api/freight/loads endpoint - P2.5 normalization"""
        print("\n🚛 Testing /api/freight/loads endpoint")
        print("=" * 80)
        
        # Test 1: Default pagination behavior
        status, response = self.test_endpoint(
            "/api/freight/loads",
            method="GET",
            test_description="Default pagination - should return page=1, pageSize=50"
        )
        
        if status == 200:
            self.verify_pagination_shape(response, "/api/freight/loads")
            # Verify defaults
            if response.get("page") != 1:
                print(f"❌ Expected default page=1, got {response.get('page')}")
            if response.get("pageSize") != 50:
                print(f"❌ Expected default pageSize=50, got {response.get('pageSize')}")
        
        # Test 2: Custom pagination parameters
        status, response = self.test_endpoint(
            "/api/freight/loads",
            method="GET",
            params={"page": 1, "pageSize": 25},
            test_description="Custom pagination - page=1, pageSize=25"
        )
        
        if status == 200:
            self.verify_pagination_shape(response, "/api/freight/loads")
            if response.get("pageSize") != 25:
                print(f"❌ Expected pageSize=25, got {response.get('pageSize')}")
        
        # Test 3: Page coercion (page <= 0 should become 1)
        status, response = self.test_endpoint(
            "/api/freight/loads",
            method="GET",
            params={"page": 0, "pageSize": 50},
            test_description="Page coercion - page=0 should become page=1"
        )
        
        if status == 200:
            if response.get("page") != 1:
                print(f"❌ Expected page coercion to 1, got {response.get('page')}")
        
        # Test 4: PageSize coercion (pageSize > 200 should become 50)
        status, response = self.test_endpoint(
            "/api/freight/loads",
            method="GET",
            params={"page": 1, "pageSize": 300},
            test_description="PageSize coercion - pageSize=300 should become pageSize=50"
        )
        
        if status == 200:
            if response.get("pageSize") != 50:
                print(f"❌ Expected pageSize coercion to 50, got {response.get('pageSize')}")
        
        # Test 5: Filtering with pagination (ventureId, officeId, status, q)
        status, response = self.test_endpoint(
            "/api/freight/loads",
            method="GET",
            params={"status": "OPEN", "page": 1, "pageSize": 10},
            test_description="Filtering with pagination - status=OPEN"
        )
        
        if status == 200:
            self.verify_pagination_shape(response, "/api/freight/loads")
        
        # Test 6: Verify includes (venture, office, carrier, createdBy) are preserved
        status, response = self.test_endpoint(
            "/api/freight/loads",
            method="GET",
            params={"page": 1, "pageSize": 5},
            test_description="Verify includes are preserved in response"
        )
        
        if status == 200 and response.get("items"):
            first_item = response["items"][0]
            expected_includes = ["venture", "office", "carrier", "createdBy"]
            for include in expected_includes:
                if include not in first_item:
                    print(f"❌ Missing include '{include}' in freight loads response")
                else:
                    print(f"✅ Include '{include}' present in freight loads response")
        
        # Test 7: Method validation (should return 405 for unsupported methods)
        status, response = self.test_endpoint(
            "/api/freight/loads",
            method="PUT",
            test_description="Method validation - PUT should return 405"
        )
        
        if status == 405:
            self.verify_error_shape(response, "/api/freight/loads")
        
        # Test 8: Error response format consistency
        status, response = self.test_endpoint(
            "/api/freight/loads",
            method="DELETE",
            test_description="Error format verification - DELETE should return 405 with proper error shape"
        )
        
        if status == 405:
            self.verify_error_shape(response, "/api/freight/loads")

    def test_saas_customers_endpoint(self):
        """Test /api/saas/customers endpoint - P2.5 normalization"""
        print("\n💼 Testing /api/saas/customers endpoint")
        print("=" * 80)
        
        # Test 1: Default pagination behavior
        status, response = self.test_endpoint(
            "/api/saas/customers",
            method="GET",
            test_description="Default pagination - should return page=1, pageSize=50"
        )
        
        if status == 200:
            self.verify_pagination_shape(response, "/api/saas/customers")
            # Verify defaults
            if response.get("page") != 1:
                print(f"❌ Expected default page=1, got {response.get('page')}")
            if response.get("pageSize") != 50:
                print(f"❌ Expected default pageSize=50, got {response.get('pageSize')}")
        
        # Test 2: Custom pagination parameters
        status, response = self.test_endpoint(
            "/api/saas/customers",
            method="GET",
            params={"page": 1, "pageSize": 25},
            test_description="Custom pagination - page=1, pageSize=25"
        )
        
        if status == 200:
            self.verify_pagination_shape(response, "/api/saas/customers")
        
        # Test 3: Page coercion
        status, response = self.test_endpoint(
            "/api/saas/customers",
            method="GET",
            params={"page": -1, "pageSize": 50},
            test_description="Page coercion - page=-1 should become page=1"
        )
        
        if status == 200:
            if response.get("page") != 1:
                print(f"❌ Expected page coercion to 1, got {response.get('page')}")
        
        # Test 4: PageSize coercion
        status, response = self.test_endpoint(
            "/api/saas/customers",
            method="GET",
            params={"page": 1, "pageSize": 500},
            test_description="PageSize coercion - pageSize=500 should become pageSize=50"
        )
        
        if status == 200:
            if response.get("pageSize") != 50:
                print(f"❌ Expected pageSize coercion to 50, got {response.get('pageSize')}")
        
        # Test 5: Filtering with pagination (ventureId, q)
        status, response = self.test_endpoint(
            "/api/saas/customers",
            method="GET",
            params={"q": "test", "page": 1, "pageSize": 10},
            test_description="Filtering with pagination - q=test"
        )
        
        if status == 200:
            self.verify_pagination_shape(response, "/api/saas/customers")
        
        # Test 6: Verify SaaSCustomerWithMrr structure
        status, response = self.test_endpoint(
            "/api/saas/customers",
            method="GET",
            params={"page": 1, "pageSize": 5},
            test_description="Verify SaaSCustomerWithMrr structure"
        )
        
        if status == 200 and response.get("items"):
            first_item = response["items"][0]
            expected_fields = ["venture", "subscriptions", "totalMrr", "activeSubscriptions"]
            for field in expected_fields:
                if field not in first_item:
                    print(f"❌ Missing field '{field}' in SaaS customer response")
                else:
                    print(f"✅ Field '{field}' present in SaaS customer response")
            
            # Verify venture structure
            if "venture" in first_item and first_item["venture"]:
                venture = first_item["venture"]
                if "id" not in venture or "name" not in venture:
                    print(f"❌ Venture should have id and name fields")
                else:
                    print(f"✅ Venture structure verified")
            
            # Verify subscriptions structure
            if "subscriptions" in first_item and first_item["subscriptions"]:
                subscription = first_item["subscriptions"][0]
                expected_sub_fields = ["id", "planName", "mrr", "startedAt"]
                for field in expected_sub_fields:
                    if field not in subscription:
                        print(f"❌ Missing subscription field '{field}'")
                    else:
                        print(f"✅ Subscription field '{field}' present")
        
        # Test 7: Method validation
        status, response = self.test_endpoint(
            "/api/saas/customers",
            method="PUT",
            test_description="Method validation - PUT should return 405"
        )
        
        if status == 405:
            self.verify_error_shape(response, "/api/saas/customers")

    def test_hospitality_reviews_endpoint(self):
        """Test /api/hospitality/reviews endpoint - P2.5 normalization"""
        print("\n🏨 Testing /api/hospitality/reviews endpoint")
        print("=" * 80)
        
        # Test 1: Default pagination behavior
        status, response = self.test_endpoint(
            "/api/hospitality/reviews",
            method="GET",
            test_description="Default pagination - should return page=1, pageSize=50"
        )
        
        if status == 200:
            self.verify_pagination_shape(response, "/api/hospitality/reviews")
            # Verify defaults
            if response.get("page") != 1:
                print(f"❌ Expected default page=1, got {response.get('page')}")
            if response.get("pageSize") != 50:
                print(f"❌ Expected default pageSize=50, got {response.get('pageSize')}")
        
        # Test 2: Custom pagination parameters
        status, response = self.test_endpoint(
            "/api/hospitality/reviews",
            method="GET",
            params={"page": 1, "pageSize": 25},
            test_description="Custom pagination - page=1, pageSize=25"
        )
        
        if status == 200:
            self.verify_pagination_shape(response, "/api/hospitality/reviews")
        
        # Test 3: Page coercion
        status, response = self.test_endpoint(
            "/api/hospitality/reviews",
            method="GET",
            params={"page": 0, "pageSize": 50},
            test_description="Page coercion - page=0 should become page=1"
        )
        
        if status == 200:
            if response.get("page") != 1:
                print(f"❌ Expected page coercion to 1, got {response.get('page')}")
        
        # Test 4: PageSize coercion
        status, response = self.test_endpoint(
            "/api/hospitality/reviews",
            method="GET",
            params={"page": 1, "pageSize": 250},
            test_description="PageSize coercion - pageSize=250 should become pageSize=50"
        )
        
        if status == 200:
            if response.get("pageSize") != 50:
                print(f"❌ Expected pageSize coercion to 50, got {response.get('pageSize')}")
        
        # Test 5: Filtering with pagination (hotelId, ventureId, source, unresponded, includeTest)
        status, response = self.test_endpoint(
            "/api/hospitality/reviews",
            method="GET",
            params={"unresponded": "true", "page": 1, "pageSize": 10},
            test_description="Filtering with pagination - unresponded=true"
        )
        
        if status == 200:
            self.verify_pagination_shape(response, "/api/hospitality/reviews")
        
        # Test 6: Verify includes (hotel, respondedBy) are preserved
        status, response = self.test_endpoint(
            "/api/hospitality/reviews",
            method="GET",
            params={"page": 1, "pageSize": 5},
            test_description="Verify includes are preserved in response"
        )
        
        if status == 200 and response.get("items"):
            first_item = response["items"][0]
            expected_includes = ["hotel", "respondedBy"]
            for include in expected_includes:
                if include not in first_item:
                    print(f"❌ Missing include '{include}' in hospitality reviews response")
                else:
                    print(f"✅ Include '{include}' present in hospitality reviews response")
        
        # Test 7: Method validation
        status, response = self.test_endpoint(
            "/api/hospitality/reviews",
            method="PATCH",
            test_description="Method validation - PATCH should return 405"
        )
        
        if status == 405:
            self.verify_error_shape(response, "/api/hospitality/reviews")

    def test_error_shape_consistency(self):
        """Test error shape consistency across all three endpoints"""
        print("\n🚨 Testing Error Shape Consistency")
        print("=" * 80)
        
        endpoints = [
            "/api/freight/loads",
            "/api/saas/customers", 
            "/api/hospitality/reviews"
        ]
        
        for endpoint in endpoints:
            # Test 400 validation error (if applicable)
            # Test 403 RBAC scope violation (if applicable)
            # Test 405 wrong method with Allow header
            status, response = self.test_endpoint(
                endpoint,
                method="PATCH",
                test_description=f"405 Method validation for {endpoint}"
            )
            
            if status == 405:
                self.verify_error_shape(response, endpoint)
            
            # Test another unsupported method
            status, response = self.test_endpoint(
                endpoint,
                method="DELETE",
                test_description=f"405 Method validation (DELETE) for {endpoint}"
            )
            
            if status == 405:
                self.verify_error_shape(response, endpoint)

    def run_all_tests(self):
        """Run all P2.5 normalization tests"""
        print("🚀 Starting P2.5 Normalization Backend API Tests")
        print("=" * 80)
        
        # Test each endpoint
        self.test_freight_loads_endpoint()
        self.test_saas_customers_endpoint()
        self.test_hospitality_reviews_endpoint()
        self.test_error_shape_consistency()
        
        # Summary
        print("\n📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        successful_tests = [r for r in self.results if r['status_code'] == 200]
        expected_errors = [r for r in self.results if r['status_code'] in [401, 403, 405]]
        unexpected_errors = [r for r in self.results if r['status_code'] >= 400 and r['status_code'] not in [401, 403, 405]]
        connection_errors = [r for r in self.results if r['status_code'] == 0]
        
        print(f"Total tests: {total_tests}")
        print(f"Successful responses (200): {len(successful_tests)}")
        print(f"Expected errors (401/403/405): {len(expected_errors)}")
        print(f"Unexpected errors: {len(unexpected_errors)}")
        print(f"Connection errors: {len(connection_errors)}")
        
        if connection_errors:
            print("\n❌ CONNECTION ERRORS:")
            for result in connection_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['response'].get('error', 'Unknown error')}")
        
        if unexpected_errors:
            print("\n❌ UNEXPECTED ERRORS:")
            for result in unexpected_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['status_code']} - {result['response']}")
        
        print("\n✅ SUCCESSFUL TESTS:")
        for result in successful_tests:
            print(f"  - {result['method']} {result['endpoint']}: {result['status_code']} - {result['test_description']}")
        
        print("\n✅ EXPECTED BEHAVIORS:")
        for result in expected_errors:
            print(f"  - {result['method']} {result['endpoint']}: {result['status_code']} - {result['test_description']}")
        
        return len(connection_errors) == 0 and len(unexpected_errors) == 0

def main():
    """Main test execution"""
    tester = P25NormalizationTester()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/p2_5_normalization_test_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/p2_5_normalization_test_results.json")
    
    if success:
        print("\n🎉 All P2.5 normalization tests completed successfully!")
        return 0
    else:
        print("\n💥 Some tests failed - check the results above")
        return 1

if __name__ == "__main__":
    sys.exit(main())