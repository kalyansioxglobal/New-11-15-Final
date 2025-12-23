# System Truth Map v1.2

**Generated:** December 12, 2024  
**Purpose:** Single source of truth for rollout decisions  
**Scope:** Multi-venture Command Center (~108,000 lines TypeScript, 93 database tables)

---

## A. Executive Summary

1. **Canonical freight workflow** lives in `/freight/*` pages with `/api/freight/*` APIs; legacy `/logistics/*` routes remain for dashboard, customers, and shippers
2. **Canonical hospitality workflow** splits across `/hospitality/*` (hotels list/detail) and `/hotels/*` (KPIs, disputes, snapshot)
3. **Customer is the CRM parent account; LogisticsShipper is the operational shipper entity** under that account via `LogisticsShipper.customerId → Customer` foreign key relationship
4. **Dual load detail pages exist:** `/freight/loads/[id]` (canonical, 694 lines) vs `/logistics/loads/[id]` (legacy, 524 lines)
5. **Dual hotel detail pages exist:** `/hospitality/hotels/[id]` (canonical) vs `/hotels/[id]/index.tsx` (unique KPI entry form - keep for now)
6. **`/loads` redirects to `/carrier-portal`** (301 permanent) - cleanup complete
7. **20 freight nav items** could consolidate to 12 with sub-menus (Analytics, Operations, AI Tools)
8. **Carrier Portal** (`/carrier-portal`) is the external-facing page for carriers to view available loads
9. **AI features are mixed:** 6 use stubbed client, 3 use real OpenAI integration

---

## B. No-Regrets Cleanup (Safe regardless of persona - max 4 items)

These items are safe to implement without product decisions:

| # | Item | Evidence | Action |
|---|------|----------|--------|
| 1 | Redirect `/logistics/loads/[id]` → `/freight/loads/[id]` | Duplicate page, freight version is 694 lines (more complete) vs logistics 524 lines | Add 301 redirect |
| 2 | Redirect `/hotels` (list) → `/hospitality/hotels` | Duplicate list page | Add 301 redirect |
| 3 | Redirect `/hotels/new` → `/hospitality/hotels/new` | Duplicate create page | Add 301 redirect |
| 4 | Mark `/freight/lost` and `/freight/at-risk` as Legacy | Superseded by `/freight/lost-and-at-risk` combined view | Recommended future action: hide from nav + redirect to `/freight/lost-and-at-risk` |

---

## C. Decisions Required (Product decisions - NOT no-regrets)

These items require stakeholder input before implementation:

| # | Item | Why It's a Decision | Options |
|---|------|---------------------|---------|
| 1 | **Shippers vs Customers nav labels** | Both are valid CRM entities with parent-child relationship. Changing labels affects user workflows. | A) Keep both as-is with documentation, B) Rename to clarify relationship, C) Merge UI views |
| 2 | **Coverage vs War Room consolidation** | Similar functionality but may serve different use cases for different roles | A) Merge into War Room, B) Keep both with differentiated purpose |
| 3 | **Freight nav grouping (20 → 12 items)** | Changes user navigation patterns | Requires UX review and user testing |
| 4 | **Legacy `/logistics/*` API deprecation** | Some pages may still call legacy APIs | Requires API usage audit first |

### AI UX Improvements (Future Enhancement)

| Item | Rationale | Recommended Action |
|------|-----------|-------------------|
| Document AI feature status in UI | 6 features are stubbed vs 3 working - causes user confusion | Add status indicators (e.g., "Beta", "Coming Soon") to AI feature pages |

---

## D. Shippers vs Customers: Parent-Child Relationship

### Schema Relationship (NOT duplicates)

```
Customer (CRM Account)
    │
    ├── assignedSalesId → User (sales rep)
    ├── assignedCsrId → User (CSR)
    ├── assignedDispatcherId → User (dispatcher)
    ├── loads → Load[] (direct load relationship)
    │
    └── shippers → LogisticsShipper[] (one-to-many)
                        │
                        ├── customerId → Customer (FK back to parent)
                        ├── city, state, country (location data)
                        ├── contactName, email, phone
                        ├── churnStatus, churnRiskScore
                        └── loads → Load[] (via Load.shipperId)
```

### What Each Entity Represents

