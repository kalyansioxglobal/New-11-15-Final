# SIOX Command Center - UI/Backend Gap Analysis Audit

**Audit Date:** December 15, 2025  
**Scope:** 106 Prisma Models vs 167 UI Pages vs 329 API Routes  
**Objective:** Identify missing CRUD interfaces, incomplete features, RBAC inconsistencies, and backend capabilities not exposed in the UI

---

## Executive Summary

The SIOX Command Center is a comprehensive multi-venture management platform covering Logistics, Hotels, BPO, SaaS, and Holdings. This audit reveals several categories of gaps:

| Category | Count | Priority |
|----------|-------|----------|
| Route Registry - Naming Mismatches | 9 | HIGH |
| Route Registry - Missing API Handlers | 5 | HIGH |
| Route Registry - Missing Pages | 2 | HIGH |
| Models with No Direct UI | 13 | MEDIUM |
| Incomplete CRUD Operations | 12 | MEDIUM |
| RBAC Inconsistencies | 8 | MEDIUM |
| Navigation/Discoverability Issues | 6 | LOW |

---

## Part 1: Prisma Models Without UI Surfaces

### 1.1 Core Infrastructure Models (No Direct UI Needed)
These are system/internal models that correctly have no UI:
- `ApiRouteConfig` - Internal route metadata
- `RateLimitWindow` - Rate limiting tracking
- `EmailOtp` - OTP authentication tokens
- `FmcsaSyncLog` - FMCSA sync job logs
- `JobRunLog` - Background job execution logs
- `AiUsageLog` - AI API usage tracking (has admin page)
- `ImpersonationLog` - Impersonation audit trail

### 1.2 Models Missing UI Management (HIGH Priority)

| Model | Expected UI | Current Status | Gap |
|-------|-------------|----------------|-----|
| `PermissionMatrix` | Admin > Role Matrix | No CRUD UI | Need create/edit/delete |
| `VenturePermissionOverride` | Admin > Permissions | API exists, no management UI | Missing dedicated page |
| `ApprovalRouting` | Admin > Ventures | No UI | Need per-venture email routing config |
| `IncentivePlan` | Admin > Incentives | Has view only | Missing create/edit forms |
| `IncentiveRule` | Admin > Incentives | Has view only | Missing CRUD |
| `IncentiveQualification` | Admin > Incentives | No UI | Missing qualification management |
| `UserIncentiveOverride` | Admin > Incentives | No UI | Need per-user override UI |
| `AuditCheck` | Admin > Audit | No UI | Need audit check configuration |
| `AiDraftTemplate` | Admin > AI Templates | Has page | Missing inline create/edit |
| `GeneralLedgerEntry` | Holdings/Hotels | No UI | Financial reconciliation missing |
| `ThreePlLoadMapping` | Freight | No UI | 3PL load mapping interface missing |
| `CarrierVentureStats` | Freight > Carriers | No UI | Per-venture carrier stats dashboard |
| `BankSnapshot` | Holdings > Bank | List only | Missing detail view |

### 1.3 Outreach System Models (MEDIUM Priority)
Multiple outreach models exist but UI is fragmented:

| Model | API Coverage | UI Status |
|-------|--------------|-----------|
| `OutreachMessage` | Full CRUD | Has war room, no list view |
| `OutreachRecipient` | Backend only | No dedicated UI |
| `OutreachConversation` | Backend only | No conversation thread UI |
| `OutreachReply` | Backend only | No reply management UI |
| `OutreachAttribution` | Backend only | No ROI dashboard |
| `WebhookQuarantine` | Full CRUD | Has admin page |

**Recommendation:** Create unified Outreach Hub with conversation threads, recipient tracking, and ROI attribution dashboard.

### 1.4 Dispatch System Models (MEDIUM Priority)

