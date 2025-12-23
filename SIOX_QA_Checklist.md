# SIOX Command Center - QA Testing Checklist

## 1. Authentication & Login

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.1 | Valid login | Enter valid email, click Send Code, enter "123456" | Redirected to dashboard | |
| 1.2 | Invalid OTP | Enter wrong code | Error message shown | |
| 1.3 | Session persistence | Login, close tab, reopen | Still logged in | |
| 1.4 | Logout | Click logout button | Redirected to login page | |
| 1.5 | Role-based nav | Login as different roles | See appropriate menu items | |

## 2. Freight - Loads

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.1 | View loads list | Navigate to Freight > Loads | See paginated list | |
| 2.2 | Load details | Click on a load | See full load details | |
| 2.3 | Filter by status | Use status filter dropdown | List filters correctly | |
| 2.4 | Search loads | Enter search term | Results match search | |
| 2.5 | Create load | Click Add Load, fill form | Load created successfully | |
| 2.6 | Edit load | Click Edit on a load | Can modify and save | |
| 2.7 | Assign carrier | Click Assign Carrier button | Carrier assignment works | |

## 3. Freight - Carriers

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.1 | View carriers | Navigate to Freight > Carriers | See carrier list | |
| 3.2 | Carrier details | Click on a carrier | See carrier info, equipment, lanes | |
| 3.3 | Search carriers | Use search box | Results filter correctly | |
| 3.4 | Add carrier | Click Add Carrier | Form works, carrier created | |
| 3.5 | Edit carrier | Edit existing carrier | Changes saved | |
| 3.6 | View dispatchers | On carrier detail, see dispatchers | Dispatcher list shows | |
| 3.7 | Add dispatcher | Add new dispatcher to carrier | Dispatcher added | |

## 4. Freight - Carrier Matching

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 4.1 | Find carriers for load | Go to load, click Find Carriers | Matching carriers shown | |
| 4.2 | Match scoring | Check carrier scores | Scores show breakdown | |
| 4.3 | Lane history bonus | Carrier with prior lanes | Higher lane history score | |
| 4.4 | Equipment match | Equipment type filters | Correct equipment shown | |
| 4.5 | Notify carriers | Click Notify Carriers | Notification sent (30-min cooldown) | |

## 5. Freight - Coverage War Room

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 5.1 | View dashboard | Navigate to Coverage War Room | See summary cards | |
| 5.2 | Coverage rate | Check coverage rate card | Percentage accurate | |
| 5.3 | Open loads | See open loads count | Matches actual open loads | |
| 5.4 | At-risk loads | See at-risk section | Loads flagged correctly | |
| 5.5 | Dispatcher leaderboard | View leaderboard | Shows contacts/coverage stats | |
| 5.6 | Coverage trend chart | View trend chart | 7-day trend displays | |

## 6. Freight - Shipper ICP Analysis

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.1 | View ICP dashboard | Navigate to Shipper ICP | Dashboard loads | |
| 6.2 | Ideal Profile tab | Click Ideal Profile | See avg metrics | |
| 6.3 | Tier Segments | Click Tier Segments | A/B/C/D breakdown | |
| 6.4 | Growth Targets | View growth targets | Growth potential shown | |
| 6.5 | Risk/Reward matrix | View matrix tab | Quadrant chart displays | |
| 6.6 | All Shippers | View shipper list | Searchable, sortable list | |
| 6.7 | Filter by tier | Select tier filter | List filters correctly | |

## 7. Freight - Shippers

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 7.1 | View shippers | Navigate to Shippers | See shipper list | |
| 7.2 | Shipper details | Click on shipper | See full details | |
| 7.3 | Add shipper | Create new shipper | Shipper created | |
| 7.4 | Edit shipper | Modify shipper | Changes saved | |
| 7.5 | Shipper loads | View shipper's loads | Load history shows | |