| Entity | Purpose | Key Fields | Used By |
|--------|---------|------------|---------|
| **Customer** | CRM account / business relationship | Staff assignments (sales, CSR, dispatcher), vertical, tmsCustomerCode | `/logistics/customers/*`, Customer Approval workflows |
| **LogisticsShipper** | Operational shipper for loads | Location (city/state), contact info, churn metrics, tmsShipperCode | `/logistics/shippers/*`, `Load.shipperId` |

### Current UI Mapping

| Nav Item | Route | Table | Correct Behavior |
|----------|-------|-------|------------------|
| Customers | `/logistics/customers` | Customer | CRM view with staff assignments |
| Shippers | `/logistics/shippers` | LogisticsShipper | Operational shipper entities |

### Recommended UI Clarification (requires product decision)

- Add subtitle to Customers page: "CRM accounts with sales/CSR/dispatcher assignments"
- Add subtitle to Shippers page: "Operational shipper entities linked to loads"
- Consider linking: show "Parent Customer" on shipper detail if `customerId` is set

---

## E. Persona Map

| Persona | Primary Workflows | Pages Involved | APIs Involved |
|---------|-------------------|----------------|---------------|
| **Broker Staff (CSR/Dispatcher)** | Load management, carrier matching, coverage, at-risk monitoring | `/freight/loads/*`, `/freight/carriers/*`, `/freight/coverage-war-room`, `/freight/lost-and-at-risk`, `/freight/carrier-search` | `/api/freight/loads/*`, `/api/freight/carriers/*`, `/api/freight/coverage-*` |
| **Broker Management** | KPIs, P&L, shipper churn, intelligence, customer approval | `/freight/kpi`, `/freight/pnl`, `/freight/shipper-churn`, `/freight/shipper-icp`, `/freight/intelligence`, `/logistics/customer-approval-request` | `/api/freight-kpi`, `/api/freight/pnl`, `/api/freight/shipper-*`, `/api/freight/intelligence` |
| **Carrier (External)** | View available loads | `/carrier-portal` | `/api/carrier-portal/available-loads` |
| **Hospitality Staff** | Hotel management, reviews, daily reports | `/hospitality/hotels/*`, `/hospitality/reviews`, `/hotels/[id]/*` | `/api/hospitality/*`, `/api/hotels/*`, `/api/hotel-kpi/*` |
| **Hospitality Management** | KPIs, P&L, disputes, loss nights, snapshot | `/hotels/kpi`, `/hotels/kpi-report`, `/hotels/disputes/*`, `/hotels/loss-nights`, `/hotels/snapshot`, `/admin/hotels/pnl` | `/api/hotels/*`, `/api/hotel-kpi/*` |
| **BPO Staff** | Campaign management, agent tracking, real-time monitoring | `/bpo/campaigns/*`, `/bpo/agents`, `/bpo/realtime` | `/api/bpo/*` |
| **BPO Management** | Dashboard, KPIs, incentives | `/bpo/dashboard`, `/bpo/kpi`, `/bpo/incentives` | `/api/bpo/dashboard`, `/api/bpo/kpi/*` |
| **SaaS Staff** | Customer management, subscriptions | `/saas/customers/*`, `/saas/subscriptions` | `/api/saas/*` |
| **Holdings/Finance** | Assets, bank snapshots, documents | `/holdings/assets/*`, `/holdings/bank`, `/holdings/documents` | `/api/holdings/*`, `/api/bank-*` |
| **Admin/Internal** | Users, ventures, offices, audit, activity log, incentives | `/admin/*`, `/incentives/*`, `/gamification` | `/api/admin/*`, `/api/incentives/*`, `/api/gamification/*` |
| **All Employees** | My Day, Tasks, EOD Reports, Preferences | `/my-day`, `/tasks/*`, `/eod-reports/*`, `/settings/preferences` | `/api/my-day`, `/api/tasks/*`, `/api/eod-reports/*`, `/api/user/preferences` |

**Note:** All APIs verified by file presence under `/pages/api/...`

---

## F. Navigation Structure

### Navigation Counts

| Metric | Value | Evidence |
|--------|-------|----------|
| Nav item objects in `NAV_ITEMS` array | **79** | `grep -c "^  {" lib/nav.ts` |
| Total lines in `lib/nav.ts` | **623** | `wc -l lib/nav.ts` |
| Nav sections defined | **9** | command_center, operations, it, freight, hotel, bpo, saas, holdings, admin |

### Role-Based Visibility

Not all 79 nav items are visible to all users. Each item can have a `roles` array that restricts visibility:

```typescript
{
  id: "freight_ai_ops_diagnostics",
  label: "AI Ops Diagnostics",
  href: "/freight/ai/ops-diagnostics",
  roles: ["CEO", "ADMIN", "COO"],  // Only visible to these roles
}
```

Items without a `roles` array are visible to all authenticated users.

---

## G. System Inventory

### G.1 Freight Module

| Page Route | Purpose | Persona | Bucket | Status | Evidence |
|------------|---------|---------|--------|--------|----------|
| `/logistics/dashboard` | Freight overview | Broker | Analytics | Canonical | Nav: "Dashboard" in freight section |
| `/freight/loads` | Load list | Broker | Operations | Canonical | Nav: "Loads" |
| `/freight/loads/[id]` | Load detail | Broker | Operations | **Canonical** | 694 lines, full feature set |
| `/freight/loads/[id]/find-carriers` | Matching engine UI | Broker | Operations | Canonical | Link from load detail |
| `/freight/loads/new` | Create load | Broker | Operations | Canonical | Link from loads list |
| `/freight/carriers` | Carrier list | Broker | CRM | Canonical | Nav: "Carriers" |
| `/freight/carriers/[id]` | Carrier detail | Broker | CRM | Canonical | Link from carrier list |
| `/freight/carriers/new` | Create carrier | Broker | CRM | Canonical | Link from carriers list |
| `/logistics/shippers` | Shipper list | Broker | CRM | Canonical | Nav: "Shippers", uses LogisticsShipper table |
| `/logistics/shippers/[id]` | Shipper detail | Broker | CRM | Canonical | Link from shippers list |
| `/logistics/shippers/new` | Create shipper | Broker | CRM | Canonical | Link from shippers list |
| `/logistics/customers` | Customer list | Broker | CRM | Canonical | Nav: "Customers", uses Customer table |
| `/logistics/customers/[id]` | Customer detail | Broker | CRM | Canonical | Has sales/CSR/dispatcher assignments |
| `/freight/kpi` | Freight KPIs | Broker Mgmt | Analytics | Canonical | Nav: "Freight KPIs" |
| `/freight/sales-kpi` | Sales KPIs | Broker Mgmt | Analytics | Canonical | Nav: "Sales KPIs" |
| `/freight/pnl` | Profit & Loss | Broker Mgmt | Analytics | Canonical | Nav: "Freight P&L" |
| `/freight/shipper-churn` | Churn analysis | Broker Mgmt | Analytics | Canonical | Nav: "Shipper Churn" |
| `/freight/shipper-icp` | ICP analysis | Broker Mgmt | Analytics | Canonical | Nav: "Shipper ICP" |
| `/freight/intelligence` | AI analytics | Broker Mgmt | AI Tools | Canonical | Nav: "Intelligence" |
| `/freight/coverage-war-room` | Coverage mgmt | Broker | Operations | Canonical | Nav: "War Room" |
| `/freight/coverage` | Coverage stats | Broker | Analytics | Canonical | Nav: "Coverage" |
| `/freight/carrier-search` | Quick search | Broker | Operations | Canonical | Nav: "Carrier Search" |
| `/freight/lost-and-at-risk` | Combined view | Broker | Operations | Canonical | Nav: "At-Risk & Lost" |
| `/freight/ai/carrier-draft` | AI drafts | Broker | AI Tools | Canonical | Nav: "AI Carrier Draft" |
| `/freight/ai/eod-draft` | AI EOD | Broker Mgmt | AI Tools | Canonical | Nav: "AI EOD Draft" |
| `/freight/ai/ops-diagnostics` | AI diagnostics | Executives | AI Tools | Canonical | Nav: "AI Ops Diagnostics" |
| `/logistics/missing-mappings` | Data cleanup | Admin | Reference | Canonical | Nav: "Missing Mappings" |
| `/logistics/customer-approval-request` | Approval workflow | Broker | Operations | Canonical | Nav: "Customer Approval" |
| `/freight/at-risk` | At-risk loads | Broker | Operations | **Legacy** | Superseded by lost-and-at-risk |
| `/freight/lost` | Lost loads | Broker | Operations | **Legacy** | Superseded by lost-and-at-risk |
| `/logistics/loads/[id]` | Load detail | Broker | Operations | **Legacy** | 524 lines, redirect to /freight/loads/[id] |
| `/carrier-portal` | Available loads | Carrier | Operations | Canonical | External facing, verified file exists |
| `/loads` | Redirect | - | - | **Redirect** | 301 to /carrier-portal |