| Model | API Status | UI Status |
|-------|------------|-----------|
| `DispatchDriver` | Full CRUD | Has page `/dispatch/drivers` |
| `DispatchTruck` | Backend only | No dedicated UI - needs trucks page |
| `DispatchLoad` | Full CRUD | Has page `/dispatch/loads` |
| `DispatchConversation` | Full CRUD | Has inbox |
| `DispatchMessage` | Full CRUD | Shown in inbox |
| `Settlement` | Full CRUD | Has page `/dispatch/settlements` |
| `EmailProviderConnection` | Has APIs | Has UI in `/dispatch/settings` |

**Gap:** DispatchTruck has no management interface. Trucks are implicitly managed through drivers.

---

## Part 2: API Routes Without UI Surfaces

### 2.1 Admin APIs Without Pages

| API Endpoint | Purpose | UI Gap |
|--------------|---------|--------|
| `/api/admin/system-check/*` | Data integrity, integrations, security | No admin dashboard |
| `/api/admin/auto-seed-test-data` | Test data seeding | Developer-only, OK |
| `/api/admin/cleanup-test-data` | Test cleanup | Developer-only, OK |
| `/api/admin/job-roles` | Job role management | No CRUD UI |
| `/api/admin/permissions/ventures/[ventureId]` | Per-venture permissions | No UI |

### 2.2 Freight APIs Without Direct UI Access

| API Endpoint | Purpose | UI Gap |
|--------------|---------|--------|
| `/api/freight/low-margin-radar` | Margin analysis | No dashboard widget |
| `/api/freight/lost-postmortem` | Lost load analysis | No UI, only AI-driven |
| `/api/freight/coverage-stats` | Coverage metrics | Data exists, no visualization |
| `/api/freight/zip-lookup` | Zip code lookup | Utility API, OK |
| `/api/freight/city-suggestions` | City autocomplete | Utility API, OK |
| `/api/freight-kpi/bulk-upsert` | Bulk KPI import | Admin tool, needs UI |
| `/api/freight/carriers/match` | Carrier matching | Used in load details, OK |

### 2.3 Hospitality APIs Without UI

| API Endpoint | Purpose | UI Gap |
|--------------|---------|--------|
| `/api/hospitality/night-audit` | Night audit posting | No dedicated UI |
| `/api/hospitality/high-loss` | High loss detection | No alert dashboard |
| `/api/hotel-kpi/bulk-upsert` | Bulk KPI import | Has upload page, but API-only |

### 2.4 BPO APIs Without Complete UI

| API Endpoint | Purpose | UI Gap |
|--------------|---------|--------|
| `/api/bpo/call-logs/index` | Call log access | No call log browser UI |
| `/api/bpo/kpi/upsert` | KPI entry | No manual entry form |
| `/api/bpo/agent-kpi` | Agent KPI details | Shown in dashboard, no drill-down |

### 2.5 Jobs/Scheduled Task APIs

| API Endpoint | Purpose | UI Gap |
|--------------|---------|--------|
| `/api/jobs/task-generation` | Auto task creation | No trigger UI |
| `/api/jobs/quote-timeout` | Quote expiration | No status UI |
| `/api/jobs/incentive-daily` | Daily incentive calc | No manual trigger |
| `/api/jobs/fmcsa-sync` | FMCSA data sync | Has admin page |
| `/api/jobs/churn-recalc` | Churn recalculation | No manual trigger |

---

## Part 3: Incomplete CRUD Operations

### 3.1 Models with Read but No Create/Update

| Model | Read | Create | Update | Delete | Gap |
|-------|------|--------|--------|--------|-----|
| `EmployeeKpiDaily` | Yes | No UI | No UI | No | Imported only |
| `FreightKpiDaily` | Yes | No UI | No UI | No | Calculated only |
| `HotelKpiDaily` | Yes | Upload | No UI | No | No edit capability |
| `BpoKpiRecord` | Yes | API | No UI | No | No manual entry |
| `BpoDailyMetric` | Yes | No | No | No | Aggregated data |
| `BpoAgentMetric` | Yes | API | No UI | No | No manual adjustment |
| `HotelDailyReport` | Yes | No | No | No | No entry form |
| `HotelNightAudit` | No | No | No | No | Completely missing |
| `HotelPnlMonthly` | Yes | No | No | No | View only |
| `LostLoadReason` | Backend | No | No | No | Needs admin config |
| `CarrierPreferredLane` | Yes | Yes | Yes | Yes | Has full CRUD |
| `ShipperPreferredLane` | Yes | Yes | Yes | Yes | Has full CRUD |

