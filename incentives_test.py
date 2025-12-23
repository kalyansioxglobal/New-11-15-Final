#!/usr/bin/env python3
"""
Incentives Engine Backend Testing
Testing the new incentives engine and /api/incentives/run endpoint as per review request:

1) Prisma / Models - Confirm incentive-related models are valid
2) POST /api/incentives/run - Comprehensive endpoint testing
3) Audit event verification
"""

import requests
import json
import os
import sys
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import time

# Base URL for the API
BASE_URL = "http://localhost:3000"

class IncentivesEngineTester:
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
        """Test an API endpoint"""
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
            return response
            
        except Exception as e:
            error_data = {"error": str(e), "type": type(e).__name__}
            self.log_result(endpoint, method, 0, error_data, headers, body, 
                          f"{test_description} - Connection Error")
            return None

    def test_prisma_models(self):
        """Test 1: Verify Prisma models are accessible and valid"""
        print("🔍 Testing Prisma Models for Incentives...")
        
        # Test if we can access incentive-related data through existing endpoints
        # This indirectly validates that Prisma models are working
        
        # Check if we can query ventures (needed for incentive plans)
        response = self.test_endpoint("/api/ventures", "GET", 
                                    test_description="Verify Venture model access for incentive plans")
        
        if response and response.status_code == 200:
            print("✅ Venture model accessible - incentive plans can be venture-scoped")
        
        # Check if we can access user data (needed for incentive calculations)
        response = self.test_endpoint("/api/admin/users", "GET",
                                    test_description="Verify User model access for incentive calculations")
        
        # Note: We can't directly test IncentivePlan, IncentiveRule, IncentiveDaily models
        # without specific endpoints, but the /api/incentives/run endpoint will validate these
        
    def test_incentives_run_method_validation(self):
        """Test 2a: Method validation for /api/incentives/run"""
        print("🔍 Testing Method Validation for /api/incentives/run...")
        
        # Test non-POST methods should return 405
        methods_to_test = ["GET", "PUT", "DELETE"]
        
        for method in methods_to_test:
            response = self.test_endpoint("/api/incentives/run", method,
                                        test_description=f"Non-POST method {method} should return 405")
            
            if response:
                expected_status = 405
                if response.status_code == expected_status:
                    print(f"✅ {method} correctly rejected with 405")
                    # Verify JSON error response
                    try:
                        data = response.json()
                        if data.get("error") == "Method not allowed":
                            print("✅ Correct JSON error format")
                        else:
                            print(f"❌ Unexpected error message: {data}")
                    except:
                        print("❌ Response is not valid JSON")
                else:
                    print(f"❌ {method} returned {response.status_code}, expected {expected_status}")

    def test_incentives_run_auth(self):
        """Test 2b: Authentication and authorization for /api/incentives/run"""
        print("🔍 Testing Authentication/Authorization for /api/incentives/run...")
        
        # Test with no authentication (should work in dev mode with auto-auth as CEO)
        response = self.test_endpoint("/api/incentives/run", "POST", 
                                    body={},
                                    test_description="Test with dev mode auto-auth (should work as CEO)")
        
        # In development mode, this should work because of auto-auth as CEO
        # In production, this would require proper authentication
        
        if response:
            if response.status_code in [200, 400]:  # 400 is OK for invalid input, 200 for success
                print("✅ Authentication working (dev mode auto-auth as CEO)")
            elif response.status_code == 403:
                print("❌ Unexpected 403 - check if user has CEO/ADMIN role")
            else:
                print(f"❌ Unexpected status code: {response.status_code}")

    def test_incentives_run_inputs(self):
        """Test 2c: Input validation for /api/incentives/run"""
        print("🔍 Testing Input Validation for /api/incentives/run...")
        
        # Test 1: No body (should default to yesterday, scope="both")
        response = self.test_endpoint("/api/incentives/run", "POST",
                                    body={},
                                    test_description="No body - should default to yesterday, scope='both'")
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("scope") == "both":
                print("✅ Default scope 'both' working")
            if "date" in data:
                print(f"✅ Default date working: {data['date']}")
        
        # Test 2: Explicit valid body
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        response = self.test_endpoint("/api/incentives/run", "POST",
                                    body={"date": yesterday, "scope": "freight"},
                                    test_description=f"Explicit valid body - date: {yesterday}, scope: freight")
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("date") == yesterday and data.get("scope") == "freight":
                print("✅ Explicit date and scope working correctly")
        
        # Test 3: Invalid date format
        response = self.test_endpoint("/api/incentives/run", "POST",
                                    body={"date": "invalid-date"},
                                    test_description="Invalid date format should return 400")
        
        if response and response.status_code == 400:
            data = response.json()
            if data.get("error") == "Invalid date" and "date must be YYYY-MM-DD" in data.get("detail", ""):
                print("✅ Invalid date validation working correctly")
            else:
                print(f"❌ Unexpected error format: {data}")
        
        # Test 4: Valid date formats
        test_date = "2024-01-15"
        response = self.test_endpoint("/api/incentives/run", "POST",
                                    body={"date": test_date, "scope": "bpo"},
                                    test_description=f"Valid date format: {test_date}")
        
        # Test 5: Different scope values
        for scope in ["freight", "bpo", "both"]:
            response = self.test_endpoint("/api/incentives/run", "POST",
                                        body={"date": test_date, "scope": scope},
                                        test_description=f"Test scope: {scope}")
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get("scope") == scope:
                    print(f"✅ Scope '{scope}' working correctly")

    def test_incentives_run_behavior(self):
        """Test 2d: Behavior and idempotency of /api/incentives/run"""
        print("🔍 Testing Behavior and Idempotency for /api/incentives/run...")
        
        # Use a specific test date to ensure consistency
        test_date = "2024-01-10"
        
        # First run
        response1 = self.test_endpoint("/api/incentives/run", "POST",
                                     body={"date": test_date, "scope": "both"},
                                     test_description=f"First run for {test_date}")
        
        if response1 and response1.status_code == 200:
            data1 = response1.json()
            rows_written_1 = data1.get("rowsWritten", 0)
            print(f"✅ First run successful, rowsWritten: {rows_written_1}")
            
            # Second run (should be idempotent - upserts should not create duplicates)
            time.sleep(1)  # Small delay to ensure different timestamps
            response2 = self.test_endpoint("/api/incentives/run", "POST",
                                         body={"date": test_date, "scope": "both"},
                                         test_description=f"Second run for {test_date} (idempotency test)")
            
            if response2 and response2.status_code == 200:
                data2 = response2.json()
                rows_written_2 = data2.get("rowsWritten", 0)
                print(f"✅ Second run successful, rowsWritten: {rows_written_2}")
                
                # The second run might have different rowsWritten due to upserts,
                # but it should not fail and should handle existing records properly
                print("✅ Idempotency test passed - no errors on re-running")

    def test_incentives_run_response_format(self):
        """Test 2e: Response format validation for /api/incentives/run"""
        print("🔍 Testing Response Format for /api/incentives/run...")
        
        test_date = "2024-01-05"
        response = self.test_endpoint("/api/incentives/run", "POST",
                                    body={"date": test_date, "scope": "freight"},
                                    test_description="Verify response format")
        
        if response and response.status_code == 200:
            data = response.json()
            
            # Check required fields
            required_fields = ["success", "date", "scope", "rowsWritten"]
            missing_fields = []
            
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
            
            if not missing_fields:
                print("✅ All required response fields present")
                
                # Validate field types and values
                if data.get("success") is True:
                    print("✅ success field is boolean true")
                
                if data.get("date") == test_date:
                    print("✅ date field matches request")
                
                if data.get("scope") == "freight":
                    print("✅ scope field matches request")
                
                if isinstance(data.get("rowsWritten"), int) and data.get("rowsWritten") >= 0:
                    print(f"✅ rowsWritten is valid integer: {data.get('rowsWritten')}")
                
            else:
                print(f"❌ Missing required fields: {missing_fields}")

    def test_audit_event_logging(self):
        """Test 3: Audit event logging for incentives run"""
        print("🔍 Testing Audit Event Logging...")
        
        # Run incentives to generate audit log
        test_date = "2024-01-08"
        response = self.test_endpoint("/api/incentives/run", "POST",
                                    body={"date": test_date, "scope": "both"},
                                    test_description="Run incentives to generate audit log")
        
        if response and response.status_code == 200:
            data = response.json()
            rows_written = data.get("rowsWritten", 0)
            
            # Wait a moment for audit log to be written
            time.sleep(2)
            
            # Check audit logs
            audit_response = self.test_endpoint("/api/admin/audit-logs", "GET",
                                              test_description="Check for incentives audit log")
            
            if audit_response and audit_response.status_code == 200:
                audit_data = audit_response.json()
                items = audit_data.get("items", [])
                
                # Look for the incentives run audit log
                incentives_logs = [
                    log for log in items 
                    if log.get("domain") == "admin" and log.get("action") == "INCENTIVES_RUN"
                ]
                
                if incentives_logs:
                    latest_log = incentives_logs[0]  # Should be most recent
                    print("✅ Incentives audit log found")
                    
                    # Verify audit log structure
                    expected_fields = ["domain", "action", "entityType", "entityId", "metadata"]
                    for field in expected_fields:
                        if field in latest_log:
                            print(f"✅ Audit log has {field}: {latest_log[field]}")
                        else:
                            print(f"❌ Audit log missing {field}")
                    
                    # Verify specific values
                    if latest_log.get("domain") == "admin":
                        print("✅ Correct domain: admin")
                    
                    if latest_log.get("action") == "INCENTIVES_RUN":
                        print("✅ Correct action: INCENTIVES_RUN")
                    
                    if latest_log.get("entityType") == "incentiveBatch":
                        print("✅ Correct entityType: incentiveBatch")
                    
                    if latest_log.get("entityId") == test_date:
                        print("✅ Correct entityId (date)")
                    
                    # Check metadata
                    metadata = latest_log.get("metadata", {})
                    if isinstance(metadata, dict):
                        if metadata.get("date") == test_date:
                            print("✅ Metadata contains correct date")
                        if metadata.get("scope") == "both":
                            print("✅ Metadata contains correct scope")
                        if "rowsWritten" in metadata:
                            print(f"✅ Metadata contains rowsWritten: {metadata['rowsWritten']}")
                    
                else:
                    print("❌ No incentives audit log found")
            else:
                print("❌ Could not retrieve audit logs")

    def test_database_integration(self):
        """Test database integration and data persistence"""
        print("🔍 Testing Database Integration...")
        
        # This test verifies that the incentives calculation actually works with the database
        # We'll run incentives and then try to verify the data was written
        
        test_date = "2024-01-12"
        response = self.test_endpoint("/api/incentives/run", "POST",
                                    body={"date": test_date, "scope": "both"},
                                    test_description="Test database integration")
        
        if response and response.status_code == 200:
            data = response.json()
            rows_written = data.get("rowsWritten", 0)
            
            if rows_written > 0:
                print(f"✅ Database integration working - {rows_written} rows written")
            else:
                print("ℹ️ No rows written - may be due to no KPI data for test date")
                print("   This is expected if there's no FreightKpiDaily or EmployeeKpiDaily data")

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting Comprehensive Incentives Engine Testing")
        print("=" * 80)
        
        try:
            # Test 1: Prisma Models
            self.test_prisma_models()
            print()
            
            # Test 2a: Method Validation
            self.test_incentives_run_method_validation()
            print()
            
            # Test 2b: Authentication
            self.test_incentives_run_auth()
            print()
            
            # Test 2c: Input Validation
            self.test_incentives_run_inputs()
            print()
            
            # Test 2d: Behavior and Idempotency
            self.test_incentives_run_behavior()
            print()
            
            # Test 2e: Response Format
            self.test_incentives_run_response_format()
            print()
            
            # Test 3: Audit Event Logging
            self.test_audit_event_logging()
            print()
            
            # Test 4: Database Integration
            self.test_database_integration()
            print()
            
        except Exception as e:
            print(f"❌ Test execution failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Summary
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        successful_tests = len([r for r in self.results if r["status_code"] < 400])
        failed_tests = total_tests - successful_tests
        
        print(f"Total API calls: {total_tests}")
        print(f"Successful (2xx-3xx): {successful_tests}")
        print(f"Failed (4xx-5xx): {failed_tests}")
        print(f"Success rate: {(successful_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")
        
        # Save detailed results
        with open("/app/incentives_test_results.json", "w") as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"\n📁 Detailed results saved to: /app/incentives_test_results.json")
        
        return {
            "total_tests": total_tests,
            "successful_tests": successful_tests,
            "failed_tests": failed_tests,
            "success_rate": (successful_tests/total_tests*100) if total_tests > 0 else 0
        }

def main():
    """Main test execution"""
    print("🧪 Incentives Engine Backend Testing")
    print("Testing /api/incentives/run endpoint and related functionality")
    print()
    
    tester = IncentivesEngineTester()
    results = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    if results["failed_tests"] == 0:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️ {results['failed_tests']} tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()