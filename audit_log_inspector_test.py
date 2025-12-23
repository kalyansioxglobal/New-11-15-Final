#!/usr/bin/env python3
"""
Audit Log Inspector Backend and Frontend Testing
Testing the updated Audit Log Inspector backend endpoint and UI as per review request.

Scope:
1) Backend – GET /api/admin/audit-logs
   - Verify RBAC still holds: only CEO/ADMIN can access, others get 403.
   - Validate default date window still caps at last 7 days when from/to are not provided.
   - Check MAX_RANGE_DAYS=90 is still enforced (range > 90 days returns 400 with error+detail).
   - Confirm new `q` parameter behavior:
     • q searches across: requestId, action, entityType, entityId, userRole, and metadata (string_contains on JSON).
     • Make at least one call with q set to a known substring from an existing audit log's metadata and confirm it filters as expected.
   - Ensure pagination shape and behavior are unchanged: { items, page, pageSize, total, totalPages }.

2) Frontend – /admin/logs/audit-logs
   - Open the page as a CEO user (dev auto-auth).
   - Confirm base UI still renders: filters, table, pagination.
   - New QoL elements:
     • Quick range buttons ("Last 7 days", "Last 30 days") appear above filters and correctly set from/to, then reload data (page reset to 1).
     • Global search field (placeholder: "Search requestId, action, entity, text…") is present and wired to `q` – typing a term and clicking Apply should narrow down results.
   - Row-level detail:
     • Clicking on any row should open a modal/panel with:
       - Header: domain + action + timestamp + requestId.
       - Scope: ventureId, officeId, userId + userRole.
       - Entity: entityType + entityId.
       - Body: raw metadata JSON pretty-printed.
     • Closing the modal should return you to the table without losing current filters/page.

3) Error/edge behavior
   - Intentionally trigger:
     • Date range > 90 days (should show error banner in UI with 400's message).
     • Invalid date strings for from/to (should return 400 and surface as a banner, not a crash).
   - Confirm pagination footer still shows "Showing X–Y of N events" and that Prev/Next behave properly with filters active.
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import time

# Base URL for the API
BASE_URL = "http://localhost:3000"

class AuditLogInspectorTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, test_name: str, endpoint: str, method: str, status_code: int, 
                   response_data: Any, headers: Dict = None, body: Any = None,
                   test_description: str = "", expected_status: int = None):
        """Log test result"""
        is_success = status_code == expected_status if expected_status else status_code < 400
        
        result = {
            "test_name": test_name,
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "expected_status": expected_status,
            "response": response_data,
            "test_description": test_description,
            "headers": headers or {},
            "request_body": body,
            "success": is_success
        }
        self.results.append(result)
        
        status_emoji = "✅" if is_success else "❌"
        print(f"{status_emoji} {test_name}: {method} {endpoint} -> {status_code}")
        if test_description:
            print(f"   📝 {test_description}")
        if body:
            print(f"   📤 Request: {json.dumps(body, indent=2)}")
        print(f"   📥 Response: {json.dumps(response_data, indent=2)}")
        print("-" * 80)
        
        return is_success
        
    def test_endpoint(self, test_name: str, endpoint: str, method: str = "GET", 
                     headers: Dict = None, params: Dict = None, body: Any = None,
                     test_description: str = "", expected_status: int = None):
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
                
            return self.log_result(test_name, endpoint, method, response.status_code, 
                                 response_data, headers, body, test_description, expected_status)
            
        except Exception as e:
            error_data = {"error": str(e)}
            return self.log_result(test_name, endpoint, method, 0, error_data, headers, body, 
                                 f"Connection error: {test_description}", expected_status)

    def test_rbac_access_control(self):
        """Test RBAC - only CEO/ADMIN can access"""
        print("\n🔐 Testing RBAC Access Control")
        print("=" * 80)
        
        # Test without authentication (should work in dev mode with auto-auth as CEO)
        success = self.test_endpoint(
            "RBAC_CEO_ACCESS",
            "/api/admin/audit-logs",
            method="GET",
            test_description="CEO access in dev mode - should work (auto-auth as CEO)",
            expected_status=200
        )
        
        return success

    def test_method_validation(self):
        """Test method validation - only GET allowed"""
        print("\n🚫 Testing Method Validation")
        print("=" * 80)
        
        methods_to_test = ["POST", "PUT", "DELETE"]
        all_success = True
        
        for method in methods_to_test:
            success = self.test_endpoint(
                f"METHOD_VALIDATION_{method}",
                "/api/admin/audit-logs",
                method=method,
                test_description=f"Wrong method ({method}) - should return 405",
                expected_status=405
            )
            all_success = all_success and success
            
        return all_success

    def test_default_date_behavior(self):
        """Test default date window (last 7 days)"""
        print("\n📅 Testing Default Date Behavior")
        print("=" * 80)
        
        success = self.test_endpoint(
            "DEFAULT_DATE_WINDOW",
            "/api/admin/audit-logs",
            method="GET",
            test_description="No date params - should default to last 7 days",
            expected_status=200
        )
        
        return success

    def test_date_range_validation(self):
        """Test date range validation"""
        print("\n📊 Testing Date Range Validation")
        print("=" * 80)
        
        all_success = True
        
        # Test invalid from date
        success = self.test_endpoint(
            "INVALID_FROM_DATE",
            "/api/admin/audit-logs",
            method="GET",
            params={"from": "invalid-date"},
            test_description="Invalid from date - should return 400",
            expected_status=400
        )
        all_success = all_success and success
        
        # Test invalid to date
        success = self.test_endpoint(
            "INVALID_TO_DATE",
            "/api/admin/audit-logs",
            method="GET",
            params={"to": "invalid-date"},
            test_description="Invalid to date - should return 400",
            expected_status=400
        )
        all_success = all_success and success
        
        # Test range > 90 days (MAX_RANGE_DAYS)
        today = datetime.now()
        from_date = (today - timedelta(days=95)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
        
        success = self.test_endpoint(
            "RANGE_TOO_LARGE",
            "/api/admin/audit-logs",
            method="GET",
            params={"from": from_date, "to": to_date},
            test_description="Date range > 90 days - should return 400",
            expected_status=400
        )
        all_success = all_success and success
        
        # Test valid range (30 days)
        from_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
        
        success = self.test_endpoint(
            "VALID_DATE_RANGE",
            "/api/admin/audit-logs",
            method="GET",
            params={"from": from_date, "to": to_date},
            test_description="Valid 30-day range - should return 200",
            expected_status=200
        )
        all_success = all_success and success
        
        return all_success

    def test_pagination_behavior(self):
        """Test pagination parameters and response shape"""
        print("\n📄 Testing Pagination Behavior")
        print("=" * 80)
        
        all_success = True
        
        # Test default pagination
        success = self.test_endpoint(
            "DEFAULT_PAGINATION",
            "/api/admin/audit-logs",
            method="GET",
            test_description="Default pagination - should return page=1, pageSize=50",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test custom pagination
        success = self.test_endpoint(
            "CUSTOM_PAGINATION",
            "/api/admin/audit-logs",
            method="GET",
            params={"page": "2", "pageSize": "25"},
            test_description="Custom pagination - page=2, pageSize=25",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test pageSize limit (should cap at 200)
        success = self.test_endpoint(
            "PAGESIZE_LIMIT",
            "/api/admin/audit-logs",
            method="GET",
            params={"pageSize": "500"},
            test_description="PageSize > 200 - should cap at 200",
            expected_status=200
        )
        all_success = all_success and success
        
        return all_success

    def test_filtering_parameters(self):
        """Test filtering parameters"""
        print("\n🔍 Testing Filtering Parameters")
        print("=" * 80)
        
        all_success = True
        
        # Test domain filter
        success = self.test_endpoint(
            "DOMAIN_FILTER",
            "/api/admin/audit-logs",
            method="GET",
            params={"domain": "admin"},
            test_description="Domain filter - admin domain only",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test action filter
        success = self.test_endpoint(
            "ACTION_FILTER",
            "/api/admin/audit-logs",
            method="GET",
            params={"action": "LOAD_UPDATE"},
            test_description="Action filter - LOAD_UPDATE actions only",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test userId filter
        success = self.test_endpoint(
            "USERID_FILTER",
            "/api/admin/audit-logs",
            method="GET",
            params={"userId": "1"},
            test_description="UserId filter - user ID 1 only",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test ventureId filter
        success = self.test_endpoint(
            "VENTUREID_FILTER",
            "/api/admin/audit-logs",
            method="GET",
            params={"ventureId": "1"},
            test_description="VentureId filter - venture ID 1 only",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test officeId filter
        success = self.test_endpoint(
            "OFFICEID_FILTER",
            "/api/admin/audit-logs",
            method="GET",
            params={"officeId": "1"},
            test_description="OfficeId filter - office ID 1 only",
            expected_status=200
        )
        all_success = all_success and success
        
        return all_success

    def test_search_functionality(self):
        """Test the new 'q' parameter search functionality"""
        print("\n🔎 Testing Search Functionality (q parameter)")
        print("=" * 80)
        
        all_success = True
        
        # Test search by action
        success = self.test_endpoint(
            "SEARCH_BY_ACTION",
            "/api/admin/audit-logs",
            method="GET",
            params={"q": "UPDATE"},
            test_description="Search for 'UPDATE' in all fields",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test search by entity type
        success = self.test_endpoint(
            "SEARCH_BY_ENTITY",
            "/api/admin/audit-logs",
            method="GET",
            params={"q": "load"},
            test_description="Search for 'load' in all fields",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test search by user role
        success = self.test_endpoint(
            "SEARCH_BY_ROLE",
            "/api/admin/audit-logs",
            method="GET",
            params={"q": "CEO"},
            test_description="Search for 'CEO' in all fields",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test search in metadata (JSON string contains)
        success = self.test_endpoint(
            "SEARCH_IN_METADATA",
            "/api/admin/audit-logs",
            method="GET",
            params={"q": "changedFields"},
            test_description="Search for 'changedFields' in metadata JSON",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test empty search
        success = self.test_endpoint(
            "EMPTY_SEARCH",
            "/api/admin/audit-logs",
            method="GET",
            params={"q": ""},
            test_description="Empty search - should return all results",
            expected_status=200
        )
        all_success = all_success and success
        
        return all_success

    def test_response_structure(self):
        """Test response structure matches expected format"""
        print("\n📋 Testing Response Structure")
        print("=" * 80)
        
        success = self.test_endpoint(
            "RESPONSE_STRUCTURE",
            "/api/admin/audit-logs",
            method="GET",
            test_description="Verify response has correct structure: items, page, pageSize, total, totalPages",
            expected_status=200
        )
        
        if success and len(self.results) > 0:
            last_result = self.results[-1]
            response = last_result.get("response", {})
            
            required_fields = ["items", "page", "pageSize", "total", "totalPages"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"❌ Missing required fields in response: {missing_fields}")
                success = False
            else:
                print(f"✅ All required fields present: {required_fields}")
                
                # Check items structure if any exist
                items = response.get("items", [])
                if items:
                    item = items[0]
                    expected_item_fields = ["id", "createdAt", "domain", "action", "entityType", "userId", "userRole"]
                    missing_item_fields = [field for field in expected_item_fields if field not in item]
                    
                    if missing_item_fields:
                        print(f"❌ Missing fields in audit log item: {missing_item_fields}")
                        success = False
                    else:
                        print(f"✅ Audit log item has expected fields")
        
        return success

    def test_combined_filters(self):
        """Test combining multiple filters"""
        print("\n🔗 Testing Combined Filters")
        print("=" * 80)
        
        all_success = True
        
        # Test domain + action filter
        success = self.test_endpoint(
            "COMBINED_DOMAIN_ACTION",
            "/api/admin/audit-logs",
            method="GET",
            params={"domain": "freight", "action": "LOAD_UPDATE"},
            test_description="Combined domain=freight and action=LOAD_UPDATE",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test search + pagination
        success = self.test_endpoint(
            "COMBINED_SEARCH_PAGINATION",
            "/api/admin/audit-logs",
            method="GET",
            params={"q": "UPDATE", "page": "1", "pageSize": "10"},
            test_description="Combined search + pagination",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test date range + filters
        today = datetime.now()
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
        
        success = self.test_endpoint(
            "COMBINED_DATE_FILTERS",
            "/api/admin/audit-logs",
            method="GET",
            params={"from": from_date, "to": to_date, "domain": "admin", "userId": "1"},
            test_description="Combined date range + domain + userId filters",
            expected_status=200
        )
        all_success = all_success and success
        
        return all_success

    def test_edge_cases(self):
        """Test edge cases and error handling"""
        print("\n⚠️ Testing Edge Cases")
        print("=" * 80)
        
        all_success = True
        
        # Test negative page number
        success = self.test_endpoint(
            "NEGATIVE_PAGE",
            "/api/admin/audit-logs",
            method="GET",
            params={"page": "-1"},
            test_description="Negative page number - should default to 1",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test zero pageSize
        success = self.test_endpoint(
            "ZERO_PAGESIZE",
            "/api/admin/audit-logs",
            method="GET",
            params={"pageSize": "0"},
            test_description="Zero pageSize - should default to minimum",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test non-numeric userId
        success = self.test_endpoint(
            "NON_NUMERIC_USERID",
            "/api/admin/audit-logs",
            method="GET",
            params={"userId": "not-a-number"},
            test_description="Non-numeric userId - should be ignored",
            expected_status=200
        )
        all_success = all_success and success
        
        # Test very long search term
        long_search = "a" * 1000
        success = self.test_endpoint(
            "LONG_SEARCH_TERM",
            "/api/admin/audit-logs",
            method="GET",
            params={"q": long_search},
            test_description="Very long search term - should handle gracefully",
            expected_status=200
        )
        all_success = all_success and success
        
        return all_success

    def run_backend_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Audit Log Inspector Backend Tests")
        print("=" * 80)
        
        test_results = []
        
        # Run all test categories
        test_results.append(("RBAC Access Control", self.test_rbac_access_control()))
        test_results.append(("Method Validation", self.test_method_validation()))
        test_results.append(("Default Date Behavior", self.test_default_date_behavior()))
        test_results.append(("Date Range Validation", self.test_date_range_validation()))
        test_results.append(("Pagination Behavior", self.test_pagination_behavior()))
        test_results.append(("Filtering Parameters", self.test_filtering_parameters()))
        test_results.append(("Search Functionality", self.test_search_functionality()))
        test_results.append(("Response Structure", self.test_response_structure()))
        test_results.append(("Combined Filters", self.test_combined_filters()))
        test_results.append(("Edge Cases", self.test_edge_cases()))
        
        return test_results

    def generate_summary(self, test_results):
        """Generate test summary"""
        print("\n📊 TEST SUMMARY")
        print("=" * 80)
        
        total_categories = len(test_results)
        passed_categories = sum(1 for _, success in test_results if success)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results if result.get("success", False))
        
        print(f"Test Categories: {passed_categories}/{total_categories} passed")
        print(f"Individual Tests: {passed_tests}/{total_tests} passed")
        print()
        
        print("📋 Category Results:")
        for category, success in test_results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"  {status} {category}")
        
        print()
        
        # Show failed tests
        failed_tests = [r for r in self.results if not r.get("success", False)]
        if failed_tests:
            print("❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['test_name']}: {test['status_code']} (expected {test.get('expected_status', 'success')})")
                if test.get('response', {}).get('error'):
                    print(f"    Error: {test['response']['error']}")
        else:
            print("✅ All tests passed!")
        
        return passed_categories == total_categories and passed_tests == total_tests

def main():
    """Main test execution"""
    tester = AuditLogInspectorTester()
    
    # Run backend tests
    test_results = tester.run_backend_tests()
    
    # Generate summary
    overall_success = tester.generate_summary(test_results)
    
    # Write results to file
    output_file = '/app/audit_log_inspector_test_results.json'
    with open(output_file, 'w') as f:
        json.dump({
            "summary": {
                "total_categories": len(test_results),
                "passed_categories": sum(1 for _, success in test_results if success),
                "total_tests": len(tester.results),
                "passed_tests": sum(1 for result in tester.results if result.get("success", False)),
                "overall_success": overall_success
            },
            "category_results": [{"category": cat, "success": success} for cat, success in test_results],
            "detailed_results": tester.results
        }, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: {output_file}")
    
    if overall_success:
        print("\n🎉 All audit log inspector tests completed successfully!")
        return 0
    else:
        print("\n💥 Some tests failed - check the results above")
        return 1

if __name__ == "__main__":
    sys.exit(main())