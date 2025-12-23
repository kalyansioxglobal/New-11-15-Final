#!/usr/bin/env python3
"""
BPO KPI and Logistics Customers API Testing
Testing the following endpoints as per review request:
1. /api/bpo/kpi (BPO KPI contract fix)
2. /api/logistics/customers (pagination implementation)
"""

import requests
import json
import sys
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Base URL for the API - using localhost as per system setup
BASE_URL = "http://localhost:3000"

class BpoKpiLogisticsCustomersTest:
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
        if body:
            print(f"   📤 Request: {json.dumps(body, indent=2)}")
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
                          response_data, headers, body, test_description)
            
            return response.status_code, response_data
            
        except Exception as e:
            error_data = {"error": str(e)}
            self.log_result(endpoint, method, 0, error_data, headers, body, 
                          f"Connection error: {test_description}")
            return 0, error_data

    def test_bpo_kpi_endpoint(self):
        """Test /api/bpo/kpi endpoint according to review request"""
        print("\n🎯 Testing /api/bpo/kpi endpoint (BPO KPI contract fix)")
        print("=" * 80)
        
        # Test 1: Method validation - should reject non-GET methods with 405
        print("\n📋 Testing Method Validation")
        self.test_endpoint(
            "/api/bpo/kpi",
            method="POST",
            test_description="POST method - should return 405 Method Not Allowed"
        )
        
        self.test_endpoint(
            "/api/bpo/kpi",
            method="PUT",
            test_description="PUT method - should return 405 Method Not Allowed"
        )
        
        self.test_endpoint(
            "/api/bpo/kpi",
            method="DELETE",
            test_description="DELETE method - should return 405 Method Not Allowed"
        )
        
        # Test 2: Authentication - should require auth (401 when unauthenticated)
        print("\n🔐 Testing Authentication")
        self.test_endpoint(
            "/api/bpo/kpi",
            method="GET",
            test_description="Unauthenticated GET - should return 401 (or work in dev mode)"
        )
        
        # Test 3: Date range validation - should reject ranges > 90 days with 400
        print("\n📅 Testing Date Range Validation")
        today = datetime.now()
        past_date = today - timedelta(days=100)  # More than 90 days
        
        params = {
            "from": past_date.strftime("%Y-%m-%d"),
            "to": today.strftime("%Y-%m-%d")
        }
        
        self.test_endpoint(
            "/api/bpo/kpi",
            method="GET",
            params=params,
            test_description="Date range > 90 days - should return 400 with proper error"
        )
        
        # Test 4: Valid date range - should work
        print("\n✅ Testing Valid Date Range")
        valid_from = today - timedelta(days=30)  # Within 90 days
        
        params = {
            "from": valid_from.strftime("%Y-%m-%d"),
            "to": today.strftime("%Y-%m-%d")
        }
        
        self.test_endpoint(
            "/api/bpo/kpi",
            method="GET",
            params=params,
            test_description="Valid 30-day range - should return 200 with proper JSON structure"
        )
        
        # Test 5: Default behavior (no from/to params)
        print("\n🔄 Testing Default Behavior")
        self.test_endpoint(
            "/api/bpo/kpi",
            method="GET",
            test_description="No date params - should use default range and return proper structure"
        )
        
        # Test 6: Query parameters - test ventureId, officeId, campaignId, agentId
        print("\n🔍 Testing Query Parameters")
        params = {
            "ventureId": "1",
            "officeId": "1",
            "campaignId": "1",
            "agentId": "1"
        }
        
        self.test_endpoint(
            "/api/bpo/kpi",
            method="GET",
            params=params,
            test_description="With query parameters - should scope results accordingly"
        )

    def test_logistics_customers_endpoint(self):
        """Test /api/logistics/customers endpoint according to review request"""
        print("\n📦 Testing /api/logistics/customers endpoint (pagination implementation)")
        print("=" * 80)
        
        # Test 1: Method validation
        print("\n📋 Testing Method Validation")
        self.test_endpoint(
            "/api/logistics/customers",
            method="PUT",
            test_description="PUT method - should return 405 Method Not Allowed"
        )
        
        self.test_endpoint(
            "/api/logistics/customers",
            method="DELETE",
            test_description="DELETE method - should return 405 Method Not Allowed"
        )
        
        # Test 2: Default pagination behavior
        print("\n📄 Testing Default Pagination")
        self.test_endpoint(
            "/api/logistics/customers",
            method="GET",
            test_description="Default pagination - should return page=1, pageSize=50"
        )
        
        # Test 3: Custom pagination parameters
        print("\n🔢 Testing Custom Pagination Parameters")
        params = {
            "page": "2",
            "pageSize": "25"
        }
        
        self.test_endpoint(
            "/api/logistics/customers",
            method="GET",
            params=params,
            test_description="Custom pagination - page=2, pageSize=25"
        )
        
        # Test 4: Page normalization (page <= 0 should normalize to 1)
        print("\n🔧 Testing Page Normalization")
        params = {
            "page": "0",
            "pageSize": "25"
        }
        
        self.test_endpoint(
            "/api/logistics/customers",
            method="GET",
            params=params,
            test_description="Page <= 0 - should normalize to page=1"
        )
        
        params = {
            "page": "-5",
            "pageSize": "25"
        }
        
        self.test_endpoint(
            "/api/logistics/customers",
            method="GET",
            params=params,
            test_description="Negative page - should normalize to page=1"
        )
        
        # Test 5: PageSize normalization (pageSize <= 0 or > 200 should normalize to 50)
        print("\n📏 Testing PageSize Normalization")
        params = {
            "page": "1",
            "pageSize": "0"
        }
        
        self.test_endpoint(
            "/api/logistics/customers",
            method="GET",
            params=params,
            test_description="PageSize <= 0 - should normalize to pageSize=50"
        )
        
        params = {
            "page": "1",
            "pageSize": "500"
        }
        
        self.test_endpoint(
            "/api/logistics/customers",
            method="GET",
            params=params,
            test_description="PageSize > 200 - should normalize to pageSize=50"
        )
        
        # Test 6: Large pageSize (should be capped at 200)
        params = {
            "page": "1",
            "pageSize": "300"
        }
        
        self.test_endpoint(
            "/api/logistics/customers",
            method="GET",
            params=params,
            test_description="PageSize > 200 - should be capped/normalized"
        )

    def validate_bpo_kpi_response_structure(self, response_data: Dict) -> bool:
        """Validate BPO KPI response structure matches expected contract"""
        required_fields = ["from", "to", "agents", "totals"]
        
        for field in required_fields:
            if field not in response_data:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Validate agents array structure
        if isinstance(response_data.get("agents"), list):
            for agent in response_data["agents"]:
                agent_fields = ["agentId", "agentName", "campaignName", "totalDials", 
                              "totalConnects", "totalTalkSeconds", "totalAppointments", 
                              "totalDeals", "totalRevenue"]
                for field in agent_fields:
                    if field not in agent:
                        print(f"❌ Missing agent field: {field}")
                        return False
        
        # Validate totals structure
        totals = response_data.get("totals", {})
        totals_fields = ["totalDials", "totalConnects", "totalTalkSeconds", 
                        "totalAppointments", "totalDeals", "totalRevenue"]
        for field in totals_fields:
            if field not in totals:
                print(f"❌ Missing totals field: {field}")
                return False
        
        print("✅ BPO KPI response structure is valid")
        return True

    def validate_logistics_customers_response_structure(self, response_data: Dict) -> bool:
        """Validate Logistics Customers response structure matches expected pagination contract"""
        required_fields = ["items", "page", "pageSize", "total", "totalPages"]
        
        for field in required_fields:
            if field not in response_data:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Validate that items is an array
        if not isinstance(response_data.get("items"), list):
            print("❌ 'items' should be an array")
            return False
        
        # Validate numeric fields
        numeric_fields = ["page", "pageSize", "total", "totalPages"]
        for field in numeric_fields:
            if not isinstance(response_data.get(field), (int, float)):
                print(f"❌ '{field}' should be numeric")
                return False
        
        print("✅ Logistics Customers response structure is valid")
        return True

    def run_all_tests(self):
        """Run all endpoint tests"""
        print("🚀 Starting BPO KPI and Logistics Customers Testing")
        print("=" * 80)
        
        # Test BPO KPI endpoint
        self.test_bpo_kpi_endpoint()
        
        # Test Logistics Customers endpoint
        self.test_logistics_customers_endpoint()
        
        # Analyze results
        print("\n📊 TEST ANALYSIS")
        print("=" * 80)
        
        # Analyze BPO KPI results
        bpo_kpi_results = [r for r in self.results if "/api/bpo/kpi" in r["endpoint"]]
        successful_bpo_responses = [r for r in bpo_kpi_results if r["status_code"] == 200]
        
        print(f"\n🎯 BPO KPI Endpoint Analysis:")
        print(f"   Total tests: {len(bpo_kpi_results)}")
        print(f"   Successful responses (200): {len(successful_bpo_responses)}")
        
        for response in successful_bpo_responses:
            if isinstance(response["response"], dict):
                is_valid = self.validate_bpo_kpi_response_structure(response["response"])
                print(f"   Response structure valid: {'✅' if is_valid else '❌'}")
        
        # Analyze Logistics Customers results
        customers_results = [r for r in self.results if "/api/logistics/customers" in r["endpoint"]]
        successful_customers_responses = [r for r in customers_results if r["status_code"] == 200]
        
        print(f"\n📦 Logistics Customers Endpoint Analysis:")
        print(f"   Total tests: {len(customers_results)}")
        print(f"   Successful responses (200): {len(successful_customers_responses)}")
        
        for response in successful_customers_responses:
            if isinstance(response["response"], dict):
                is_valid = self.validate_logistics_customers_response_structure(response["response"])
                print(f"   Response structure valid: {'✅' if is_valid else '❌'}")
        
        # Summary
        print("\n📋 SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        connection_errors = [r for r in self.results if r['status_code'] == 0]
        successful_tests = [r for r in self.results if 200 <= r['status_code'] < 300]
        validation_errors = [r for r in self.results if r['status_code'] == 400]
        auth_errors = [r for r in self.results if r['status_code'] == 401]
        forbidden_errors = [r for r in self.results if r['status_code'] == 403]
        method_errors = [r for r in self.results if r['status_code'] == 405]
        server_errors = [r for r in self.results if r['status_code'] >= 500]
        
        print(f"Total tests: {total_tests}")
        print(f"✅ Successful (200-299): {len(successful_tests)}")
        print(f"🔒 Auth errors (401): {len(auth_errors)}")
        print(f"🚫 Forbidden (403): {len(forbidden_errors)}")
        print(f"❌ Validation errors (400): {len(validation_errors)}")
        print(f"🚫 Method errors (405): {len(method_errors)}")
        print(f"💥 Server errors (500+): {len(server_errors)}")
        print(f"🔌 Connection errors: {len(connection_errors)}")
        
        if connection_errors:
            print("\n❌ CONNECTION ERRORS:")
            for result in connection_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['response'].get('error', 'Unknown error')}")
        
        if server_errors:
            print("\n💥 SERVER ERRORS:")
            for result in server_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['status_code']} - {result.get('response', {}).get('error', 'Unknown error')}")
        
        return len(connection_errors) == 0 and len(server_errors) == 0

def main():
    """Main test execution"""
    tester = BpoKpiLogisticsCustomersTest()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/bpo_kpi_logistics_customers_test_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/bpo_kpi_logistics_customers_test_results.json")
    
    if success:
        print("\n🎉 All tests completed successfully!")
        return 0
    else:
        print("\n💥 Some tests failed - check the results above")
        return 1

if __name__ == "__main__":
    sys.exit(main())