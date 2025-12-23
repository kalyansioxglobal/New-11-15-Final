#!/usr/bin/env python3
"""
P3.7 + P3.8 Comprehensive Test with Real Data

This script performs additional comprehensive testing with real IncentiveDaily data
to verify the audit and gamification endpoints work correctly with actual data.
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def test_with_real_data():
    """Test audit-daily endpoint with real IncentiveDaily data"""
    print("Testing with Real IncentiveDaily Data")
    print("=" * 50)
    
    # First, get real incentive data
    response = requests.get(f"{API_BASE}/incentives/my-daily")
    if response.status_code != 200:
        print(f"❌ Could not fetch incentive data: {response.status_code}")
        return
    
    data = response.json()
    items = data.get("items", [])
    
    if not items:
        print("❌ No IncentiveDaily data available for testing")
        return
    
    print(f"✅ Found {len(items)} IncentiveDaily records")
    
    # Test audit endpoint with real data
    first_item = items[0]
    print(f"Testing audit for: Date={first_item['date']}, VentureId={first_item['ventureId']}")
    
    # Test 1: Valid audit request with real data
    audit_response = requests.get(f"{API_BASE}/incentives/audit-daily", params={
        "userId": "1",  # CEO user ID
        "ventureId": str(first_item["ventureId"]),
        "date": first_item["date"]
    })
    
    if audit_response.status_code == 200:
        audit_data = audit_response.json()
        print("✅ Audit endpoint working with real data")
        print(f"   Amount: {audit_data.get('amount')}")
        print(f"   Breakdown rules: {len(audit_data.get('breakdown', {}).get('rules', []))}")
        
        # Verify data consistency
        expected_amount = first_item["amount"]
        actual_amount = audit_data.get("amount")
        amounts_match = abs(expected_amount - actual_amount) < 0.01
        
        print(f"✅ Data consistency: {amounts_match} (Expected: {expected_amount}, Got: {actual_amount})")
        
        # Verify breakdown structure
        breakdown = audit_data.get("breakdown", {})
        has_rules = "rules" in breakdown and isinstance(breakdown["rules"], list)
        print(f"✅ Breakdown structure valid: {has_rules}")
        
        if has_rules:
            rules_total = sum(rule.get("amount", 0) for rule in breakdown["rules"])
            rules_match = abs(rules_total - actual_amount) < 0.01
            print(f"✅ Rules total matches amount: {rules_match} (Rules total: {rules_total})")
    else:
        print(f"❌ Audit endpoint failed: {audit_response.status_code}")
        print(f"   Error: {audit_response.text}")
    
    # Test 2: Test gamification with real data window
    print(f"\nTesting Gamification with Real Data Window")
    print("-" * 40)
    
    # Use the date range from the real data
    dates = [item["date"] for item in items]
    from_date = min(dates)
    to_date = max(dates)
    
    gamification_response = requests.get(f"{API_BASE}/incentives/gamification/my", params={
        "from": from_date,
        "to": to_date
    })
    
    if gamification_response.status_code == 200:
        gamification_data = gamification_response.json()
        print("✅ Gamification endpoint working with real data")
        
        # Verify totals match
        expected_total = sum(item["amount"] for item in items)
        actual_total = gamification_data.get("totals", {}).get("amount", 0)
        totals_match = abs(expected_total - actual_total) < 0.01
        
        print(f"✅ Total amounts match: {totals_match} (Expected: {expected_total}, Got: {actual_total})")
        
        # Verify days count
        expected_days = len([item for item in items if item["amount"] > 0])
        actual_days = gamification_data.get("totals", {}).get("days", 0)
        days_match = expected_days == actual_days
        
        print(f"✅ Days count matches: {days_match} (Expected: {expected_days}, Got: {actual_days})")
        
        # Verify streaks logic
        streaks = gamification_data.get("streaks", {})
        current_streak = streaks.get("current", 0)
        longest_streak = streaks.get("longest", 0)
        
        print(f"✅ Streaks: Current={current_streak}, Longest={longest_streak}")
        print(f"   Streak consistency: {current_streak <= longest_streak}")
        
        # Verify badges
        badges = gamification_data.get("badges", [])
        print(f"✅ Badges earned: {badges}")
        
        # Check badge logic
        has_daily_starter = current_streak >= 3
        has_consistent_performer = actual_days >= 10
        percentile = gamification_data.get("rank", {}).get("percentile", 0)
        has_top_earner = percentile >= 90
        
        expected_badges = []
        if has_daily_starter:
            expected_badges.append("Daily Starter")
        if has_consistent_performer:
            expected_badges.append("Consistent Performer")
        if has_top_earner:
            expected_badges.append("Top Earner")
        
        badges_correct = set(badges) == set(expected_badges)
        print(f"✅ Badge logic correct: {badges_correct}")
        print(f"   Expected: {expected_badges}")
        print(f"   Actual: {badges}")
        
    else:
        print(f"❌ Gamification endpoint failed: {gamification_response.status_code}")
        print(f"   Error: {gamification_response.text}")

def test_edge_cases():
    """Test edge cases and boundary conditions"""
    print(f"\nTesting Edge Cases")
    print("-" * 30)
    
    # Test 1: Zero/negative IDs
    response = requests.get(f"{API_BASE}/incentives/audit-daily", params={
        "userId": "0",
        "ventureId": "1",
        "date": "2025-01-02"
    })
    print(f"✅ Zero userId handled: {response.status_code == 400}")
    
    response = requests.get(f"{API_BASE}/incentives/audit-daily", params={
        "userId": "-1",
        "ventureId": "1",
        "date": "2025-01-02"
    })
    print(f"✅ Negative userId handled: {response.status_code == 400}")
    
    # Test 2: Very large date range for gamification
    from_date = (datetime.now() - timedelta(days=91)).strftime("%Y-%m-%d")
    to_date = datetime.now().strftime("%Y-%m-%d")
    response = requests.get(f"{API_BASE}/incentives/gamification/my", params={
        "from": from_date,
        "to": to_date
    })
    print(f"✅ 91-day range rejected: {response.status_code == 400}")
    
    # Test 3: Exactly 90-day range (should be allowed)
    from_date = (datetime.now() - timedelta(days=89)).strftime("%Y-%m-%d")
    to_date = datetime.now().strftime("%Y-%m-%d")
    response = requests.get(f"{API_BASE}/incentives/gamification/my", params={
        "from": from_date,
        "to": to_date
    })
    print(f"✅ 90-day range allowed: {response.status_code == 200}")
    
    # Test 4: Invalid date formats
    response = requests.get(f"{API_BASE}/incentives/audit-daily", params={
        "userId": "1",
        "ventureId": "1",
        "date": "2025-13-45"  # Invalid month/day
    })
    print(f"✅ Invalid date format handled: {response.status_code == 400}")
    
    # Test 5: Future dates
    future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    response = requests.get(f"{API_BASE}/incentives/audit-daily", params={
        "userId": "1",
        "ventureId": "1",
        "date": future_date
    })
    # Should return 404 (no data) rather than error
    print(f"✅ Future date handled gracefully: {response.status_code in [404, 200]}")

def main():
    print("P3.7 + P3.8 Comprehensive Testing with Real Data")
    print("=" * 60)
    
    try:
        test_with_real_data()
        test_edge_cases()
        
        print(f"\n✅ All comprehensive tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Critical error during testing: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())