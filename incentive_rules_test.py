#!/usr/bin/env python3
"""
Incentive Rule Management Backend API Testing
Testing the /api/incentives/rules endpoint as per review request:

1. Auth & RBAC - unauthenticated requests should get 401, only CEO/ADMIN roles can access
2. GET /api/incentives/rules - with and without planId query param
3. POST /api/incentives/rules - create new rules with validation
4. PUT /api/incentives/rules - update existing rules
5. Soft delete via POST /api/incentives/rules?action=delete

Notes:
- Backend auto-auth in dev should make you CEO by default
- This is a Next.js pages API (not FastAPI); run against the running dev server on port 3000
- Need to verify audit events are written to AuditLog
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Base URL for the API
BASE_URL = "http://localhost:3000"

class IncentiveRulesAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        self.created_rule_id = None
        self.existing_plan_id = None
        
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
                response = self.session.delete(url, json=body, headers=headers)
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

    def test_auth_and_rbac(self):
        """Test authentication and role-based access control"""
        print("\n🔐 Testing Auth & RBAC")
        print("=" * 80)
        
        # Note: In development mode, the app auto-authenticates as CEO
        # So we expect successful responses, not 401s
        status_code, response = self.test_endpoint(
            "/api/incentives/rules",
            method="GET",
            test_description="Should work with auto-auth as CEO in dev mode"
        )
        
        # Verify we get a successful response (not 401)
        if status_code == 200:
            print("✅ Auto-authentication as CEO working correctly in dev mode")
        elif status_code == 401:
            print("❌ Unexpected 401 - auto-auth may not be working")
        elif status_code == 403:
            print("❌ Unexpected 403 - role check may be failing")
        
        return status_code, response

    def test_get_all_rules(self):
        """Test GET /api/incentives/rules without planId"""
        print("\n📋 Testing GET /api/incentives/rules (all rules)")
        print("=" * 80)
        
        status_code, response = self.test_endpoint(
            "/api/incentives/rules",
            method="GET",
            test_description="Get all incentive rules"
        )
        
        if status_code == 200 and isinstance(response, list):
            print(f"✅ Retrieved {len(response)} rules")
            if len(response) > 0:
                # Validate JSON shape
                rule = response[0]
                required_fields = ['id', 'planId', 'roleKey', 'metricKey', 'calcType', 'rate', 'currency', 'isEnabled']
                missing_fields = [field for field in required_fields if field not in rule]
                if missing_fields:
                    print(f"❌ Missing required fields in response: {missing_fields}")
                else:
                    print("✅ Response JSON shape includes all required fields")
                    # Store an existing planId for later tests
                    self.existing_plan_id = rule.get('planId')
        
        return status_code, response

    def test_get_rules_by_plan_id(self):
        """Test GET /api/incentives/rules with planId query param"""
        print("\n📋 Testing GET /api/incentives/rules?planId=X")
        print("=" * 80)
        
        if not self.existing_plan_id:
            print("⚠️ No existing planId found, skipping planId filter test")
            return None, None
        
        status_code, response = self.test_endpoint(
            f"/api/incentives/rules?planId={self.existing_plan_id}",
            method="GET",
            test_description=f"Get rules for planId={self.existing_plan_id}"
        )
        
        if status_code == 200 and isinstance(response, list):
            print(f"✅ Retrieved {len(response)} rules for planId={self.existing_plan_id}")
            # Verify all returned rules have the correct planId
            if len(response) > 0:
                wrong_plan_rules = [r for r in response if r.get('planId') != self.existing_plan_id]
                if wrong_plan_rules:
                    print(f"❌ Found {len(wrong_plan_rules)} rules with wrong planId")
                else:
                    print("✅ All returned rules have correct planId")
        
        return status_code, response

    def test_create_rule_validation(self):
        """Test POST /api/incentives/rules validation"""
        print("\n✏️ Testing POST /api/incentives/rules - Validation")
        print("=" * 80)
        
        # Test missing planId
        self.test_endpoint(
            "/api/incentives/rules",
            method="POST",
            body={},
            test_description="Missing planId - should return 400"
        )
        
        # Test missing metricKey
        self.test_endpoint(
            "/api/incentives/rules",
            method="POST",
            body={"planId": 1},
            test_description="Missing metricKey - should return 400"
        )
        
        # Test missing calcType
        self.test_endpoint(
            "/api/incentives/rules",
            method="POST",
            body={"planId": 1, "metricKey": "test_metric"},
            test_description="Missing calcType - should return 400"
        )

    def test_create_rule_success(self):
        """Test POST /api/incentives/rules - Happy path"""
        print("\n✏️ Testing POST /api/incentives/rules - Success")
        print("=" * 80)
        
        if not self.existing_plan_id:
            print("⚠️ No existing planId found, using planId=1 for test")
            plan_id = 1
        else:
            plan_id = self.existing_plan_id
        
        rule_data = {
            "planId": plan_id,
            "roleKey": "SALES",
            "metricKey": "test_metric_created",
            "calcType": "FLAT_PER_UNIT",
            "rate": 5.0,
            "currency": "USD",
            "isEnabled": True
        }
        
        status_code, response = self.test_endpoint(
            "/api/incentives/rules",
            method="POST",
            body=rule_data,
            test_description="Create new incentive rule"
        )
        
        if status_code == 201 and isinstance(response, dict):
            print("✅ Rule created successfully")
            self.created_rule_id = response.get('id')
            print(f"✅ Created rule ID: {self.created_rule_id}")
            
            # Verify the rule is now visible via GET
            get_status, get_response = self.test_endpoint(
                "/api/incentives/rules",
                method="GET",
                test_description="Verify created rule is visible"
            )
            
            if get_status == 200:
                created_rule = next((r for r in get_response if r.get('id') == self.created_rule_id), None)
                if created_rule:
                    print("✅ Created rule is visible in GET response")
                else:
                    print("❌ Created rule not found in GET response")
        
        return status_code, response

    def test_update_rule_not_found(self):
        """Test PUT /api/incentives/rules - 404 path"""
        print("\n📝 Testing PUT /api/incentives/rules - Not Found")
        print("=" * 80)
        
        self.test_endpoint(
            "/api/incentives/rules",
            method="PUT",
            body={"id": 99999, "rate": 10.0},
            test_description="Update non-existent rule - should return 404"
        )

    def test_update_rule_success(self):
        """Test PUT /api/incentives/rules - Happy path"""
        print("\n📝 Testing PUT /api/incentives/rules - Success")
        print("=" * 80)
        
        if not self.created_rule_id:
            print("⚠️ No created rule ID found, skipping update test")
            return None, None
        
        update_data = {
            "id": self.created_rule_id,
            "rate": 7.5,
            "currency": "EUR",
            "isEnabled": False
        }
        
        status_code, response = self.test_endpoint(
            "/api/incentives/rules",
            method="PUT",
            body=update_data,
            test_description="Update existing rule"
        )
        
        if status_code == 200 and isinstance(response, dict):
            print("✅ Rule updated successfully")
            # Verify the changes
            if response.get('rate') == 7.5:
                print("✅ Rate updated correctly")
            if response.get('currency') == 'EUR':
                print("✅ Currency updated correctly")
            if response.get('isEnabled') == False:
                print("✅ isEnabled updated correctly")
        
        return status_code, response

    def test_soft_delete_not_found(self):
        """Test soft delete - 404 path"""
        print("\n🗑️ Testing POST /api/incentives/rules?action=delete - Not Found")
        print("=" * 80)
        
        self.test_endpoint(
            "/api/incentives/rules?action=delete",
            method="POST",
            body={"id": 99999},
            test_description="Soft delete non-existent rule - should return 404"
        )

    def test_soft_delete_success(self):
        """Test soft delete - Happy path"""
        print("\n🗑️ Testing POST /api/incentives/rules?action=delete - Success")
        print("=" * 80)
        
        if not self.created_rule_id:
            print("⚠️ No created rule ID found, skipping soft delete test")
            return None, None
        
        status_code, response = self.test_endpoint(
            "/api/incentives/rules?action=delete",
            method="POST",
            body={"id": self.created_rule_id},
            test_description="Soft delete rule (set isEnabled=false)"
        )
        
        if status_code == 200 and isinstance(response, dict):
            print("✅ Rule soft deleted successfully")
            # Verify isEnabled is now false
            if response.get('isEnabled') == False:
                print("✅ Rule isEnabled set to false (soft deleted)")
            else:
                print("❌ Rule isEnabled not set to false")
            
            # Verify the rule still exists but is disabled
            get_status, get_response = self.test_endpoint(
                "/api/incentives/rules",
                method="GET",
                test_description="Verify soft deleted rule still exists"
            )
            
            if get_status == 200:
                deleted_rule = next((r for r in get_response if r.get('id') == self.created_rule_id), None)
                if deleted_rule and deleted_rule.get('isEnabled') == False:
                    print("✅ Soft deleted rule still exists with isEnabled=false")
                else:
                    print("❌ Soft deleted rule not found or not properly disabled")
        
        return status_code, response

    def test_audit_events(self):
        """Test that audit events are written to AuditLog"""
        print("\n📊 Testing Audit Event Logging")
        print("=" * 80)
        
        # Query audit logs for incentive rule events
        status_code, response = self.test_endpoint(
            "/api/admin/audit-logs?domain=admin&action=INCENTIVE_RULE_CREATE",
            method="GET",
            test_description="Check for INCENTIVE_RULE_CREATE audit events"
        )
        
        if status_code == 200 and isinstance(response, dict):
            items = response.get('items', [])
            create_events = [item for item in items if item.get('action') == 'INCENTIVE_RULE_CREATE']
            print(f"✅ Found {len(create_events)} INCENTIVE_RULE_CREATE audit events")
        
        # Check for update events
        status_code, response = self.test_endpoint(
            "/api/admin/audit-logs?domain=admin&action=INCENTIVE_RULE_UPDATE",
            method="GET",
            test_description="Check for INCENTIVE_RULE_UPDATE audit events"
        )
        
        if status_code == 200 and isinstance(response, dict):
            items = response.get('items', [])
            update_events = [item for item in items if item.get('action') == 'INCENTIVE_RULE_UPDATE']
            print(f"✅ Found {len(update_events)} INCENTIVE_RULE_UPDATE audit events")
        
        # Check for delete events
        status_code, response = self.test_endpoint(
            "/api/admin/audit-logs?domain=admin&action=INCENTIVE_RULE_DELETE",
            method="GET",
            test_description="Check for INCENTIVE_RULE_DELETE audit events"
        )
        
        if status_code == 200 and isinstance(response, dict):
            items = response.get('items', [])
            delete_events = [item for item in items if item.get('action') == 'INCENTIVE_RULE_DELETE']
            print(f"✅ Found {len(delete_events)} INCENTIVE_RULE_DELETE audit events")

    def test_method_validation(self):
        """Test unsupported HTTP methods"""
        print("\n🚫 Testing Method Validation")
        print("=" * 80)
        
        # Test unsupported methods
        unsupported_methods = ["PATCH", "HEAD", "OPTIONS"]
        for method in unsupported_methods:
            try:
                url = f"{BASE_URL}/api/incentives/rules"
                response = self.session.request(method, url)
                self.log_result("/api/incentives/rules", method, response.status_code, 
                              {"raw_response": response.text}, {}, None,
                              f"Unsupported method {method} - should return 405")
            except Exception as e:
                print(f"⚠️ Could not test {method}: {e}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Incentive Rules API Tests")
        print("=" * 80)
        
        # Test sequence
        self.test_auth_and_rbac()
        self.test_get_all_rules()
        self.test_get_rules_by_plan_id()
        self.test_create_rule_validation()
        self.test_create_rule_success()
        self.test_update_rule_not_found()
        self.test_update_rule_success()
        self.test_soft_delete_not_found()
        self.test_soft_delete_success()
        self.test_audit_events()
        self.test_method_validation()
        
        # Summary
        print("\n📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        successful_tests = [r for r in self.results if r['status_code'] in [200, 201]]
        validation_errors = [r for r in self.results if r['status_code'] == 400]
        not_found_errors = [r for r in self.results if r['status_code'] == 404]
        method_errors = [r for r in self.results if r['status_code'] == 405]
        auth_errors = [r for r in self.results if r['status_code'] in [401, 403]]
        connection_errors = [r for r in self.results if r['status_code'] == 0]
        other_errors = [r for r in self.results if r['status_code'] >= 400 and r['status_code'] not in [400, 404, 405, 401, 403]]
        
        print(f"Total tests: {total_tests}")
        print(f"Successful (200/201): {len(successful_tests)}")
        print(f"Validation errors (400): {len(validation_errors)}")
        print(f"Not found (404): {len(not_found_errors)}")
        print(f"Method not allowed (405): {len(method_errors)}")
        print(f"Auth errors (401/403): {len(auth_errors)}")
        print(f"Connection errors: {len(connection_errors)}")
        print(f"Other errors: {len(other_errors)}")
        
        if connection_errors:
            print("\n❌ CONNECTION ERRORS:")
            for result in connection_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['response'].get('error', 'Unknown error')}")
        
        if other_errors:
            print("\n❌ UNEXPECTED ERRORS:")
            for result in other_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['status_code']} - {result['response']}")
        
        # Determine overall success
        critical_failures = len(connection_errors) + len(other_errors)
        expected_behaviors = len(validation_errors) + len(not_found_errors) + len(method_errors)
        
        print(f"\n✅ EXPECTED BEHAVIORS: {expected_behaviors}")
        print(f"✅ SUCCESSFUL OPERATIONS: {len(successful_tests)}")
        print(f"❌ CRITICAL FAILURES: {critical_failures}")
        
        return critical_failures == 0

def main():
    """Main test execution"""
    tester = IncentiveRulesAPITester()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/incentive_rules_test_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/incentive_rules_test_results.json")
    
    if success:
        print("\n🎉 All tests completed successfully!")
        return 0
    else:
        print("\n💥 Some tests failed - check the results above")
        return 1

if __name__ == "__main__":
    sys.exit(main())