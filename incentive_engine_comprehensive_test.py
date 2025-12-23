#!/usr/bin/env python3
"""
Comprehensive Incentive Engine Testing
Testing the incentive computation engine with actual calculations as per review request.
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

class ComprehensiveIncentiveTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        self.test_date = "2024-01-15"
        
    def log_result(self, test_name: str, expected: Any, actual: Any, passed: bool, details: str = ""):
        """Log test result with expected vs actual comparison"""
        result = {
            "test_name": test_name,
            "expected": expected,
            "actual": actual,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        status_emoji = "✅" if passed else "❌"
        print(f"{status_emoji} {test_name}")
        print(f"   Expected: {expected}")
        print(f"   Actual: {actual}")
        if details:
            print(f"   Details: {details}")
        print("-" * 80)

    def test_api_method_validation(self):
        """Test API method validation"""
        print("🔒 Testing API Method Validation...")
        
        methods = ["GET", "PUT", "DELETE"]
        for method in methods:
            try:
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}/api/incentives/run")
                elif method == "PUT":
                    response = self.session.put(f"{BASE_URL}/api/incentives/run")
                elif method == "DELETE":
                    response = self.session.delete(f"{BASE_URL}/api/incentives/run")
                
                expected = 405
                actual = response.status_code
                passed = actual == expected
                
                self.log_result(f"Method {method} validation", expected, actual, passed,
                              f"Should return 405 Method Not Allowed")
                
            except Exception as e:
                self.log_result(f"Method {method} validation", 405, f"Error: {e}", False)

    def test_api_input_validation(self):
        """Test API input validation"""
        print("📝 Testing API Input Validation...")
        
        test_cases = [
            ({"planId": "invalid"}, 400, "Invalid planId type"),
            ({"planId": -1}, 400, "Negative planId"),
            ({"planId": 0}, 400, "Zero planId"),
            ({}, 400, "Missing planId"),
            ({"planId": 1, "date": "invalid-date"}, 500, "Invalid date format")
        ]
        
        for body, expected_status, description in test_cases:
            try:
                response = self.session.post(f"{BASE_URL}/api/incentives/run", json=body)
                actual = response.status_code
                passed = actual == expected_status
                
                self.log_result(f"Input validation: {description}", expected_status, actual, passed)
                
            except Exception as e:
                self.log_result(f"Input validation: {description}", expected_status, f"Error: {e}", False)

    def test_incentive_calculations(self):
        """Test actual incentive calculations with seeded data"""
        print("🧮 Testing Incentive Calculations...")
        
        try:
            # Call the incentive engine
            response = self.session.post(f"{BASE_URL}/api/incentives/run", 
                                       json={"planId": 1, "date": self.test_date})
            
            if response.status_code != 200:
                self.log_result("API Response", 200, response.status_code, False, 
                              f"API call failed: {response.text}")
                return
            
            data = response.json()
            items = data.get("items", [])
            
            # Expected calculations based on our seed data:
            # Total Revenue: $4,500 (1000 + 1500 + 2000)
            # Total Miles: 2,250 (500 + 750 + 1000) 
            # Total Loads: 3
            
            expected_calculations = {
                "PERCENT_OF_METRIC": 90,    # 2% of $4,500 = $90
                "FLAT_PER_UNIT": 150,      # 3 loads × $50 = $150
                "CURRENCY_PER_DOLLAR": 225, # 2,250 miles × $0.10 = $225
                "BONUS_ON_TARGET": 0        # 3 loads < 10 threshold = $0
            }
            
            # Test total count
            expected_count = 3  # Should have 3 rules that fire (bonus doesn't fire)
            actual_count = len(items)
            self.log_result("Total incentive items", expected_count, actual_count, 
                          expected_count == actual_count)
            
            # Test individual calculations
            actual_amounts = {}
            for item in items:
                rule_id = item.get("ruleId")
                amount = item.get("amount")
                
                # Get rule details to map to calc type
                if rule_id == 12:  # PERCENT_OF_METRIC rule
                    actual_amounts["PERCENT_OF_METRIC"] = amount
                elif rule_id == 13:  # FLAT_PER_UNIT rule
                    actual_amounts["FLAT_PER_UNIT"] = amount
                elif rule_id == 14:  # CURRENCY_PER_DOLLAR rule
                    actual_amounts["CURRENCY_PER_DOLLAR"] = amount
                elif rule_id == 15:  # BONUS_ON_TARGET rule
                    actual_amounts["BONUS_ON_TARGET"] = amount
            
            # Verify each calculation type
            for calc_type, expected_amount in expected_calculations.items():
                actual_amount = actual_amounts.get(calc_type, 0)
                passed = actual_amount == expected_amount
                
                self.log_result(f"{calc_type} calculation", expected_amount, actual_amount, passed,
                              f"Rule should calculate correct incentive amount")
            
            # Test total incentive amount
            total_expected = sum(expected_calculations.values())
            total_actual = sum(item.get("amount", 0) for item in items)
            self.log_result("Total incentive amount", total_expected, total_actual,
                          total_expected == total_actual)
            
            # Test response structure
            required_fields = ["userId", "ruleId", "amount", "date", "planId"]
            for i, item in enumerate(items):
                missing_fields = [field for field in required_fields if field not in item]
                passed = len(missing_fields) == 0
                self.log_result(f"Item {i+1} structure", "All required fields", 
                              f"Missing: {missing_fields}" if missing_fields else "All present",
                              passed)
            
        except Exception as e:
            self.log_result("Incentive calculations", "Success", f"Error: {e}", False)

    def test_audit_logging(self):
        """Test audit logging functionality"""
        print("📋 Testing Audit Logging...")
        
        try:
            # Run incentive calculation
            response = self.session.post(f"{BASE_URL}/api/incentives/run",
                                       json={"planId": 1, "date": self.test_date})
            
            if response.status_code == 200:
                # Check audit logs
                audit_response = self.session.get(f"{BASE_URL}/api/admin/audit-logs",
                                                params={"domain": "admin", "action": "INCENTIVE_COMPUTE_RUN"})
                
                if audit_response.status_code == 200:
                    audit_data = audit_response.json()
                    items = audit_data.get("items", [])
                    
                    # Find our audit log entry
                    our_entry = None
                    for item in items:
                        metadata = item.get("metadata", {})
                        if (metadata.get("planId") == 1 and 
                            metadata.get("date") == self.test_date):
                            our_entry = item
                            break
                    
                    if our_entry:
                        # Verify audit log structure
                        expected_fields = ["domain", "action", "entityType", "entityId", "metadata"]
                        missing_fields = [field for field in expected_fields if field not in our_entry]
                        
                        self.log_result("Audit log structure", "All required fields",
                                      f"Missing: {missing_fields}" if missing_fields else "All present",
                                      len(missing_fields) == 0)
                        
                        # Verify audit log content
                        self.log_result("Audit domain", "admin", our_entry.get("domain"),
                                      our_entry.get("domain") == "admin")
                        
                        self.log_result("Audit action", "INCENTIVE_COMPUTE_RUN", our_entry.get("action"),
                                      our_entry.get("action") == "INCENTIVE_COMPUTE_RUN")
                        
                        self.log_result("Audit entityType", "incentivePlan", our_entry.get("entityType"),
                                      our_entry.get("entityType") == "incentivePlan")
                        
                        metadata = our_entry.get("metadata", {})
                        self.log_result("Audit metadata planId", 1, metadata.get("planId"),
                                      metadata.get("planId") == 1)
                        
                        self.log_result("Audit metadata date", self.test_date, metadata.get("date"),
                                      metadata.get("date") == self.test_date)
                        
                    else:
                        self.log_result("Audit log entry", "Found", "Not found", False)
                else:
                    self.log_result("Audit log retrieval", 200, audit_response.status_code, False)
            else:
                self.log_result("Incentive run for audit", 200, response.status_code, False)
                
        except Exception as e:
            self.log_result("Audit logging test", "Success", f"Error: {e}", False)

    def test_idempotency(self):
        """Test that multiple runs produce consistent results"""
        print("🔄 Testing Idempotency...")
        
        try:
            # Run calculation twice
            response1 = self.session.post(f"{BASE_URL}/api/incentives/run",
                                        json={"planId": 1, "date": self.test_date})
            
            time.sleep(1)  # Small delay
            
            response2 = self.session.post(f"{BASE_URL}/api/incentives/run",
                                        json={"planId": 1, "date": self.test_date})
            
            if response1.status_code == 200 and response2.status_code == 200:
                data1 = response1.json()
                data2 = response2.json()
                
                count1 = data1.get("count", 0)
                count2 = data2.get("count", 0)
                
                self.log_result("Idempotency - count consistency", count1, count2, count1 == count2)
                
                # Compare items (should be same or handled via upsert)
                items1 = sorted(data1.get("items", []), key=lambda x: x.get("ruleId", 0))
                items2 = sorted(data2.get("items", []), key=lambda x: x.get("ruleId", 0))
                
                amounts_match = True
                if len(items1) == len(items2):
                    for i in range(len(items1)):
                        if items1[i].get("amount") != items2[i].get("amount"):
                            amounts_match = False
                            break
                else:
                    amounts_match = False
                
                self.log_result("Idempotency - amount consistency", "Same amounts", 
                              "Same amounts" if amounts_match else "Different amounts", amounts_match)
            else:
                self.log_result("Idempotency test", "Both calls successful", 
                              f"Status codes: {response1.status_code}, {response2.status_code}", False)
                
        except Exception as e:
            self.log_result("Idempotency test", "Success", f"Error: {e}", False)

    def run_comprehensive_test(self):
        """Run all comprehensive tests"""
        print("🚀 Starting Comprehensive Incentive Engine Testing")
        print("=" * 80)
        
        try:
            # 1. Test API method validation
            self.test_api_method_validation()
            
            # 2. Test API input validation  
            self.test_api_input_validation()
            
            # 3. Test actual incentive calculations
            self.test_incentive_calculations()
            
            # 4. Test audit logging
            self.test_audit_logging()
            
            # 5. Test idempotency
            self.test_idempotency()
            
        except Exception as e:
            print(f"❌ Test execution failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Generate summary
        self.generate_summary()
        
    def generate_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE INCENTIVE ENGINE TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r["passed"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Group by test category
        categories = {}
        for result in self.results:
            test_name = result["test_name"]
            category = test_name.split(":")[0] if ":" in test_name else test_name.split(" ")[0]
            
            if category not in categories:
                categories[category] = {"total": 0, "passed": 0}
            categories[category]["total"] += 1
            if result["passed"]:
                categories[category]["passed"] += 1
        
        print("\n📍 Results by Category:")
        for category, stats in categories.items():
            success_rate = (stats["passed"]/stats["total"])*100
            print(f"  {category}: {stats['passed']}/{stats['total']} ({success_rate:.1f}%)")
        
        # Show failed tests
        failed_results = [r for r in self.results if not r["passed"]]
        if failed_results:
            print("\n❌ Failed Tests:")
            for result in failed_results:
                print(f"  - {result['test_name']}: Expected {result['expected']}, Got {result['actual']}")
        
        # Save detailed results
        with open("/app/incentive_engine_comprehensive_results.json", "w") as f:
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
        
        print(f"\n💾 Detailed results saved to: /app/incentive_engine_comprehensive_results.json")

def main():
    """Main test execution"""
    tester = ComprehensiveIncentiveTester()
    tester.run_comprehensive_test()

if __name__ == "__main__":
    main()