### 3.2 Forms Missing Edit Capability

| Page | Create | Edit | Delete |
|------|--------|------|--------|
| `/hotels/new` | Yes | No | No |
| `/hotels/disputes/new` | Yes | Yes (separate) | No |
| `/bpo/campaigns/new` | Yes | Yes | No |
| `/saas/customers/new` | Yes | Yes | No |
| `/holdings/assets/new` | Yes | No edit page | No |
| `/freight/loads/new` | Yes | Yes | No |
| `/freight/carriers/new` | Yes | Yes | No |
| `/logistics/shippers/new` | Yes | Yes | No |
| `/policies/new` | Yes | Yes | No |
| `/tasks/new` | Yes | Yes | Yes |

---

## Part 4: Navigation and Discoverability Issues

### 4.1 Route Registry Mismatches (HIGH Priority)

**Pages Missing (path in registry, no matching file):**
| Route ID | Registry Path | Issue |
|----------|--------------|-------|
| `freight_coverage` | `/freight/coverage` | Page doesn't exist. Actual is `/freight/coverage-war-room` |
| `attendance` | `/attendance` | Page doesn't exist. Only `/attendance/team` exists |

**API Routes - Naming Mismatches (handler exists but at different path):**
| Route ID | Registry apiPath | Actual Path |
|----------|------------------|-------------|
| `freight_sales_kpi` | `/api/freight/sales-kpi` | `/api/freight-kpi/sales` |
| `freight_lost_at_risk` | `/api/freight/lost-at-risk` | `/api/freight/lost-loads` |
| `freight_coverage` | `/api/freight/coverage` | `/api/freight/coverage-war-room` or `/api/freight/coverage-stats` |
| `user_preferences` | `/api/settings/preferences` | `/api/user/preferences` |
| `incentives` | `/api/admin/incentives` | `/api/incentives/*` |
| `my_incentives` | `/api/incentives/my` | `/api/me/incentives` |
| `hotel_pnl` | `/api/admin/hotels/pnl` | `/api/hotels/pnl/monthly` |
| `hotel_kpis` | `/api/hotels/kpis` | `/api/hotels/kpi-comparison` or `/api/hotels/snapshot` |
| `holdings_documents` | `/api/holdings/documents` | `/api/holdings/assets/[id]/documents` |

**API Routes - Actually Missing (no handler found):**
| Route ID | Registry apiPath | Issue |
|----------|------------------|-------|
| `freight_shipper_health` | `/api/freight/shipper-health` | No handler found (related: `/api/freight/shipper-churn`, `/api/freight/shipper-icp`) |
| `hotel_issues` | `/api/hotels/issues` | No handler found (disputes exist at `/api/hotels/disputes`) |
| `admin_roles` | `/api/admin/roles` | No handler found |
| `explanations` | `/api/admin/explanations` | No handler found |
| `org_chart` | `/api/admin/org-chart` | No handler found |

**Action Required:** Fix naming mismatches in route registry, and create missing API handlers.

### 4.2 Routes Correctly in Navigation

| Route ID | Path | Status |
|----------|------|--------|
| `dispatcher_dashboard` | `/dispatcher/dashboard` | Has showInNav:true, correct |
| `csr_dashboard` | `/csr/dashboard` | Has showInNav:true, correct |
| `carrier_portal` | `/carrier-portal` | Public portal, showInNav:false, correct |
| `login` | `/login` | Auth page, showInNav:false, correct |

### 4.3 Pages Existing but Not in Route Registry

