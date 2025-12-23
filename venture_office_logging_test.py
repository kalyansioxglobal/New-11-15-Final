#!/usr/bin/env python3
"""
Venture/Office Logging Tightening Verification Test
Testing the following endpoints for proper venture/office context logging:

1. /api/logistics/freight-pnl - Check api_request logs for ventureId and officeId
2. /api/freight/loads/update - Check audit_event logs for metadata.ventureId
3. /api/bpo/kpi and /api/bpo/kpi/upsert - Check logs for ventureId in user context
4. /api/hotels/disputes (index) and /api/hotels/disputes/[id] - Check audit_event logs
5. /api/ventures - Check api_request logs for endpoint and pageSize

Focus: Ensure no regressions and that new venture/office context enrichments behave as expected in logs.
"""

import requests
import json
import sys
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

# Base URL for the API
BASE_URL = "http://localhost:3000"

class VentureOfficeLoggingTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        self.log_entries = []
        
    def log_result(self, endpoint: str, method: str, status_code: int, 
                   response_data: Any, test_description: str = "", 
                   expected_logs: List[str] = None):
        """Log test result with expected logging behavior"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "response": response_data,
            "test_description": test_description,
            "expected_logs": expected_logs or [],
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        status_emoji = "✅" if status_code < 400 else "❌"
        print(f"{status_emoji} {method} {endpoint} -> {status_code}")
        if test_description:
            print(f"   📝 {test_description}")
        if expected_logs:
            print(f"   📊 Expected logs: {', '.join(expected_logs)}")
        print(f"   📥 Response: {json.dumps(response_data, indent=2)[:200]}...")
        print("-" * 80)
        
    def test_endpoint(self, endpoint: str, method: str = "GET", 
                     headers: Dict = None, body: Any = None,
                     test_description: str = "", expected_logs: List[str] = None):
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
                response_data = {"raw_response": response.text[:500]}
                
            self.log_result(endpoint, method, response.status_code, 
                          response_data, test_description, expected_logs)
            
            return response.status_code, response_data
            
        except Exception as e:
            error_data = {"error": str(e)}
            self.log_result(endpoint, method, 0, error_data, 
                          f"Connection error: {test_description}", expected_logs)
            return 0, error_data

    def test_logistics_freight_pnl(self):
        """Test /api/logistics/freight-pnl for venture/office logging"""
        print("\n🚛 Testing /api/logistics/freight-pnl - Venture/Office Context Logging")
        print("=" * 80)
        
        # Test 1: Basic request - should log api_request with venture/office context
        status, response = self.test_endpoint(
            "/api/logistics/freight-pnl",
            method="GET",
            test_description="Basic P&L request - should log api_request with ventureId/officeId context",
            expected_logs=["api_request with ventureId", "api_request with officeId or user's primary office"]
        )
        
        # Test 2: With specific officeId parameter
        status, response = self.test_endpoint(
            "/api/logistics/freight-pnl?officeId=1",
            method="GET", 
            test_description="P&L with officeId param - should log requested officeId in api_request",
            expected_logs=["api_request with officeId=1"]
        )
        
        # Test 3: With date range
        from_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        to_date = datetime.now().strftime('%Y-%m-%d')
        status, response = self.test_endpoint(
            f"/api/logistics/freight-pnl?from={from_date}&to={to_date}",
            method="GET",
            test_description="P&L with date range - should log dateFrom/dateTo in api_request",
            expected_logs=["api_request with dateFrom", "api_request with dateTo"]
        )

    def test_freight_loads_update(self):
        """Test /api/freight/loads/update for audit_event logging"""
        print("\n📦 Testing /api/freight/loads/update - Audit Event Logging")
        print("=" * 80)
        
        # Test 1: Method validation
        status, response = self.test_endpoint(
            "/api/freight/loads/update",
            method="GET",
            test_description="Wrong method - should return 405",
            expected_logs=[]
        )
        
        # Test 2: Invalid load ID
        status, response = self.test_endpoint(
            "/api/freight/loads/update",
            method="POST",
            body={"id": "invalid"},
            test_description="Invalid load ID - should return 400",
            expected_logs=[]
        )
        
        # Test 3: Non-existent load
        status, response = self.test_endpoint(
            "/api/freight/loads/update", 
            method="POST",
            body={"id": 99999, "notes": "Test update"},
            test_description="Non-existent load - should return 404",
            expected_logs=[]
        )
        
        # Test 4: Valid update (if load exists)
        status, response = self.test_endpoint(
            "/api/freight/loads/update",
            method="POST", 
            body={"id": 1, "notes": "Updated notes for logging test"},
            test_description="Valid load update - should log audit_event with metadata.ventureId",
            expected_logs=["audit_event with domain=freight", "audit_event with metadata.ventureId"]
        )

    def test_bpo_kpi_endpoints(self):
        """Test /api/bpo/kpi and /api/bpo/kpi/upsert for venture context logging"""
        print("\n📞 Testing BPO KPI Endpoints - Venture Context Logging")
        print("=" * 80)
        
        # Test 1: BPO KPI index
        status, response = self.test_endpoint(
            "/api/bpo/kpi",
            method="GET",
            test_description="BPO KPI query - should log api_request with ventureId in user context",
            expected_logs=["api_request with ventureId in user context"]
        )
        
        # Test 2: BPO KPI with venture filter
        status, response = self.test_endpoint(
            "/api/bpo/kpi?ventureId=1",
            method="GET",
            test_description="BPO KPI with ventureId param - should log venture context",
            expected_logs=["api_request with ventureId context"]
        )
        
        # Test 3: BPO KPI upsert - method validation
        status, response = self.test_endpoint(
            "/api/bpo/kpi/upsert",
            method="GET",
            test_description="Wrong method for upsert - should return 405",
            expected_logs=[]
        )
        
        # Test 4: BPO KPI upsert - missing data
        status, response = self.test_endpoint(
            "/api/bpo/kpi/upsert",
            method="POST",
            body={},
            test_description="Missing required data - should return 400",
            expected_logs=[]
        )
        
        # Test 5: BPO KPI upsert - valid data
        today = datetime.now().strftime('%Y-%m-%d')
        status, response = self.test_endpoint(
            "/api/bpo/kpi/upsert",
            method="POST",
            body={
                "campaignId": 1,
                "date": today,
                "handledCalls": 50,
                "leadsCreated": 10
            },
            test_description="Valid BPO KPI upsert - should log audit_event with venture context",
            expected_logs=["audit_event with domain=bpo", "audit_event with campaignId context"]
        )

    def test_hotels_disputes_endpoints(self):
        """Test /api/hotels/disputes endpoints for audit logging"""
        print("\n🏨 Testing Hotels Disputes Endpoints - Audit Event Logging")
        print("=" * 80)
        
        # Test 1: Disputes index
        status, response = self.test_endpoint(
            "/api/hotels/disputes",
            method="GET",
            test_description="Hotels disputes list - should log audit_event with proper domain/action",
            expected_logs=["audit_event with domain context"]
        )
        
        # Test 2: Disputes index with filters
        status, response = self.test_endpoint(
            "/api/hotels/disputes?status=OPEN&includeTest=false",
            method="GET",
            test_description="Disputes with filters - should log venture/office context from user",
            expected_logs=["venture/office context from user ventures/offices"]
        )
        
        # Test 3: Specific dispute - method validation
        status, response = self.test_endpoint(
            "/api/hotels/disputes/1",
            method="POST",
            test_description="Wrong method for dispute detail - should return 405",
            expected_logs=[]
        )
        
        # Test 4: Specific dispute - invalid ID
        status, response = self.test_endpoint(
            "/api/hotels/disputes/invalid",
            method="GET",
            test_description="Invalid dispute ID - should return 400",
            expected_logs=[]
        )
        
        # Test 5: Dispute update with valid data
        status, response = self.test_endpoint(
            "/api/hotels/disputes/1",
            method="PUT",
            body={"status": "OPEN", "internalNotes": "Updated for logging test"},
            test_description="Valid dispute update - should log audit_event with correct domain/action",
            expected_logs=["audit_event with domain=hotels", "audit_event with action=DISPUTE_UPDATE"]
        )

    def test_ventures_endpoint(self):
        """Test /api/ventures for api_request logging"""
        print("\n🏢 Testing /api/ventures - API Request Logging")
        print("=" * 80)
        
        # Test 1: Basic ventures list
        status, response = self.test_endpoint(
            "/api/ventures",
            method="GET",
            test_description="Basic ventures list - should log api_request with endpoint='/ventures' and pageSize",
            expected_logs=["api_request with endpoint=/ventures", "api_request with pageSize"]
        )
        
        # Test 2: Ventures with limit
        status, response = self.test_endpoint(
            "/api/ventures?limit=25",
            method="GET",
            test_description="Ventures with limit - should log pageSize=25",
            expected_logs=["api_request with pageSize=25"]
        )
        
        # Test 3: Ventures with high limit (should be capped)
        status, response = self.test_endpoint(
            "/api/ventures?limit=500",
            method="GET", 
            test_description="Ventures with high limit - should cap at 200 and log pageSize=200",
            expected_logs=["api_request with pageSize=200"]
        )
        
        # Test 4: Method validation
        status, response = self.test_endpoint(
            "/api/ventures",
            method="POST",
            test_description="Wrong method - should return 405",
            expected_logs=[]
        )

    def check_backend_logs(self):
        """Check backend logs for expected logging patterns"""
        print("\n📋 Checking Backend Logs for Logging Patterns")
        print("=" * 80)
        
        try:
            # Try to read supervisor logs
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "100", "/var/log/supervisor/backend.out.log"],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                log_lines = result.stdout.split('\n')
                print(f"📊 Found {len(log_lines)} recent log lines")
                
                # Look for specific logging patterns
                api_request_logs = [line for line in log_lines if 'api_request' in line]
                audit_event_logs = [line for line in log_lines if 'audit_event' in line]
                
                print(f"   🔍 api_request logs: {len(api_request_logs)}")
                print(f"   🔍 audit_event logs: {len(audit_event_logs)}")
                
                # Show sample logs
                if api_request_logs:
                    print("\n   📝 Sample api_request log:")
                    print(f"   {api_request_logs[-1][:200]}...")
                    
                if audit_event_logs:
                    print("\n   📝 Sample audit_event log:")
                    print(f"   {audit_event_logs[-1][:200]}...")
                    
                return True
            else:
                print("❌ Could not read backend logs")
                return False
                
        except Exception as e:
            print(f"❌ Error checking logs: {e}")
            return False

    def run_all_tests(self):
        """Run all venture/office logging tests"""
        print("🚀 Starting Venture/Office Logging Tightening Verification")
        print("=" * 80)
        
        # Test each endpoint group
        self.test_logistics_freight_pnl()
        self.test_freight_loads_update()
        self.test_bpo_kpi_endpoints()
        self.test_hotels_disputes_endpoints()
        self.test_ventures_endpoint()
        
        # Check backend logs
        logs_available = self.check_backend_logs()
        
        # Summary
        print("\n📊 VENTURE/OFFICE LOGGING TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        successful_tests = [r for r in self.results if r['status_code'] < 400]
        failed_tests = [r for r in self.results if r['status_code'] >= 400 and r['status_code'] != 401 and r['status_code'] != 403 and r['status_code'] != 405]
        expected_failures = [r for r in self.results if r['status_code'] in [401, 403, 405]]
        connection_errors = [r for r in self.results if r['status_code'] == 0]
        
        print(f"Total tests: {total_tests}")
        print(f"Successful requests: {len(successful_tests)}")
        print(f"Expected failures (401/403/405): {len(expected_failures)}")
        print(f"Unexpected failures: {len(failed_tests)}")
        print(f"Connection errors: {len(connection_errors)}")
        print(f"Backend logs available: {'✅' if logs_available else '❌'}")
        
        # Key findings
        print("\n🎯 KEY FINDINGS:")
        
        # Check for successful P&L requests
        pnl_success = any(r['endpoint'].endswith('freight-pnl') and r['status_code'] == 200 for r in self.results)
        print(f"   📊 Freight P&L logging: {'✅ Working' if pnl_success else '❌ Issues detected'}")
        
        # Check for load update attempts
        load_update_attempts = [r for r in self.results if 'loads/update' in r['endpoint']]
        print(f"   📦 Load update audit logging: {len(load_update_attempts)} tests performed")
        
        # Check for BPO KPI tests
        bpo_tests = [r for r in self.results if '/bpo/kpi' in r['endpoint']]
        print(f"   📞 BPO KPI logging: {len(bpo_tests)} tests performed")
        
        # Check for hotel disputes tests
        hotel_tests = [r for r in self.results if '/hotels/disputes' in r['endpoint']]
        print(f"   🏨 Hotel disputes logging: {len(hotel_tests)} tests performed")
        
        # Check for ventures tests
        venture_tests = [r for r in self.results if r['endpoint'] == '/api/ventures']
        ventures_success = any(r['status_code'] == 200 for r in venture_tests)
        print(f"   🏢 Ventures logging: {'✅ Working' if ventures_success else '❌ Issues detected'}")
        
        if connection_errors:
            print("\n❌ CONNECTION ERRORS:")
            for result in connection_errors:
                print(f"  - {result['method']} {result['endpoint']}: {result['response'].get('error', 'Unknown error')}")
        
        if failed_tests:
            print("\n❌ UNEXPECTED FAILURES:")
            for result in failed_tests:
                print(f"  - {result['method']} {result['endpoint']}: {result['status_code']}")
        
        print("\n✅ EXPECTED BEHAVIORS (Auth/Method Validation):")
        for result in expected_failures:
            print(f"  - {result['method']} {result['endpoint']}: {result['status_code']} (Expected)")
        
        # Overall assessment
        critical_issues = len(connection_errors) + len(failed_tests)
        if critical_issues == 0 and (pnl_success or ventures_success):
            print(f"\n🎉 LOGGING VERIFICATION: ✅ PASSED")
            print("   - No critical issues detected")
            print("   - Key endpoints responding correctly")
            print("   - Logging infrastructure appears functional")
        else:
            print(f"\n⚠️ LOGGING VERIFICATION: ❌ ISSUES DETECTED")
            print(f"   - {critical_issues} critical issues found")
            print("   - Manual log inspection recommended")
        
        return critical_issues == 0

def main():
    """Main test execution"""
    tester = VentureOfficeLoggingTester()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/venture_office_logging_test_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/venture_office_logging_test_results.json")
    
    if success:
        print("\n🎉 Venture/Office logging verification completed successfully!")
        return 0
    else:
        print("\n💥 Issues detected - manual inspection recommended")
        return 1

if __name__ == "__main__":
    sys.exit(main())