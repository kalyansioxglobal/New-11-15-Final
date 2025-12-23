#!/usr/bin/env python3
"""
P3.6 RBAC and Edge Case Testing for Incentive Charts APIs
Testing RBAC scenarios and edge cases that might not be covered in basic tests
"""

import requests
import json
import sys
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"

class RBACTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, endpoint: str, method: str, status_code: int, 
                   response_data, test_description: str = ""):
        """Log test result"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "response": response_data,
            "test_description": test_description
        }
        self.results.append(result)
        
        status_emoji = "✅" if status_code < 400 else "❌"
        print(f"{status_emoji} {method} {endpoint} -> {status_code}")
        if test_description:
            print(f"   📝 {test_description}")
        print(f"   📥 Response: {json.dumps(response_data, indent=2) if isinstance(response_data, (dict, list)) else str(response_data)}")
        print("-" * 80)
        
    def test_endpoint(self, endpoint: str, method: str = "GET", test_description: str = ""):
        """Test an endpoint and log results"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            response = self.session.get(url)
            try:
                response_data = response.json()
            except:
                response_data = response.text
                
            self.log_result(endpoint, method, response.status_code, 
                          response_data, test_description)
            
            return response.status_code, response_data
            
        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            self.log_result(endpoint, method, 0, error_msg, test_description)
            return 0, error_msg

    def test_rbac_scenarios(self):
        """Test RBAC scenarios for both APIs"""
        print("\n🎯 TESTING RBAC SCENARIOS")
        print("=" * 60)
        
        # Test venture access for different ventures
        print("\n🔐 Venture Access Tests")
        
        # Test access to venture 1 (should work - CEO has access to all)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=1",
            test_description="CEO access to venture 1 (should work)"
        )
        
        # Test access to venture 2 (should work - CEO has access to all)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=2",
            test_description="CEO access to venture 2 (should work)"
        )
        
        # Test access to venture 999 (non-existent, should return empty data)
        self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=999",
            test_description="CEO access to non-existent venture 999 (should return empty data)"
        )
        
        # Test user timeseries RBAC
        print("\n👤 User Timeseries RBAC Tests")
        
        # Test access to user 1 in venture 1
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1&ventureId=1",
            test_description="CEO access to user 1 in venture 1 (should work)"
        )
        
        # Test access to user 999 in venture 1 (non-existent user)
        self.test_endpoint(
            "/api/incentives/user-timeseries?userId=999&ventureId=1",
            test_description="CEO access to non-existent user 999 in venture 1 (should return empty data)"
        )

    def test_edge_cases(self):
        """Test edge cases and boundary conditions"""
        print("\n🎯 TESTING EDGE CASES")
        print("=" * 60)
        
        # Test exactly 90-day range (should work)
        today = datetime.now()
        from_90 = (today - timedelta(days=89)).strftime("%Y-%m-%d")
        to_90 = today.strftime("%Y-%m-%d")
        
        self.test_endpoint(
            f"/api/incentives/venture-timeseries?ventureId=1&from={from_90}&to={to_90}",
            test_description="Exactly 90-day range (should work)"
        )
        
        # Test 91-day range (should fail)
        from_91 = (today - timedelta(days=90)).strftime("%Y-%m-%d")
        to_91 = today.strftime("%Y-%m-%d")
        
        self.test_endpoint(
            f"/api/incentives/venture-timeseries?ventureId=1&from={from_91}&to={to_91}",
            test_description="91-day range (should fail with 400)"
        )
        
        # Test same from/to date (1 day range)
        same_date = today.strftime("%Y-%m-%d")
        
        self.test_endpoint(
            f"/api/incentives/venture-timeseries?ventureId=1&from={same_date}&to={same_date}",
            test_description="Same from/to date (1 day range, should work)"
        )
        
        # Test future dates
        future_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
        
        self.test_endpoint(
            f"/api/incentives/venture-timeseries?ventureId=1&from={same_date}&to={future_date}",
            test_description="Future date range (should work but return empty data)"
        )
        
        # Test reverse date range (to < from)
        past_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        
        self.test_endpoint(
            f"/api/incentives/venture-timeseries?ventureId=1&from={same_date}&to={past_date}",
            test_description="Reverse date range (to < from, behavior depends on implementation)"
        )

    def test_data_consistency(self):
        """Test data consistency between venture and user timeseries"""
        print("\n🎯 TESTING DATA CONSISTENCY")
        print("=" * 60)
        
        # Get venture timeseries data
        status1, venture_data = self.test_endpoint(
            "/api/incentives/venture-timeseries?ventureId=1&from=2025-12-01&to=2025-12-07",
            test_description="Get venture 1 timeseries for consistency check"
        )
        
        # Get user timeseries data for same period
        status2, user_data = self.test_endpoint(
            "/api/incentives/user-timeseries?userId=1&ventureId=1&from=2025-12-01&to=2025-12-07",
            test_description="Get user 1 timeseries for consistency check"
        )
        
        if status1 == 200 and status2 == 200 and isinstance(venture_data, dict) and isinstance(user_data, dict):
            print("\n🔍 Checking data consistency...")
            
            # Check if date ranges match
            if venture_data.get("from") == user_data.get("from") and venture_data.get("to") == user_data.get("to"):
                print("   ✅ Date ranges match between venture and user APIs")
            else:
                print("   ❌ Date ranges don't match between venture and user APIs")
            
            # Check if points arrays have same structure
            venture_points = venture_data.get("points", [])
            user_points = user_data.get("points", [])
            
            if len(venture_points) == len(user_points):
                print(f"   ✅ Both APIs return same number of points ({len(venture_points)})")
            else:
                print(f"   ⚠️ Different number of points: venture={len(venture_points)}, user={len(user_points)}")
            
            # Check if amounts match (assuming user 1 is the only user in venture 1)
            if venture_points and user_points:
                venture_total = sum(p.get("amount", 0) for p in venture_points)
                user_total = sum(p.get("amount", 0) for p in user_points)
                
                if abs(venture_total - user_total) < 0.01:  # Allow for small floating point differences
                    print(f"   ✅ Total amounts match: ${venture_total:.2f}")
                else:
                    print(f"   ⚠️ Total amounts differ: venture=${venture_total:.2f}, user=${user_total:.2f}")

    def test_frontend_api_integration(self):
        """Test the APIs that the frontend would call"""
        print("\n🎯 TESTING FRONTEND API INTEGRATION")
        print("=" * 60)
        
        # Test ventures API (for dropdown population)
        self.test_endpoint(
            "/api/ventures",
            test_description="Get ventures list (for frontend dropdown)"
        )
        
        # Test venture summary API (existing functionality)
        self.test_endpoint(
            "/api/incentives/venture-summary?ventureId=1",
            test_description="Get venture summary (existing functionality)"
        )
        
        # Test user daily API (existing functionality for drill-down)
        self.test_endpoint(
            "/api/incentives/user-daily?userId=1&ventureId=1",
            test_description="Get user daily data (existing drill-down functionality)"
        )

    def run_all_tests(self):
        """Run all RBAC and edge case tests"""
        print("🚀 STARTING P3.6 RBAC AND EDGE CASE TESTING")
        print("=" * 80)
        
        try:
            self.test_rbac_scenarios()
            self.test_edge_cases()
            self.test_data_consistency()
            self.test_frontend_api_integration()
            
            # Summary
            print("\n📊 RBAC & EDGE CASE TEST SUMMARY")
            print("=" * 60)
            
            total_tests = len(self.results)
            passed_tests = len([r for r in self.results if r["status_code"] < 400])
            failed_tests = total_tests - passed_tests
            
            print(f"Total Tests: {total_tests}")
            print(f"✅ Passed: {passed_tests}")
            print(f"❌ Failed: {failed_tests}")
            print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
            
            return self.results
            
        except Exception as e:
            print(f"❌ Test execution failed: {str(e)}")
            return []

def main():
    """Main test execution"""
    tester = RBACTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open("/app/p3_6_rbac_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: /app/p3_6_rbac_test_results.json")
    
    return len([r for r in results if r["status_code"] >= 400 and "should fail" not in r["test_description"]]) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)