| Page Path | Status | Action Needed |
|-----------|--------|---------------|
| `/employee/dashboard` | In registry | OK |
| `/admin/dashboard` | Not in registry | Add to registry |
| `/admin/org-chart` | In registry | OK |
| `/freight-kpis` | Duplicate of `/freight/kpi` | Consider consolidating |
| `/loads/index` | Redirect to freight/loads | OK |
| `/ai/templates` | Not in registry | Add or remove page |
| `/carrier-portal` | In registry | OK |

### 4.4 Broken or Orphaned Pages

| Page | Issue |
|------|-------|
| `/hotels/snapshot` | May duplicate `/hospitality/dashboard` |
| `/hotels/kpi-report` | Unclear relationship to `/hotels/kpis` |
| `/hotels/kpi` | Three KPI pages exist, needs consolidation |
| `/freight/shipper-icp` | Tab in `/freight/shipper-health`, redundant |
| `/freight/shipper-churn` | Tab in `/freight/shipper-health`, redundant |
| `/freight/lost` | Duplicate of `/freight/lost-and-at-risk` |
| `/freight/at-risk` | Duplicate of `/freight/lost-and-at-risk` |

### 4.5 Navigation Module Organization Issues

```
Current Modules:
- command_center: My Day, Overview, Ventures, Employee Hub
- operations: Tasks, Insurance, EOD Reports, Attendance, Feedback
- it: IT Management (single page)
- freight: 18 items - OVERLOADED
- dispatch: 6 items
- hospitality: 9 items
- bpo: 7 items
- saas: 4 items
- holdings: 3 items
- admin: 18 items - OVERLOADED
```

**Issues:**
1. `freight` module has 18 items - consider sub-grouping
2. `admin` module has 18 items - consider sub-grouping
3. `it` module has only 1 nav item but page has tabs for assets/incidents

---

## Part 5: RBAC Inconsistencies

### 5.1 Role Matrix

| Role | Count in Routes | Coverage |
|------|-----------------|----------|
| CEO | 44 | Full access |
| ADMIN | 44 | Full access |
| COO | 38 | Near-full access |
| VENTURE_HEAD | 34 | Venture-scoped |
| OFFICE_MANAGER | 32 | Office-scoped |
| TEAM_LEAD | 18 | Limited |
| FINANCE | 16 | Finance modules |
| AUDITOR | 11 | Read-heavy |
| HR_ADMIN | 7 | HR modules |
| DISPATCHER | 13 | Freight/Dispatch |
| CSR | 12 | Customer-facing |
| CARRIER_TEAM | 3 | Limited |
| ACCOUNTING | 2 | Very limited |
| EMPLOYEE | 0 explicit | Uses fallback |
| CONTRACTOR | 0 explicit | Uses fallback |
| TEST_USER | 0 explicit | Uses fallback |

### 5.2 RBAC Gaps

| Issue | Routes | Problem |
|-------|--------|---------|
| No roles specified | `/my-day`, `/tasks`, `/attendance`, etc. | Defaults to all authenticated users |
| ACCOUNTING under-defined | Only 2 routes | Likely needs access to more finance pages |
| CARRIER_TEAM under-defined | Only 3 routes | May need more freight visibility |
| No role for Analytics | N/A | Consider ANALYST role |

### 5.3 Inconsistent Role Requirements

| API Endpoint | Page Path | API Roles | Page Roles | Issue |
|--------------|-----------|-----------|------------|-------|
| `/api/freight/loads` | `/freight/loads` | Not specified | CSR, DISPATCHER, etc. | API should match |
| `/api/holdings/*` | `/holdings/*` | Not specified | CEO, ADMIN, COO, FINANCE | API unprotected? |

### 5.4 Security Concern: TEST_PASSWORD

**CRITICAL:** The codebase contains a `TEST_PASSWORD` universal credential mechanism. This MUST be removed before production deployment.

---

## Part 6: Feature Completeness by Module