### G.2 Hospitality Module

| Page Route | Purpose | Persona | Bucket | Status | Evidence |
|------------|---------|---------|--------|--------|----------|
| `/hospitality/dashboard` | Hotel overview | Hospitality | Analytics | Canonical | Nav: "Dashboard" in hotel section |
| `/hospitality/hotels` | Hotel list | Hospitality | CRM | Canonical | Nav: "Hotels" |
| `/hospitality/hotels/[id]` | Hotel detail | Hospitality | CRM | **Canonical** | Metrics, reviews, reports |
| `/hospitality/hotels/new` | Create hotel | Hospitality | CRM | Canonical | Link from hotels list |
| `/hospitality/reviews` | Reviews list | Hospitality | CRM | Canonical | Nav: "Reviews" |
| `/hotels` | Hotel list | Hospitality | CRM | **Candidate for redirect** | Duplicate of /hospitality/hotels |
| `/hotels/[id]/index` | Hotel KPI entry | Hospitality | Operations | **Keep** | Unique KPI entry form not in /hospitality |
| `/hotels/kpi` | Hotel KPIs | Hospitality Mgmt | Analytics | Canonical | Nav: "Hotel KPIs" |
| `/hotels/kpi-report` | YoY report | Hospitality Mgmt | Analytics | Canonical | Nav: "KPI Report (YoY)" |
| `/hotels/kpi-upload` | KPI upload | Hospitality Mgmt | Admin | Canonical | Used for bulk uploads |
| `/hotels/snapshot` | Hotel snapshot | Hospitality Mgmt | Analytics | Canonical | File verified |
| `/hotels/loss-nights` | Loss nights | Hospitality Mgmt | Analytics | Canonical | Nav: "Loss Nights" |
| `/hotels/disputes` | Dispute list | Hospitality Mgmt | Operations | Canonical | Nav: "Disputes" |
| `/hotels/disputes/[id]` | Dispute detail | Hospitality Mgmt | Operations | Canonical | Link from disputes list |
| `/hotels/disputes/new` | Create dispute | Hospitality Mgmt | Operations | Canonical | Link from disputes list |
| `/hotels/new` | Create hotel | Hospitality | CRM | **Candidate for redirect** | Duplicate of /hospitality/hotels/new |
| `/hotels/ai/outreach-draft` | AI outreach | Hospitality | AI Tools | Canonical | Nav: "AI Outreach Draft" |
| `/admin/hotels/pnl` | Hotel P&L | Hospitality Mgmt | Analytics | Canonical | Nav: "Hotel P&L" |

### G.3 Other Modules (BPO, SaaS, Holdings, IT, Admin)

| Page Route | Purpose | Persona | Bucket | Status | Evidence |
|------------|---------|---------|--------|--------|----------|
| `/bpo/dashboard` | BPO overview | BPO | Analytics | Canonical | Nav link |
| `/bpo/campaigns/*` | Campaign management | BPO | Operations | Canonical | Nav link |
| `/bpo/agents` | Agent list | BPO | CRM | Canonical | Nav link |
| `/bpo/realtime` | Real-time stats | BPO | Operations | Canonical | Nav link |
| `/bpo/kpi` | BPO KPIs | BPO Mgmt | Analytics | Canonical | Nav link |
| `/bpo/incentives` | BPO incentives | BPO Mgmt | Analytics | Canonical | Nav link |
| `/bpo/ai/client-draft` | AI client draft | BPO | AI Tools | Canonical | Nav link |
| `/saas/customers/*` | Customer management | SaaS | CRM | Canonical | Nav link |
| `/saas/subscriptions` | Subscription list | SaaS | Operations | Canonical | Nav link |
| `/saas/metrics` | MRR/ARR metrics | SaaS Mgmt | Analytics | Canonical | Nav link |
| `/holdings/assets/*` | Asset management | Holdings | CRM | Canonical | Nav link |
| `/holdings/bank` | Bank snapshots | Holdings | Analytics | Canonical | Nav link |
| `/holdings/documents` | Document vault | Holdings | Reference | Canonical | Nav link |
| `/it-assets/*` | IT asset management | IT/Admin | Operations | Canonical | Nav link |
| `/it-incidents` | Incident list | IT/Admin | Operations | Canonical | Nav link |
| `/admin/*` | Admin functions | Admin | Admin | Canonical | Nav links |

