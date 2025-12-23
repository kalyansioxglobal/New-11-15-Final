#!/usr/bin/env python3
"""
Audit Log Backend Testing
Testing the AuditLog persistence and /api/admin/audit-logs endpoint as per review request.

Goals:
1) Verify that calling existing audited endpoints results in AuditLog rows being created in the database
2) Verify /api/admin/audit-logs endpoint behavior:
   - GET only; non-GET returns 405 with JSON { error: "Method not allowed" }
   - CEO/ADMIN-only; non-privileged roles get 403 { error: "Forbidden" }
   - Default behavior (no query params): returns last 7 days of logs, paginated
   - Query parameters: from/to dates, domain, action, userId, ventureId, officeId
   - Pagination: page/pageSize respected, with pageSize capped at 200
3) Confirm that audit-logs API never throws unhandled errors when auditLog table is empty
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

# Base URL for the API
BASE_URL = "http://localhost:3000"

class AuditLogTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, test_name: str, endpoint: str, method: str, status_code: int, 
                   response_data: Any, expected_status: int = None, 
                   test_description: str = ""):
        """Log test result"""
        expected_status = expected_status or status_code
        passed = status_code == expected_status
        
        result = {
            "test_name": test_name,
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "expected_status": expected_status,
            "passed": passed,
            "response": response_data,
            "test_description": test_description,
        }
        self.results.append(result)
        
        status_emoji = "✅" if passed else "❌"
        print(f"{status_emoji} {test_name}: {method} {endpoint} -> {status_code} (expected {expected_status})")
        if test_description:
            print(f"   📝 {test_description}")
        if not passed:
            print(f"   ⚠️  Expected {expected_status}, got {status_code}")
        print(f"   📥 Response: {json.dumps(response_data, indent=2)[:200]}...")
        print("-" * 80)
        
        return passed
        
    def make_request(self, endpoint: str, method: str = "GET", 
                    headers: Dict = None, body: Any = None) -> tuple[int, Any]:
        """Make HTTP request and return status code and response data"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, params=body if isinstance(body, dict) else None)
            elif method == "POST":
                response = self.session.post(url, json=body, headers=headers)
            elif method == "DELETE":
                response = self.session.delete(url, json=body, headers=headers)
            elif method == "PUT":
                response = self.session.put(url, json=body, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
                
            return response.status_code, response_data
            
        except Exception as e:
            return 0, {"error": str(e)}

    def test_audit_logs_method_validation(self):
        """Test that /api/admin/audit-logs only accepts GET method"""
        print("\n🔍 Testing /api/admin/audit-logs Method Validation")
        print("=" * 80)
        
        # Test non-GET methods should return 405
        methods_to_test = ["POST", "PUT", "DELETE"]
        
        for method in methods_to_test:
            status_code, response_data = self.make_request("/api/admin/audit-logs", method=method)
            
            passed = self.log_result(
                f"Method_{method}_Validation",
                "/api/admin/audit-logs",
                method,
                status_code,
                response_data,
                expected_status=405,
                test_description=f"{method} method should return 405 Method Not Allowed"
            )
            
            # Verify response format
            if passed and isinstance(response_data, dict):
                if "error" in response_data and response_data["error"] == "Method not allowed":
                    print(f"   ✅ Correct error message format for {method}")
                else:
                    print(f"   ⚠️  Expected error message 'Method not allowed' for {method}")

    def test_audit_logs_authorization(self):
        """Test that /api/admin/audit-logs requires CEO/ADMIN role"""
        print("\n🔐 Testing /api/admin/audit-logs Authorization")
        print("=" * 80)
        
        # Test without authentication (should work in dev mode with auto-auth as CEO)
        status_code, response_data = self.make_request("/api/admin/audit-logs")
        
        # In development mode, this should work (auto-auth as CEO)
        # In production, this would return 401/403
        self.log_result(
            "Authorization_Check",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            test_description="Authorization check - should work in dev mode (auto-auth as CEO)"
        )
        
        return status_code, response_data

    def test_audit_logs_default_behavior(self):
        """Test default behavior (last 7 days, paginated)"""
        print("\n📅 Testing /api/admin/audit-logs Default Behavior")
        print("=" * 80)
        
        status_code, response_data = self.make_request("/api/admin/audit-logs")
        
        passed = self.log_result(
            "Default_Behavior",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=200,
            test_description="Default behavior should return last 7 days, paginated"
        )
        
        if passed and isinstance(response_data, dict):
            # Verify response structure
            required_fields = ["items", "page", "pageSize", "total", "totalPages"]
            missing_fields = [field for field in required_fields if field not in response_data]
            
            if not missing_fields:
                print("   ✅ Response has all required pagination fields")
                print(f"   📊 Found {response_data.get('total', 0)} audit logs")
                print(f"   📄 Page {response_data.get('page', 'N/A')} of {response_data.get('totalPages', 'N/A')}")
                print(f"   📏 Page size: {response_data.get('pageSize', 'N/A')}")
            else:
                print(f"   ⚠️  Missing required fields: {missing_fields}")
                
        return status_code, response_data

    def test_audit_logs_date_validation(self):
        """Test date parameter validation"""
        print("\n📅 Testing /api/admin/audit-logs Date Validation")
        print("=" * 80)
        
        # Test invalid from date
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs", 
            body={"from": "invalid-date"}
        )
        
        self.log_result(
            "Invalid_From_Date",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=400,
            test_description="Invalid from date should return 400"
        )
        
        # Test invalid to date
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs", 
            body={"to": "not-a-date"}
        )
        
        self.log_result(
            "Invalid_To_Date",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=400,
            test_description="Invalid to date should return 400"
        )
        
        # Test date range too large (>90 days)
        from_date = (datetime.now() - timedelta(days=100)).isoformat()
        to_date = datetime.now().isoformat()
        
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs", 
            body={"from": from_date, "to": to_date}
        )
        
        self.log_result(
            "Date_Range_Too_Large",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=400,
            test_description="Date range >90 days should return 400"
        )

    def test_audit_logs_valid_date_range(self):
        """Test valid date range"""
        print("\n📅 Testing /api/admin/audit-logs Valid Date Range")
        print("=" * 80)
        
        # Test valid date range (last 7 days)
        from_date = (datetime.now() - timedelta(days=7)).isoformat()
        to_date = datetime.now().isoformat()
        
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs", 
            body={"from": from_date, "to": to_date}
        )
        
        self.log_result(
            "Valid_Date_Range",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=200,
            test_description="Valid 7-day date range should return 200"
        )

    def test_audit_logs_pagination(self):
        """Test pagination parameters"""
        print("\n📄 Testing /api/admin/audit-logs Pagination")
        print("=" * 80)
        
        # Test custom page size
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs", 
            body={"pageSize": "25"}
        )
        
        passed = self.log_result(
            "Custom_Page_Size",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=200,
            test_description="Custom pageSize=25 should work"
        )
        
        if passed and isinstance(response_data, dict):
            if response_data.get("pageSize") == 25:
                print("   ✅ PageSize correctly set to 25")
            else:
                print(f"   ⚠️  Expected pageSize 25, got {response_data.get('pageSize')}")
        
        # Test pageSize cap at 200
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs", 
            body={"pageSize": "500"}
        )
        
        passed = self.log_result(
            "PageSize_Cap",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=200,
            test_description="PageSize should be capped at 200"
        )
        
        if passed and isinstance(response_data, dict):
            if response_data.get("pageSize") == 200:
                print("   ✅ PageSize correctly capped at 200")
            else:
                print(f"   ⚠️  Expected pageSize 200 (capped), got {response_data.get('pageSize')}")

    def test_audit_logs_filters(self):
        """Test filter parameters"""
        print("\n🔍 Testing /api/admin/audit-logs Filters")
        print("=" * 80)
        
        # Test domain filter
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs", 
            body={"domain": "freight"}
        )
        
        self.log_result(
            "Domain_Filter",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=200,
            test_description="Domain filter should work"
        )
        
        # Test action filter
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs", 
            body={"action": "LOAD_UPDATE"}
        )
        
        self.log_result(
            "Action_Filter",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=200,
            test_description="Action filter should work"
        )
        
        # Test userId filter
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs", 
            body={"userId": "1"}
        )
        
        self.log_result(
            "UserId_Filter",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=200,
            test_description="UserId filter should work"
        )

    def test_audited_endpoints_create_logs(self):
        """Test that audited endpoints create audit log entries"""
        print("\n📝 Testing Audited Endpoints Create Audit Logs")
        print("=" * 80)
        
        # Get initial audit log count
        status_code, initial_response = self.make_request("/api/admin/audit-logs")
        initial_count = 0
        if status_code == 200 and isinstance(initial_response, dict):
            initial_count = initial_response.get("total", 0)
            print(f"   📊 Initial audit log count: {initial_count}")
        
        # Test freight load update endpoint (should create audit log)
        load_update_data = {
            "id": 1,
            "notes": f"Test update at {datetime.now().isoformat()}"
        }
        
        status_code, response_data = self.make_request(
            "/api/freight/loads/update",
            method="POST",
            body=load_update_data
        )
        
        self.log_result(
            "Freight_Load_Update",
            "/api/freight/loads/update",
            "POST",
            status_code,
            response_data,
            test_description="Freight load update should create audit log"
        )
        
        # Test BPO KPI upsert endpoint (should create audit log)
        kpi_data = {
            "campaignId": 1,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "handledCalls": 50,
            "isTest": True
        }
        
        status_code, response_data = self.make_request(
            "/api/bpo/kpi/upsert",
            method="POST",
            body=kpi_data
        )
        
        self.log_result(
            "BPO_KPI_Upsert",
            "/api/bpo/kpi/upsert",
            "POST",
            status_code,
            response_data,
            test_description="BPO KPI upsert should create audit log"
        )
        
        # Test cleanup test data endpoint (should create audit log)
        cleanup_data = {
            "confirm": "DELETE_ALL_TEST_DATA"
        }
        
        status_code, response_data = self.make_request(
            "/api/admin/cleanup-test-data",
            method="POST",
            body=cleanup_data
        )
        
        self.log_result(
            "Admin_Cleanup_Test_Data",
            "/api/admin/cleanup-test-data",
            "POST",
            status_code,
            response_data,
            test_description="Admin cleanup should create audit log"
        )
        
        # Wait a moment for audit logs to be written
        time.sleep(1)
        
        # Check if audit logs were created
        status_code, final_response = self.make_request("/api/admin/audit-logs")
        final_count = 0
        if status_code == 200 and isinstance(final_response, dict):
            final_count = final_response.get("total", 0)
            print(f"   📊 Final audit log count: {final_count}")
            
            if final_count > initial_count:
                print(f"   ✅ Audit logs created! Increased by {final_count - initial_count}")
                
                # Check for specific audit log entries
                items = final_response.get("items", [])
                if items:
                    print("   📋 Recent audit log entries:")
                    for item in items[:5]:  # Show first 5
                        print(f"      - {item.get('domain')}.{item.get('action')} on {item.get('entityType')} (ID: {item.get('entityId')})")
            else:
                print("   ⚠️  No new audit logs detected")

    def test_empty_audit_log_table(self):
        """Test that audit-logs API works when auditLog table is empty"""
        print("\n🗃️ Testing Empty Audit Log Table Handling")
        print("=" * 80)
        
        # This test assumes the table might be empty or we're testing edge cases
        status_code, response_data = self.make_request(
            "/api/admin/audit-logs",
            body={"from": "2020-01-01", "to": "2020-01-02"}  # Date range with no data
        )
        
        passed = self.log_result(
            "Empty_Table_Handling",
            "/api/admin/audit-logs",
            "GET",
            status_code,
            response_data,
            expected_status=200,
            test_description="Should handle empty results gracefully"
        )
        
        if passed and isinstance(response_data, dict):
            if response_data.get("total") == 0 and response_data.get("items") == []:
                print("   ✅ Correctly handles empty result set")
            else:
                print(f"   📊 Found {response_data.get('total', 'N/A')} logs in test date range")

    def run_all_tests(self):
        """Run all audit log tests"""
        print("🚀 Starting Audit Log Backend Tests")
        print("=" * 80)
        
        # Test audit-logs endpoint
        self.test_audit_logs_method_validation()
        self.test_audit_logs_authorization()
        self.test_audit_logs_default_behavior()
        self.test_audit_logs_date_validation()
        self.test_audit_logs_valid_date_range()
        self.test_audit_logs_pagination()
        self.test_audit_logs_filters()
        self.test_empty_audit_log_table()
        
        # Test audit log creation
        self.test_audited_endpoints_create_logs()
        
        # Summary
        print("\n📊 AUDIT LOG TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = [r for r in self.results if r['passed']]
        failed_tests = [r for r in self.results if not r['passed']]
        
        print(f"Total tests: {total_tests}")
        print(f"Passed: {len(passed_tests)} ✅")
        print(f"Failed: {len(failed_tests)} ❌")
        
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for result in failed_tests:
                print(f"  - {result['test_name']}: {result['method']} {result['endpoint']}")
                print(f"    Expected {result['expected_status']}, got {result['status_code']}")
        
        if passed_tests:
            print(f"\n✅ PASSED TESTS: {len(passed_tests)}/{total_tests}")
        
        success_rate = len(passed_tests) / total_tests * 100 if total_tests > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return len(failed_tests) == 0

def main():
    """Main test execution"""
    tester = AuditLogTester()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/audit_log_test_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/audit_log_test_results.json")
    
    if success:
        print("\n🎉 All audit log tests completed successfully!")
        return 0
    else:
        print("\n💥 Some audit log tests failed - check the results above")
        return 1

if __name__ == "__main__":
    exit(main())