### 6.1 Freight Module (Most Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Loads CRUD | Complete | Full lifecycle |
| Carriers CRUD | Complete | With FMCSA integration |
| Shippers CRUD | Complete | Called "Shippers (Locations)" |
| Customers CRUD | Complete | Called "Shippers (Accounts)" |
| Quotes | Partial | Create/view, no bulk operations |
| KPIs | Complete | Multiple dashboards |
| P&L | Complete | Summary view |
| Outreach | Partial | War room exists, no conversation UI |
| Shipper Health | Complete | Churn, ICP, At-Risk tabs |
| Coverage | Complete | War room |
| Tasks | Complete | Freight-specific task management |

**Missing:**
- Carrier contact history UI
- Load event timeline (backend only)
- Customer touch point tracking UI

### 6.2 Hospitality Module (Good)

| Feature | Status | Notes |
|---------|--------|-------|
| Hotels CRUD | Complete | Full lifecycle |
| KPIs | Complete | Daily, YoY, charts |
| Disputes | Complete | Full workflow |
| Reviews | Complete | With response tracking |
| P&L | Complete | Monthly view |
| Loss Nights | Complete | Tracking UI |
| Night Audit | Missing | API exists, no UI |

**Missing:**
- Night audit posting UI
- Daily report entry form
- High loss alert dashboard

### 6.3 BPO Module (Partial)

| Feature | Status | Notes |
|---------|--------|-------|
| Campaigns CRUD | Complete | Full lifecycle |
| Agents | Partial | List view, limited edit |
| Dashboard | Complete | Real-time stats |
| KPIs | Partial | View only, no entry |
| Incentives | Partial | Overview, no config |
| Call Logs | Missing | API exists, no UI |

**Missing:**
- Call log browser
- Agent performance detail view
- Manual KPI entry form
- Campaign formula builder UI

### 6.4 SaaS Module (Minimal)

| Feature | Status | Notes |
|---------|--------|-------|
| Customers CRUD | Complete | Basic |
| Subscriptions | Partial | List, cancel |
| Metrics | Complete | MRR/ARR dashboard |
| Cohorts | Backend only | API exists, no UI |

**Missing:**
- Subscription modification UI
- Cohort analysis visualization
- Onboarding tracking UI

### 6.5 Holdings Module (Minimal)

| Feature | Status | Notes |
|---------|--------|-------|
| Assets | Partial | List, create |
| Bank Accounts | Partial | Snapshots list |
| Documents | Basic | Vault view |

**Missing:**
- Asset edit/delete
- Bank account management (only snapshots visible)
- Asset valuation tracking
- Document categorization

### 6.6 Dispatch Module (Good)

| Feature | Status | Notes |
|---------|--------|-------|
| Loads | Complete | Full workflow |
| Drivers | Complete | Full CRUD |
| Trucks | Missing | No UI |
| Settlements | Complete | Full workflow |
| Inbox | Complete | Conversation threads |
| Email Connections | Complete | Full management in `/dispatch/settings` |

**Missing:**
- Truck management UI
- SMS configuration UI

### 6.7 Operations Module (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Tasks | Complete | Board view, list view |
| Policies | Complete | Full CRUD |
| EOD Reports | Complete | Submit, team view |
| Attendance | Complete | Personal and team |
| Feedback | Complete | Submission form |

### 6.8 IT Module (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Assets | Complete | Full CRUD with assignment |
| Incidents | Complete | Full workflow |

### 6.9 Admin Module (Partially Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Users | Complete | Full CRUD |
| Offices | Complete | Full CRUD |
| Ventures | Complete | Full CRUD |
| Roles | Partial | View matrix, no edit |
| Incentives | Partial | Simulator, no config CRUD |
| Gamification | Partial | Leaderboard, no config |
| AI Templates | Partial | List, limited edit |
| Audit | Complete | Run and view |
| Activity Log | Complete | View |
| Quarantine | Complete | Resolve workflow |
| Jobs | Complete | Status and logs |

**Missing:**
- Permission matrix editor
- Incentive plan builder
- Gamification config UI
- Job department/role CRUD

---

## Part 7: Recommendations

### 7.1 High Priority (Security/Core)

