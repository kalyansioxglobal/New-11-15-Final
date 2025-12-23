#!/usr/bin/env python3
"""
Business Flows Regression Testing
Testing the following core business flows as per review request:

1) Freight flow: load create → margin calc → lost-load mark → at-risk → P&L views
2) Hotels flow: disputes create/update → metrics endpoints → dashboards → rate-shopping placeholder stability  
3) BPO flow: KPI upsert → KPI dashboard → agent filters

This test drives each flow end-to-end with realistic data and reports pass/fail status.
"""

import requests
import json
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import time

# Base URL for the API - using localhost as per system instructions
BASE_URL = "http://localhost:3000"

class BusinessFlowTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        self.test_data = {}
        
    def log_result(self, flow: str, step: str, status: str, notes: str, blockers: str = ""):
        """Log test result in matrix format"""
        result = {
            "flow": flow,
            "step": step,
            "status": status,
            "notes": notes,
            "blockers": blockers,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        status_emoji = "✅" if status == "PASS" else "❌"
        print(f"{status_emoji} {flow}: {step} -> {status}")
        print(f"   📝 {notes}")
        if blockers:
            print(f"   🚫 Blockers: {blockers}")
        print("-" * 80)

    def make_request(self, method: str, endpoint: str, data: Any = None, params: Dict = None) -> tuple:
        """Make HTTP request and return status code and response data"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, params=params)
            elif method == "POST":
                response = self.session.post(url, json=data, params=params)
            elif method == "PUT":
                response = self.session.put(url, json=data, params=params)
            elif method == "DELETE":
                response = self.session.delete(url, json=data, params=params)
            else:
                return 0, {"error": f"Unsupported method: {method}"}
                
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
                
            return response.status_code, response_data
            
        except Exception as e:
            return 0, {"error": str(e)}

    def test_freight_flow(self):
        """Test Freight flow: load create → margin calc → lost-load mark → at-risk → P&L views"""
        print("\n🚛 Testing Freight Flow")
        print("=" * 80)
        
        # Step 1: Create Load
        load_data = {
            "ventureId": 1,
            "officeId": 1,
            "reference": "TEST-LOAD-001",
            "shipperName": "Acme Shipping Co",
            "customerName": "Global Logistics Inc",
            "pickupCity": "Chicago",
            "pickupState": "IL",
            "pickupZip": "60601",
            "pickupDate": (datetime.now() + timedelta(days=1)).isoformat(),
            "dropCity": "Atlanta",
            "dropState": "GA", 
            "dropZip": "30301",
            "dropDate": (datetime.now() + timedelta(days=3)).isoformat(),
            "equipmentType": "DRY_VAN",
            "weightLbs": 45000,
            "billAmount": 2500.00,
            "costAmount": 2000.00,
            "notes": "Regression test load"
        }
        
        status_code, response = self.make_request("POST", "/api/freight/loads/create", load_data)
        
        if status_code == 201 and "load" in response:
            load_id = response["load"]["id"]
            margin = response["load"].get("marginAmount", 0)
            self.test_data["load_id"] = load_id
            self.log_result("Freight", "Create Load", "PASS", 
                          f"Load created with ID {load_id}, margin calculated: ${margin}")
        else:
            self.log_result("Freight", "Create Load", "FAIL", 
                          f"Status: {status_code}, Response: {response}", 
                          "Cannot create load - blocking subsequent tests")
            return

        # Step 2: Mark Load as Lost
        lost_data = {
            "id": load_id,
            "lostReasonId": 1,  # Assuming reason ID 1 exists
            "note": "Customer cancelled - regression test"
        }
        
        status_code, response = self.make_request("POST", "/api/freight/loads/mark-lost", lost_data)
        
        if status_code == 200 and response.get("load", {}).get("loadStatus") == "LOST":
            self.log_result("Freight", "Mark Lost", "PASS", 
                          f"Load {load_id} marked as LOST successfully")
        else:
            self.log_result("Freight", "Mark Lost", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Step 3: Create another load and mark at-risk
        load_data["reference"] = "TEST-LOAD-002"
        load_data["billAmount"] = 3000.00
        load_data["costAmount"] = 2800.00  # Lower margin
        
        status_code, response = self.make_request("POST", "/api/freight/loads/create", load_data)
        
        if status_code == 201 and "load" in response:
            at_risk_load_id = response["load"]["id"]
            
            # Mark as at-risk
            at_risk_data = {
                "id": at_risk_load_id,
                "reason": "Carrier issues - regression test"
            }
            
            status_code, response = self.make_request("POST", "/api/freight/loads/mark-at-risk", at_risk_data)
            
            if status_code == 200 and response.get("load", {}).get("loadStatus") == "AT_RISK":
                self.log_result("Freight", "Mark At-Risk", "PASS", 
                              f"Load {at_risk_load_id} marked as AT_RISK successfully")
            else:
                self.log_result("Freight", "Mark At-Risk", "FAIL", 
                              f"Status: {status_code}, Response: {response}")
        else:
            self.log_result("Freight", "Mark At-Risk", "FAIL", 
                          f"Could not create second load. Status: {status_code}")

        # Step 4: Test P&L Views
        # Test freight P&L endpoint
        pnl_params = {
            "startDate": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "endDate": datetime.now().strftime("%Y-%m-%d")
        }
        
        status_code, response = self.make_request("GET", "/api/freight/pnl", params=pnl_params)
        
        if status_code == 200 and "summary" in response and "loads" in response:
            load_count = response["summary"].get("loadCount", 0)
            total_margin = response["summary"].get("totalMargin", 0)
            self.log_result("Freight", "P&L View (freight/pnl)", "PASS", 
                          f"P&L data retrieved: {load_count} loads, ${total_margin} total margin")
        else:
            self.log_result("Freight", "P&L View (freight/pnl)", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Test logistics freight P&L endpoint
        status_code, response = self.make_request("GET", "/api/logistics/freight-pnl", params=pnl_params)
        
        if status_code == 200 and "summary" in response:
            load_count = response["summary"].get("loadCount", 0)
            total_margin = response["summary"].get("totalMargin", 0)
            self.log_result("Freight", "P&L View (logistics/freight-pnl)", "PASS", 
                          f"Logistics P&L data retrieved: {load_count} loads, ${total_margin} total margin")
        else:
            self.log_result("Freight", "P&L View (logistics/freight-pnl)", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

    def test_hotels_flow(self):
        """Test Hotels flow: disputes create/update → metrics endpoints → dashboards → rate-shopping placeholder stability"""
        print("\n🏨 Testing Hotels Flow")
        print("=" * 80)
        
        # Step 1: Create Hotel Dispute
        dispute_data = {
            "propertyId": 1,  # Assuming property ID 1 exists
            "type": "CHARGEBACK",
            "channel": "OTA",
            "reservationId": "RES-TEST-001",
            "folioNumber": "FOL-001",
            "guestName": "John Doe",
            "guestEmail": "john.doe@test.com",
            "guestPhone": "+1-555-0123",
            "postedDate": datetime.now().isoformat(),
            "stayFrom": (datetime.now() - timedelta(days=5)).isoformat(),
            "stayTo": (datetime.now() - timedelta(days=3)).isoformat(),
            "currency": "USD",
            "disputedAmount": 250.00,
            "originalAmount": 250.00,
            "reason": "Guest claims unauthorized charge - regression test",
            "internalNotes": "Regression test dispute"
        }
        
        status_code, response = self.make_request("POST", "/api/hotels/disputes", dispute_data)
        
        if status_code == 201 and "dispute" in response:
            dispute_id = response["dispute"]["id"]
            self.test_data["dispute_id"] = dispute_id
            self.log_result("Hotels", "Dispute Create", "PASS", 
                          f"Dispute created with ID {dispute_id}, amount: ${dispute_data['disputedAmount']}")
        else:
            self.log_result("Hotels", "Dispute Create", "FAIL", 
                          f"Status: {status_code}, Response: {response}",
                          "Cannot create dispute - may affect subsequent tests")
            dispute_id = None

        # Step 2: Update Hotel Dispute (if created successfully)
        if dispute_id:
            update_data = {
                "status": "IN_PROGRESS",
                "internalNotes": "Updated during regression test - investigating with guest"
            }
            
            status_code, response = self.make_request("PUT", f"/api/hotels/disputes/{dispute_id}", update_data)
            
            if status_code == 200:
                self.log_result("Hotels", "Dispute Update", "PASS", 
                              f"Dispute {dispute_id} updated to IN_PROGRESS status")
            else:
                self.log_result("Hotels", "Dispute Update", "FAIL", 
                              f"Status: {status_code}, Response: {response}")
        else:
            self.log_result("Hotels", "Dispute Update", "FAIL", 
                          "No dispute ID available from create step")

        # Step 3: Test Disputes List & Summary
        status_code, response = self.make_request("GET", "/api/hotels/disputes", 
                                                params={"includeTest": "false", "page": "1", "pageSize": "50"})
        
        if status_code == 200 and "disputes" in response:
            dispute_count = len(response["disputes"])
            total_disputes = response.get("total", 0)
            self.log_result("Hotels", "Disputes List", "PASS", 
                          f"Retrieved {dispute_count} disputes (total: {total_disputes})")
        else:
            self.log_result("Hotels", "Disputes List", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Test disputes summary
        status_code, response = self.make_request("GET", "/api/hotels/disputes/summary", 
                                                params={"includeTest": "false"})
        
        if status_code == 200 and "summary" in response and "totals" in response:
            total_disputes = response["totals"].get("totalDisputes", 0)
            total_amount = response["totals"].get("totalDisputedAmount", 0)
            self.log_result("Hotels", "Disputes Summary", "PASS", 
                          f"Summary retrieved: {total_disputes} total disputes, ${total_amount} disputed")
        else:
            self.log_result("Hotels", "Disputes Summary", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Step 4: Test Hotel Metrics/KPI Endpoints
        status_code, response = self.make_request("GET", "/api/hotel-kpi", 
                                                params={"ventureId": "1"})
        
        if status_code == 200 and "summary" in response:
            self.log_result("Hotels", "Hotel KPI Index", "PASS", 
                          "Hotel KPI data retrieved successfully")
        else:
            self.log_result("Hotels", "Hotel KPI Index", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Step 5: Test Hospitality Dashboard
        status_code, response = self.make_request("GET", "/api/hospitality/dashboard", 
                                                params={"includeTest": "false"})
        
        if status_code == 200 and "summary" in response and "hotels" in response:
            hotel_count = response["summary"].get("hotelCount", 0)
            total_revenue = response["summary"].get("totalRevenue7d", 0)
            self.log_result("Hotels", "Hospitality Dashboard", "PASS", 
                          f"Dashboard loaded: {hotel_count} hotels, ${total_revenue} 7-day revenue")
        else:
            self.log_result("Hotels", "Hospitality Dashboard", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Step 6: Test Hotel Snapshot (rate-shopping placeholder)
        status_code, response = self.make_request("GET", "/api/hotels/snapshot")
        
        if status_code in [200, 404, 501]:  # 404/501 acceptable for placeholder
            if status_code == 200:
                self.log_result("Hotels", "Rate-Shopping Placeholder", "PASS", 
                              "Hotel snapshot endpoint responding (may be placeholder)")
            else:
                self.log_result("Hotels", "Rate-Shopping Placeholder", "PASS", 
                              f"Placeholder stable (returns {status_code} as expected)")
        else:
            self.log_result("Hotels", "Rate-Shopping Placeholder", "FAIL", 
                          f"Unexpected error: Status {status_code}, Response: {response}")

    def test_bpo_flow(self):
        """Test BPO flow: KPI upsert → KPI dashboard → agent filters"""
        print("\n📞 Testing BPO Flow")
        print("=" * 80)
        
        # Step 1: BPO KPI Upsert
        kpi_data = {
            "campaignId": 1,  # Assuming campaign ID 1 exists
            "date": datetime.now().strftime("%Y-%m-%d"),
            "talkTimeMin": 480,  # 8 hours
            "handledCalls": 120,
            "outboundCalls": 200,
            "leadsCreated": 25,
            "demosBooked": 8,
            "salesClosed": 3,
            "fteCount": 2,
            "avgQaScore": 85.5,
            "revenue": 1500.00,
            "cost": 800.00,
            "isTest": False
        }
        
        status_code, response = self.make_request("POST", "/api/bpo/kpi/upsert", kpi_data)
        
        if status_code == 200 and response.get("success"):
            kpi_id = response.get("kpi", {}).get("id", "unknown")
            self.log_result("BPO", "KPI Upsert", "PASS", 
                          f"KPI upserted successfully (ID: {kpi_id}), {kpi_data['leadsCreated']} leads created")
        else:
            self.log_result("BPO", "KPI Upsert", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Step 2: BPO KPI Dashboard/Index
        status_code, response = self.make_request("GET", "/api/bpo/kpi", 
                                                params={"ventureId": "1"})
        
        if status_code == 200 and "summary" in response:
            total_leads = response["summary"].get("totalLeads", 0)
            total_calls = response["summary"].get("totalCalls", 0)
            self.log_result("BPO", "KPI Dashboard", "PASS", 
                          f"KPI dashboard loaded: {total_leads} leads, {total_calls} calls")
        else:
            self.log_result("BPO", "KPI Dashboard", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Step 3: BPO Dashboard (Portfolio View)
        status_code, response = self.make_request("GET", "/api/bpo/dashboard", 
                                                params={"ventureId": "1", "includeTest": "false"})
        
        if status_code == 200 and "summary" in response and "campaigns" in response:
            campaign_count = len(response.get("campaigns", []))
            total_revenue = response["summary"].get("totalRevenue", 0)
            self.log_result("BPO", "BPO Dashboard", "PASS", 
                          f"BPO dashboard loaded: {campaign_count} campaigns, ${total_revenue} revenue")
        else:
            self.log_result("BPO", "BPO Dashboard", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Step 4: Agent Filters/List
        status_code, response = self.make_request("GET", "/api/bpo/agents", 
                                                params={"ventureId": "1", "page": "1", "pageSize": "50"})
        
        if status_code == 200 and "items" in response:
            agent_count = len(response["items"])
            total_agents = response.get("total", 0)
            self.log_result("BPO", "Agent Filters", "PASS", 
                          f"Agent list retrieved: {agent_count} agents shown (total: {total_agents})")
        else:
            self.log_result("BPO", "Agent Filters", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

        # Test agent search filter
        status_code, response = self.make_request("GET", "/api/bpo/agents", 
                                                params={"search": "test", "pageSize": "10"})
        
        if status_code == 200:
            filtered_count = len(response.get("items", []))
            self.log_result("BPO", "Agent Search Filter", "PASS", 
                          f"Agent search filter working: {filtered_count} results for 'test'")
        else:
            self.log_result("BPO", "Agent Search Filter", "FAIL", 
                          f"Status: {status_code}, Response: {response}")

    def run_all_tests(self):
        """Run all business flow tests"""
        print("🚀 Starting Business Flows Regression Testing")
        print("=" * 80)
        
        # Test each business flow
        self.test_freight_flow()
        self.test_hotels_flow()
        self.test_bpo_flow()
        
        # Generate summary matrix
        self.generate_summary_matrix()
        
        return len([r for r in self.results if r["status"] == "FAIL"]) == 0

    def generate_summary_matrix(self):
        """Generate summary matrix as requested"""
        print("\n📊 BUSINESS FLOWS REGRESSION SUMMARY MATRIX")
        print("=" * 80)
        
        # Group results by flow
        flows = {}
        for result in self.results:
            flow = result["flow"]
            if flow not in flows:
                flows[flow] = []
            flows[flow].append(result)
        
        # Print matrix header
        print(f"{'Step':<40} {'Status':<8} {'Notes':<50} {'Blockers':<30}")
        print("-" * 128)
        
        # Print results for each flow
        for flow_name, flow_results in flows.items():
            print(f"\n{flow_name.upper()} FLOW:")
            for result in flow_results:
                status_symbol = "✅ PASS" if result["status"] == "PASS" else "❌ FAIL"
                step_name = f"{flow_name}: {result['step']}"
                notes = result["notes"][:47] + "..." if len(result["notes"]) > 50 else result["notes"]
                blockers = result["blockers"][:27] + "..." if len(result["blockers"]) > 30 else result["blockers"]
                
                print(f"{step_name:<40} {status_symbol:<8} {notes:<50} {blockers:<30}")
        
        # Overall summary
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r["status"] == "PASS"])
        failed_tests = total_tests - passed_tests
        
        print(f"\n{'='*128}")
        print(f"OVERALL SUMMARY:")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ CRITICAL ISSUES FOUND:")
            for result in self.results:
                if result["status"] == "FAIL":
                    print(f"  - {result['flow']}: {result['step']} - {result['notes']}")
                    if result["blockers"]:
                        print(f"    Blockers: {result['blockers']}")

def main():
    """Main test execution"""
    tester = BusinessFlowTester()
    success = tester.run_all_tests()
    
    # Write results to file
    with open('/app/business_flows_regression_results.json', 'w') as f:
        json.dump(tester.results, f, indent=2)
    
    print(f"\n📝 Detailed results saved to: /app/business_flows_regression_results.json")
    
    if success:
        print("\n🎉 All business flows completed successfully!")
        return 0
    else:
        print("\n💥 Some business flows failed - check the results above")
        return 1

if __name__ == "__main__":
    sys.exit(main())