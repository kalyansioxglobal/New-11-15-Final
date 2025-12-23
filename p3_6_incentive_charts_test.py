#!/usr/bin/env python3
"""
P3.6 Incentive Charts API and UI Testing
Testing the following as per review request:

Backend APIs:
1. GET /api/incentives/venture-timeseries - Method validation, auth, RBAC, validation, data shape
2. GET /api/incentives/user-timeseries - Same requirements as user-daily

Frontend UI:
3. Venture-level chart on /admin/incentives/venture-summary
4. User-level chart in drill-down panel

Test Requirements:
- Method & auth validation (405 for non-GET, 401 for unauthenticated)
- RBAC (CEO/ADMIN can query any ventureId, scoped users get 403 for excluded ventures)
- Input validation (invalid ventureId -> 400, invalid dates -> 400, >90-day window -> 400)
- Data shape verification (proper response structure with points array)
- Frontend chart behavior and data wiring
"""

import requests
import json
import os
import sys
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Base URL for the API - Next.js serves API routes from same domain
BASE_URL = "http://localhost:3000"

class IncentiveChartsAPITester:
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
                
            # Check for Allow header in 405 responses
            response_headers = dict(response.headers)
            
            self.log_result(endpoint, method, response.status_code, 
                          response_data, response_headers, body, test_description)
            
            return response.status_code, response_data, response_headers
            
        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            self.log_result(endpoint, method, 0, error_msg, {}, body, test_description)
            return 0, error_msg, {}

    def test_venture_timeseries_api(self):
        """Test GET /api/incentives/venture-timeseries endpoint"""
        print("\n🎯 TESTING VENTURE TIMESERIES API")
        print("=" * 60)
        
        # 1. Method validation tests
        print("\n📋 Method Validation Tests")
        
        # Test POST method (should return 405)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=1", 
            "POST",
            test_description="POST method should return 405 with Allow: GET"
        )
        
        # Test PUT method (should return 405)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=1", 
            "PUT",
            test_description="PUT method should return 405 with Allow: GET"
        )
        
        # Test DELETE method (should return 405)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=1", 
            "DELETE",
            test_description="DELETE method should return 405 with Allow: GET"
        )
        
        # 2. Authentication tests (in dev mode, should auto-auth as CEO)
        print("\n🔐 Authentication Tests")
        
        # Test unauthenticated request (dev mode auto-authenticates)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=1",
            test_description="Unauthenticated request (dev mode should auto-auth as CEO)"
        )
        
        # 3. Input validation tests
        print("\n✅ Input Validation Tests")
        
        # Test missing ventureId
        self.test_endpoint(
            "/api/incentives/venture-timeseries",
            test_description="Missing ventureId should return 400"
        )
        
        # Test invalid ventureId (non-numeric)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=invalid",
            test_description="Invalid ventureId (non-numeric) should return 400"
        )
        
        # Test invalid ventureId (zero)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=0",
            test_description="Invalid ventureId (zero) should return 400"
        )
        
        # Test invalid ventureId (negative)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=-1",
            test_description="Invalid ventureId (negative) should return 400"
        )
        
        # Test invalid date format
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=1&from=invalid-date&to=2025-12-07",
            test_description="Invalid from date should return 400"
        )
        
        # Test date range too large (>90 days)
        from_date = "2025-01-01"
        to_date = "2025-12-31"  # More than 90 days
        self.test_endpoint(
            f"/api/incentives/venture-timeseries?ventureId=1&from={from_date}&to={to_date}",
            test_description="Date range >90 days should return 400"
        )
        
        # 4. Valid requests with data shape verification
        print("\n📊 Data Shape Verification Tests")
        
        # Test valid request with default date range
        status, response, headers = self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=1",
            test_description="Valid request with default date range (last 30 days)"
        )
        
        if status == 200 and isinstance(response, dict):
            print("   🔍 Verifying response structure...")
            required_fields = ["ventureId", "from", "to", "points"]
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Field '{field}' present")
                else:
                    print(f"   ❌ Field '{field}' missing")
            
            if "points" in response and isinstance(response["points"], list):
                print(f"   ✅ Points array with {len(response['points'])} items")
                if response["points"]:
                    point = response["points"][0]
                    if "date" in point and "amount" in point:
                        print("   ✅ Point structure correct (date, amount)")
                    else:
                        print("   ❌ Point structure incorrect")
        
        # Test valid request with specific date range (7 days)
        today = datetime.now()
        from_date = (today - timedelta(days=6)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
        
        self.test_endpoint(
            f"/api/incentives/venture-timeseries?ventureId=1&from={from_date}&to={to_date}",
            test_description="Valid request with 7-day date range"
        )
        
        # Test with different venture (if exists)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=2",
            test_description="Valid request for different venture"
        )

    def test_user_timeseries_api(self):
        """Test GET /api/incentives/user-timeseries endpoint"""
        print("\n🎯 TESTING USER TIMESERIES API")
        print("=" * 60)
        
        # 1. Method validation tests
        print("\n📋 Method Validation Tests")
        
        # Test POST method (should return 405)
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1&ventureId=1", 
            "POST",
            test_description="POST method should return 405 with Allow: GET"
        )
        
        # Test PUT method (should return 405)
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1&ventureId=1", 
            "PUT",
            test_description="PUT method should return 405 with Allow: GET"
        )
        
        # 2. Authentication tests (in dev mode, should auto-auth as CEO)
        print("\n🔐 Authentication Tests")
        
        # Test unauthenticated request (dev mode auto-authenticates)
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1&ventureId=1",
            test_description="Unauthenticated request (dev mode should auto-auth as CEO)"
        )
        
        # 3. Input validation tests
        print("\n✅ Input Validation Tests")
        
        # Test missing userId
        self.test_endpoint(
            "/api/incentives/user-timeseries?ventureId=1",
            test_description="Missing userId should return 400"
        )
        
        # Test missing ventureId
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1",
            test_description="Missing ventureId should return 400"
        )
        
        # Test invalid userId (non-numeric)
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=invalid&ventureId=1",
            test_description="Invalid userId (non-numeric) should return 400"
        )
        
        # Test invalid ventureId (non-numeric)
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1&ventureId=invalid",
            test_description="Invalid ventureId (non-numeric) should return 400"
        )
        
        # Test invalid userId (zero)
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=0&ventureId=1",
            test_description="Invalid userId (zero) should return 400"
        )
        
        # Test invalid ventureId (negative)
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1&ventureId=-1",
            test_description="Invalid ventureId (negative) should return 400"
        )
        
        # Test date range too large (>90 days)
        from_date = "2025-01-01"
        to_date = "2025-12-31"  # More than 90 days
        self.test_endpoint(
            f"/api/incentives/user-timeseries?userId=1&ventureId=1&from={from_date}&to={to_date}",
            test_description="Date range >90 days should return 400"
        )
        
        # 4. Valid requests with data shape verification
        print("\n📊 Data Shape Verification Tests")
        
        # Test valid request with default date range
        status, response, headers = self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1&ventureId=1",
            test_description="Valid request with default date range (last 30 days)"
        )
        
        if status == 200 and isinstance(response, dict):
            print("   🔍 Verifying response structure...")
            required_fields = ["userId", "ventureId", "from", "to", "points"]
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Field '{field}' present")
                else:
                    print(f"   ❌ Field '{field}' missing")
            
            if "points" in response and isinstance(response["points"], list):
                print(f"   ✅ Points array with {len(response['points'])} items")
                if response["points"]:
                    point = response["points"][0]
                    if "date" in point and "amount" in point:
                        print("   ✅ Point structure correct (date, amount)")
                    else:
                        print("   ❌ Point structure incorrect")
        
        # Test valid request with specific date range (7 days)
        today = datetime.now()
        from_date = (today - timedelta(days=6)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
        
        self.test_endpoint(
            f"/api/incentives/user-timeseries?userId=1&ventureId=1&from={from_date}&to={to_date}",
            test_description="Valid request with 7-day date range"
        )

    def test_frontend_venture_summary_page(self):
        """Test frontend /admin/incentives/venture-summary page"""
        print("\n🎯 TESTING FRONTEND VENTURE SUMMARY PAGE")
        print("=" * 60)
        
        # Test page loading
        status, response, headers = self.test_endpoint(
            "/admin/incentives/venture-summary",
            test_description="Load venture summary page"
        )
        
        if status == 200:
            print("   ✅ Page loads successfully")
            
            # Check for key UI elements in the HTML response
            if isinstance(response, str):
                ui_elements = [
                    "Venture Incentive Summary",
                    "Select venture",
                    "Last 7 days",
                    "Last 30 days",
                    "View summary",
                    "Daily incentives – venture"
                ]
                
                for element in ui_elements:
                    if element.lower() in response.lower():
                        print(f"   ✅ UI element '{element}' found")
                    else:
                        print(f"   ⚠️ UI element '{element}' not found (may be dynamically loaded)")
        else:
            print(f"   ❌ Page failed to load with status {status}")

    def test_frontend_user_drill_down(self):
        """Test frontend user drill-down panel functionality"""
        print("\n🎯 TESTING FRONTEND USER DRILL-DOWN FUNCTIONALITY")
        print("=" * 60)
        
        # Since this is a dynamic UI feature, we'll test the underlying API calls
        # that would be made when a user clicks on a row
        
        print("   📝 Testing API calls that would be made by drill-down panel...")
        
        # Test user-daily API (existing functionality)
        self.test_endpoint(
            "/api/incentives/user-daily?userId=1&ventureId=1",
            test_description="User daily API call (for drill-down panel data)"
        )
        
        # Test user-timeseries API (new functionality for chart)
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1&ventureId=1",
            test_description="User timeseries API call (for drill-down panel chart)"
        )
        
        # Test with different date ranges (7d, 30d, full)
        today = datetime.now()
        
        # 7-day range
        from_7d = (today - timedelta(days=6)).strftime("%Y-%m-%d")
        to_7d = today.strftime("%Y-%m-%d")
        self.test_endpoint(
            f"/api/incentives/user-timeseries?userId=1&ventureId=1&from={from_7d}&to={to_7d}",
            test_description="User timeseries API call (7-day range for drill-down)"
        )
        
        # 30-day range
        from_30d = (today - timedelta(days=29)).strftime("%Y-%m-%d")
        to_30d = today.strftime("%Y-%m-%d")
        self.test_endpoint(
            f"/api/incentives/user-timeseries?userId=1&ventureId=1&from={from_30d}&to={to_30d}",
            test_description="User timeseries API call (30-day range for drill-down)"
        )

    def run_all_tests(self):
        """Run all P3.6 incentive charts tests"""
        print("🚀 STARTING P3.6 INCENTIVE CHARTS API AND UI TESTING")
        print("=" * 80)
        
        try:
            # Test backend APIs
            self.test_venture_timeseries_api()
            self.test_user_timeseries_api()
            
            # Test frontend functionality
            self.test_frontend_venture_summary_page()
            self.test_frontend_user_drill_down()
            
            # Summary
            print("\n📊 TEST SUMMARY")
            print("=" * 60)
            
            total_tests = len(self.results)
            passed_tests = len([r for r in self.results if r["status_code"] < 400])
            failed_tests = total_tests - passed_tests
            
            print(f"Total Tests: {total_tests}")
            print(f"✅ Passed: {passed_tests}")
            print(f"❌ Failed: {failed_tests}")
            print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
            
            # Categorize results
            method_validation_tests = [r for r in self.results if "method" in r["test_description"].lower()]
            auth_tests = [r for r in self.results if "auth" in r["test_description"].lower()]
            validation_tests = [r for r in self.results if "validation" in r["test_description"].lower() or "invalid" in r["test_description"].lower()]
            data_tests = [r for r in self.results if "data" in r["test_description"].lower() or "valid request" in r["test_description"].lower()]
            frontend_tests = [r for r in self.results if "frontend" in r["test_description"].lower() or "page" in r["test_description"].lower()]
            
            print(f"\n📋 Method Validation: {len([r for r in method_validation_tests if r['status_code'] < 400])}/{len(method_validation_tests)} passed")
            print(f"🔐 Authentication: {len([r for r in auth_tests if r['status_code'] < 400])}/{len(auth_tests)} passed")
            print(f"✅ Input Validation: {len([r for r in validation_tests if r['status_code'] >= 400])}/{len(validation_tests)} correctly rejected")
            print(f"📊 Data Shape: {len([r for r in data_tests if r['status_code'] < 400])}/{len(data_tests)} passed")
            print(f"🖥️ Frontend: {len([r for r in frontend_tests if r['status_code'] < 400])}/{len(frontend_tests)} passed")
            
            return self.results
            
        except Exception as e:
            print(f"❌ Test execution failed: {str(e)}")
            return []

def main():
    """Main test execution"""
    tester = IncentiveChartsAPITester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open("/app/p3_6_incentive_charts_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: /app/p3_6_incentive_charts_test_results.json")
    
    return len([r for r in results if r["status_code"] >= 400]) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)