1. **Remove TEST_PASSWORD** - Critical security vulnerability
2. **Fix Route Registry Issues (see Section 4.1):**
   - **9 Naming Mismatches**: Update apiPath in registry to match actual handler paths
   - **5 Missing API Handlers**: Create handlers or remove from registry
   - **2 Missing Pages**: `/freight/coverage` (use `/freight/coverage-war-room`), `/attendance`
3. **Add Permission Matrix UI** - Currently no way to edit permissions
4. **Add RBAC to unprotected APIs** - Holdings, some freight APIs
5. **Create Truck Management UI** - Dispatch module incomplete

### 7.2 Medium Priority (Functionality)

1. **Consolidate duplicate pages:**
   - `/freight/lost`, `/freight/at-risk`, `/freight/lost-and-at-risk`
   - `/hotels/kpi`, `/hotels/kpis`, `/hotels/kpi-report`
   
2. **Add missing CRUD forms:**
   - HotelDailyReport entry
   - HotelNightAudit posting
   - BPO Call log browser
   - Asset edit/delete

3. **Create Outreach Hub:**
   - Unified conversation threads
   - Recipient tracking
   - ROI attribution dashboard

4. **Add configuration UIs:**
   - Incentive plan builder
   - Gamification rules
   - Audit check configuration
   - Approval routing per venture

### 7.3 Low Priority (Enhancement)

1. **Navigation improvements:**
   - Sub-group freight module (18 items)
   - Sub-group admin module (18 items)
   - Add breadcrumbs for deep pages

2. **Add missing dashboards:**
   - Low margin radar
   - Carrier venture stats
   - SaaS cohort analysis
   - Bank account trends

3. **Improve KPI entry:**
   - Manual entry forms for all KPI types
   - Bulk import with preview
   - Data validation UI

---

## Part 8: Model-to-UI Matrix

### Complete Reference (106 Models)

