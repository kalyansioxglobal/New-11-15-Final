#!/usr/bin/env python3
"""
Incentive Computation Engine Testing
Testing the new incentive computation engine and test endpoint as per review request:

1) Backend engine – lib/incentives/engine.ts
2) API – POST /api/incentives/run  
3) Create seed data with different calculation types
4) Verify calculations work correctly
"""

import requests
import json
import os
import sys
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import time

# Base URL for the API
BASE_URL = "http://localhost:3000"

class IncentiveEngineTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        self.test_date = "2024-01-15"  # Use a fixed test date
        
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
            "request_body": body,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        status_emoji = "✅" if status_code < 400 else "❌"
        print(f"{status_emoji} {method} {endpoint} -> {status_code}")
        if test_description:
            print(f"   📝 {test_description}")
        print(f"   📤 Request: {json.dumps(body) if body else 'No body'}")
        print(f"   📥 Response: {json.dumps(response_data, indent=2)}")
        print("-" * 80)
        
    def make_request(self, method: str, endpoint: str, data: Any = None, 
                     test_description: str = "") -> requests.Response:
        """Make HTTP request and log result"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=data)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
                
            self.log_result(endpoint, method.upper(), response.status_code, 
                          response_data, dict(response.headers), data, test_description)
            return response
            
        except Exception as e:
            error_data = {"error": str(e), "type": type(e).__name__}
            self.log_result(endpoint, method.upper(), 0, error_data, {}, data, test_description)
            raise

    def test_seed_data_creation(self):
        """Create minimal seed data for incentive testing"""
        print("🌱 Creating seed data for incentive testing...")
        
        # We'll use the existing seeding endpoints to create test data
        # First, let's check if we have ventures and users
        
        # Check ventures
        response = self.make_request("GET", "/api/ventures", 
                                   test_description="Check existing ventures")
        
        if response.status_code == 200:
            ventures_data = response.json()
            if isinstance(ventures_data, list) and len(ventures_data) > 0:
                print(f"✅ Found {len(ventures_data)} existing ventures")
                venture_id = ventures_data[0].get('id', 1)
            else:
                print("⚠️ No ventures found, will use venture ID 1")
                venture_id = 1
        else:
            print("⚠️ Could not fetch ventures, will use venture ID 1")
            venture_id = 1
            
        return venture_id

    def test_incentive_api_method_validation(self):
        """Test POST /api/incentives/run method validation"""
        print("🔒 Testing method validation for /api/incentives/run...")
        
        # Test non-POST methods
        methods_to_test = ["GET", "PUT", "DELETE"]
        
        for method in methods_to_test:
            self.make_request(method, "/api/incentives/run",
                            test_description=f"Test {method} method (should return 405)")

    def test_incentive_api_input_validation(self):
        """Test POST /api/incentives/run input validation"""
        print("📝 Testing input validation for /api/incentives/run...")
        
        # Test missing planId
        self.make_request("POST", "/api/incentives/run", {},
                        test_description="Test missing planId (should return 400)")
        
        # Test invalid planId (string)
        self.make_request("POST", "/api/incentives/run", {"planId": "invalid"},
                        test_description="Test invalid planId string (should return 400)")
        
        # Test invalid planId (negative)
        self.make_request("POST", "/api/incentives/run", {"planId": -1},
                        test_description="Test negative planId (should return 400)")
        
        # Test invalid planId (zero)
        self.make_request("POST", "/api/incentives/run", {"planId": 0},
                        test_description="Test zero planId (should return 400)")
        
        # Test invalid date format
        self.make_request("POST", "/api/incentives/run", 
                        {"planId": 1, "date": "invalid-date"},
                        test_description="Test invalid date format (should return 400)")

    def test_incentive_api_valid_requests(self):
        """Test POST /api/incentives/run with valid requests"""
        print("✅ Testing valid requests for /api/incentives/run...")
        
        # Test with planId only (should use default date)
        self.make_request("POST", "/api/incentives/run", {"planId": 1},
                        test_description="Test with planId only (default date)")
        
        # Test with planId and valid date
        self.make_request("POST", "/api/incentives/run", 
                        {"planId": 1, "date": self.test_date},
                        test_description=f"Test with planId and date {self.test_date}")
        
        # Test with different planId
        self.make_request("POST", "/api/incentives/run", 
                        {"planId": 2, "date": self.test_date},
                        test_description=f"Test with different planId (2)")

    def test_incentive_calculation_types(self):
        """Test different incentive calculation types"""
        print("🧮 Testing incentive calculation types...")
        
        # For this test, we'll call the API with different plan IDs
        # The actual calculation logic is tested by calling the engine
        
        calc_types = [
            ("PERCENT_OF_METRIC", 1),
            ("FLAT_PER_UNIT", 2), 
            ("CURRENCY_PER_DOLLAR", 3),
            ("BONUS_ON_TARGET", 4)
        ]
        
        for calc_type, plan_id in calc_types:
            self.make_request("POST", "/api/incentives/run",
                            {"planId": plan_id, "date": self.test_date},
                            test_description=f"Test {calc_type} calculation")

    def test_audit_log_verification(self):
        """Verify audit logs are created for incentive runs"""
        print("📋 Testing audit log creation...")
        
        # Run incentive calculation
        response = self.make_request("POST", "/api/incentives/run",
                                   {"planId": 1, "date": self.test_date},
                                   test_description="Run incentives for audit log test")
        
        if response.status_code == 200:
            # Check audit logs
            self.make_request("GET", "/api/admin/audit-logs",
                            {"domain": "admin", "action": "INCENTIVE_COMPUTE_RUN"},
                            test_description="Check audit logs for incentive runs")

    def test_engine_response_format(self):
        """Test the response format from the incentive engine"""
        print("📊 Testing engine response format...")
        
        response = self.make_request("POST", "/api/incentives/run",
                                   {"planId": 1, "date": self.test_date},
                                   test_description="Test response format")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify expected response structure
            expected_keys = ["items", "count"]
            missing_keys = [key for key in expected_keys if key not in data]
            
            if missing_keys:
                print(f"❌ Missing keys in response: {missing_keys}")
            else:
                print("✅ Response has all expected keys")
                
            # Verify items structure if present
            if "items" in data and isinstance(data["items"], list):
                print(f"✅ Items is a list with {len(data['items'])} entries")
                
                if len(data["items"]) > 0:
                    item = data["items"][0]
                    expected_item_keys = ["userId", "ruleId", "amount", "date", "planId"]
                    missing_item_keys = [key for key in expected_item_keys if key not in item]
                    
                    if missing_item_keys:
                        print(f"❌ Missing keys in item: {missing_item_keys}")
                    else:
                        print("✅ Item structure is correct")

    def test_idempotency(self):
        """Test that running the same calculation multiple times is idempotent"""
        print("🔄 Testing idempotency...")
        
        # Run the same calculation twice
        response1 = self.make_request("POST", "/api/incentives/run",
                                    {"planId": 1, "date": self.test_date},
                                    test_description="First run for idempotency test")
        
        time.sleep(1)  # Small delay
        
        response2 = self.make_request("POST", "/api/incentives/run",
                                    {"planId": 1, "date": self.test_date},
                                    test_description="Second run for idempotency test")
        
        if response1.status_code == 200 and response2.status_code == 200:
            data1 = response1.json()
            data2 = response2.json()
            
            # Compare results (should be the same or handle upserts correctly)
            if data1.get("count") == data2.get("count"):
                print("✅ Idempotency test passed - same count returned")
            else:
                print(f"⚠️ Different counts: {data1.get('count')} vs {data2.get('count')}")

    def run_comprehensive_test(self):
        """Run all incentive engine tests"""
        print("🚀 Starting Comprehensive Incentive Engine Testing")
        print("=" * 80)
        
        try:
            # 1. Create seed data
            venture_id = self.test_seed_data_creation()
            
            # 2. Test method validation
            self.test_incentive_api_method_validation()
            
            # 3. Test input validation
            self.test_incentive_api_input_validation()
            
            # 4. Test valid requests
            self.test_incentive_api_valid_requests()
            
            # 5. Test calculation types
            self.test_incentive_calculation_types()
            
            # 6. Test response format
            self.test_engine_response_format()
            
            # 7. Test idempotency
            self.test_idempotency()
            
            # 8. Test audit logs
            self.test_audit_log_verification()
            
        except Exception as e:
            print(f"❌ Test execution failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Generate summary
        self.generate_summary()
        
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 80)
        print("📊 INCENTIVE ENGINE TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r["status_code"] < 400])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Group by endpoint
        endpoints = {}
        for result in self.results:
            endpoint = result["endpoint"]
            if endpoint not in endpoints:
                endpoints[endpoint] = {"total": 0, "passed": 0}
            endpoints[endpoint]["total"] += 1
            if result["status_code"] < 400:
                endpoints[endpoint]["passed"] += 1
        
        print("\n📍 Results by Endpoint:")
        for endpoint, stats in endpoints.items():
            success_rate = (stats["passed"]/stats["total"])*100
            print(f"  {endpoint}: {stats['passed']}/{stats['total']} ({success_rate:.1f}%)")
        
        # Save detailed results
        with open("/app/incentive_engine_test_results.json", "w") as f:
            json.dump({
                "summary": {
                    "total_tests": total_tests,
                    "passed_tests": passed_tests,
                    "failed_tests": failed_tests,
                    "success_rate": (passed_tests/total_tests)*100,
                    "test_date": self.test_date,
                    "timestamp": datetime.now().isoformat()
                },
                "results": self.results
            }, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: /app/incentive_engine_test_results.json")

def main():
    """Main test execution"""
    tester = IncentiveEngineTester()
    tester.run_comprehensive_test()

if __name__ == "__main__":
    main()