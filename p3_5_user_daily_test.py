#!/usr/bin/env python3
"""
P3.5 User-Level Daily Drill-Down API and UI Testing

Testing the following as per review request:
1. Backend – GET /api/incentives/user-daily
   - Method & auth validation
   - RBAC / scope validation  
   - Input validation (userId, ventureId, date ranges)
   - Data response structure verification

2. Frontend – /admin/incentives/venture-summary (P3.5-enhanced)
   - User daily breakdown panel functionality
   - Quick range buttons integration
   - API integration verification
"""

import requests
import json
import os
import sys
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Base URL for the API - using localhost for internal testing
BASE_URL = "http://localhost:3000"

class P35UserDailyTester:
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
            print(f"   📤 Request: {json.dumps(body) if isinstance(body, dict) else str(body)}")
        print(f"   📥 Response: {json.dumps(response_data, indent=2) if isinstance(response_data, (dict, list)) else str(response_data)}")
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
            elif method == "PUT":
                response = self.session.put(url, json=body, headers=headers)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers)
            elif method == "PATCH":
                response = self.session.patch(url, json=body, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = response.text
                
            response_headers = dict(response.headers)
            self.log_result(endpoint, method, response.status_code, 
                          response_data, response_headers, body, test_description)
            
            return response.status_code, response_data, response_headers
            
        except Exception as e:
            error_data = {"error": str(e)}
            self.log_result(endpoint, method, 0, error_data, {}, body, 
                          f"{test_description} - Connection Error")
            return 0, error_data, {}

    def test_user_daily_api_method_validation(self):
        """Test method validation for /api/incentives/user-daily"""
        print("\n🔍 Testing Method Validation for /api/incentives/user-daily")
        
        # Test non-GET methods should return 405 with Allow: GET
        methods_to_test = ["POST", "PUT", "DELETE", "PATCH"]
        
        for method in methods_to_test:
            status, response, headers = self.test_endpoint(
                "/api/incentives/user-daily?userId=1&ventureId=1",
                method=method,
                test_description=f"Non-GET method {method} should return 405 with Allow: GET"
            )
            
            # Verify 405 status and Allow header
            if status == 405:
                allow_header = headers.get('Allow', headers.get('allow', ''))
                if 'GET' in allow_header:
                    print(f"   ✅ {method} correctly returns 405 with Allow: GET")
                else:
                    print(f"   ⚠️ {method} returns 405 but missing Allow: GET header")
            else:
                print(f"   ❌ {method} should return 405, got {status}")

    def test_user_daily_api_authentication(self):
        """Test authentication for /api/incentives/user-daily"""
        print("\n🔍 Testing Authentication for /api/incentives/user-daily")
        
        # In development mode, this should auto-authenticate as CEO
        # Test with valid parameters
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?userId=1&ventureId=1",
            method="GET",
            test_description="Authenticated request (dev mode auto-auth as CEO)"
        )
        
        if status == 200:
            print("   ✅ Development mode auto-authentication working")
        elif status == 401:
            print("   ⚠️ Got 401 - may need authentication setup")
        else:
            print(f"   ❌ Unexpected status {status} for authenticated request")

    def test_user_daily_api_validation(self):
        """Test input validation for /api/incentives/user-daily"""
        print("\n🔍 Testing Input Validation for /api/incentives/user-daily")
        
        # Test missing userId
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?ventureId=1",
            method="GET",
            test_description="Missing userId should return 400"
        )
        
        # Test missing ventureId
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?userId=1",
            method="GET", 
            test_description="Missing ventureId should return 400"
        )
        
        # Test non-numeric userId
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?userId=abc&ventureId=1",
            method="GET",
            test_description="Non-numeric userId should return 400"
        )
        
        # Test non-numeric ventureId
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?userId=1&ventureId=abc",
            method="GET",
            test_description="Non-numeric ventureId should return 400"
        )
        
        # Test zero/negative userId
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?userId=0&ventureId=1",
            method="GET",
            test_description="Zero userId should return 400"
        )
        
        # Test zero/negative ventureId
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?userId=1&ventureId=-1",
            method="GET",
            test_description="Negative ventureId should return 400"
        )

    def test_user_daily_api_date_validation(self):
        """Test date range validation for /api/incentives/user-daily"""
        print("\n🔍 Testing Date Range Validation for /api/incentives/user-daily")
        
        # Test date range > 90 days
        from_date = "2024-01-01"
        to_date = "2024-12-31"  # More than 90 days
        status, response, headers = self.test_endpoint(
            f"/api/incentives/user-daily?userId=1&ventureId=1&from={from_date}&to={to_date}",
            method="GET",
            test_description="Date range > 90 days should return 400"
        )
        
        if status == 400 and isinstance(response, dict):
            if "Date range too large" in response.get("error", ""):
                print("   ✅ Date range validation working correctly")
            else:
                print(f"   ⚠️ Got 400 but unexpected error message: {response.get('error')}")
        
        # Test invalid date strings
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?userId=1&ventureId=1&from=invalid-date&to=2024-12-07",
            method="GET",
            test_description="Invalid date strings (design choice: may fall back to defaults)"
        )

    def test_user_daily_api_rbac(self):
        """Test RBAC for /api/incentives/user-daily"""
        print("\n🔍 Testing RBAC for /api/incentives/user-daily")
        
        # Test with valid ventureId that CEO should have access to
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?userId=1&ventureId=1",
            method="GET",
            test_description="CEO/ADMIN should have access to valid ventureId/userId pairs"
        )
        
        if status == 200:
            print("   ✅ CEO/ADMIN access working correctly")
        elif status == 403:
            print("   ⚠️ Got 403 - may be scoped user access restriction")
        else:
            print(f"   ❌ Unexpected status {status} for RBAC test")

    def test_user_daily_api_data_structure(self):
        """Test data structure for /api/incentives/user-daily"""
        print("\n🔍 Testing Data Structure for /api/incentives/user-daily")
        
        # Test with valid parameters
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-daily?userId=1&ventureId=1",
            method="GET",
            test_description="Valid request should return proper data structure"
        )
        
        if status == 200 and isinstance(response, dict):
            # Check required fields
            required_fields = ["userId", "ventureId", "from", "to", "items", "totalAmount"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                print("   ✅ All required fields present in response")
                
                # Check items structure
                items = response.get("items", [])
                if isinstance(items, list):
                    print(f"   ✅ Items is array with {len(items)} entries")
                    
                    if items:
                        # Check first item structure
                        first_item = items[0]
                        item_fields = ["date", "amount", "note"]
                        item_missing = [field for field in item_fields if field not in first_item]
                        
                        if not item_missing:
                            print("   ✅ Item structure correct (date, amount, note)")
                        else:
                            print(f"   ❌ Missing item fields: {item_missing}")
                    
                    # Verify totalAmount calculation
                    calculated_total = sum(item.get("amount", 0) for item in items)
                    api_total = response.get("totalAmount", 0)
                    
                    if abs(calculated_total - api_total) < 0.01:  # Allow for floating point precision
                        print(f"   ✅ Total amount calculation correct: {api_total}")
                    else:
                        print(f"   ❌ Total amount mismatch: calculated {calculated_total}, API returned {api_total}")
                        
                else:
                    print("   ❌ Items field is not an array")
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
        else:
            print(f"   ❌ Expected 200 with JSON response, got {status}")

    def test_frontend_venture_summary_page(self):
        """Test frontend venture summary page with P3.5 enhancements"""
        print("\n🔍 Testing Frontend /admin/incentives/venture-summary Page")
        
        # Test page accessibility
        status, response, headers = self.test_endpoint(
            "/admin/incentives/venture-summary",
            method="GET",
            test_description="Page should load successfully"
        )
        
        if status == 200:
            print("   ✅ Page loads successfully")
            
            # Check for key UI elements in the HTML response
            if isinstance(response, str):
                ui_elements = [
                    "Venture Incentive Summary",
                    "User daily breakdown", 
                    "Last 7 days",
                    "Last 30 days",
                    "Full window",
                    "Select venture",
                    "View summary"
                ]
                
                found_elements = []
                for element in ui_elements:
                    if element in response:
                        found_elements.append(element)
                
                print(f"   ✅ Found {len(found_elements)}/{len(ui_elements)} expected UI elements")
                
                if len(found_elements) >= len(ui_elements) * 0.7:  # At least 70% of elements
                    print("   ✅ Page contains expected P3.5 UI components")
                else:
                    print("   ⚠️ Some expected UI elements may be missing")
            else:
                print("   ⚠️ Response is not HTML string")
        else:
            print(f"   ❌ Page failed to load: {status}")

    def test_ventures_api_integration(self):
        """Test /api/ventures endpoint for dropdown population"""
        print("\n🔍 Testing /api/ventures Integration")
        
        status, response, headers = self.test_endpoint(
            "/api/ventures",
            method="GET",
            test_description="Ventures API should return list for dropdown"
        )
        
        if status == 200 and isinstance(response, list):
            print(f"   ✅ Ventures API returns {len(response)} ventures")
            
            if response:
                # Check venture structure
                first_venture = response[0]
                if "id" in first_venture and "name" in first_venture:
                    print("   ✅ Venture objects have required id and name fields")
                else:
                    print("   ❌ Venture objects missing required fields")
        else:
            print(f"   ❌ Expected 200 with array, got {status}")

    def run_all_tests(self):
        """Run all P3.5 user daily drill-down tests"""
        print("🚀 Starting P3.5 User-Level Daily Drill-Down API and UI Testing")
        print("=" * 80)
        
        # Backend API Tests
        self.test_user_daily_api_method_validation()
        self.test_user_daily_api_authentication()
        self.test_user_daily_api_validation()
        self.test_user_daily_api_date_validation()
        self.test_user_daily_api_rbac()
        self.test_user_daily_api_data_structure()
        
        # Frontend Integration Tests
        self.test_frontend_venture_summary_page()
        self.test_ventures_api_integration()
        
        # Summary
        print("\n📊 Test Summary")
        print("=" * 80)
        
        total_tests = len(self.results)
        successful_tests = len([r for r in self.results if r["status_code"] < 400])
        failed_tests = total_tests - successful_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Successful: {successful_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(successful_tests/total_tests)*100:.1f}%")
        
        # Save results to file
        with open("/app/p3_5_user_daily_test_results.json", "w") as f:
            json.dump({
                "summary": {
                    "total_tests": total_tests,
                    "successful_tests": successful_tests,
                    "failed_tests": failed_tests,
                    "success_rate": f"{(successful_tests/total_tests)*100:.1f}%"
                },
                "results": self.results
            }, f, indent=2)
        
        print(f"\n💾 Detailed results saved to /app/p3_5_user_daily_test_results.json")
        
        return successful_tests, failed_tests

if __name__ == "__main__":
    tester = P35UserDailyTester()
    successful, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)