| # | Model | UI Pages | APIs | Status |
|---|-------|----------|------|--------|
| 1 | User | /admin/users | Yes | Complete |
| 2 | AiUsageLog | /admin/ai-usage | Yes | Complete |
| 3 | UserPreferences | /settings/preferences | Yes | Complete |
| 4 | UserMapping | /mappings | Yes | Complete |
| 5 | StaffAlias | Backend only | Yes | No UI |
| 6 | SalesPersonCost | Backend only | Yes | No UI |
| 7 | InsurancePolicy | /insurance/policies | Yes | Complete |
| 8 | VentureUser | /ventures/[id]/people | Yes | Complete |
| 9 | OfficeUser | /offices/[id] | Yes | Complete |
| 10 | Venture | /ventures, /admin/ventures | Yes | Complete |
| 11 | AuditLog | /admin/activity-log | Yes | Complete |
| 12 | Office | /admin/offices | Yes | Complete |
| 13 | Task | /tasks | Yes | Complete |
| 14 | Policy | /policies | Yes | Complete |
| 15 | FreightKpiDaily | /freight/kpi | Yes | Read-only |
| 16 | HotelProperty | /hospitality/hotels | Yes | Complete |
| 17 | HotelKpiDaily | /hotels/kpis | Yes | Read-only |
| 18 | HotelDailyReport | Backend only | Yes | No UI |
| 19 | HotelNightAudit | Backend only | Yes | No UI |
| 20 | HotelPnlMonthly | /admin/hotels/pnl | Yes | Read-only |
| 21 | ThreePlLoadMapping | Backend only | No | No UI |
| 22 | GeneralLedgerEntry | Backend only | No | No UI |
| 23 | Load | /freight/loads | Yes | Complete |
| 24 | LostLoadReason | Backend only | Yes | Config needed |
| 25 | Carrier | /freight/carriers | Yes | Complete |
| 26 | CarrierPreferredLane | /admin/freight/carriers/[id]/preferred-lanes | Yes | Complete |
| 27 | CarrierVentureStats | Backend only | No | No UI |
| 28 | ShipperPreferredLane | /admin/freight/shippers/[id]/preferred-lanes | Yes | Complete |
| 29 | CarrierDispatcher | Embedded in carrier | Yes | Partial |
| 30 | Customer | /logistics/customers | Yes | Complete |
| 31 | CustomerTouch | Backend only | Yes | No dedicated UI |
| 32 | CarrierContact | Backend only | Yes | No UI |
| 33 | EmployeeKpiDaily | Backend only | Yes | No UI |
| 34 | EodReport | /eod-reports | Yes | Complete |
| 35 | Attendance | /attendance | Yes | Complete |
| 36 | Notification | Header bell | Yes | Complete |
| 37 | ImpersonationLog | Backend only | Yes | No UI (OK) |
| 38 | LogisticsShipper | /logistics/shippers | Yes | Complete |
| 39 | LogisticsLoadEvent | Embedded in load | Yes | Partial |
| 40 | FreightQuote | /freight/quotes/[id] | Yes | Partial |
| 41 | HotelReview | /hospitality/reviews | Yes | Complete |
| 42 | BpoCampaign | /bpo/campaigns | Yes | Complete |
| 43 | BpoAgent | /bpo/agents | Yes | Complete |
| 44 | BpoKpiRecord | Backend only | Yes | No manual entry |
| 45 | BpoDailyMetric | /bpo/dashboard | Yes | Read-only |
| 46 | BpoCallLog | Backend only | Yes | No UI |
| 47 | BpoAgentMetric | /bpo/kpi | Yes | Read-only |
| 48 | SaasCustomer | /saas/customers | Yes | Complete |
| 49 | SaasSubscription | /saas/subscriptions | Yes | Partial |
| 50 | SalesClientOnboarding | Backend only | Yes | No UI |
| 51 | HoldingAsset | /holdings/assets | Yes | Partial |
| 52 | HoldingAssetDocument | Embedded in asset | Yes | Complete |
| 53 | BankAccount | Backend only | Yes | No direct UI |
| 54 | BankSnapshot | /holdings/bank | Yes | Partial |
| 55 | BankAccountSnapshot | /holdings/bank | Yes | Read-only |
| 56 | File | Embedded | Yes | Complete |
| 57 | JobDepartment | Backend only | Yes | No UI |
| 58 | JobRole | Backend only | Yes | No UI |
| 59 | CustomerApprovalRequest | /logistics/customer-approval-request | Yes | Complete |
| 60 | ApprovalRouting | Backend only | No | No UI |
| 61 | CustomerApproval | /logistics/ventures/[ventureId]/customer-approval | Yes | Complete |
| 62 | EmailOtp | Backend only | Yes | No UI (OK) |
| 63 | PermissionMatrix | Backend only | Yes | No edit UI |
| 64 | VenturePermissionOverride | Backend only | Yes | No UI |
| 65 | HotelDispute | /hotels/disputes | Yes | Complete |
| 66 | HotelDisputeNote | Embedded in dispute | Yes | Complete |
| 67 | ImportJob | /import | Yes | Complete |
| 68 | ImportMapping | /mappings | Yes | Complete |
| 69 | ITAsset | /it-assets | Yes | Complete |
| 70 | ITAssetFile | Embedded | Yes | Complete |
| 71 | ITAssetHistory | Embedded | Yes | Complete |
| 72 | ITIncident | /it-incidents | Yes | Complete |
| 73 | EmailLog | Backend only | No | No UI (OK) |
| 74 | RateLimitWindow | Backend only | No | No UI (OK) |
| 75 | IncentivePlan | /admin/incentives | Yes | Read-only |
| 76 | IncentiveQualification | Backend only | Yes | No UI |
| 77 | IncentiveRule | /admin/incentives/rules | Yes | Read-only |
| 78 | UserIncentiveOverride | Backend only | Yes | No UI |
| 79 | IncentiveDaily | /incentives | Yes | Complete |
| 80 | IncentiveScenario | /admin/incentives/simulator | Yes | Complete |
| 81 | IncentivePayout | Backend only | Yes | No UI |
| 82 | GamificationConfig | Backend only | Yes | No UI |
| 83 | GamificationEvent | /gamification | Yes | Read-only |
| 84 | GamificationPointsBalance | /gamification | Yes | Complete |
| 85 | TaskOverdueExplanation | Inline in task | Yes | Complete |
| 86 | MissedEodExplanation | /admin/explanations | Yes | Complete |
| 87 | AuditRun | /admin/audit | Yes | Complete |
| 88 | AuditCheck | Backend only | No | No UI |
| 89 | AuditIssue | Embedded in run | Yes | Complete |
| 90 | ApiRouteConfig | Backend only | No | No UI (OK) |
| 91 | ActivityLog | /admin/activity-log | Yes | Complete |
| 92 | JobRunLog | /admin/jobs | Yes | Complete |
| 93 | AiDraftTemplate | /admin/ai-templates | Yes | Partial |
| 94 | ITIncidentTag | Embedded | Yes | Complete |
| 95 | ITIncidentTagMapping | Backend only | Yes | No UI (OK) |
| 96 | FmcsaSyncLog | /admin/jobs | Yes | Complete |
| 97 | VentureOutboundConfig | Backend only | No | No UI |
| 98 | OutreachMessage | /freight/outreach-war-room | Yes | Partial |
| 99 | OutreachRecipient | Backend only | Yes | No UI |
| 100 | OutreachConversation | Backend only | Yes | No UI |
| 101 | OutreachReply | Backend only | Yes | No UI |
| 102 | OutreachAttribution | Backend only | No | No UI |
| 103 | WebhookQuarantine | /admin/quarantine | Yes | Complete |
| 104 | FeedbackSubmission | /feedback | Yes | Complete |
| 105 | DispatchDriver | /dispatch/drivers | Yes | Complete |
| 106 | DispatchTruck | Backend only | Partial | No UI |
| 107 | DispatchLoad | /dispatch/loads | Yes | Complete |
| 108 | Settlement | /dispatch/settlements | Yes | Complete |
| 109 | DispatchConversation | /dispatch/inbox | Yes | Complete |
| 110 | DispatchMessage | Embedded | Yes | Complete |
| 111 | EmailProviderConnection | /dispatch/settings | Yes | Complete |

