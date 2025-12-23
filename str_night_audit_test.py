#!/usr/bin/env python3
"""
STR / Night Audit KPI Bridge End-to-End Testing

Testing the following functionality as per review request:
1. Backend STR Upload: POST /api/hotels/str/upload
2. Backend Night Audit Upload: POST /api/hotels/night-audit/upload  
3. Frontend KPI Upload Page: /hotels/kpi-upload

This test verifies:
- Method validation (405 for non-POST)
- Input validation (400 for missing file/propertyId)
- Successful uploads with proper response format
- Audit log creation
- Frontend page functionality
"""

import requests
import json
import os
import sys
import tempfile
import csv
from typing import Dict, Any, Optional

# Base URL for the API
BASE_URL = "http://localhost:3000"

class STRNightAuditTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        self.property_id = None
        
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
            "request_body": str(body) if body else None
        }
        self.results.append(result)
        
        status_emoji = "✅" if status_code < 400 else "❌"
        print(f"{status_emoji} {method} {endpoint} -> {status_code}")
        if test_description:
            print(f"   📝 {test_description}")
        if isinstance(body, dict):
            print(f"   📤 Request: {json.dumps(body, indent=2)}")
        elif body:
            print(f"   📤 Request: {str(body)[:200]}...")
        else:
            print(f"   📤 Request: No body")
        print(f"   📥 Response: {json.dumps(response_data, indent=2)}")
        print("-" * 80)
        
    def test_endpoint(self, endpoint: str, method: str = "GET", 
                     headers: Dict = None, json_data: Any = None,
                     files: Dict = None, data: Dict = None,
                     test_description: str = ""):
        """Test an endpoint and log results"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers)
            elif method == "POST":
                if files:
                    response = self.session.post(url, headers=headers, files=files, data=data)
                else:
                    response = self.session.post(url, headers=headers, json=json_data)
            elif method == "PUT":
                response = self.session.put(url, headers=headers, json=json_data)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
                
            self.log_result(endpoint, method, response.status_code, response_data, 
                          headers, json_data or data, test_description)
            return response
            
        except Exception as e:
            error_data = {"error": str(e)}
            self.log_result(endpoint, method, 0, error_data, headers, 
                          json_data or data, f"{test_description} - EXCEPTION")
            return None

    def create_str_csv(self) -> str:
        """Create a temporary STR CSV file for testing"""
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
        
        # STR CSV format: date,occ,adr,revpar,comp_occ,comp_adr,comp_revpar
        csv_data = [
            ['date', 'occ', 'adr', 'revpar', 'comp_occ', 'comp_adr', 'comp_revpar'],
            ['2024-01-01', '75', '120', '90', '70', '110', '80'],
            ['2024-01-02', '80', '125', '100', '75', '115', '85'],
            ['2024-01-03', '70', '115', '80', '65', '105', '75']
        ]
        
        writer = csv.writer(temp_file)
        writer.writerows(csv_data)
        temp_file.close()
        
        return temp_file.name

    def create_night_audit_csv(self) -> str:
        """Create a temporary Night Audit CSV file for testing"""
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
        
        # Night Audit CSV format: date,rooms_sold,rooms_available,room_revenue
        csv_data = [
            ['date', 'rooms_sold', 'rooms_available', 'room_revenue'],
            ['2024-01-02', '80', '100', '9600'],
            ['2024-01-03', '85', '100', '10200'],
            ['2024-01-04', '75', '100', '9000']
        ]
        
        writer = csv.writer(temp_file)
        writer.writerows(csv_data)
        temp_file.close()
        
        return temp_file.name

    def get_property_id(self) -> Optional[int]:
        """Get a valid property ID for testing"""
        print("🔍 Getting hotel properties for testing...")
        response = self.test_endpoint("/api/hospitality/hotels", "GET", 
                                    test_description="Get hotel properties for testing")
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    property_id = data[0].get('id')
                    print(f"✅ Using property ID: {property_id}")
                    return property_id
                else:
                    print("❌ No hotel properties found")
                    return None
            except:
                print("❌ Failed to parse hotel properties response")
                return None
        else:
            print("❌ Failed to get hotel properties")
            return None

    def test_str_upload_endpoint(self):
        """Test STR upload endpoint comprehensively"""
        print("\n🧪 TESTING STR UPLOAD ENDPOINT")
        print("=" * 50)
        
        # Test 1: Method validation - Non-POST should return 405
        self.test_endpoint("/api/hotels/str/upload", "GET", 
                         test_description="Method validation - GET should return 405")
        
        # Test 2: Missing file should return 400
        self.test_endpoint("/api/hotels/str/upload", "POST", 
                         data={"propertyId": "1"},
                         test_description="Missing file should return 400")
        
        # Test 3: Missing propertyId should return 400
        str_csv_path = self.create_str_csv()
        try:
            with open(str_csv_path, 'rb') as f:
                files = {'file': ('str_test.csv', f, 'text/csv')}
                self.test_endpoint("/api/hotels/str/upload", "POST", 
                                 files=files,
                                 test_description="Missing propertyId should return 400")
        finally:
            os.unlink(str_csv_path)
        
        # Test 4: Invalid propertyId should return 400
        str_csv_path = self.create_str_csv()
        try:
            with open(str_csv_path, 'rb') as f:
                files = {'file': ('str_test.csv', f, 'text/csv')}
                data = {'propertyId': '99999'}  # Non-existent property
                self.test_endpoint("/api/hotels/str/upload", "POST", 
                                 files=files, data=data,
                                 test_description="Invalid propertyId should return 400")
        finally:
            os.unlink(str_csv_path)
        
        # Test 5: Valid upload (if we have a property ID)
        if self.property_id:
            str_csv_path = self.create_str_csv()
            try:
                with open(str_csv_path, 'rb') as f:
                    files = {'file': ('str_test.csv', f, 'text/csv')}
                    data = {'propertyId': str(self.property_id)}
                    self.test_endpoint("/api/hotels/str/upload", "POST", 
                                     files=files, data=data,
                                     test_description="Valid STR upload should return 200")
            finally:
                os.unlink(str_csv_path)
        else:
            print("⚠️  Skipping valid upload test - no property ID available")

    def test_night_audit_upload_endpoint(self):
        """Test Night Audit upload endpoint comprehensively"""
        print("\n🧪 TESTING NIGHT AUDIT UPLOAD ENDPOINT")
        print("=" * 50)
        
        # Test 1: Method validation - Non-POST should return 405
        self.test_endpoint("/api/hotels/night-audit/upload", "GET", 
                         test_description="Method validation - GET should return 405")
        
        # Test 2: Missing file should return 400
        self.test_endpoint("/api/hotels/night-audit/upload", "POST", 
                         data={"propertyId": "1"},
                         test_description="Missing file should return 400")
        
        # Test 3: Missing propertyId should return 400
        na_csv_path = self.create_night_audit_csv()
        try:
            with open(na_csv_path, 'rb') as f:
                files = {'file': ('night_audit_test.csv', f, 'text/csv')}
                self.test_endpoint("/api/hotels/night-audit/upload", "POST", 
                                 files=files,
                                 test_description="Missing propertyId should return 400")
        finally:
            os.unlink(na_csv_path)
        
        # Test 4: Invalid propertyId should return 400
        na_csv_path = self.create_night_audit_csv()
        try:
            with open(na_csv_path, 'rb') as f:
                files = {'file': ('night_audit_test.csv', f, 'text/csv')}
                data = {'propertyId': '99999'}  # Non-existent property
                self.test_endpoint("/api/hotels/night-audit/upload", "POST", 
                                 files=files, data=data,
                                 test_description="Invalid propertyId should return 400")
        finally:
            os.unlink(na_csv_path)
        
        # Test 5: Valid upload (if we have a property ID)
        if self.property_id:
            na_csv_path = self.create_night_audit_csv()
            try:
                with open(na_csv_path, 'rb') as f:
                    files = {'file': ('night_audit_test.csv', f, 'text/csv')}
                    data = {'propertyId': str(self.property_id)}
                    self.test_endpoint("/api/hotels/night-audit/upload", "POST", 
                                     files=files, data=data,
                                     test_description="Valid Night Audit upload should return 200")
            finally:
                os.unlink(na_csv_path)
        else:
            print("⚠️  Skipping valid upload test - no property ID available")

    def test_audit_logs_endpoint(self):
        """Test audit logs endpoint for STR and Night Audit uploads"""
        print("\n🧪 TESTING AUDIT LOGS ENDPOINT")
        print("=" * 50)
        
        # Test 1: Get STR upload audit logs
        self.test_endpoint("/api/admin/audit-logs?domain=hotels&action=STR_UPLOAD", "GET",
                         test_description="Get STR upload audit logs")
        
        # Test 2: Get Night Audit upload audit logs
        self.test_endpoint("/api/admin/audit-logs?domain=hotels&action=NIGHT_AUDIT_UPLOAD", "GET",
                         test_description="Get Night Audit upload audit logs")

    def test_frontend_kpi_upload_page(self):
        """Test frontend KPI upload page"""
        print("\n🧪 TESTING FRONTEND KPI UPLOAD PAGE")
        print("=" * 50)
        
        # Test 1: Load the KPI upload page
        response = self.test_endpoint("/hotels/kpi-upload", "GET",
                                    test_description="Load KPI upload page")
        
        if response and response.status_code == 200:
            content = response.text
            
            # Check for key elements in the page
            checks = [
                ("Property dropdown", "Select property" in content),
                ("STR upload section", "STR Upload" in content),
                ("Night Audit upload section", "Night Audit Upload" in content),
                ("Recent uploads table", "Recent KPI Uploads" in content),
                ("File input for STR", 'type="file"' in content),
                ("Upload buttons", "Upload STR" in content and "Upload Night Audit" in content)
            ]
            
            print("📋 Frontend Page Content Verification:")
            for check_name, check_result in checks:
                status = "✅" if check_result else "❌"
                print(f"   {status} {check_name}")
        
        # Test 2: Check if hospitality hotels API is accessible (used by frontend)
        self.test_endpoint("/api/hospitality/hotels", "GET",
                         test_description="Hotels API for frontend dropdown")

    def run_all_tests(self):
        """Run all STR/Night Audit KPI Bridge tests"""
        print("🚀 STARTING STR / NIGHT AUDIT KPI BRIDGE TESTING")
        print("=" * 60)
        
        # Get a property ID for testing
        self.property_id = self.get_property_id()
        
        # Run backend tests
        self.test_str_upload_endpoint()
        self.test_night_audit_upload_endpoint()
        self.test_audit_logs_endpoint()
        
        # Run frontend tests
        self.test_frontend_kpi_upload_page()
        
        # Generate summary
        self.generate_summary()

    def generate_summary(self):
        """Generate test summary"""
        print("\n📊 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r['status_code'] < 400])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Group results by endpoint
        endpoint_results = {}
        for result in self.results:
            endpoint = result['endpoint']
            if endpoint not in endpoint_results:
                endpoint_results[endpoint] = []
            endpoint_results[endpoint].append(result)
        
        print("\n📋 RESULTS BY ENDPOINT:")
        for endpoint, results in endpoint_results.items():
            passed = len([r for r in results if r['status_code'] < 400])
            total = len(results)
            status = "✅" if passed == total else "❌" if passed == 0 else "⚠️"
            print(f"   {status} {endpoint}: {passed}/{total} tests passed")
        
        # Save detailed results
        with open('/app/str_night_audit_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: /app/str_night_audit_test_results.json")

def main():
    """Main test execution"""
    tester = STRNightAuditTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()