## 8. Hotels - Dashboard & KPIs

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 8.1 | Hotel dashboard | Navigate to Hospitality Dashboard | Overview loads | |
| 8.2 | Hotel list | See all hotels | Hotels displayed | |
| 8.3 | Hotel details | Click on hotel | Daily KPIs, reviews show | |
| 8.4 | Add daily report | Add new daily KPI | Data saved | |
| 8.5 | Hotel KPIs | Navigate to Hotel KPIs | Charts display | |
| 8.6 | KPI Report YoY | Navigate to KPI Report | MTD/YTD tabs work | |
| 8.7 | LYMTD comparison | View MTD tab | Last year comparison shows | |
| 8.8 | LYYTD comparison | View YTD tab | YTD vs last year shows | |
| 8.9 | Trend charts | View 30-day trends | All 4 charts render | |

## 9. Hotels - Reviews

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 9.1 | View reviews | Navigate to Reviews | Review list shows | |
| 9.2 | Filter by hotel | Select hotel filter | Reviews filter | |
| 9.3 | Filter by rating | Select rating filter | Reviews filter | |
| 9.4 | Review details | Click on review | Full review shows | |
| 9.5 | Respond to review | Add response | Response saved | |

## 10. BPO Dashboard

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 10.1 | BPO dashboard | Navigate to BPO Dashboard | Stats display | |
| 10.2 | Agent status | View real-time status | Agent cards show | |
| 10.3 | Campaign metrics | View campaign data | Metrics accurate | |
| 10.4 | Call volume chart | View charts | Charts render | |

## 11. SaaS Dashboard

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 11.1 | SaaS metrics | Navigate to SaaS Dashboard | MRR/ARR shows | |
| 11.2 | Churn rate | View churn metrics | Percentage accurate | |
| 11.3 | Customer list | View customer list | Customers display | |

## 12. Holdings & Admin

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 12.1 | Bank accounts | View bank accounts | Account list shows | |
| 12.2 | Document vault | Navigate to Documents | Document list shows | |
| 12.3 | IT Assets | View IT assets | Asset inventory shows | |
| 12.4 | User management | View users (admin) | User list shows | |
| 12.5 | Ventures | View ventures | Venture list shows | |

## 13. UI/UX

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 13.1 | Dark mode | Toggle theme | UI switches correctly | |
| 13.2 | Mobile responsive | Resize browser | Layout adjusts | |
| 13.3 | Navigation collapse | Collapse sidebar | Navigation works | |
| 13.4 | Loading states | Navigate pages | Loading indicators show | |
| 13.5 | Error messages | Trigger error | User-friendly message | |
| 13.6 | Table visibility | View tables in dark mode | All text readable | |

## 14. Data Integrity

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 14.1 | Date formatting | Check dates across app | Consistent format | |
| 14.2 | Currency formatting | Check amounts | Proper $ formatting | |
| 14.3 | Percentage formatting | Check percentages | Consistent decimals | |
| 14.4 | Pagination | Navigate large lists | Pagination works | |
| 14.5 | Sorting | Sort columns | Correct sort order | |

---

## Test Summary

| Section | Total Tests | Passed | Failed | Blocked |
|---------|-------------|--------|--------|---------|
| Authentication | 5 | | | |
| Freight - Loads | 7 | | | |
| Freight - Carriers | 7 | | | |
| Freight - Matching | 5 | | | |
| Coverage War Room | 6 | | | |
| Shipper ICP | 7 | | | |
| Freight - Shippers | 5 | | | |
| Hotels - KPIs | 9 | | | |
| Hotels - Reviews | 5 | | | |
| BPO Dashboard | 4 | | | |
| SaaS Dashboard | 3 | | | |
| Holdings & Admin | 5 | | | |
| UI/UX | 6 | | | |
| Data Integrity | 5 | | | |
| **TOTAL** | **79** | | | |

---

**Tester Name:** ________________  
**Test Date:** ________________  
**Environment:** Development / Staging / Production  
**Notes:**