---

## Part 9: Summary Statistics

### Models by UI Coverage
- **Complete UI:** 58 (55%)
- **Partial UI:** 17 (16%)
- **Read-only UI:** 12 (11%)
- **No UI (needs):** 12 (11%)
- **No UI (OK):** 7 (7%)

### API Routes by Category
- **Full CRUD:** 89 routes (27%)
- **Read-only:** 124 routes (38%)
- **Write-only:** 43 routes (13%)
- **Utility/Internal:** 73 routes (22%)

### Pages by Module
- **Freight:** 45 pages
- **Admin:** 28 pages
- **Hospitality:** 22 pages
- **BPO:** 10 pages
- **Dispatch:** 8 pages
- **SaaS:** 5 pages
- **Holdings:** 4 pages
- **Operations:** 15 pages
- **IT:** 6 pages
- **Other:** 24 pages

---

## Appendix A: Route Registry Coverage

Total routes configured in `lib/access-control/routes.ts`: **56 routes**

Modules:
- command_center: 4 routes
- operations: 8 routes
- it: 1 route
- freight: 18 routes
- dispatch: 6 routes
- hospitality: 9 routes
- bpo: 7 routes
- saas: 4 routes
- holdings: 3 routes
- admin: 18 routes
- public: 2 routes

---

## Appendix B: Role Distribution

```
CEO/ADMIN: Full access (44/56 routes explicitly)
COO: 38/56 routes
VENTURE_HEAD: 34/56 routes
OFFICE_MANAGER: 32/56 routes
TEAM_LEAD: 18/56 routes
FINANCE: 16/56 routes
AUDITOR: 11/56 routes
HR_ADMIN: 7/56 routes
DISPATCHER: 13/56 routes
CSR: 12/56 routes
CARRIER_TEAM: 3/56 routes
ACCOUNTING: 2/56 routes
```

Routes with no role specification (open to all authenticated): 8 routes

---

*End of Audit Report*
