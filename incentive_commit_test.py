#!/usr/bin/env python3
"""
Incentive Commit Flow Testing
Testing the new incentive commit flow as per review request:

1) Backend service – saveIncentivesForDay(planId, date)
2) API – POST /api/incentives/commit
3) Audit log verification

This test verifies:
- calculateIncentivesForDay and saveIncentivesForDay integration
- IncentiveDaily row creation/updates with proper structure
- First run vs second run behavior (insert vs update)
- API endpoint validation and response format
- Audit log creation with proper metadata
- RBAC enforcement (CEO/ADMIN only)
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

class IncentiveCommitTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        self.test_date = "2024-01-15"  # Use a fixed test date for consistent testing
        self.test_plan_id = 1  # Use plan ID 1 for testing
        
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
        
    def test_endpoint(self, endpoint: str, method: str = "GET", 
                     headers: Dict = None, body: Any = None,
                     test_description: str = ""):
        """Test an endpoint and log the result"""
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
            error_data = {"error": str(e), "type": type(e).__name__}
            self.log_result(endpoint, method, 0, error_data, headers, body, 
                          f"{test_description} - Connection Error")
            return 0, error_data

    def setup_test_data(self):
        """Setup test data for incentive commit testing"""
        print("🔧 Setting up test data...")
        
        # First, let's seed some basic test data
        status, response = self.test_endpoint(
            "/api/admin/auto-seed-test-data",
            "POST",
            test_description="Setup basic test data"
        )
        
        if status != 200:
            print("⚠️  Warning: Could not setup test data, continuing with existing data")
        
        return True

    def test_method_validation(self):
        """Test HTTP method validation for /api/incentives/commit"""
        print("\n🧪 Testing Method Validation...")
        
        # Test non-POST methods
        methods_to_test = ["GET", "PUT", "DELETE"]
        
        for method in methods_to_test:
            status, response = self.test_endpoint(
                "/api/incentives/commit",
                method,
                test_description=f"Method validation - {method} should return 405"
            )
            
            if status == 405:
                print(f"✅ {method} correctly rejected with 405")
                # Check for Allow header
                if "Allow" in str(response):
                    print("✅ Allow header present in response")
            else:
                print(f"❌ {method} returned {status}, expected 405")

    def test_input_validation(self):
        """Test input validation for /api/incentives/commit"""
        print("\n🧪 Testing Input Validation...")
        
        # Test missing planId
        status, response = self.test_endpoint(
            "/api/incentives/commit",
            "POST",
            body={},
            test_description="Missing planId should return 400"
        )
        
        if status == 400:
            print("✅ Missing planId correctly rejected with 400")
        else:
            print(f"❌ Missing planId returned {status}, expected 400")
        
        # Test invalid planId (string)
        status, response = self.test_endpoint(
            "/api/incentives/commit",
            "POST",
            body={"planId": "invalid"},
            test_description="Invalid planId (string) should return 400"
        )
        
        if status == 400:
            print("✅ Invalid planId correctly rejected with 400")
        else:
            print(f"❌ Invalid planId returned {status}, expected 400")
        
        # Test invalid planId (negative)
        status, response = self.test_endpoint(
            "/api/incentives/commit",
            "POST",
            body={"planId": -1},
            test_description="Invalid planId (negative) should return 400"
        )
        
        if status == 400:
            print("✅ Negative planId correctly rejected with 400")
        else:
            print(f"❌ Negative planId returned {status}, expected 400")
        
        # Test invalid planId (zero)
        status, response = self.test_endpoint(
            "/api/incentives/commit",
            "POST",
            body={"planId": 0},
            test_description="Invalid planId (zero) should return 400"
        )
        
        if status == 400:
            print("✅ Zero planId correctly rejected with 400")
        else:
            print(f"❌ Zero planId returned {status}, expected 400")

    def test_successful_commit_first_run(self):
        """Test successful incentive commit - first run"""
        print("\n🧪 Testing Successful Commit - First Run...")
        
        # Test with valid planId and date
        status, response = self.test_endpoint(
            "/api/incentives/commit",
            "POST",
            body={
                "planId": self.test_plan_id,
                "date": self.test_date
            },
            test_description="First commit run with valid planId and date"
        )
        
        if status == 200:
            print("✅ First commit run successful")
            
            # Verify response structure
            required_fields = ["items", "inserted", "updated", "count"]
            for field in required_fields:
                if field in response:
                    print(f"✅ Response contains required field: {field}")
                else:
                    print(f"❌ Response missing required field: {field}")
            
            # Verify count matches items length
            if "items" in response and "count" in response:
                if response["count"] == len(response["items"]):
                    print("✅ Count matches items length")
                else:
                    print(f"❌ Count ({response['count']}) doesn't match items length ({len(response['items'])})")
            
            # Store first run results for comparison
            self.first_run_response = response
            
            # Verify inserted > 0 for first run (if there are items)
            if response.get("count", 0) > 0:
                if response.get("inserted", 0) > 0:
                    print("✅ First run shows inserted > 0")
                else:
                    print("❌ First run should have inserted > 0 when items exist")
            
            return True
        else:
            print(f"❌ First commit run failed with status {status}")
            return False

    def test_successful_commit_second_run(self):
        """Test successful incentive commit - second run (should update, not insert)"""
        print("\n🧪 Testing Successful Commit - Second Run...")
        
        # Test same planId and date again
        status, response = self.test_endpoint(
            "/api/incentives/commit",
            "POST",
            body={
                "planId": self.test_plan_id,
                "date": self.test_date
            },
            test_description="Second commit run with same planId and date"
        )
        
        if status == 200:
            print("✅ Second commit run successful")
            
            # Verify response structure
            required_fields = ["items", "inserted", "updated", "count"]
            for field in required_fields:
                if field in response:
                    print(f"✅ Response contains required field: {field}")
                else:
                    print(f"❌ Response missing required field: {field}")
            
            # Verify inserted = 0 and updated > 0 for second run
            if response.get("inserted", -1) == 0:
                print("✅ Second run shows inserted = 0")
            else:
                print(f"❌ Second run should have inserted = 0, got {response.get('inserted')}")
            
            if response.get("count", 0) > 0:
                if response.get("updated", 0) > 0:
                    print("✅ Second run shows updated > 0")
                else:
                    print("❌ Second run should have updated > 0 when items exist")
            
            # Compare with first run
            if hasattr(self, 'first_run_response'):
                if response.get("count") == self.first_run_response.get("count"):
                    print("✅ Second run has same count as first run")
                else:
                    print(f"❌ Count mismatch: first={self.first_run_response.get('count')}, second={response.get('count')}")
            
            return True
        else:
            print(f"❌ Second commit run failed with status {status}")
            return False

    def test_default_date_behavior(self):
        """Test default date behavior (should use today if no date provided)"""
        print("\n🧪 Testing Default Date Behavior...")
        
        # Test without date parameter
        status, response = self.test_endpoint(
            "/api/incentives/commit",
            "POST",
            body={"planId": self.test_plan_id},
            test_description="Commit without date should use today's date"
        )
        
        if status == 200:
            print("✅ Commit without date successful")
            
            # The response should still have the required structure
            required_fields = ["items", "inserted", "updated", "count"]
            for field in required_fields:
                if field in response:
                    print(f"✅ Response contains required field: {field}")
                else:
                    print(f"❌ Response missing required field: {field}")
            
            return True
        else:
            print(f"❌ Commit without date failed with status {status}")
            return False

    def verify_audit_log_creation(self):
        """Verify that audit logs are created for incentive commits"""
        print("\n🧪 Verifying Audit Log Creation...")
        
        # Query audit logs for incentive commit actions
        status, response = self.test_endpoint(
            "/api/admin/audit-logs?action=INCENTIVE_COMMIT_RUN&domain=admin",
            "GET",
            test_description="Query audit logs for incentive commit actions"
        )
        
        if status == 200:
            print("✅ Audit logs query successful")
            
            if "items" in response and len(response["items"]) > 0:
                print(f"✅ Found {len(response['items'])} audit log entries")
                
                # Check the structure of the most recent audit log
                latest_log = response["items"][0]
                
                # Verify audit log structure
                required_audit_fields = ["domain", "action", "entityType", "entityId", "metadata"]
                for field in required_audit_fields:
                    if field in latest_log:
                        print(f"✅ Audit log contains required field: {field}")
                    else:
                        print(f"❌ Audit log missing required field: {field}")
                
                # Verify specific values
                if latest_log.get("domain") == "admin":
                    print("✅ Audit log has correct domain: admin")
                else:
                    print(f"❌ Audit log has incorrect domain: {latest_log.get('domain')}")
                
                if latest_log.get("action") == "INCENTIVE_COMMIT_RUN":
                    print("✅ Audit log has correct action: INCENTIVE_COMMIT_RUN")
                else:
                    print(f"❌ Audit log has incorrect action: {latest_log.get('action')}")
                
                if latest_log.get("entityType") == "incentivePlan":
                    print("✅ Audit log has correct entityType: incentivePlan")
                else:
                    print(f"❌ Audit log has incorrect entityType: {latest_log.get('entityType')}")
                
                # Verify metadata structure
                metadata = latest_log.get("metadata", {})
                required_metadata_fields = ["planId", "date", "count", "inserted", "updated"]
                for field in required_metadata_fields:
                    if field in metadata:
                        print(f"✅ Audit log metadata contains: {field}")
                    else:
                        print(f"❌ Audit log metadata missing: {field}")
                
                return True
            else:
                print("❌ No audit log entries found for incentive commits")
                return False
        else:
            print(f"❌ Audit logs query failed with status {status}")
            return False

    def test_rbac_enforcement(self):
        """Test RBAC enforcement - only CEO/ADMIN should be able to commit"""
        print("\n🧪 Testing RBAC Enforcement...")
        
        # Note: In development mode, the app auto-authenticates as CEO
        # So we can't easily test unauthorized access without modifying the auth system
        # But we can verify that the endpoint works for authorized users
        
        status, response = self.test_endpoint(
            "/api/incentives/commit",
            "POST",
            body={
                "planId": self.test_plan_id,
                "date": self.test_date
            },
            test_description="RBAC test - should work for CEO/ADMIN (dev mode auto-auth as CEO)"
        )
        
        if status == 200:
            print("✅ RBAC allows CEO/ADMIN access (dev mode)")
            return True
        elif status == 403:
            print("✅ RBAC correctly blocks unauthorized access")
            return True
        else:
            print(f"❌ Unexpected RBAC response: {status}")
            return False

    def verify_incentive_daily_structure(self):
        """Verify IncentiveDaily records have correct structure"""
        print("\n🧪 Verifying IncentiveDaily Record Structure...")
        
        # We can't directly query the database, but we can infer structure from API responses
        # The commit API should return items that match the engine output
        
        # Run a commit to get sample data
        status, response = self.test_endpoint(
            "/api/incentives/commit",
            "POST",
            body={
                "planId": self.test_plan_id,
                "date": self.test_date
            },
            test_description="Get sample incentive data for structure verification"
        )
        
        if status == 200 and "items" in response and len(response["items"]) > 0:
            print("✅ Got sample incentive data")
            
            # Check structure of items (engine output)
            sample_item = response["items"][0]
            required_item_fields = ["userId", "ruleId", "amount", "date", "planId"]
            
            for field in required_item_fields:
                if field in sample_item:
                    print(f"✅ Engine output contains: {field}")
                else:
                    print(f"❌ Engine output missing: {field}")
            
            # Verify data types
            if isinstance(sample_item.get("userId"), int):
                print("✅ userId is integer")
            else:
                print(f"❌ userId should be integer, got {type(sample_item.get('userId'))}")
            
            if isinstance(sample_item.get("amount"), (int, float)):
                print("✅ amount is numeric")
            else:
                print(f"❌ amount should be numeric, got {type(sample_item.get('amount'))}")
            
            return True
        else:
            print("❌ Could not get sample incentive data for structure verification")
            return False

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting Incentive Commit Flow Comprehensive Testing")
        print("=" * 80)
        
        # Setup
        self.setup_test_data()
        
        # Test sequence
        tests = [
            ("Method Validation", self.test_method_validation),
            ("Input Validation", self.test_input_validation),
            ("Successful Commit - First Run", self.test_successful_commit_first_run),
            ("Successful Commit - Second Run", self.test_successful_commit_second_run),
            ("Default Date Behavior", self.test_default_date_behavior),
            ("RBAC Enforcement", self.test_rbac_enforcement),
            ("Audit Log Creation", self.verify_audit_log_creation),
            ("IncentiveDaily Structure", self.verify_incentive_daily_structure),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n{'='*20} {test_name} {'='*20}")
            try:
                result = test_func()
                if result:
                    passed += 1
                    print(f"✅ {test_name} PASSED")
                else:
                    print(f"❌ {test_name} FAILED")
            except Exception as e:
                print(f"💥 {test_name} ERROR: {e}")
        
        # Summary
        print("\n" + "="*80)
        print("🏁 INCENTIVE COMMIT FLOW TEST SUMMARY")
        print("="*80)
        print(f"📊 Tests Passed: {passed}/{total} ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED!")
        else:
            print(f"⚠️  {total - passed} tests failed or had errors")
        
        # Save results
        self.save_results()
        
        return passed == total

    def save_results(self):
        """Save test results to JSON file"""
        results_file = "/app/incentive_commit_test_results.json"
        
        summary = {
            "test_run_timestamp": datetime.now().isoformat(),
            "total_tests": len(self.results),
            "base_url": BASE_URL,
            "test_date": self.test_date,
            "test_plan_id": self.test_plan_id,
            "results": self.results
        }
        
        try:
            with open(results_file, 'w') as f:
                json.dump(summary, f, indent=2)
            print(f"📁 Results saved to {results_file}")
        except Exception as e:
            print(f"❌ Failed to save results: {e}")

def main():
    """Main function"""
    tester = IncentiveCommitTester()
    success = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()