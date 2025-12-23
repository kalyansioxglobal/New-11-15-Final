#!/usr/bin/env python3

import requests
import json
from datetime import datetime, timedelta
import sys

# Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def test_api_incentives_my_daily():
    """Test the GET /api/incentives/my-daily endpoint"""
    print("=== Testing GET /api/incentives/my-daily ===")
    
    results = {
        "method_validation": [],
        "auth_tests": [],
        "date_behavior": [],
        "data_shape": [],
        "errors": []
    }
    
    # 1. Method validation tests
    print("\n1. Testing method validation...")
    
    # Test non-GET methods
    for method in ["POST", "PUT", "DELETE", "PATCH"]:
        try:
            response = requests.request(method, f"{API_BASE}/incentives/my-daily", timeout=10)
            if response.status_code == 405:
                allow_header = response.headers.get("Allow", "")
                if "GET" in allow_header:
                    results["method_validation"].append({
                        "method": method,
                        "status": "✅ PASS",
                        "details": f"Correctly returned 405 with Allow: {allow_header}"
                    })
                else:
                    results["method_validation"].append({
                        "method": method,
                        "status": "❌ FAIL",
                        "details": f"405 returned but Allow header missing or incorrect: {allow_header}"
                    })
            else:
                results["method_validation"].append({
                    "method": method,
                    "status": "❌ FAIL",
                    "details": f"Expected 405, got {response.status_code}"
                })
        except Exception as e:
            results["errors"].append(f"Method {method} test failed: {str(e)}")
    
    # 2. Authentication tests
    print("\n2. Testing authentication...")
    
    # Test unauthenticated request (should get 401 from getEffectiveUser)
    try:
        response = requests.get(f"{API_BASE}/incentives/my-daily", timeout=10)
        if response.status_code == 401:
            results["auth_tests"].append({
                "test": "unauthenticated",
                "status": "✅ PASS",
                "details": "Correctly returned 401 for unauthenticated request"
            })
        elif response.status_code == 200:
            # In development mode, might auto-authenticate
            results["auth_tests"].append({
                "test": "unauthenticated",
                "status": "ℹ️ INFO",
                "details": "Development mode auto-authentication (expected behavior)"
            })
        else:
            results["auth_tests"].append({
                "test": "unauthenticated",
                "status": "❌ FAIL",
                "details": f"Expected 401, got {response.status_code}"
            })
    except Exception as e:
        results["errors"].append(f"Auth test failed: {str(e)}")
    
    # Test authenticated request (assuming dev auto-auth)
    try:
        response = requests.get(f"{API_BASE}/incentives/my-daily", timeout=10)
        if response.status_code == 200:
            results["auth_tests"].append({
                "test": "authenticated",
                "status": "✅ PASS",
                "details": "Successfully authenticated and returned 200"
            })
        else:
            results["auth_tests"].append({
                "test": "authenticated",
                "status": "❌ FAIL",
                "details": f"Expected 200, got {response.status_code}"
            })
    except Exception as e:
        results["errors"].append(f"Authenticated test failed: {str(e)}")
    
    # 3. Date range behavior tests
    print("\n3. Testing date range behavior...")
    
    # Test no from/to parameters (should default to last 30 days)
    try:
        response = requests.get(f"{API_BASE}/incentives/my-daily", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "from" in data and "to" in data:
                from_date = datetime.fromisoformat(data["from"])
                to_date = datetime.fromisoformat(data["to"])
                diff_days = (to_date - from_date).days + 1
                if 29 <= diff_days <= 31:  # Allow some flexibility for month boundaries
                    results["date_behavior"].append({
                        "test": "default_range",
                        "status": "✅ PASS",
                        "details": f"Default range is {diff_days} days (from: {data['from']}, to: {data['to']})"
                    })
                else:
                    results["date_behavior"].append({
                        "test": "default_range",
                        "status": "❌ FAIL",
                        "details": f"Default range is {diff_days} days, expected ~30"
                    })
            else:
                results["date_behavior"].append({
                    "test": "default_range",
                    "status": "❌ FAIL",
                    "details": "Response missing from/to fields"
                })
        else:
            results["date_behavior"].append({
                "test": "default_range",
                "status": "❌ FAIL",
                "details": f"Expected 200, got {response.status_code}"
            })
    except Exception as e:
        results["errors"].append(f"Default range test failed: {str(e)}")
    
    # Test valid from/to in YYYY-MM-DD format
    try:
        from_date = "2024-01-01"
        to_date = "2024-01-07"
        response = requests.get(f"{API_BASE}/incentives/my-daily?from={from_date}&to={to_date}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("from") == from_date and data.get("to") == to_date:
                results["date_behavior"].append({
                    "test": "valid_date_range",
                    "status": "✅ PASS",
                    "details": f"Correctly used provided date range: {from_date} to {to_date}"
                })
            else:
                results["date_behavior"].append({
                    "test": "valid_date_range",
                    "status": "❌ FAIL",
                    "details": f"Date range mismatch. Expected {from_date}-{to_date}, got {data.get('from')}-{data.get('to')}"
                })
        else:
            results["date_behavior"].append({
                "test": "valid_date_range",
                "status": "❌ FAIL",
                "details": f"Expected 200, got {response.status_code}"
            })
    except Exception as e:
        results["errors"].append(f"Valid date range test failed: {str(e)}")
    
    # Test window > 90 days (should return 400)
    try:
        from_date = "2024-01-01"
        to_date = "2024-05-01"  # More than 90 days
        response = requests.get(f"{API_BASE}/incentives/my-daily?from={from_date}&to={to_date}", timeout=10)
        if response.status_code == 400:
            data = response.json()
            if "error" in data and "Date range too large" in data["error"]:
                results["date_behavior"].append({
                    "test": "large_range",
                    "status": "✅ PASS",
                    "details": f"Correctly rejected large range with error: {data['error']}"
                })
            else:
                results["date_behavior"].append({
                    "test": "large_range",
                    "status": "❌ FAIL",
                    "details": f"400 returned but wrong error message: {data}"
                })
        else:
            results["date_behavior"].append({
                "test": "large_range",
                "status": "❌ FAIL",
                "details": f"Expected 400, got {response.status_code}"
            })
    except Exception as e:
        results["errors"].append(f"Large range test failed: {str(e)}")
    
    # Test invalid from/to strings (should return 400)
    try:
        response = requests.get(f"{API_BASE}/incentives/my-daily?from=invalid-date&to=also-invalid", timeout=10)
        if response.status_code == 400:
            data = response.json()
            if "error" in data and "Invalid date range" in data["error"]:
                results["date_behavior"].append({
                    "test": "invalid_dates",
                    "status": "✅ PASS",
                    "details": f"Correctly rejected invalid dates with error: {data['error']}"
                })
            else:
                results["date_behavior"].append({
                    "test": "invalid_dates",
                    "status": "❌ FAIL",
                    "details": f"400 returned but wrong error message: {data}"
                })
        else:
            results["date_behavior"].append({
                "test": "invalid_dates",
                "status": "❌ FAIL",
                "details": f"Expected 400, got {response.status_code}"
            })
    except Exception as e:
        results["errors"].append(f"Invalid dates test failed: {str(e)}")
    
    # 4. Data shape verification
    print("\n4. Testing data shape...")
    
    try:
        response = requests.get(f"{API_BASE}/incentives/my-daily", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Check required top-level fields
            required_fields = ["items", "totalAmount", "from", "to"]
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                results["data_shape"].append({
                    "test": "top_level_fields",
                    "status": "✅ PASS",
                    "details": "All required top-level fields present"
                })
            else:
                results["data_shape"].append({
                    "test": "top_level_fields",
                    "status": "❌ FAIL",
                    "details": f"Missing fields: {missing_fields}"
                })
            
            # Check items array structure
            if "items" in data and isinstance(data["items"], list):
                results["data_shape"].append({
                    "test": "items_array",
                    "status": "✅ PASS",
                    "details": f"Items is array with {len(data['items'])} entries"
                })
                
                # Check item structure if items exist
                if data["items"]:
                    item = data["items"][0]
                    required_item_fields = ["date", "ventureId", "ventureName", "amount", "currency", "breakdown"]
                    missing_item_fields = [f for f in required_item_fields if f not in item]
                    
                    if not missing_item_fields:
                        results["data_shape"].append({
                            "test": "item_structure",
                            "status": "✅ PASS",
                            "details": "Item structure matches specification"
                        })
                    else:
                        results["data_shape"].append({
                            "test": "item_structure",
                            "status": "❌ FAIL",
                            "details": f"Item missing fields: {missing_item_fields}"
                        })
                    
                    # Check breakdown structure
                    if "breakdown" in item and item["breakdown"] is not None:
                        if "rules" in item["breakdown"] and isinstance(item["breakdown"]["rules"], list):
                            results["data_shape"].append({
                                "test": "breakdown_structure",
                                "status": "✅ PASS",
                                "details": "Breakdown structure is correct"
                            })
                        else:
                            results["data_shape"].append({
                                "test": "breakdown_structure",
                                "status": "❌ FAIL",
                                "details": "Breakdown missing rules array"
                            })
                else:
                    results["data_shape"].append({
                        "test": "item_structure",
                        "status": "ℹ️ INFO",
                        "details": "No items to check structure (empty result set)"
                    })
            else:
                results["data_shape"].append({
                    "test": "items_array",
                    "status": "❌ FAIL",
                    "details": "Items field missing or not an array"
                })
            
            # Check totalAmount calculation
            if "items" in data and "totalAmount" in data:
                calculated_total = sum(item.get("amount", 0) for item in data["items"])
                if abs(calculated_total - data["totalAmount"]) < 0.01:  # Allow for floating point precision
                    results["data_shape"].append({
                        "test": "total_calculation",
                        "status": "✅ PASS",
                        "details": f"Total amount correctly calculated: {data['totalAmount']}"
                    })
                else:
                    results["data_shape"].append({
                        "test": "total_calculation",
                        "status": "❌ FAIL",
                        "details": f"Total mismatch: calculated {calculated_total}, returned {data['totalAmount']}"
                    })
        else:
            results["data_shape"].append({
                "test": "response_structure",
                "status": "❌ FAIL",
                "details": f"Could not test data shape, got status {response.status_code}"
            })
    except Exception as e:
        results["errors"].append(f"Data shape test failed: {str(e)}")
    
    return results

def test_frontend_incentives_my():
    """Test the frontend /incentives/my page"""
    print("\n=== Testing Frontend /incentives/my ===")
    
    results = {
        "page_load": [],
        "ui_elements": [],
        "functionality": [],
        "errors": []
    }
    
    try:
        # Test page load
        response = requests.get(f"{BASE_URL}/incentives/my", timeout=15)
        if response.status_code == 200:
            html_content = response.text
            
            results["page_load"].append({
                "test": "page_accessibility",
                "status": "✅ PASS",
                "details": "Page loads successfully"
            })
            
            # Check for key UI elements
            ui_checks = [
                ("title", "My Incentives", "Page title present"),
                ("explanatory_text", "Read-only view of your daily incentives", "Explanatory text present"),
                ("quick_range_7d", "Last 7 days", "Quick range 7 days button present"),
                ("quick_range_30d", "Last 30 days", "Quick range 30 days button present"),
                ("from_input", 'type="date"', "From date input present"),
                ("to_input", 'type="date"', "To date input present"),
                ("apply_button", "Apply", "Apply button present"),
                ("clear_button", "Clear", "Clear button present"),
                ("summary_total", "Total incentives in this period", "Summary total section present"),
                ("summary_days", "Days with non-zero incentives", "Summary days section present"),
                ("table_header", "Daily Incentives", "Table header present"),
                ("empty_state", "No incentives recorded for this period yet", "Empty state message present")
            ]
            
            for check_name, search_text, description in ui_checks:
                if search_text in html_content:
                    results["ui_elements"].append({
                        "test": check_name,
                        "status": "✅ PASS",
                        "details": description
                    })
                else:
                    results["ui_elements"].append({
                        "test": check_name,
                        "status": "❌ FAIL",
                        "details": f"Missing: {description}"
                    })
            
            # Check for JavaScript functionality indicators
            js_checks = [
                ("react_components", "useState", "React state management present"),
                ("api_calls", "/api/incentives/my-daily", "API endpoint reference present"),
                ("modal_functionality", "setSelected", "Modal functionality present")
            ]
            
            for check_name, search_text, description in js_checks:
                if search_text in html_content:
                    results["functionality"].append({
                        "test": check_name,
                        "status": "✅ PASS",
                        "details": description
                    })
                else:
                    results["functionality"].append({
                        "test": check_name,
                        "status": "ℹ️ INFO",
                        "details": f"Not detected in HTML: {description}"
                    })
        
        else:
            results["page_load"].append({
                "test": "page_accessibility",
                "status": "❌ FAIL",
                "details": f"Page returned status {response.status_code}"
            })
    
    except Exception as e:
        results["errors"].append(f"Frontend test failed: {str(e)}")
    
    return results

def print_results(test_name, results):
    """Print test results in a formatted way"""
    print(f"\n{'='*60}")
    print(f"{test_name} RESULTS")
    print(f"{'='*60}")
    
    for category, tests in results.items():
        if category == "errors":
            if tests:
                print(f"\n❌ ERRORS:")
                for error in tests:
                    print(f"   • {error}")
        else:
            if tests:
                print(f"\n{category.upper().replace('_', ' ')}:")
                for test in tests:
                    status = test.get("status", "❓")
                    test_name = test.get("test", "unknown")
                    details = test.get("details", "")
                    print(f"   {status} {test_name}: {details}")

def main():
    """Run all tests"""
    print("Starting Incentives My Daily API and UI Testing...")
    print(f"Base URL: {BASE_URL}")
    
    # Test backend API
    api_results = test_api_incentives_my_daily()
    print_results("BACKEND API", api_results)
    
    # Test frontend page
    frontend_results = test_frontend_incentives_my()
    print_results("FRONTEND PAGE", frontend_results)
    
    # Summary
    print(f"\n{'='*60}")
    print("TESTING SUMMARY")
    print(f"{'='*60}")
    
    # Count results
    api_total = sum(len(tests) for category, tests in api_results.items() if category != "errors")
    api_passed = sum(1 for tests in api_results.values() if isinstance(tests, list) 
                    for test in tests if test.get("status", "").startswith("✅"))
    
    frontend_total = sum(len(tests) for category, tests in frontend_results.items() if category != "errors")
    frontend_passed = sum(1 for tests in frontend_results.values() if isinstance(tests, list) 
                         for test in tests if test.get("status", "").startswith("✅"))
    
    total_errors = len(api_results.get("errors", [])) + len(frontend_results.get("errors", []))
    
    print(f"Backend API Tests: {api_passed}/{api_total} passed")
    print(f"Frontend Tests: {frontend_passed}/{frontend_total} passed")
    print(f"Total Errors: {total_errors}")
    
    if total_errors == 0 and api_passed == api_total and frontend_passed == frontend_total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  Some tests failed or had issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())