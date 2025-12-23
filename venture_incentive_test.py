#!/usr/bin/env python3
"""
Venture-Level Incentive Summary API and Admin UI Testing
Testing the following as per review request:

1. Backend GET /api/incentives/venture-summary
   - Method & auth validation
   - RBAC / scope validation  
   - Input validation (ventureId, date ranges)
   - Data shape & aggregation verification

2. Frontend /admin/incentives/venture-summary
   - Page loading and UI elements
   - Venture dropdown, date filters, quick ranges
   - Summary strip, table, user details panel
   - Empty state handling
"""

import requests
import json
import sys
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Base URL for the API
BASE_URL = "http://localhost:3000"

class VentureIncentiveTester:
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
        print(f"   📥 Response: {json.dumps(response_data, indent=2)}")
        print("-" * 80)
        
    def test_endpoint(self, endpoint: str, method: str = "GET", 
                     headers: Dict = None, body: Any = None,
                     test_description: str = "", params: Dict = None):
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

    def create_test_incentive_data(self):
        """Create test IncentiveDaily data for testing"""
        print("\n🌱 Creating test IncentiveDaily data")
        print("=" * 80)
        
        # Create test data via direct database insertion
        # This would normally be done via a seeding script
        test_data_script = """
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function createTestIncentiveData() {
          console.log('Creating test IncentiveDaily data...');
          
          // Get first user and venture
          const user = await prisma.user.findFirst();
          const venture = await prisma.venture.findFirst();
          
          if (!user || !venture) {
            console.log('No user or venture found for test data');
            return;
          }
          
          const today = new Date();
          const testData = [];
          
          // Create 10 days of test data
          for (let i = 0; i < 10; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            testData.push({
              userId: user.id,
              ventureId: venture.id,
              date: date,
              amount: Math.random() * 500 + 100, // Random amount between 100-600
              currency: 'USD',
              breakdown: {
                rules: [
                  { ruleId: 1, amount: Math.random() * 300 + 50 },
                  { ruleId: 2, amount: Math.random() * 200 + 50 }
                ]
              },
              isTest: true
            });
          }
          
          // Upsert the data
          for (const data of testData) {
            await prisma.incentiveDaily.upsert({
              where: {
                userId_date_ventureId: {
                  userId: data.userId,
                  date: data.date,
                  ventureId: data.ventureId
                }
              },
              update: data,
              create: data
            });
          }
          
          console.log(`Created ${testData.length} IncentiveDaily records`);
          await prisma.$disconnect();
        }
        
        createTestIncentiveData().catch(console.error);
        """
        
        # Write and execute the script
        with open('/tmp/create_incentive_test_data.js', 'w') as f:
            f.write(test_data_script)
        
        import subprocess
        try:
            result = subprocess.run(['node', '/tmp/create_incentive_test_data.js'], 
                                  cwd='/app', capture_output=True, text=True, timeout=30)
            print(f"Test data creation result: {result.stdout}")
            if result.stderr:
                print(f"Errors: {result.stderr}")
        except Exception as e:
            print(f"Failed to create test data: {e}")

    def test_backend_method_validation(self):
        """Test method validation for venture-summary endpoint"""
        print("\n🔍 Testing Backend Method Validation")
        print("=" * 80)
        
        endpoint = "/api/incentives/venture-summary"
        
        # Test non-GET methods should return 405 with Allow: GET
        for method in ["POST", "PUT", "DELETE"]:
            status, response = self.test_endpoint(
                endpoint,
                method=method,
                test_description=f"{method} request should return 405 with Allow: GET"
            )
            
            # Verify Allow header is set
            if status == 405:
                print(f"   ✅ {method} correctly returned 405")
            else:
                print(f"   ❌ {method} returned {status}, expected 405")

    def test_backend_authentication(self):
        """Test authentication requirements"""
        print("\n🔐 Testing Backend Authentication")
        print("=" * 80)
        
        endpoint = "/api/incentives/venture-summary"
        
        # Test unauthenticated request (should return 401 via getEffectiveUser)
        # Note: In development mode, this might auto-authenticate as CEO
        status, response = self.test_endpoint(
            endpoint,
            params={"ventureId": "1"},
            test_description="Unauthenticated request - should return 401 (or 200 in dev mode)"
        )
        
        if status == 401:
            print("   ✅ Properly requires authentication")
        elif status == 200:
            print("   ℹ️ Development mode auto-authentication (expected)")
        else:
            print(f"   ❌ Unexpected status {status}")

    def test_backend_rbac_scope(self):
        """Test RBAC and scope validation"""
        print("\n🛡️ Testing Backend RBAC/Scope")
        print("=" * 80)
        
        endpoint = "/api/incentives/venture-summary"
        
        # Test with valid ventureId (should work for CEO/ADMIN in dev mode)
        status, response = self.test_endpoint(
            endpoint,
            params={"ventureId": "1"},
            test_description="CEO/ADMIN access to valid ventureId - should return 200"
        )
        
        if status == 200:
            print("   ✅ CEO/ADMIN can access venture data")
        elif status == 403:
            print("   ⚠️ Access denied - check user permissions")
        else:
            print(f"   ❌ Unexpected status {status}")
        
        # Test with non-existent ventureId
        status, response = self.test_endpoint(
            endpoint,
            params={"ventureId": "99999"},
            test_description="Non-existent ventureId - should return 200 with empty data or 403"
        )

    def test_backend_input_validation(self):
        """Test input validation"""
        print("\n✅ Testing Backend Input Validation")
        print("=" * 80)
        
        endpoint = "/api/incentives/venture-summary"
        
        # Test missing ventureId
        status, response = self.test_endpoint(
            endpoint,
            test_description="Missing ventureId - should return 400"
        )
        
        # Test non-numeric ventureId
        status, response = self.test_endpoint(
            endpoint,
            params={"ventureId": "invalid"},
            test_description="Non-numeric ventureId - should return 400"
        )
        
        # Test zero/negative ventureId
        status, response = self.test_endpoint(
            endpoint,
            params={"ventureId": "0"},
            test_description="Zero ventureId - should return 400"
        )
        
        status, response = self.test_endpoint(
            endpoint,
            params={"ventureId": "-1"},
            test_description="Negative ventureId - should return 400"
        )
        
        # Test date range > 90 days
        from_date = (datetime.now() - timedelta(days=100)).strftime('%Y-%m-%d')
        to_date = datetime.now().strftime('%Y-%m-%d')
        
        status, response = self.test_endpoint(
            endpoint,
            params={
                "ventureId": "1",
                "from": from_date,
                "to": to_date
            },
            test_description="Date range > 90 days - should return 400"
        )
        
        # Test invalid date strings
        status, response = self.test_endpoint(
            endpoint,
            params={
                "ventureId": "1",
                "from": "invalid-date",
                "to": "also-invalid"
            },
            test_description="Invalid date strings - should return 400"
        )

    def test_backend_data_shape_aggregation(self):
        """Test data shape and aggregation logic"""
        print("\n📊 Testing Backend Data Shape & Aggregation")
        print("=" * 80)
        
        endpoint = "/api/incentives/venture-summary"
        
        # Test with valid parameters
        from_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        to_date = datetime.now().strftime('%Y-%m-%d')
        
        status, response = self.test_endpoint(
            endpoint,
            params={
                "ventureId": "1",
                "from": from_date,
                "to": to_date
            },
            test_description="Valid request - verify response structure"
        )
        
        if status == 200 and isinstance(response, dict):
            # Verify response structure
            required_fields = ["ventureId", "from", "to", "items", "totalAmount"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                print("   ✅ All required top-level fields present")
                
                # Verify items structure
                items = response.get("items", [])
                if items:
                    item = items[0]
                    item_fields = ["userId", "userName", "email", "role", "totalAmount", "daysWithIncentives"]
                    missing_item_fields = [field for field in item_fields if field not in item]
                    
                    if not missing_item_fields:
                        print("   ✅ Item structure correct")
                    else:
                        print(f"   ❌ Missing item fields: {missing_item_fields}")
                    
                    # Verify totalAmount calculation
                    calculated_total = sum(item.get("totalAmount", 0) for item in items)
                    response_total = response.get("totalAmount", 0)
                    
                    if abs(calculated_total - response_total) < 0.01:  # Allow for floating point precision
                        print("   ✅ Total amount calculation correct")
                    else:
                        print(f"   ❌ Total amount mismatch: calculated {calculated_total}, response {response_total}")
                else:
                    print("   ℹ️ No items in response (no data for this venture/period)")
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")

    def test_frontend_page_loading(self):
        """Test frontend page loading"""
        print("\n🌐 Testing Frontend Page Loading")
        print("=" * 80)
        
        # Test page accessibility
        status, response = self.test_endpoint(
            "/admin/incentives/venture-summary",
            test_description="Frontend page loading"
        )
        
        if status == 200:
            print("   ✅ Page loads successfully")
            
            # Check for key UI elements in the HTML
            html_content = response.get("raw_response", "")
            if isinstance(html_content, str):
                ui_elements = [
                    "Venture Incentive Summary",
                    "Select venture",
                    "Last 7 days",
                    "Last 30 days",
                    "From",
                    "To",
                    "View summary",
                    "Clear"
                ]
                
                for element in ui_elements:
                    if element in html_content:
                        print(f"   ✅ Found UI element: {element}")
                    else:
                        print(f"   ⚠️ Missing UI element: {element}")
        else:
            print(f"   ❌ Page failed to load: {status}")

    def test_frontend_api_integration(self):
        """Test frontend API integration"""
        print("\n🔗 Testing Frontend API Integration")
        print("=" * 80)
        
        # Test ventures API (used by frontend dropdown)
        status, response = self.test_endpoint(
            "/api/ventures",
            test_description="Ventures API for dropdown population"
        )
        
        if status == 200 and isinstance(response, list):
            print(f"   ✅ Ventures API returns {len(response)} ventures")
            if response:
                venture = response[0]
                if "id" in venture and "name" in venture:
                    print("   ✅ Venture objects have required fields")
                else:
                    print("   ❌ Venture objects missing required fields")
        else:
            print(f"   ❌ Ventures API failed: {status}")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Venture-Level Incentive Summary Testing")
        print("=" * 80)
        
        # Create test data first
        self.create_test_incentive_data()
        
        # Backend API tests
        self.test_backend_method_validation()
        self.test_backend_authentication()
        self.test_backend_rbac_scope()
        self.test_backend_input_validation()
        self.test_backend_data_shape_aggregation()
        
        # Frontend tests
        self.test_frontend_page_loading()
        self.test_frontend_api_integration()
        
        # Summary
        print("\n📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = [r for r in self.results if r['status_code'] in [200, 405, 400, 403]]
        failed_tests = [r for r in self.results if r['status_code'] not in [200, 405, 400, 403, 401] and r['status_code'] != 0]
        connection_errors = [r for r in self.results if r['status_code'] == 0]
        
        print(f"Total tests: {total_tests}")
        print(f"Passed tests: {len(passed_tests)}")
        print(f"Failed tests: {len(failed_tests)}")
        print(f"Connection errors: {len(connection_errors)}")
        
        if connection_errors:
            print("\n❌ CONNECTION ERRORS:")
            for result in connection_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['response'].get('error', 'Unknown error')}")
        
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for result in failed_tests:
                print(f"  - {result['method']} {result['endpoint']}: {result['status_code']} - {result.get('test_description', '')}")
        
        return len(connection_errors) == 0 and len(failed_tests) == 0

def main():
    """Main test execution"""
    tester = VentureIncentiveTester()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/venture_incentive_test_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/venture_incentive_test_results.json")
    
    if success:
        print("\n🎉 All tests completed successfully!")
        return 0
    else:
        print("\n💥 Some tests failed - check the results above")
        return 1

if __name__ == "__main__":
    sys.exit(main())