---

## H. AI Features Status

### Client Architecture

| Client File | Implementation | Status |
|-------------|----------------|--------|
| `lib/ai/aiClient.ts` | Returns stub response with TODO comment | **STUBBED** |
| `lib/ai/client.ts` | Calls real `openai.chat.completions.create()` | **WORKING** |

### Feature-by-Feature Status

| Feature | File | Client Used | API Route | Status | Evidence |
|---------|------|-------------|-----------|--------|----------|
| Freight Carrier Outreach | `lib/ai/freightCarrierOutreachAssistant.ts` | `aiClient.ts` | `/api/ai/freight-carrier-draft` | **STUB** | Uses `callFreightAssistant` |
| Freight CEO EOD Draft | `lib/ai/freightCeoEodAssistant.ts` | `aiClient.ts` | `/api/ai/freight-eod-draft` | **STUB** | Uses `callFreightAssistant` |
| Freight Ops Diagnostics | `lib/ai/freightOpsDiagnosticsAssistant.ts` | `aiClient.ts` | `/api/ai/freight-ops-diagnostics` | **STUB** | Uses `callFreightAssistant` |
| Freight Summary | `lib/ai/freightSummaryAssistant.ts` | `aiClient.ts` | `/api/ai/freight-summary` | **STUB** | Uses `callFreightAssistant` |
| Hotel Outreach | `lib/ai/hotelOutreachAssistant.ts` | `aiClient.ts` | `/api/ai/hotel-outreach-draft` | **STUB** | Uses `callFreightAssistant` |
| BPO Client Outreach | `lib/ai/bpoClientOutreachAssistant.ts` | `aiClient.ts` | `/api/ai/bpo-client-draft` | **STUB** | Uses `callFreightAssistant` |
| Dashboard Summarizer | `lib/ai/summarize.ts` | `client.ts` | Various | **WORKING** | Uses `generateCompletion` with real OpenAI |
| Incentive Summarizer | `lib/ai/summarize.ts` | `client.ts` | Various | **WORKING** | Uses `generateCompletion` with real OpenAI |
| Lost Load Rescue Agent | `lib/ai/freightLostLoadAgent.ts` | Direct OpenAI | `/api/freight/loads/[id]/run-lost-load-agent` | **WORKING** | Direct `openai.chat.completions.create()` |

**Summary:** 6 features stubbed, 3 features working with real OpenAI.

### Stub Response Evidence (`lib/ai/aiClient.ts` lines 28-34)

```typescript
// TODO: Wire this to the real AI provider (Emergent/OpenAI/etc.).
// For now, we return a stubbed response to keep Wave 11 safe
// without requiring provider keys in this environment.
const disabledMessage =
  "AI assistant is configured but provider is not wired yet. This is a stub response.";
```

---

## I. Duplication & Overlap Report

### Page Duplications

| Duplicate | Canonical | Reason | Status | Evidence |
|-----------|-----------|--------|--------|----------|
| `/logistics/loads/[id]` (524 lines) | `/freight/loads/[id]` (694 lines) | Same purpose, freight version more complete | Redirect candidate | File comparison |
| `/hotels` (list) | `/hospitality/hotels` | Same purpose | Redirect candidate | Both render hotel lists |
| `/hotels/new` | `/hospitality/hotels/new` | Same purpose | Redirect candidate | Both create hotels |
| `/hotels/[id]/index` | `/hospitality/hotels/[id]` | Different features | **KEEP BOTH** | hotels/[id] has unique KPI entry form |
| `/freight/lost` + `/freight/at-risk` | `/freight/lost-and-at-risk` | Combined view exists | Legacy, recommend hide from nav | Combined page supersedes |
| `/freight/coverage` | `/freight/coverage-war-room` | Similar purpose | Decision required | Different UI, may serve different needs |

### API Duplications

| Duplicate API | Canonical API | Reason | Verified | Evidence |
|---------------|---------------|--------|----------|----------|
| `/api/logistics/loads/[id]` | `/api/freight/loads/[id]` | Both manage loads | Yes | File exists at both paths |
| `/api/logistics/freight-pnl` | `/api/freight/pnl` | Same purpose | Yes | Files exist |
| `/api/logistics/carriers` | `/api/freight/carriers/*` | Carrier data | Yes | Files exist |
| `/api/logistics/loads/[id]/match-carriers` | `/api/freight/loads/[id]/matches` | Matching | Yes | Files exist |
| `/api/hospitality/snapshot` | `/api/hotels/snapshot` | Same purpose | Yes | Verified exists, caller unknown (see note below) |

