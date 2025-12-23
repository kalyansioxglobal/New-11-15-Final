# SIOX Command Center - Comprehensive End-to-End Testing Checklist

**Application:** SIOX Multi-Venture Command Center  
**Total Pages:** 167 UI Pages  
**Total API Routes:** 329 Endpoints  
**Total Prisma Models:** 111 Models  
**Total User Roles:** 16 Roles  

---

## Table of Contents
1. [Pre-Test Setup](#1-pre-test-setup)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Command Center Module](#3-command-center-module)
4. [Operations Module](#4-operations-module)
5. [IT Management Module](#5-it-management-module)
6. [Freight/Logistics Module](#6-freightlogistics-module)
7. [Dispatch/Transport Module](#7-dispatchtransport-module)
8. [Hospitality Module](#8-hospitality-module)
9. [BPO Module](#9-bpo-module)
10. [SaaS Module](#10-saas-module)
11. [Holdings Module](#11-holdings-module)
12. [Admin Module](#12-admin-module)
13. [AI Features](#13-ai-features)
14. [Cross-Module Data Flow Tests](#14-cross-module-data-flow-tests)
15. [Role-Based Access Control Tests](#15-role-based-access-control-tests)
16. [Performance & Error Handling](#16-performance--error-handling)

---

## 1. Pre-Test Setup

### 1.1 Test Users (One per Role)
| Role | Test Email | Purpose |
|------|------------|---------|
| CEO | ceo@test.com | Full access validation |
| ADMIN | admin@test.com | Admin functions |
| COO | coo@test.com | Cross-venture access |
| VENTURE_HEAD | vh@test.com | Venture-scoped access |
| OFFICE_MANAGER | om@test.com | Office-scoped access |
| TEAM_LEAD | tl@test.com | Team management |
| EMPLOYEE | emp@test.com | Basic access |
| DISPATCHER | dispatcher@test.com | Freight-specific |
| CSR | csr@test.com | Customer service |
| CARRIER_TEAM | carrier@test.com | Carrier management |
| FINANCE | finance@test.com | Financial access |
| AUDITOR | auditor@test.com | Read-only audit |
| HR_ADMIN | hr@test.com | HR functions |
| ACCOUNTING | accounting@test.com | Accounting access |

### 1.2 Test Data Requirements
- [ ] At least 2 ventures per type (Logistics, Hospitality, BPO, SaaS, Holdings)
- [ ] At least 2 offices per venture
- [ ] At least 5 users per role type
- [ ] Sample loads, carriers, customers, hotels, campaigns, etc.

---

## 2. Authentication & Authorization

### 2.1 Login Flow
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AUTH-001 | Login page loads | Navigate to /login | Login form displays with email field | [ ] |
| AUTH-002 | OTP request - valid email | Enter valid email, click Send OTP | Success message, OTP sent | [ ] |
| AUTH-003 | OTP request - invalid email | Enter non-registered email | Error: "User not found" | [ ] |
| AUTH-004 | OTP verification - correct code | Enter correct OTP | Redirect to dashboard | [ ] |
| AUTH-005 | OTP verification - wrong code | Enter wrong OTP 3 times | Account locked message | [ ] |
| AUTH-006 | OTP expiration | Wait 10+ minutes, enter OTP | Error: "OTP expired" | [ ] |
| AUTH-007 | Session persistence | Login, close browser, reopen | Session maintained | [ ] |
| AUTH-008 | Logout | Click logout button | Redirect to login, session cleared | [ ] |

### 2.2 Impersonation (Admin Only)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AUTH-009 | Impersonation dropdown visible | Login as ADMIN/CEO | Impersonation dropdown in header | [ ] |
| AUTH-010 | Start impersonation | Select user from dropdown | Banner shows "Impersonating X" | [ ] |
| AUTH-011 | Access changes during impersonation | Navigate app while impersonating | See only impersonated user's access | [ ] |
| AUTH-012 | Stop impersonation | Click "Stop Impersonating" | Return to original session | [ ] |
| AUTH-013 | Impersonation audit log | Check /admin/activity-log | Impersonation events logged | [ ] |
| AUTH-014 | Non-admin cannot impersonate | Login as EMPLOYEE | No impersonation dropdown | [ ] |

### 2.3 Protected Routes
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AUTH-015 | Unauthenticated access | Visit /overview without login | Redirect to /login | [ ] |
| AUTH-016 | Unauthorized route | EMPLOYEE visits /admin/users | Redirect to /unauthorized | [ ] |
| AUTH-017 | API without auth | Call API without session | 401 Unauthorized | [ ] |

---

## 3. Command Center Module

### 3.1 My Day Page (/my-day)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CC-001 | Page loads | Navigate to /my-day | Today's tasks, EOD status visible | [ ] |
| CC-002 | Mark attendance | Click "Mark Present" | Attendance recorded, button changes | [ ] |
| CC-003 | View tasks for today | Check task section | Only today's tasks shown | [ ] |
| CC-004 | Quick EOD submission | Click "Submit EOD" | Redirects to /eod-reports/submit | [ ] |
| CC-005 | Task completion from My Day | Check off a task | Task marked complete, updates list | [ ] |

### 3.2 Overview Dashboard (/overview)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CC-006 | Dashboard loads for CEO | Login as CEO, go to /overview | Full dashboard with all ventures | [ ] |
| CC-007 | Venture summary cards | View venture cards | Shows KPIs, status for each | [ ] |
| CC-008 | Quick Links display | Check quick links section | User's saved links visible | [ ] |
| CC-009 | Add Quick Link | Click "Add Link", fill form, save | New link appears in grid | [ ] |
| CC-010 | Edit Quick Link | Click edit on existing link | Modal opens, can update | [ ] |
| CC-011 | Delete Quick Link | Click delete on link | Link removed after confirmation | [ ] |
| CC-012 | Click Quick Link | Click a quick link | Opens URL in new tab | [ ] |

### 3.3 Ventures (/ventures)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CC-013 | Ventures list loads | Navigate to /ventures | All accessible ventures listed | [ ] |
| CC-014 | Venture card details | View a venture card | Shows type, office count, status | [ ] |
| CC-015 | Click into venture | Click venture card | Navigate to /ventures/[id] | [ ] |
| CC-016 | Venture detail tabs | On detail page | See Overview, Freight, Hotels, People tabs | [ ] |
| CC-017 | Venture People tab | Click People tab | List of users assigned to venture | [ ] |
| CC-018 | Venture-scoped data | View venture detail | Only data for that venture shown | [ ] |

---

## 4. Operations Module

### 4.1 Tasks (/tasks)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| OPS-001 | Tasks list loads | Navigate to /tasks | List of user's tasks | [ ] |
| OPS-002 | Create new task | Click "New Task", fill form | Task created, appears in list | [ ] |
| OPS-003 | Task appears on board | Create task, go to /tasks/board | New task visible in correct column | [ ] |
| OPS-004 | Edit task | Click task, edit details | Changes saved | [ ] |
| OPS-005 | Complete task | Mark task as complete | Task moves to Done, timestamp recorded | [ ] |
| OPS-006 | Delete task | Click delete on task | Task removed | [ ] |
| OPS-007 | Task assignment | Assign task to another user | Task appears in assignee's list | [ ] |
| OPS-008 | Task due date filter | Filter by due date | Only matching tasks shown | [ ] |
| OPS-009 | Overdue task highlight | View overdue task | Red highlight, warning icon | [ ] |
| OPS-010 | Task priority sorting | Sort by priority | High priority first | [ ] |

### 4.2 Tasks Board (/tasks/board)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| OPS-011 | Kanban board loads | Navigate to /tasks/board | Columns: To Do, In Progress, Done | [ ] |
| OPS-012 | Drag task between columns | Drag task to new column | Status updates, persists on refresh | [ ] |
| OPS-013 | Board filters | Filter by assignee | Only that user's tasks shown | [ ] |

### 4.3 EOD Reports (/eod-reports)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| OPS-014 | Submit EOD form loads | Navigate to /eod-reports/submit | Form with fields visible | [ ] |
| OPS-015 | Submit EOD report | Fill form, click Submit | Success message, report saved | [ ] |
| OPS-016 | View my EOD history | Navigate to /eod-reports | List of submitted reports | [ ] |
| OPS-017 | EOD shows in team view | Submit EOD, manager views /eod-reports/team | Report visible | [ ] |
| OPS-018 | EOD required fields | Submit without required fields | Validation errors shown | [ ] |
| OPS-019 | Edit EOD (same day) | Edit today's EOD | Changes saved | [ ] |
| OPS-020 | View EOD detail | Click on EOD in list | Full report displayed | [ ] |

### 4.4 Team EOD Reports (/eod-reports/team)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| OPS-021 | Team reports load | Navigate as manager | See all team member reports | [ ] |
| OPS-022 | Filter by date | Select date range | Only reports in range shown | [ ] |
| OPS-023 | Missing EOD indicator | View team with missing EODs | Missing reports flagged | [ ] |
| OPS-024 | Notify manager button | Click notify | Manager receives notification | [ ] |

### 4.5 Attendance (/attendance/team)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| OPS-025 | Attendance page loads | Navigate to /attendance/team | Calendar view with team | [ ] |
| OPS-026 | Mark attendance (self) | Click "Present" button | Attendance recorded with timestamp | [ ] |
| OPS-027 | View team attendance | View as manager | See all team members' status | [ ] |
| OPS-028 | Attendance status types | Try each status | Present, Remote, PTO, Half Day, Sick, Late all work | [ ] |
| OPS-029 | Manager override | Manager changes team member status | Override recorded with reason | [ ] |
| OPS-030 | Attendance stats | View stats section | Correct counts for each status | [ ] |

### 4.6 Insurance Policies (/policies)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| OPS-031 | Policies list loads | Navigate to /policies | List of insurance policies | [ ] |
| OPS-032 | Create policy | Click New, fill form | Policy created | [ ] |
| OPS-033 | Edit policy | Click edit on policy | Modal opens, can update | [ ] |
| OPS-034 | Delete policy | Click delete | Policy removed after confirmation | [ ] |
| OPS-035 | Expiring policy alert | Policy near expiration | Warning indicator shown | [ ] |
| OPS-036 | Policy file upload | Attach document to policy | File saves, downloadable | [ ] |

### 4.7 Feedback (/feedback)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| OPS-037 | Feedback form loads | Navigate to /feedback | Form with category, description | [ ] |
| OPS-038 | Submit feedback | Fill and submit | Success message | [ ] |
| OPS-039 | Attach files | Add up to 5 files | Files upload successfully | [ ] |
| OPS-040 | File size limit | Try 15MB file | Error: exceeds 10MB limit | [ ] |
| OPS-041 | Feedback categories | Check dropdown | Bug, Feature Request, General available | [ ] |

---

## 5. IT Management Module

### 5.1 IT Assets (/it)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| IT-001 | IT page loads with tabs | Navigate to /it | Assets and Incidents tabs visible | [ ] |
| IT-002 | Assets list loads | View Assets tab | List of all IT assets | [ ] |
| IT-003 | Create IT asset | Click New Asset, fill form | Asset created with serial number | [ ] |
| IT-004 | Asset detail page | Click asset in list | Full details, history visible | [ ] |
| IT-005 | Edit asset | Edit asset details | Changes saved | [ ] |
| IT-006 | Assign asset to user | Select assignee | Assignment recorded with date | [ ] |
| IT-007 | Asset history tracking | Reassign asset | History shows previous assignments | [ ] |
| IT-008 | Delete asset | Delete asset | Removed after confirmation | [ ] |
| IT-009 | Asset filters | Filter by type, status | Only matching assets shown | [ ] |
| IT-010 | Asset search | Search by serial/name | Correct results returned | [ ] |

### 5.2 IT Incidents (/it - Incidents Tab)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| IT-011 | Incidents list loads | View Incidents tab | List of IT incidents | [ ] |
| IT-012 | Create incident | Click New Incident, fill form | Incident created | [ ] |
| IT-013 | Incident priority levels | Check priority dropdown | Low, Medium, High, Critical | [ ] |
| IT-014 | Assign incident | Assign to IT staff | Assignee notified | [ ] |
| IT-015 | Resolve incident | Mark as resolved | Status changes, resolution time calculated | [ ] |
| IT-016 | Incident tags | Add tags to incident | Tags saved and searchable | [ ] |
| IT-017 | Link incident to asset | Associate with IT asset | Link visible on both records | [ ] |

---

## 6. Freight/Logistics Module

### 6.1 Logistics Dashboard (/logistics/dashboard)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-001 | Dashboard loads | Navigate to /logistics/dashboard | KPIs, charts visible | [ ] |
| FRT-002 | Venture filter | Filter by logistics venture | Only that venture's data shown | [ ] |
| FRT-003 | Date range filter | Select date range | Data updates accordingly | [ ] |
| FRT-004 | Load status breakdown | View status chart | Pie/bar chart accurate | [ ] |

### 6.2 Loads (/freight/loads)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-005 | Loads list loads | Navigate to /freight/loads | Paginated load list | [ ] |
| FRT-006 | Create new load | Click New Load, fill form | Load created with ID | [ ] |
| FRT-007 | Load created appears | Create load, refresh list | New load in list | [ ] |
| FRT-008 | Load detail page | Click load | Full details: origin, destination, rate | [ ] |
| FRT-009 | Edit load | Edit load details | Changes saved | [ ] |
| FRT-010 | Assign carrier to load | Select carrier | Carrier assigned, status updates | [ ] |
| FRT-011 | Load status workflow | Change status through lifecycle | Pending → Assigned → In Transit → Delivered | [ ] |
| FRT-012 | Find carriers for load | Click "Find Carriers" | Carrier search page with matching carriers | [ ] |
| FRT-013 | Load filters | Filter by status, date, origin | Correct results | [ ] |
| FRT-014 | Load search | Search by reference number | Correct load found | [ ] |
| FRT-015 | Delete load | Delete load | Removed (soft delete) | [ ] |

### 6.3 Carriers (/freight/carriers)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-016 | Carriers list loads | Navigate to /freight/carriers | Carrier list with MC numbers | [ ] |
| FRT-017 | Create carrier | Click New Carrier, fill form | Carrier created | [ ] |
| FRT-018 | Carrier detail page | Click carrier | Contact info, stats, preferred lanes | [ ] |
| FRT-019 | FMCSA lookup | Click refresh FMCSA | Updates carrier data from FMCSA | [ ] |
| FRT-020 | Add carrier dispatcher | Add dispatcher contact | Contact saved, visible on carrier | [ ] |
| FRT-021 | Add preferred lane | Add lane preference | Lane visible on carrier detail | [ ] |
| FRT-022 | Carrier search | Search by name or MC | Correct results | [ ] |
| FRT-023 | Carrier stats | View carrier stats | Loads hauled, on-time %, issues | [ ] |

### 6.4 Shippers - Locations (/logistics/shippers)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-024 | Shippers list loads | Navigate to /logistics/shippers | Location list | [ ] |
| FRT-025 | Create shipper location | Click New, fill form | Location created | [ ] |
| FRT-026 | Shipper detail | Click shipper | Address, contacts, history | [ ] |
| FRT-027 | Add shipper preferred lanes | Add lane preferences | Lanes saved | [ ] |
| FRT-028 | Link to customer account | Associate with Customer | Link visible | [ ] |

### 6.5 Shippers - Accounts (/logistics/customers)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-029 | Customers list loads | Navigate to /logistics/customers | Customer accounts | [ ] |
| FRT-030 | Create customer | Click New, fill form | Customer created | [ ] |
| FRT-031 | Customer detail | Click customer | Full profile, credit terms | [ ] |
| FRT-032 | Customer health score | View health indicator | Score calculated and displayed | [ ] |
| FRT-033 | Customer touches | Log customer interaction | Touch recorded with timestamp | [ ] |
| FRT-034 | Customer approval workflow | Request approval | Approval request created | [ ] |

### 6.6 Shipper Approval (/logistics/customer-approval-request)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-035 | Approval form loads | Navigate to approval page | Form with customer selection | [ ] |
| FRT-036 | Submit approval request | Fill and submit | Request created, pending status | [ ] |
| FRT-037 | Approval appears for manager | Login as approver | Request visible in queue | [ ] |
| FRT-038 | Approve request | Click Approve | Status changes, customer activated | [ ] |
| FRT-039 | Reject request | Click Reject with reason | Status changes, requestor notified | [ ] |

### 6.7 Freight KPIs (/freight/kpi)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-040 | KPI page loads | Navigate to /freight/kpi | KPI dashboard | [ ] |
| FRT-041 | KPI metrics display | View metrics | Loads, revenue, margin, on-time % | [ ] |
| FRT-042 | Venture filter | Filter by venture | Venture-specific KPIs | [ ] |
| FRT-043 | Date range filter | Select date range | KPIs recalculate | [ ] |
| FRT-044 | Export KPIs | Click export | CSV download | [ ] |

### 6.8 Freight P&L (/freight/pnl)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-045 | P&L page loads | Navigate to /freight/pnl | P&L statement | [ ] |
| FRT-046 | Revenue breakdown | View revenue section | By customer, lane, carrier | [ ] |
| FRT-047 | Cost breakdown | View costs section | Carrier pay, fuel, other | [ ] |
| FRT-048 | Margin calculation | Check margin | (Revenue - Cost) / Revenue correct | [ ] |
| FRT-049 | Period comparison | Compare periods | YoY, MoM variance shown | [ ] |

### 6.9 Shipper Health (/freight/shipper-health)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-050 | Shipper Health loads | Navigate to page | Tabs for At-Risk, Churn, ICP | [ ] |
| FRT-051 | At-Risk tab | View at-risk customers | Health scores < threshold | [ ] |
| FRT-052 | Churn analysis tab | View churn data | Customers with declining activity | [ ] |
| FRT-053 | ICP tab | View ideal customer profile | ICP matches highlighted | [ ] |

### 6.10 Coverage War Room (/freight/coverage)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-054 | Coverage page loads | Navigate to /freight/coverage | Coverage stats and war room tabs | [ ] |
| FRT-055 | Coverage stats tab | View stats | Open loads, coverage %, by lane | [ ] |
| FRT-056 | War room tab | View war room | Urgent loads needing coverage | [ ] |
| FRT-057 | Lane filter | Filter by lane | Specific lane coverage | [ ] |

### 6.11 Lost & At-Risk (/freight/lost-and-at-risk)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-058 | Lost loads list | Navigate to page | Lost/at-risk loads | [ ] |
| FRT-059 | AI detection | Check AI flagged loads | AI-identified issues highlighted | [ ] |
| FRT-060 | Loss reason categorization | View reasons | Categories: pricing, capacity, service | [ ] |
| FRT-061 | Recovery actions | Log recovery attempt | Action recorded | [ ] |

### 6.12 Dormant Customers (/freight/dormant-customers)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-062 | Dormant list loads | Navigate to page | Customers with no recent activity | [ ] |
| FRT-063 | Days since last load | Check days column | Accurate calculation | [ ] |
| FRT-064 | Reactivation action | Log outreach | Touch recorded | [ ] |

### 6.13 Outreach War Room (/freight/outreach-war-room)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-065 | Outreach page loads | Navigate to page | Outreach campaigns | [ ] |
| FRT-066 | Pending outreach | View pending queue | Prioritized by urgency | [ ] |
| FRT-067 | Log outreach | Record email/call | Touch saved | [ ] |
| FRT-068 | Outreach stats | View stats | Response rate, conversions | [ ] |

### 6.14 Dispatcher Dashboard (/dispatcher/dashboard)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-069 | Dispatcher view loads | Navigate as dispatcher | Assigned loads, tasks | [ ] |
| FRT-070 | Today's loads | View today's loads | Only current day | [ ] |
| FRT-071 | Quick status update | Update load status | Instant save | [ ] |

### 6.15 CSR Dashboard (/csr/dashboard)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-072 | CSR view loads | Navigate as CSR | Customer-focused view | [ ] |
| FRT-073 | Customer queue | View customer queue | Pending items for customers | [ ] |
| FRT-074 | Quick quote | Generate quote | Quote created | [ ] |

### 6.16 Missing Mappings (/logistics/missing-mappings)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FRT-075 | Missing mappings load | Navigate to page | List of unmapped entries | [ ] |
| FRT-076 | Map entry | Select mapping | Entry mapped | [ ] |
| FRT-077 | Bulk mapping | Select multiple, map | All updated | [ ] |

---

## 7. Dispatch/Transport Module

### 7.1 Dispatch Hub (/dispatch)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DSP-001 | Dispatch hub loads | Navigate to /dispatch | Main dispatch interface | [ ] |
| DSP-002 | View active loads | Check loads section | Current loads displayed | [ ] |

### 7.2 Dispatch Inbox (/dispatch/inbox)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DSP-003 | Inbox loads | Navigate to /dispatch/inbox | Conversations list | [ ] |
| DSP-004 | View conversation | Click conversation | Messages displayed | [ ] |
| DSP-005 | Send message | Type and send | Message sent, appears in thread | [ ] |
| DSP-006 | Claim conversation | Click claim | Assigned to current user | [ ] |
| DSP-007 | Release conversation | Click release | Unassigned | [ ] |

### 7.3 Dispatch Loads (/dispatch/loads)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DSP-008 | Dispatch loads list | Navigate to page | Transport loads | [ ] |
| DSP-009 | Create dispatch load | Click new, fill form | Load created | [ ] |
| DSP-010 | Assign driver | Select driver | Driver assigned | [ ] |
| DSP-011 | Assign truck | Select truck | Truck assigned | [ ] |

### 7.4 Drivers (/dispatch/drivers)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DSP-012 | Drivers list loads | Navigate to /dispatch/drivers | Driver list | [ ] |
| DSP-013 | Create driver | Click new, fill form | Driver created | [ ] |
| DSP-014 | Driver detail | Click driver | License info, loads, stats | [ ] |
| DSP-015 | Edit driver | Edit details | Changes saved | [ ] |
| DSP-016 | Deactivate driver | Mark inactive | Status updates | [ ] |

### 7.5 Trucks (/dispatch/trucks)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DSP-017 | Trucks list loads | Navigate to /dispatch/trucks | Truck list | [ ] |
| DSP-018 | Create truck | Click New Truck, fill form | Truck created with unit number | [ ] |
| DSP-019 | Truck created appears in list | Create truck, refresh | New truck visible | [ ] |
| DSP-020 | Truck detail page | Click truck | Full specs, maintenance history | [ ] |
| DSP-021 | Edit truck | Edit details | Changes saved | [ ] |
| DSP-022 | Delete truck | Click delete | Removed after confirmation | [ ] |
| DSP-023 | Truck status filter | Filter by status | Active, Maintenance, Out of Service | [ ] |

### 7.6 Settlements (/dispatch/settlements)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DSP-024 | Settlements list loads | Navigate to /dispatch/settlements | Settlement records | [ ] |
| DSP-025 | Create settlement | Generate settlement | Settlement created | [ ] |
| DSP-026 | Settlement calculation | View calculation | Gross - deductions = net | [ ] |
| DSP-027 | Approve settlement | Approve as finance | Status: Approved | [ ] |
| DSP-028 | Settlement history | View by driver | All driver settlements | [ ] |

### 7.7 Dispatch Settings (/dispatch/settings)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DSP-029 | Settings page loads | Navigate to /dispatch/settings | Configuration options | [ ] |
| DSP-030 | Email connection | Connect Gmail | OAuth flow completes | [ ] |
| DSP-031 | Save settings | Update and save | Settings persisted | [ ] |

---

## 8. Hospitality Module

### 8.1 Hospitality Dashboard (/hospitality/dashboard)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HSP-001 | Dashboard loads | Navigate to /hospitality/dashboard | Hotel KPIs overview | [ ] |
| HSP-002 | Occupancy chart | View chart | Daily/weekly occupancy | [ ] |
| HSP-003 | ADR/RevPAR metrics | View metrics | Accurate calculations | [ ] |
| HSP-004 | Property filter | Filter by hotel | Single hotel data | [ ] |

### 8.2 Hotels (/hospitality/hotels)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HSP-005 | Hotels list loads | Navigate to /hospitality/hotels | List of properties | [ ] |
| HSP-006 | Create hotel | Click New Hotel, fill form | Hotel created | [ ] |
| HSP-007 | Hotel created appears | Create, refresh | New hotel in list | [ ] |
| HSP-008 | Hotel detail page | Click hotel | Full property details | [ ] |
| HSP-009 | Edit hotel | Edit property info | Changes saved | [ ] |
| HSP-010 | Delete hotel | Delete hotel | Removed (soft delete) | [ ] |
| HSP-011 | Hotel status toggle | Toggle active/closed | Status updates | [ ] |

### 8.3 Hotel KPIs (/hotels/kpis)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HSP-012 | KPI page loads | Navigate to /hotels/kpis | Charts and YoY tabs | [ ] |
| HSP-013 | Charts tab | View charts | Occupancy, ADR, RevPAR charts | [ ] |
| HSP-014 | YoY report tab | View YoY | Year-over-year comparison | [ ] |
| HSP-015 | Property filter | Filter by property | Single property KPIs | [ ] |
| HSP-016 | Date range filter | Select dates | KPIs recalculate | [ ] |

### 8.4 Hotel P&L (/admin/hotels/pnl)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HSP-017 | P&L page loads | Navigate to hotel P&L | Monthly P&L statement | [ ] |
| HSP-018 | Revenue breakdown | View revenue | Room, other revenue | [ ] |
| HSP-019 | Expense breakdown | View expenses | Payroll, utilities, marketing | [ ] |
| HSP-020 | GOP calculation | Check GOP | Gross Operating Profit correct | [ ] |
| HSP-021 | Month filter | Select month | That month's P&L | [ ] |
| HSP-022 | Property filter | Select property | Property-specific P&L | [ ] |

### 8.5 Hotel KPI Upload (/hotels/kpi-upload)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HSP-023 | Upload page loads | Navigate to page | File upload form | [ ] |
| HSP-024 | Upload CSV | Select valid CSV | Data imported | [ ] |
| HSP-025 | Invalid file format | Upload wrong format | Error message | [ ] |
| HSP-026 | Validation errors | Upload invalid data | Row-level errors shown | [ ] |

### 8.6 Hotel Reviews (/hospitality/reviews)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HSP-027 | Reviews list loads | Navigate to /hospitality/reviews | Reviews from all sources | [ ] |
| HSP-028 | Filter by source | Filter Google/TripAdvisor | Only that source shown | [ ] |
| HSP-029 | Filter by property | Select hotel | Only that hotel's reviews | [ ] |
| HSP-030 | Review detail | Click review | Full text, response | [ ] |
| HSP-031 | Add response | Add/edit response | Response saved | [ ] |
| HSP-032 | Rating filter | Filter by stars | Correct results | [ ] |
| HSP-033 | Average rating display | View average | Accurate calculation | [ ] |

### 8.7 Hotel Issues (/hotels/issues)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HSP-034 | Issues page loads | Navigate to /hotels/issues | Disputes and Loss Nights tabs | [ ] |
| HSP-035 | Disputes tab | View disputes | OTA/guest disputes | [ ] |
| HSP-036 | Loss nights tab | View loss nights | High-loss nights flagged | [ ] |

### 8.8 Hotel Disputes (/hotels/disputes)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HSP-037 | Disputes list loads | Navigate to /hotels/disputes | List of disputes | [ ] |
| HSP-038 | Create dispute | Click New, fill form | Dispute created | [ ] |
| HSP-039 | Dispute appears in issues | Create dispute, go to issues tab | Dispute visible | [ ] |
| HSP-040 | Dispute detail | Click dispute | Full details, timeline | [ ] |
| HSP-041 | Add dispute note | Add note | Note saved with timestamp | [ ] |
| HSP-042 | Update dispute status | Change status | Status updated | [ ] |
| HSP-043 | Resolve dispute | Mark resolved | Resolution recorded | [ ] |

### 8.9 AI Outreach Draft (/hotels/ai/outreach-draft)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HSP-044 | AI draft page loads | Navigate to page | Draft generator form | [ ] |
| HSP-045 | Generate draft | Fill context, click generate | AI-generated draft appears | [ ] |
| HSP-046 | Edit draft | Modify generated text | Edits preserved | [ ] |
| HSP-047 | Copy draft | Click copy | Text copied to clipboard | [ ] |

---

## 9. BPO Module

### 9.1 BPO Dashboard (/bpo/dashboard)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| BPO-001 | Dashboard loads | Navigate to /bpo/dashboard | BPO KPI overview | [ ] |
| BPO-002 | Call volume chart | View chart | Daily/weekly call volume | [ ] |
| BPO-003 | Agent performance | View agent metrics | Top performers shown | [ ] |
| BPO-004 | Campaign filter | Filter by campaign | Campaign-specific data | [ ] |

### 9.2 Campaigns (/bpo/campaigns)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| BPO-005 | Campaigns list loads | Navigate to /bpo/campaigns | Campaign list | [ ] |
| BPO-006 | Create campaign | Click New Campaign | Campaign created | [ ] |
| BPO-007 | Campaign created appears | Create, refresh | New campaign in list | [ ] |
| BPO-008 | Campaign detail | Click campaign | Full details, metrics | [ ] |
| BPO-009 | Edit campaign | Edit details | Changes saved | [ ] |
| BPO-010 | Campaign metrics | View metrics | Calls, conversions, revenue | [ ] |
| BPO-011 | Assign agents | Add agents to campaign | Agents assigned | [ ] |

### 9.3 Agents (/bpo/agents)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| BPO-012 | Agents list loads | Navigate to /bpo/agents | Agent list | [ ] |
| BPO-013 | Create agent | Click New Agent | Agent created | [ ] |
| BPO-014 | Agent detail | Click agent | Full profile, stats | [ ] |
| BPO-015 | Agent KPIs | View KPIs | Calls, talk time, conversions | [ ] |
| BPO-016 | Edit agent | Edit details | Changes saved | [ ] |

### 9.4 Call Logs (/bpo/call-logs)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| BPO-017 | Call logs load | Navigate to /bpo/call-logs | Call log list | [ ] |
| BPO-018 | Filter by venture | Select venture | Venture calls only | [ ] |
| BPO-019 | Filter by campaign | Select campaign | Campaign calls only | [ ] |
| BPO-020 | Filter by date | Select date range | Date-filtered results | [ ] |
| BPO-021 | Connected filter | Toggle connected | Only connected/not connected | [ ] |
| BPO-022 | Deal status filter | Filter by deal status | Matching calls | [ ] |
| BPO-023 | Pagination | Navigate pages | Cursor-based pagination works | [ ] |

### 9.5 Real-time (/bpo/realtime)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| BPO-024 | Real-time page loads | Navigate to /bpo/realtime | Live stats | [ ] |
| BPO-025 | Live agent status | View agents | Online/offline status | [ ] |
| BPO-026 | Active calls count | View metric | Current calls in progress | [ ] |
| BPO-027 | Auto-refresh | Wait 30 seconds | Data refreshes | [ ] |

### 9.6 BPO KPIs (/bpo/kpi)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| BPO-028 | KPI page loads | Navigate to /bpo/kpi | KPI dashboard | [ ] |
| BPO-029 | Record KPI | Enter KPI data | Data saved | [ ] |
| BPO-030 | KPI trends | View trend charts | Historical data displayed | [ ] |
| BPO-031 | Export KPIs | Click export | CSV download | [ ] |

### 9.7 BPO Incentives (/bpo/incentives)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| BPO-032 | Incentives page loads | Navigate to page | Incentive programs | [ ] |
| BPO-033 | View agent incentives | Select agent | Their incentive progress | [ ] |
| BPO-034 | Incentive calculation | Check calculation | Correct based on rules | [ ] |

### 9.8 AI Client Draft (/bpo/ai/client-draft)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| BPO-035 | AI draft page loads | Navigate to page | Draft form | [ ] |
| BPO-036 | Generate client draft | Fill and generate | AI draft appears | [ ] |
| BPO-037 | Copy draft | Click copy | Text copied | [ ] |

---

## 10. SaaS Module

### 10.1 SaaS Customers (/saas/customers)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SAAS-001 | Customers list loads | Navigate to /saas/customers | Customer list | [ ] |
| SAAS-002 | Create customer | Click New, fill form | Customer created | [ ] |
| SAAS-003 | Customer appears | Create, refresh | New customer visible | [ ] |
| SAAS-004 | Customer detail | Click customer | Full profile, subscriptions | [ ] |
| SAAS-005 | Edit customer | Edit details | Changes saved | [ ] |
| SAAS-006 | Customer lifecycle | View history | Acquisition, activity, churn risk | [ ] |

### 10.2 Subscriptions (/saas/subscriptions)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SAAS-007 | Subscriptions list | Navigate to /saas/subscriptions | All subscriptions | [ ] |
| SAAS-008 | Create subscription | Add subscription to customer | Subscription created | [ ] |
| SAAS-009 | Subscription links to customer | View customer detail | Subscription visible | [ ] |
| SAAS-010 | Edit subscription | Change plan/price | Updates saved | [ ] |
| SAAS-011 | Cancel subscription | Cancel subscription | Status: Cancelled | [ ] |
| SAAS-012 | Subscription renewal | View renewal date | Accurate next billing | [ ] |

### 10.3 MRR/ARR Metrics (/saas/metrics)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SAAS-013 | Metrics page loads | Navigate to /saas/metrics | MRR/ARR dashboard | [ ] |
| SAAS-014 | MRR calculation | View MRR | Sum of monthly recurring | [ ] |
| SAAS-015 | ARR calculation | View ARR | MRR x 12 | [ ] |
| SAAS-016 | Churn metrics | View churn | Customer and revenue churn | [ ] |
| SAAS-017 | Cohort analysis | View cohorts | Cohort retention data | [ ] |
| SAAS-018 | Growth chart | View growth | MRR trend over time | [ ] |

### 10.4 Sales KPIs (/sales/sales-kpi)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SAAS-019 | Sales KPI page loads | Navigate to page | Sales metrics | [ ] |
| SAAS-020 | Record sales KPI | Enter daily data | Data saved | [ ] |
| SAAS-021 | Sales trends | View charts | Pipeline, conversions | [ ] |

---

## 11. Holdings Module

### 11.1 Holdings Assets (/holdings/assets)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HLD-001 | Assets list loads | Navigate to /holdings/assets | Asset list | [ ] |
| HLD-002 | Create asset | Click New, fill form | Asset created | [ ] |
| HLD-003 | Asset appears | Create, refresh | New asset visible | [ ] |
| HLD-004 | Asset detail | Click asset | Full details, documents | [ ] |
| HLD-005 | Edit asset | Edit details | Changes saved | [ ] |
| HLD-006 | Delete asset | Delete asset | Removed | [ ] |
| HLD-007 | Asset valuation | View valuation | Current market value | [ ] |
| HLD-008 | Upload asset document | Attach document | Document saved | [ ] |
| HLD-009 | Download asset document | Click download | File downloads | [ ] |

### 11.2 Bank Snapshots (/holdings/bank)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HLD-010 | Bank page loads | Navigate to /holdings/bank | Bank accounts list | [ ] |
| HLD-011 | Create bank account | Add new account | Account created | [ ] |
| HLD-012 | Account detail | Click account | Balance history | [ ] |
| HLD-013 | Add snapshot | Record balance | Snapshot saved with date | [ ] |
| HLD-014 | Balance trend | View chart | Historical balances | [ ] |
| HLD-015 | Total holdings | View total | Sum of all accounts | [ ] |

### 11.3 Document Vault (/holdings/documents)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HLD-016 | Document vault loads | Navigate to page | Document list | [ ] |
| HLD-017 | Upload document | Upload file | Document saved | [ ] |
| HLD-018 | Categorize document | Set category | Category saved | [ ] |
| HLD-019 | Search documents | Search by name | Results found | [ ] |
| HLD-020 | Download document | Click download | File downloads | [ ] |
| HLD-021 | Delete document | Delete file | Removed | [ ] |

### 11.4 Holdings RBAC Verification
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HLD-022 | CEO access | Login as CEO, access holdings | Full access | [ ] |
| HLD-023 | ADMIN access | Login as ADMIN | Full access | [ ] |
| HLD-024 | COO access | Login as COO | Full access | [ ] |
| HLD-025 | FINANCE access | Login as FINANCE | Full access | [ ] |
| HLD-026 | EMPLOYEE denied | Login as EMPLOYEE | Access denied | [ ] |
| HLD-027 | DISPATCHER denied | Login as DISPATCHER | Access denied | [ ] |

---

## 12. Admin Module

### 12.1 Users (/admin/users)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-001 | Users list loads | Navigate to /admin/users | User list | [ ] |
| ADM-002 | Create user | Click Create User, fill form | User created | [ ] |
| ADM-003 | User appears in list | Create user, refresh | New user visible | [ ] |
| ADM-004 | Edit user | Edit user details | Changes saved | [ ] |
| ADM-005 | Change user role | Update role | Role changed | [ ] |
| ADM-006 | Assign ventures | Assign to ventures | User has venture access | [ ] |
| ADM-007 | Assign offices | Assign to offices | User has office access | [ ] |
| ADM-008 | Deactivate user | Mark inactive | User cannot login | [ ] |
| ADM-009 | Search users | Search by name/email | Results found | [ ] |
| ADM-010 | Filter by role | Filter by role | Role-specific users shown | [ ] |

### 12.2 Offices (/admin/offices)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-011 | Offices list loads | Navigate to /admin/offices | Office list | [ ] |
| ADM-012 | Create office | Click New, fill form | Office created | [ ] |
| ADM-013 | Office appears | Create, refresh | New office visible | [ ] |
| ADM-014 | Edit office | Edit details | Changes saved | [ ] |
| ADM-015 | Assign to venture | Link to venture | Office associated | [ ] |
| ADM-016 | Delete office | Delete office | Removed | [ ] |

### 12.3 Ventures (/admin/ventures)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-017 | Ventures list loads | Navigate to /admin/ventures | Venture list | [ ] |
| ADM-018 | Create venture | Click New, fill form | Venture created | [ ] |
| ADM-019 | Venture appears | Create, refresh | New venture visible | [ ] |
| ADM-020 | Edit venture | Edit details | Changes saved | [ ] |
| ADM-021 | Venture type | Set type | Type saved correctly | [ ] |
| ADM-022 | Deactivate venture | Mark inactive | Venture hidden from users | [ ] |

### 12.4 Roles & Permissions (/admin/roles)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-023 | Roles page loads | Navigate to /admin/roles | Role list | [ ] |
| ADM-024 | View role permissions | Click role | Permission matrix displayed | [ ] |
| ADM-025 | Edit permissions | Modify permissions | Changes saved | [ ] |
| ADM-026 | Permission applied | User with role tests | Access matches permissions | [ ] |

### 12.5 Activity Log (/admin/activity-log)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-027 | Activity log loads | Navigate to page | Recent activities | [ ] |
| ADM-028 | Filter by user | Select user | That user's activities | [ ] |
| ADM-029 | Filter by action | Select action type | Matching activities | [ ] |
| ADM-030 | Filter by date | Select date range | Date-filtered results | [ ] |
| ADM-031 | Activity details | Click activity | Full detail shown | [ ] |
| ADM-032 | Impersonation logged | Impersonate user | Event appears in log | [ ] |

### 12.6 Audit (/admin/audit)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-033 | Audit page loads | Navigate to /admin/audit | Audit dashboard | [ ] |
| ADM-034 | Run audit | Click Run Audit | Audit executes, results shown | [ ] |
| ADM-035 | View audit issues | View issues | Issues with severity | [ ] |
| ADM-036 | Audit history | View past audits | Historical results | [ ] |

### 12.7 System Jobs (/admin/jobs)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-037 | Jobs page loads | Navigate to /admin/jobs | Job list | [ ] |
| ADM-038 | View job status | Check jobs | Status: Active/Inactive | [ ] |
| ADM-039 | Trigger job manually | Click Run | Job executes | [ ] |
| ADM-040 | Dry run option | Enable dry run, trigger | No actual changes | [ ] |
| ADM-041 | Job history | View history | Past executions listed | [ ] |

### 12.8 Quarantine (/admin/quarantine)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-042 | Quarantine loads | Navigate to /admin/quarantine | Quarantined items | [ ] |
| ADM-043 | View quarantine item | Click item | Full details | [ ] |
| ADM-044 | Resolve quarantine | Click resolve | Item processed | [ ] |
| ADM-045 | Delete quarantine | Click delete | Item removed | [ ] |

### 12.9 AI Templates (/admin/ai-templates)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-046 | Templates list loads | Navigate to page | Template list | [ ] |
| ADM-047 | Create template | Click New, fill form | Template created | [ ] |
| ADM-048 | Edit template | Edit template | Changes saved | [ ] |
| ADM-049 | Delete template | Delete template | Removed | [ ] |
| ADM-050 | Template in use | Use template in AI draft | Template applied | [ ] |

### 12.10 AI Usage (/admin/ai-usage)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-051 | AI usage loads | Navigate to page | Usage statistics | [ ] |
| ADM-052 | Usage by user | View by user | User-specific usage | [ ] |
| ADM-053 | Usage by feature | View by feature | Feature breakdown | [ ] |
| ADM-054 | Token consumption | View tokens | Accurate counts | [ ] |
| ADM-055 | Daily limits | Check limits | Daily cap enforced | [ ] |

### 12.11 Org Chart (/admin/org-chart)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-056 | Org chart loads | Navigate to page | Organizational chart | [ ] |
| ADM-057 | Hierarchy display | View chart | Reports-to relationships | [ ] |
| ADM-058 | Department view | Filter by department | Department tree | [ ] |

### 12.12 Data Import (/import)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-059 | Import page loads | Navigate to /import | Import options | [ ] |
| ADM-060 | Upload CSV | Select valid CSV | File parsed | [ ] |
| ADM-061 | Field mapping | Map fields | Mappings saved | [ ] |
| ADM-062 | Import preview | View preview | Data displayed | [ ] |
| ADM-063 | Execute import | Click Import | Data imported | [ ] |
| ADM-064 | Import errors | Upload invalid data | Errors shown | [ ] |
| ADM-065 | FMCSA import | Import carriers | Carriers created | [ ] |

### 12.13 Incentives Admin (/admin/incentives)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-066 | Incentives page loads | Navigate to /admin/incentives | Incentive management | [ ] |
| ADM-067 | View overview tab | Click Overview | Plan summary | [ ] |
| ADM-068 | Rules tab | Click Rules | Incentive rules list | [ ] |
| ADM-069 | Create rule | Add new rule | Rule created | [ ] |
| ADM-070 | Edit rule | Edit rule | Changes saved | [ ] |
| ADM-071 | Delete rule | Delete rule | Removed | [ ] |
| ADM-072 | Run tab | Click Run | Execute calculations | [ ] |
| ADM-073 | Simulator tab | Click Simulator | Test scenarios | [ ] |
| ADM-074 | Preview tab | Click Preview | Preview payouts | [ ] |

---

## 13. AI Features

### 13.1 Freight AI Tools (/freight/ai-tools)
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AI-001 | AI tools page loads | Navigate to /freight/ai-tools | Tabs for each tool | [ ] |
| AI-002 | Carrier draft tab | Use carrier draft | AI generates carrier outreach | [ ] |
| AI-003 | EOD draft tab | Use EOD draft | AI generates EOD summary | [ ] |
| AI-004 | Ops diagnostics tab | Use diagnostics | AI analyzes operations | [ ] |
| AI-005 | Intelligence tab | Use intelligence | AI market insights | [ ] |
| AI-006 | Rate limiting | Make many requests | Rate limit message shown | [ ] |
| AI-007 | Usage tracking | Check AI usage | Calls logged | [ ] |

### 13.2 AI Guardrails
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AI-008 | Input sanitization | Submit malicious prompt | Prompt rejected/sanitized | [ ] |
| AI-009 | Output filtering | Request sensitive data | Data not exposed | [ ] |
| AI-010 | Daily limit | Exceed daily limit | Limit reached message | [ ] |
| AI-011 | Usage logged | Make AI request | Log entry created | [ ] |

---

## 14. Cross-Module Data Flow Tests

### 14.1 Task Flow
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FLOW-001 | Task creation to board | Create task at /tasks/new | Task appears on /tasks/board | [ ] |
| FLOW-002 | Task to My Day | Create task for today | Task appears on /my-day | [ ] |
| FLOW-003 | Task assignment notification | Assign task to user | User receives notification | [ ] |
| FLOW-004 | Completed task count | Complete task | Dashboard stats update | [ ] |

### 14.2 Load Flow
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FLOW-005 | Load to carrier assignment | Create load, assign carrier | Carrier stats update | [ ] |
| FLOW-006 | Load to KPI | Complete load | Freight KPI updates | [ ] |
| FLOW-007 | Load to P&L | Load with revenue | P&L revenue increases | [ ] |
| FLOW-008 | Lost load flagging | Mark load lost | Appears in lost loads report | [ ] |

### 14.3 Hotel Flow
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FLOW-009 | Hotel to KPI | Create hotel with KPI data | KPI dashboard shows data | [ ] |
| FLOW-010 | KPI upload to charts | Upload KPIs via CSV | Charts reflect new data | [ ] |
| FLOW-011 | P&L data to dashboard | Add P&L entry | Dashboard updates | [ ] |
| FLOW-012 | Review to reputation | Add review | Average rating recalculates | [ ] |

### 14.4 BPO Flow
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FLOW-013 | Campaign to agent | Assign agent to campaign | Agent sees campaign | [ ] |
| FLOW-014 | Call log to KPI | Calls logged | KPI metrics update | [ ] |
| FLOW-015 | Agent to incentive | Agent hits targets | Incentive calculated | [ ] |

### 14.5 SaaS Flow
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FLOW-016 | Customer to subscription | Create customer, add subscription | Subscription links to customer | [ ] |
| FLOW-017 | Subscription to MRR | Add subscription | MRR increases | [ ] |
| FLOW-018 | Cancellation to churn | Cancel subscription | Churn metrics update | [ ] |

### 14.6 Holdings Flow
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FLOW-019 | Asset to document | Create asset, add document | Document linked to asset | [ ] |
| FLOW-020 | Bank snapshot to total | Add snapshot | Total holdings updates | [ ] |

### 14.7 User Flow
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| FLOW-021 | User to attendance | User marks present | Attendance records created | [ ] |
| FLOW-022 | User to EOD | User submits EOD | Report visible to manager | [ ] |
| FLOW-023 | User to activity log | User performs action | Action logged | [ ] |
| FLOW-024 | Venture assignment | Assign user to venture | User sees venture data | [ ] |
| FLOW-025 | Office assignment | Assign user to office | User scoped to office | [ ] |

---

## 15. Role-Based Access Control Tests

### 15.1 CEO Role
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RBAC-001 | CEO sees all ventures | Login as CEO | All ventures visible | [ ] |
| RBAC-002 | CEO accesses holdings | Go to holdings | Full access | [ ] |
| RBAC-003 | CEO accesses admin | Go to admin pages | Full access | [ ] |
| RBAC-004 | CEO can impersonate | Use impersonation | Works | [ ] |

### 15.2 VENTURE_HEAD Role
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RBAC-005 | VH sees assigned ventures | Login as VH | Only assigned ventures | [ ] |
| RBAC-006 | VH cannot access other ventures | Try other venture | Access denied | [ ] |
| RBAC-007 | VH manages team | View team page | Team visible | [ ] |
| RBAC-008 | VH cannot access admin users | Try /admin/users | Access denied | [ ] |

### 15.3 EMPLOYEE Role
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RBAC-009 | Employee sees limited nav | Login as EMPLOYEE | Limited menu | [ ] |
| RBAC-010 | Employee My Day access | Go to /my-day | Access granted | [ ] |
| RBAC-011 | Employee tasks access | Go to /tasks | Own tasks only | [ ] |
| RBAC-012 | Employee no admin | Try /admin | Access denied | [ ] |
| RBAC-013 | Employee no holdings | Try /holdings | Access denied | [ ] |

### 15.4 DISPATCHER Role
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RBAC-014 | Dispatcher freight access | Go to freight pages | Access granted | [ ] |
| RBAC-015 | Dispatcher no hospitality | Try /hospitality | Access denied | [ ] |
| RBAC-016 | Dispatcher dashboard | Go to /dispatcher/dashboard | Access granted | [ ] |

### 15.5 CSR Role
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RBAC-017 | CSR customer access | Go to customers | Access granted | [ ] |
| RBAC-018 | CSR dashboard | Go to /csr/dashboard | Access granted | [ ] |
| RBAC-019 | CSR no P&L | Try /freight/pnl | Access denied | [ ] |

### 15.6 FINANCE Role
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RBAC-020 | Finance P&L access | Go to P&L pages | Access granted | [ ] |
| RBAC-021 | Finance settlements | Go to /dispatch/settlements | Access granted | [ ] |
| RBAC-022 | Finance holdings | Go to /holdings | Access granted | [ ] |
| RBAC-023 | Finance no user admin | Try /admin/users | Access denied | [ ] |

### 15.7 AUDITOR Role
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RBAC-024 | Auditor read-only | View pages | Can view, not edit | [ ] |
| RBAC-025 | Auditor KPI access | View all KPIs | Access granted | [ ] |
| RBAC-026 | Auditor no create | Try to create load | Action denied | [ ] |

### 15.8 HR_ADMIN Role
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RBAC-027 | HR user management | Go to /admin/users | Access granted | [ ] |
| RBAC-028 | HR attendance | View /attendance | Access granted | [ ] |
| RBAC-029 | HR no venture data | Try freight loads | Access denied | [ ] |

---

## 16. Performance & Error Handling

### 16.1 Performance Tests
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PERF-001 | Page load time | Load main pages | < 3 seconds | [ ] |
| PERF-002 | Large list pagination | View 1000+ records | Pagination works | [ ] |
| PERF-003 | Search performance | Search large dataset | Results < 2 seconds | [ ] |
| PERF-004 | Chart rendering | Load dashboard with charts | Renders smoothly | [ ] |
| PERF-005 | File upload | Upload 10MB file | Completes without timeout | [ ] |

### 16.2 Error Handling
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ERR-001 | 404 page | Visit /nonexistent | 404 page shown | [ ] |
| ERR-002 | API error display | Cause API error | User-friendly message | [ ] |
| ERR-003 | Network timeout | Slow connection | Loading state, then retry | [ ] |
| ERR-004 | Session expiry | Let session expire | Redirect to login | [ ] |
| ERR-005 | Validation errors | Submit invalid form | Field errors highlighted | [ ] |
| ERR-006 | Concurrent edit | Two users edit same record | Conflict handling | [ ] |

### 16.3 API Rate Limiting
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RATE-001 | General rate limit | 31+ requests/minute | 429 response | [ ] |
| RATE-002 | Rate limit message | Hit rate limit | Clear message to user | [ ] |
| RATE-003 | Rate limit recovery | Wait 1 minute | Requests work again | [ ] |

### 16.4 Database Safety
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DB-001 | Connection pooling | Many concurrent users | Connections managed | [ ] |
| DB-002 | Transaction rollback | Fail mid-operation | Data consistent | [ ] |
| DB-003 | Cascade delete | Delete parent | Children handled | [ ] |

---

## Testing Sign-Off

### Test Summary
| Module | Total Tests | Passed | Failed | Blocked |
|--------|-------------|--------|--------|---------|
| Authentication | 17 | | | |
| Command Center | 18 | | | |
| Operations | 41 | | | |
| IT Management | 17 | | | |
| Freight/Logistics | 75 | | | |
| Dispatch/Transport | 31 | | | |
| Hospitality | 47 | | | |
| BPO | 37 | | | |
| SaaS | 21 | | | |
| Holdings | 27 | | | |
| Admin | 74 | | | |
| AI Features | 11 | | | |
| Cross-Module Flows | 25 | | | |
| RBAC | 29 | | | |
| Performance/Error | 18 | | | |
| **TOTAL** | **488** | | | |

### Approvals
| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

*Document Version: 1.0*  
*Last Updated: December 2025*  
*Application Version: SIOX Command Center v1.0*
