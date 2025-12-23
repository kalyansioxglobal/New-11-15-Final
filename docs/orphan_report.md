# Orphan Report - Orphaned Code Analysis

**Generated**: December 15, 2025  
**Scope**: Complete system analysis for orphaned pages, APIs, services, jobs, and models

---

## Executive Summary

This report identifies code that appears to be orphaned (unused, incomplete, or disconnected from the main system). Each finding includes severity level and recommended action.

---

## 1. ORPHANED GAMIFICATION TRIGGERS

### Finding: Gamification Points API Has No Automated Callers
**Severity**: HIGH  
**Location**: `pages/api/gamification/points.ts`

**Issue**: The POST endpoint for creating gamification events exists but NO automated triggers call it. 

**Evidence**:
```bash
$ grep -rn "GamificationEvent\.create" --include="*.ts" --include="*.tsx"
# Returns 0 matches in production code!

$ grep -rn "gamificationEvent" pages/api/ lib/
pages/api/gamification/leaderboard.ts:39:    const events = await prisma.gamificationEvent.groupBy
pages/api/gamification/points.ts:23:      const events = await prisma.gamificationEvent.findMany
pages/api/gamification/points.ts:32:      const total = await prisma.gamificationEvent.aggregate
pages/api/gamification/points.ts:52:      const event = await prisma.gamificationEvent.create
pages/api/admin/cleanup-test-data.ts:53:    results.gamificationEvents = (await prisma.gamificationEvent.deleteMany
```

- The ONLY place `gamificationEvent.create` is called is inside `/api/gamification/points.ts` (line 52)
- No automated triggers in freight, hotels, BPO, tasks, or EOD report code paths
- Grep for `/api/gamification/points` POST calls returns 0 matches in production code

**Expected Behavior**: Actions like EOD report submission, load completion, or outreach should auto-award points.

**Current State**: Points can only be awarded via manual API calls.

**Recommendation**: 
1. Add gamification triggers to key actions:
   - EOD report submission → award points
   - Load DELIVERED → award points  
   - Carrier outreach sent → award points
   - Review response → award points
2. Or, document that gamification is intentionally manual-only

---

## 2. ORPHANED/INCOMPLETE MODELS

### 2.1 CarrierVentureStats
**Severity**: LOW  
**Location**: Prisma schema

**Status**: USED - Referenced in carrier search and carrier detail pages.

### 2.2 ShipperPreferredLane
**Severity**: LOW  
**Location**: Prisma schema, `pages/api/freight/shippers/[shipperId]/preferred-lanes/`

**Status**: USED - Has API endpoints and UI integration.

### 2.3 ThreePlLoadMapping
**Severity**: LOW  
**Location**: Prisma schema

**Status**: USED - Referenced in `/api/import/tms-3pl-financial` for 3PL financial imports.

### 2.4 IncentiveScenario
**Severity**: LOW  
**Location**: Prisma schema

**Status**: USED - Full CRUD at `/api/incentives/scenarios/`

### 2.5 AiDraftTemplate
**Severity**: LOW  
**Location**: Prisma schema

**Status**: USED - Full CRUD at `/api/admin/ai-templates/`

### 2.6 ApprovalRouting
**Severity**: LOW  
**Location**: Prisma schema (line 1619), referenced by Venture (line 256)

**Status**: ✅ VERIFIED USED - Used for email routing in customer approval workflow.

**Grep Evidence**:
```bash
$ grep -rn "approvalRouting" pages/api/
pages/api/logistics/customer-approvals/index.ts:82:  const routing = await prisma.approvalRouting.findFirst({
pages/api/logistics/customer-approvals/index.ts:87:    const to = routing.toEmails.split(',')...
```

**Code Path**: When a CustomerApproval is created (line 68), the system looks up ApprovalRouting (line 82) to determine email recipients for SendGrid notification (lines 86-114).

---

## 3. ORPHANED API ENDPOINTS

### 3.1 /api/hello.ts
**Severity**: LOW  
**Location**: `pages/api/hello.ts`

**Issue**: Default Next.js template endpoint, likely unused.

**Recommendation**: Remove if not used for health checks.

### 3.2 /api/status.ts  
**Severity**: LOW (INFORMATIONAL)  
**Location**: `pages/api/status.ts`

**Status**: Likely a health check endpoint - KEEP.

### 3.3 /api/briefing.ts
**Severity**: LOW  
**Location**: `pages/api/briefing.ts`

**Status**: ✅ VERIFIED USED - Called by DailyBriefingPanel component on CEO overview dashboard.

**Grep Evidence**:
```bash
$ grep -rn "DailyBriefing" pages/ components/
components/DailyBriefing.tsx:147:export default function DailyBriefingPanel()
pages/overview.tsx:6:import DailyBriefingPanel from "../components/DailyBriefing";
pages/overview.tsx:199:              <DailyBriefingPanel />
```

**Code Path**: `pages/overview.tsx` imports and renders `DailyBriefingPanel` (line 199) → component fetches `/api/briefing` → calls `buildDailyBriefing()` from `lib/briefing.ts`.

### 3.4 /api/test/* endpoints
**Severity**: LOW  
**Location**: `pages/api/test/`

**Status**: Test endpoints - should be disabled in production or removed.
- `login.ts`, `logout.ts`, `whoami.ts`
- `freight/outreach-last.ts`

---

## 4. ORPHANED UI PAGES