**Snapshot API Note:** `/hotels/snapshot` page calls `/api/hotels/snapshot` (verified in code). `/api/hospitality/snapshot` exists but its caller is unknown.

**Note:** All APIs verified by file presence under `/pages/api/...`

---

## J. Critical Workflow Paths

### J.1 Broker Freight Workflow

```
Login → My Day → Logistics Dashboard → Loads List → Load Detail → Find Carriers → 
Coverage War Room → At-Risk & Lost → Freight KPIs
```

| Step | Page | APIs Called (Verified) |
|------|------|------------------------|
| 1. Login | `/login` | `/api/auth/send-otp` ✓, `/api/auth/verify-otp` ✓ |
| 2. My Day | `/my-day` | `/api/my-day` ✓ |
| 3. Dashboard | `/logistics/dashboard` | `/api/logistics/dashboard` ✓, `/api/logistics/loss-insights` ✓ |
| 4. Loads List | `/freight/loads` | `/api/freight/meta` ✓, `/api/freight/loads` ✓ |
| 5. Load Detail | `/freight/loads/[id]` | `/api/freight/loads/[id]` ✓, `/api/freight/loads/events` ✓ |
| 6. Find Carriers | `/freight/loads/[id]/find-carriers` | `/api/freight/loads/[id]/matches` ✓, `/api/freight/carriers/match` ✓ |
| 7. War Room | `/freight/coverage-war-room` | `/api/freight/coverage-war-room` ✓, `/api/freight/coverage-stats` ✓ |
| 8. At-Risk | `/freight/lost-and-at-risk` | `/api/freight/at-risk-loads` ✓, `/api/freight/lost-loads` ✓ |
| 9. KPIs | `/freight/kpi` | `/api/freight-kpi` ✓, `/api/analytics/series` ✓ |

### J.2 Carrier Portal Workflow

```
Carrier Portal → View Available Loads
```

| Step | Page | APIs Called (Verified) |
|------|------|------------------------|
| 1. Portal | `/carrier-portal` | `/api/carrier-portal/available-loads` ✓ |

**Note:** Current carrier portal is read-only. No carrier self-service account management exists.

### J.3 Hospitality Workflow

```
Dashboard → Hotels List → Hotel Detail → Snapshot → KPI Report
```

| Step | Page | APIs Called (Verified) |
|------|------|------------------------|
| 1. Dashboard | `/hospitality/dashboard` | `/api/hospitality/dashboard` ✓ |
| 2. Hotels | `/hospitality/hotels` | `/api/ventures` ✓, `/api/hospitality/hotels` ✓ |
| 3. Detail | `/hospitality/hotels/[id]` | `/api/hospitality/hotels/[id]` ✓, `/api/hospitality/hotels/[id]/metrics` ✓ |
| 4. Snapshot | `/hotels/snapshot` | `/api/hotels/snapshot` ✓ |
| 5. KPI Report | `/hotels/kpi-report` | `/api/hotels/kpi-comparison` ✓ |

---

## K. Risk Register

| # | Risk | Severity | Pages/APIs | Mitigation |
|---|------|----------|------------|------------|
| 1 | **Dual load detail pages** - Different code, same purpose | **High** | `/logistics/loads/[id]`, `/freight/loads/[id]` | Redirect logistics to freight, test all load workflows |
| 2 | **Shippers vs Customers confusion** - Users may not understand parent-child relationship | **Medium** | `/logistics/shippers`, `/logistics/customers` | Add UI subtitles explaining relationship; do NOT remove either from nav without product decision |
| 3 | **Missing carrier portal features** - Carriers can only view, not interact | **Medium** | `/carrier-portal` | Document as limitation, plan Phase 2 enhancements |
| 4 | **Legacy freight pages still accessible** - at-risk.tsx, lost.tsx | **Medium** | `/freight/at-risk`, `/freight/lost` | Mark as Legacy; recommend hide from nav + redirect to combined page |
| 5 | **Hotel module split** - pages in /hotels and /hospitality | **Medium** | All hotel pages | Document canonical paths, add redirects for /hotels base routes |
| 6 | **6 AI features are stubbed** | **Medium** | All `/api/ai/*` except lost-load-agent, summarize | Document status, plan provider wiring; consider UI indicators (future enhancement) |
| 7 | **Coverage vs War Room overlap** - Similar functionality | **Low** | `/freight/coverage`, `/freight/coverage-war-room` | Product decision required before consolidation |
| 8 | **20 freight nav items** - Overwhelming for users | **Medium** | `lib/nav.ts` | Group into sub-menus (requires UX review) |
| 9 | **API namespace split** - /api/freight vs /api/logistics | **Medium** | All freight APIs | Document canonical, deprecate logistics duplicates after usage audit |
| 10 | **Role-gated features** - Testing requires multiple accounts | **Low** | All role-restricted pages (79 nav items, not all visible) | Maintain test users for each role in seed data |
| 11 | **Orphan API endpoint** - `/api/hospitality/snapshot` has no known caller | **Low** | `/api/hospitality/snapshot` | Audit usage before removal; may be called by external systems |