### 4.1 pages/loads/index.tsx
**Severity**: LOW  
**Location**: `pages/loads/index.tsx`

**Status**: ✅ VERIFIED - This is a PERMANENT REDIRECT to `/carrier-portal`, not an orphan.

**Evidence** (from file content):
```typescript
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/carrier-portal",
      permanent: true,
    },
  };
};
```

**Recommendation**: KEEP - Intentional redirect for legacy URL compatibility.

### 4.2 pages/carrier-portal/index.tsx
**Severity**: LOW  
**Location**: `pages/carrier-portal/index.tsx`

**Status**: NEEDS VERIFICATION - May be for external carrier access. Check if actively used.

### 4.3 pages/csr/dashboard.tsx
**Severity**: LOW  
**Location**: `pages/csr/dashboard.tsx`

**Status**: Customer Service Rep dashboard - verify if separate from employee dashboard.

### 4.4 pages/dispatcher/dashboard.tsx
**Severity**: LOW  
**Location**: `pages/dispatcher/dashboard.tsx`

**Status**: May duplicate `/dispatch/index.tsx` - verify role-specific routing.

### 4.5 pages/employee/dashboard.tsx
**Severity**: LOW  
**Location**: `pages/employee/dashboard.tsx`

**Status**: Generic employee landing - verify if used or if role-specific dashboards preferred.

---

## 5. ORPHANED SERVICES/LIBRARIES

### 5.1 Duplicate/Legacy API Patterns
**Severity**: MEDIUM

**Observed Pattern**: Some domains have overlapping API structures:
- `/api/hotels/` vs `/api/hospitality/hotels/`
- `/api/hotel-kpi/` vs `/api/hospitality/` KPI endpoints

**Recommendation**: Audit and consolidate to single canonical paths per domain.

### 5.2 /api/it/ vs /api/it-assets/
**Severity**: LOW  
**Location**: `pages/api/it/` and `pages/api/it-assets/`

**Status**: Two parallel API structures for IT assets.
- `/api/it/assets/` 
- `/api/it-assets/`

**Recommendation**: Consolidate to one canonical path.

---

## 6. ORPHANED BACKGROUND JOBS

### 6.1 FMCSA Sync Job
**Severity**: LOW  
**Location**: `pages/api/jobs/fmcsa-sync.ts`

**Status**: API endpoint exists. 

**Check Required**: Verify if included in scheduled jobs runner or triggered manually.

### 6.2 RingCentral KPI Scheduler
**Severity**: LOW  
**Location**: `scripts/ringcentral-kpi-scheduler.ts`

**Status**: Has dedicated workflow - ACTIVE.

---

## 7. ORPHANED IMPORTS/DEPENDENCIES

### 7.1 Unused npm packages
**Severity**: LOW

**Recommendation**: Run `npm prune` and audit for unused dependencies.

Common candidates to check:
- `csv-parser` vs `csv-parse` (two CSV libraries?)
- `formidable` vs `busboy` (two file upload libraries?)

---

## 8. ORPHANED DATABASE RELATIONSHIPS

### 8.1 GamificationConfig
**Severity**: MEDIUM  
**Location**: Prisma schema

**Issue**: `GamificationConfig` model exists for per-venture gamification configuration.

**Status**: API exists at `/api/gamification/config` but verify if UI configures this.

### 8.2 DispatchDriver / DispatchSettlement / DispatchConversation
**Severity**: LOW

**Status**: Dispatch module tables - verify complete wiring with dispatch UI.

---

## 9. ORPHANED SCRIPTS

### 9.1 audit_regression_test.py
**Severity**: LOW  
**Location**: `audit_regression_test.py`

**Status**: Python test file in root. Should be in tests/ or documented.

### 9.2 p3_7_p3_8_comprehensive_test.py
**Severity**: LOW  
**Location**: `p3_7_p3_8_comprehensive_test.py`

**Status**: Python test file. Should be organized or documented.

---

## 10. DOCUMENTATION GAPS

### 10.1 Gamification System
**Severity**: HIGH

**Issue**: No documentation on how gamification points are supposed to be awarded.

### 10.2 Incentive Rules
**Severity**: MEDIUM

**Issue**: calcType values (TIERED_SLAB, LOAD_LEVEL_BONUS) mentioned as "not part of v1" - document what IS implemented.

---

## Summary Action Items

| Priority | Item | Action |
|----------|------|--------|
| HIGH | Gamification triggers missing | Add auto-triggers or document as manual |
| MEDIUM | ApprovalRouting model | Verify usage |
| MEDIUM | /api/briefing.ts | Verify usage |
| MEDIUM | Duplicate API patterns (hotels) | Consolidate |
| LOW | /api/hello.ts | Remove if unused |
| LOW | /api/test/* | Disable in production |
| LOW | pages/loads/ | Verify vs freight/loads |
| LOW | IT API duplication | Consolidate /api/it/ and /api/it-assets/ |
| LOW | Python test files | Move to tests/ |

---

## Verification Queries

To verify orphan status, run these checks:

```bash
# Check for GamificationEvent creation points
grep -r "GamificationEvent" --include="*.ts" --include="*.tsx"

# Check ApprovalRouting usage
grep -r "ApprovalRouting\|approvalRouting" --include="*.ts" --include="*.tsx"

# Check /api/briefing usage
grep -r "briefing" pages/ --include="*.tsx"

# Check loads page usage
grep -r '"/loads"' --include="*.tsx"
```