---

## L. Appendix: Role Matrix Summary

| Role | Venture Scope | Office Scope | Admin Panel | Impersonate |
|------|---------------|--------------|-------------|-------------|
| CEO | All | All | Yes | Yes |
| ADMIN | All | All | Yes | Yes |
| COO | All | All | No | No |
| VENTURE_HEAD | Assigned | All | No | No |
| OFFICE_MANAGER | Assigned | Assigned | No | No |
| TEAM_LEAD | Assigned | Assigned | No | No |
| EMPLOYEE | Assigned | Assigned | No | No |
| DISPATCHER | Assigned | Assigned | No | No |
| CSR | Assigned | Assigned | No | No |
| CARRIER_TEAM | Assigned | Assigned | No | No |
| HR_ADMIN | Assigned | Assigned | No | No |
| FINANCE | Assigned | Assigned | No | No |
| AUDITOR | Assigned | Assigned | No | No |
| ACCOUNTING | Assigned | Assigned | No | No |

---

## M. Files Scanned

- `/pages/**/*.tsx` - All 150+ page components
- `/pages/api/**/*.ts` - All 200+ API routes (verified by file presence)
- `/lib/nav.ts` - Navigation configuration (79 nav items, 623 lines)
- `/lib/permissions.ts` - Role configuration (902 lines)
- `/lib/ai/*.ts` - AI feature implementations (verified stub vs working)
- `/prisma/schema.prisma` - Database schema (93 models)

---

## N. Change Log

### v1.1 → v1.2

| Section | Change | Reason |
|---------|--------|--------|
| Section B | Removed "Document AI feature status" from No-Regrets | Adding UI indicators is a code change, not documentation-only |
| Section C | Added "AI UX Improvements" subsection under Decisions Required | Moved AI status indicator recommendation to future enhancement |
| Section B, Item 4 | Reworded legacy pages item | Changed from "Hide from nav" (code change) to "Mark as Legacy; recommended future action" (documentation-only) |
| Section E, J | Replaced `/api/freight-kpi/index` with `/api/freight-kpi` | Route path, not file path |
| Section I, J | Removed "OR" ambiguity from Snapshot API | `/hotels/snapshot` calls `/api/hotels/snapshot`; `/api/hospitality/snapshot` caller unknown |
| Section K | Added Risk #11 for orphan `/api/hospitality/snapshot` | Identified during snapshot API audit |
| Line counts | Updated to 694/524 | Exact current line counts |

### v1 → v1.1

| Section | Change | Reason |
|---------|--------|--------|
| Executive Summary | Replaced "same entity / needs schema merge" with parent-child relationship description | Shippers and Customers have proper FK relationship, not duplicates |
| New Section C | Added "Decisions Required" section | Separated product decisions from no-regrets cleanup |
| Section B | Removed "Remove Shippers from nav" from No-Regrets | This is a product decision, not a safe cleanup |
| New Section D | Added "Shippers vs Customers: Parent-Child Relationship" with schema details | Clarifies the actual data model |
| Section F | Added "Navigation Counts" section | Corrected 591 → 623 lines, added 79 nav items count |
| Section F | Added role-based visibility explanation | Explains why not all 79 items are visible to all users |
| Section H | Added detailed "AI Features Status" section | Documents exactly which 6 are stubbed vs 3 working with file evidence |
| All API references | Added verification note | "Verified by file presence under /pages/api/..." |
| Section I | Added "Verified" column to API duplications | Confirms all listed APIs exist |
| Section J | Added checkmarks to workflow APIs | Confirms all workflow APIs are verified |

**Zero code changes made.**
