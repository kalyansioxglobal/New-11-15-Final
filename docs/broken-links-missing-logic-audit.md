# Broken Links, Missing Logic & Logic Errors Audit

**Generated:** December 2025  
**Purpose:** Comprehensive audit of broken API links, missing implementations, and logic errors  
**Scope:** All frontend API calls, imported functions, and critical business logic

---

## Executive Summary

**Status:** 🟡 **MOSTLY OK** with specific issues identified

**Findings:**
- ✅ **3 missing routes** were already created (hospitality hotel routes)
- 🔴 **2 stubbed implementations** (AI client, FMCSA client) - return mock data
- 🟡 **Missing event triggers** (hotel reviews, BPO calls → gamification)
- 🟡 **Logic issues** (incentive calculation paths, null handling in KPI calculations)
- 🟡 **Missing null checks** in some calculations

---

## Part 1: Broken Links (404 Errors)

### ✅ FIXED: Hospitality Hotel Routes

**Status:** ✅ **FIXED** - Routes were created

These routes were missing but have been created:
- ✅ `/api/hospitality/hotels/[id]/metrics` - Created
- ✅ `/api/hospitality/hotels/[id]/reviews` - Created
- ✅ `/api/hospitality/hotels/[id]/daily-reports` - Created

**Verification:** Files exist at:
- `pages/api/hospitality/hotels/[id]/metrics.ts`
- `pages/api/hospitality/hotels/[id]/reviews.ts`
- `pages/api/hospitality/hotels/[id]/daily-reports.ts`

### ✅ VERIFIED: All Routes Exist

Based on frontend code analysis, these routes were flagged for verification but **ALL EXIST**:

**1. `/api/overview/ventures`**
- **Called From:** `pages/overview.tsx:44`, `pages/ventures/index.tsx:77`
- **Status:** ✅ **EXISTS** - `pages/api/overview/ventures.ts`
- **Verified:** Route exists and returns venture data with KPIs

**2. `/api/overview/summary`**
- **Called From:** `pages/overview.tsx:45`
- **Status:** ✅ **EXISTS** - `pages/api/overview/summary.ts`
- **Verified:** Route exists

**3. `/api/saas/cohorts`**
- **Called From:** `pages/saas/metrics.tsx:83`
- **Status:** ✅ **EXISTS** - `pages/api/saas/cohorts.ts`
- **Verified:** Route exists and returns cohort retention data

**4. `/api/sales-kpi/record`**
- **Called From:** `pages/sales/sales-kpi.tsx:245`
- **Status:** ✅ **EXISTS** - `pages/api/sales-kpi/record.ts`
- **Verified:** Route exists and handles POST for recording sales KPIs

**5. `/api/freight-kpi/sales-cost`**
- **Called From:** `pages/sales/sales-kpi.tsx:187`
- **Status:** ✅ **EXISTS** - `pages/api/freight-kpi/sales-cost.ts`
- **Verified:** Route exists and handles GET/POST for sales person costs

---

## Part 2: Missing Logic (Stubbed/Mock Implementations)

### 🔴 CRITICAL: Stubbed AI Client

**Location:** `lib/ai/aiClient.ts:28-34`

**Issue:** AI client returns stub response instead of calling real provider

```typescript
// TODO: Wire this to the real AI provider (Emergent/OpenAI/etc.).
// For now, we return a stubbed response to keep Wave 11 safe
// without requiring provider keys in this environment.
const disabledMessage =
  "AI assistant is configured but provider is not wired yet. This is a stub response.";

return disabledMessage + "\n\nPrompt preview: " + prompt.slice(0, 400);
```

**Impact:** 🔴 **CRITICAL** - All AI features return stub responses, not real AI

**Status:** 🔴 **STUBBED** - Not calling real AI provider

**Action Required:**
- [ ] Wire to real AI provider (OpenAI, Emergent, etc.)
- [ ] Add API key configuration
- [ ] Remove stub response
- [ ] Add error handling for API failures

**Files Affected:**
- `lib/ai/aiClient.ts` - Main AI client
- All AI endpoints that use `callFreightAssistant()`

---

### 🔴 CRITICAL: Mock FMCSA Client

**Location:** `lib/integrations/fmcsaClient.ts:22-44`

**Issue:** FMCSA client returns mock data instead of calling real API

```typescript
// In production, replace with actual HTTP call:
// const response = await fetch(`https://api.fmcsa.dot.gov/carriers/${mcNumber}`, { /* ... */ });
// const data = await response.json();
// return { mcNumber: data.mc_number, status: data.status, authorized: data.authorized, ... };

// Mock response: assume all carriers are active and authorized for now
const mockData: FMCSACarrierData = {
  mcNumber,
  status: 'ACTIVE',
  authorized: true,
  safetyRating: 'SATISFACTORY',
  lastUpdated: new Date(),
};
```

**Impact:** 🟡 **HIGH** - All FMCSA lookups return fake data, carrier safety checks are meaningless

**Status:** 🔴 **MOCK** - Not calling real FMCSA API

**Action Required:**
- [ ] Implement real FMCSA API call
- [ ] Add API key configuration
- [ ] Add error handling for API failures
- [ ] Add rate limiting for FMCSA API calls
- [ ] Remove mock data

**Files Affected:**
- `lib/integrations/fmcsaClient.ts` - FMCSA client
- `pages/api/admin/freight/fmcsa-sync.ts` - FMCSA sync endpoint
- `pages/api/carriers/[id]/fmcsa-refresh.ts` - Individual refresh endpoint
- `lib/jobs/fmcsaAutosyncJob.ts` - Scheduled sync job

---

### 🟡 PARTIAL: RingCentral Integration

**Location:** `lib/import/normalizers.ts`, `pages/api/import/ringcentral.ts`

**Issue:** RingCentral integration only supports CSV file import, no live API integration

**Missing:**
- No RingCentral API client (OAuth2, JWT, SDK)
- No env vars for `RINGCENTRAL_CLIENT_ID`, `RINGCENTRAL_CLIENT_SECRET`
- No background sync job to pull call logs automatically
- No webhook handler for real-time call events

**Impact:** 🟡 **MEDIUM** - BPO call logs must be manually imported via CSV

**Status:** 🟡 **PARTIAL** - File import works, live API doesn't

**Action Required:**
- [ ] Implement RingCentral API client
- [ ] Add OAuth2/JWT authentication
- [ ] Add background sync job
- [ ] Add webhook handler for real-time events
- [ ] OR: Document that CSV import is the intended workflow

**Files Affected:**
- `lib/import/normalizers.ts` - CSV parser
- `pages/api/import/ringcentral.ts` - Import endpoint
- `lib/jobs/` - Need to add sync job

---

### 🟡 PARTIAL: 3PL Integration

**Location:** `lib/threepl/client.ts`

**Issue:** 3PL client exists but may not be fully configured

**Status:** 🟡 **PARTIAL** - Client exists, usage is limited

**Action Required:**
- [ ] Verify 3PL API credentials are configured
- [ ] Test 3PL API calls in production
- [ ] Add error handling for API failures
- [ ] OR: Document that 3PL integration is not yet active

---

## Part 3: Missing Event Triggers

### 🔴 MISSING: Hotel Review Response → Gamification

**Location:** `pages/api/hospitality/reviews/[id].ts` (or similar)

**Issue:** When hotel review is responded to, no gamification points are awarded

**Expected:** Should call `awardPointsForEvent('HOTEL_REVIEW_RESPONDED', 5-10 pts)`

**Current:** No gamification trigger

**Impact:** 🟡 **MEDIUM** - Missing engagement opportunity

**Action Required:**
- [ ] Add `awardPointsForEvent()` call when review is responded to
- [ ] Add idempotency key to prevent double-counting
- [ ] Test that points are awarded correctly

**Files to Update:**
- `pages/api/hospitality/reviews/[id].ts` (or wherever review response is handled)

---

### 🔴 MISSING: BPO Call Log → Gamification

**Location:** `pages/api/bpo/call-logs.ts`

**Issue:** When BPO call log is created, no gamification points are awarded

**Expected:** Should call `awardPointsForEvent('BPO_CALL_COMPLETED', 1-5 pts)`

**Current:** No gamification trigger

**Impact:** 🟡 **MEDIUM** - Missing engagement opportunity

**Action Required:**
- [ ] Add `awardPointsForEvent()` call when call log is created
- [ ] Add idempotency key to prevent double-counting
- [ ] Test that points are awarded correctly

**Files to Update:**
- `pages/api/bpo/call-logs.ts`

---

### 🟡 MISSING: Load DELIVERED → Immediate KPI Recalculation

**Location:** `pages/api/freight/loads/update.ts`

**Issue:** When load status changes to DELIVERED, KPIs are not immediately recalculated

**Expected:** Should trigger `FreightKpiDaily` recalculation (or queue for scheduled job)

**Current:** KPIs are calculated on-demand when user views dashboard

**Impact:** 🟡 **LOW** - KPIs may be stale until dashboard is viewed

**Action Required:**
- [ ] Add scheduled job to pre-aggregate KPIs daily (recommended)
- [ ] OR: Add immediate recalculation on load DELIVERED (if performance allows)
- [ ] Document that KPIs are calculated on-demand

**Files to Update:**
- `lib/jobs/kpiAggregationJob.ts` (create new job)
- `scripts/scheduled-jobs-runner.ts` (add to schedule)

---

### 🟡 MISSING: Hotel KPI Upload → Briefing Update

**Location:** `pages/api/hotels/kpi-upload.ts`

**Issue:** When hotel KPI is uploaded, briefing is not immediately updated

**Expected:** Should trigger briefing recalculation (or queue for next briefing)

**Current:** Briefing reads on-demand

**Impact:** 🟡 **LOW** - Briefing may be stale until next view

**Action Required:**
- [ ] Add briefing update trigger on KPI upload
- [ ] OR: Document that briefing is calculated on-demand

---

## Part 4: Logic Errors

### 🔴 CRITICAL: Incentive Calculation Logic Conflicts

**Location:** Multiple files

**Issue:** Three different incentive calculation paths exist:
1. Legacy: `lib/incentives.ts` - Uses `EmployeeKpiDaily`, currency "INR"
2. New Increment: `lib/incentives/engine.ts` - `saveIncentivesForDay()` - Can double-count
3. New Idempotent: `lib/incentives/engine.ts` - `saveIncentivesForDayIdempotent()` - Safe

**Impact:** 🔴 **CRITICAL** - Can result in incorrect incentive payments

**Logic Error:**
- Manual commit uses increment pattern: `amount: existing + new`
- If run twice, amount doubles
- Legacy engine uses different currency (INR vs USD)

**Action Required:**
- [ ] Delete legacy engine (P0)
- [ ] Fix manual commit to use idempotent version (P0)
- [ ] Remove increment-based `saveIncentivesForDay()` (P0)

**Files:**
- `lib/incentives.ts` - DELETE
- `pages/api/incentives/run.ts` - DELETE
- `pages/api/incentives/commit.ts` - FIX (use idempotent version)
- `lib/incentives/engine.ts` - Remove increment version

---

### 🟡 WARNING: Null Handling in KPI Calculations

**Location:** `lib/kpiFreight.ts:54-64`

**Issue:** Margin calculation doesn't explicitly handle null `costAmount`

```typescript
const profit =
  typeof totalProfit === "number"
    ? totalProfit
    : totalRevenue - totalCost;  // If totalCost is null/undefined, this is NaN

const marginPct =
  typeof avgMarginPct === "number"
    ? avgMarginPct
    : totalRevenue > 0
    ? (profit / totalRevenue) * 100  // If profit is NaN, marginPct is NaN
    : 0;
```

**Impact:** 🟡 **MEDIUM** - If `totalCost` is null/undefined, calculations return NaN

**Logic Error:** Missing null check for `totalCost`

**Action Required:**
- [ ] Add null check: `const totalCost = input.totalCost ?? 0;`
- [ ] Add validation to ensure `totalCost` is a number
- [ ] Add test for null cost handling

**Files:**
- `lib/kpiFreight.ts:54-64`

---

### 🟡 WARNING: Missing Null Check in Incentive Calculations

**Location:** `lib/incentives/engine.ts:181`

**Issue:** `computeAmountForRule()` checks `!metricValue` but doesn't handle null explicitly

```typescript
if (!metricValue && rule.calcType !== "BONUS_ON_TARGET") return 0;
```

**Impact:** 🟡 **LOW** - Null values are treated as 0, which may be correct but should be explicit

**Logic Error:** Implicit null handling, should be explicit

**Action Required:**
- [ ] Add explicit null check: `if (metricValue === null || metricValue === undefined || metricValue === 0)`
- [ ] Document behavior for null values
- [ ] Add test for null metric values

**Files:**
- `lib/incentives/engine.ts:181`

---

### 🟡 WARNING: Missing Validation in API Routes

**Location:** Various API routes

**Issue:** Some API routes don't validate input types before using them

**Examples:**
- `pages/api/freight/carriers/index.ts` - Uses `any` types, no Zod validation
- `pages/api/freight/loads/[id].ts` - PATCH has no body validation
- `pages/api/hotels/snapshot.ts` - Query params not validated

**Impact:** 🟡 **MEDIUM** - Invalid input can cause runtime errors

**Action Required:**
- [ ] Add Zod schemas for API route inputs
- [ ] Add validation middleware
- [ ] Replace `any` types with proper types

**Files:**
- Multiple API routes (see `docs/api-audit-report.md`)

---

## Part 5: Missing Error Handling

### 🟡 WARNING: Swallowed Errors in Background Jobs

**Location:** `scripts/scheduled-jobs-runner.ts`

**Issue:** Jobs catch errors but only log to console, no alerting

```typescript
} catch (err: any) {
  console.error(`[${new Date().toISOString()}] Job failed:`, err.message);
  // No alerting, no retry, no visibility
}
```

**Impact:** 🟡 **HIGH** - Critical job failures go unnoticed

**Action Required:**
- [ ] Add alerting for job failures (email, Slack, PagerDuty)
- [ ] Add retry logic
- [ ] Add monitoring dashboard

**Files:**
- `scripts/scheduled-jobs-runner.ts`
- `lib/jobs/*.ts`

---

### 🟡 WARNING: Missing Error Handling in External API Calls

**Location:** `lib/outreach/providers/sendgrid.ts`, `lib/outreach/providers/twilio.ts`

**Issue:** External API calls may not have comprehensive error handling

**Impact:** 🟡 **MEDIUM** - Transient failures cause permanent errors

**Action Required:**
- [ ] Add retry logic with exponential backoff
- [ ] Add circuit breaker pattern
- [ ] Add fallback behavior
- [ ] Add comprehensive error logging

**Files:**
- `lib/outreach/providers/sendgrid.ts`
- `lib/outreach/providers/twilio.ts`
- `lib/integrations/fmcsaClient.ts`

---

## Part 6: Correct Logic Verification

### ✅ VERIFIED: Gamification Idempotency

**Location:** `lib/gamification/awardPoints.ts:57-72`

**Status:** ✅ **CORRECT** - Uses idempotency key check before awarding points

```typescript
if (idempotencyKey) {
  const existing = await prisma.gamificationEvent.findFirst({
    where: {
      userId,
      ventureId,
      type: eventType,
      metadata: {
        path: ['idempotencyKey'],
        equals: idempotencyKey,
      },
    },
  });

  if (existing) {
    return { success: true, eventId: existing.id, skipped: true };
  }
}
```

**Verification:** ✅ Logic is correct - prevents double-counting

---

### ✅ VERIFIED: Scheduled Incentive Job Idempotency

**Location:** `lib/jobs/incentiveDailyJob.ts:34-105`

**Status:** ✅ **CORRECT** - Uses DELETE then CREATE pattern (idempotent)

```typescript
// Delete existing records for this venture+date ONCE (idempotent clear)
const deleteResult = await prisma.incentiveDaily.deleteMany({
  where: {
    ventureId,
    date: dayDate,
  },
});

// Create fresh records
await prisma.incentiveDaily.create({ ... });
```

**Verification:** ✅ Logic is correct - idempotent, safe to run multiple times

---

### 🟡 NEEDS REVIEW: Margin Calculation Logic

**Location:** `lib/kpiFreight.ts:54-64`

**Issue:** Margin calculation may not handle null `costAmount` correctly

**Current Logic:**
```typescript
const profit = totalRevenue - totalCost;  // If totalCost is null, profit is NaN
const marginPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
```

**Problem:** If `totalCost` is null/undefined, `profit` becomes NaN, then `marginPct` becomes NaN

**Correct Logic Should Be:**
```typescript
const totalCost = input.totalCost ?? 0;
const profit = totalRevenue - totalCost;
const marginPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
```

**Action Required:**
- [ ] Add null check for `totalCost`
- [ ] Add test for null cost handling
- [ ] Verify margin calculations are correct

---

### 🟡 NEEDS REVIEW: Incentive Rule Calculation Logic

**Location:** `lib/incentives/engine.ts:176-206`

**Issue:** `computeAmountForRule()` may not handle all edge cases correctly

**Current Logic:**
```typescript
if (!metricValue && rule.calcType !== "BONUS_ON_TARGET") return 0;
```

**Problem:** `!metricValue` treats `0` as falsy, but `0` might be a valid metric value

**Correct Logic Should Be:**
```typescript
if (metricValue === null || metricValue === undefined) {
  if (rule.calcType !== "BONUS_ON_TARGET") return 0;
  // For BONUS_ON_TARGET, continue even if metricValue is null
}
```

**Action Required:**
- [ ] Review logic for handling `0` vs `null` vs `undefined`
- [ ] Add explicit null checks
- [ ] Add tests for edge cases

---

## Part 7: Summary of Issues

### 🔴 Critical Issues (Must Fix)

1. **Stubbed AI Client** - Returns mock responses, not real AI
2. **Mock FMCSA Client** - Returns fake carrier data
3. **Incentive Calculation Conflicts** - Three different paths, can double-count

### 🟡 High Priority Issues (Should Fix)

4. **Missing Event Triggers** - Hotel reviews, BPO calls don't trigger gamification
5. **Missing Error Handling** - Background jobs fail silently
6. **Null Handling in KPI Calculations** - May return NaN if costAmount is null
7. **Missing Input Validation** - Some API routes don't validate inputs

### 🟢 Medium Priority Issues (Nice to Have)

8. **RingCentral Integration** - Only CSV import, no live API
9. **3PL Integration** - May not be fully configured
10. **Missing KPI Recalculation Triggers** - KPIs calculated on-demand only

---

## Part 8: Action Items

### Immediate (This Week)

1. [ ] **Fix Incentive Calculation Conflicts** (P0)
   - Delete legacy engine
   - Fix manual commit to use idempotent version
   - Remove increment-based version

2. [ ] **Fix Null Handling in KPI Calculations** (P1)
   - Add null check for `totalCost` in `lib/kpiFreight.ts`
   - Add test for null cost handling

3. [ ] **Add Missing Event Triggers** (P1)
   - Add gamification trigger for hotel review responses
   - Add gamification trigger for BPO call logs

### Short-Term (This Month)

4. [ ] **Wire Up AI Client** (P1)
   - Connect to real AI provider
   - Add API key configuration
   - Remove stub response

5. [ ] **Wire Up FMCSA Client** (P1)
   - Implement real FMCSA API call
   - Add API key configuration
   - Remove mock data

6. [ ] **Add Error Handling** (P1)
   - Add alerting for job failures
   - Add retry logic for external APIs
   - Add circuit breaker pattern

7. [ ] **Add Input Validation** (P1)
   - Add Zod schemas for API routes
   - Add validation middleware
   - Replace `any` types

### Medium-Term (Next Quarter)

8. [ ] **Complete RingCentral Integration** (P2)
   - Implement live API integration
   - Add background sync job
   - OR: Document CSV import as intended workflow

9. [ ] **Verify 3PL Integration** (P2)
   - Test 3PL API calls
   - Verify credentials are configured
   - OR: Document that integration is not active

10. [ ] **Add KPI Recalculation Triggers** (P2)
    - Add scheduled job for KPI aggregation
    - OR: Document that KPIs are calculated on-demand

---

## Part 9: Verification Checklist

### Broken Links
- [x] Hospitality hotel routes - ✅ FIXED (created)
- [x] `/api/overview/ventures` - ✅ VERIFIED (exists)
- [x] `/api/overview/summary` - ✅ VERIFIED (exists)
- [x] `/api/saas/cohorts` - ✅ VERIFIED (exists)
- [x] `/api/sales-kpi/record` - ✅ VERIFIED (exists)
- [x] `/api/freight-kpi/sales-cost` - ✅ VERIFIED (exists)

### Missing Logic
- [ ] AI client - 🔴 STUBBED (returns mock)
- [ ] FMCSA client - 🔴 MOCK (returns fake data)
- [ ] RingCentral - 🟡 PARTIAL (CSV only, no live API)
- [ ] 3PL - 🟡 PARTIAL (may not be configured)

### Missing Event Triggers
- [ ] Hotel review response → Gamification
- [ ] BPO call log → Gamification
- [ ] Load DELIVERED → KPI recalculation
- [ ] Hotel KPI upload → Briefing update

### Logic Errors
- [ ] Incentive calculation conflicts - 🔴 CRITICAL
- [ ] Null handling in KPI calculations - 🟡 WARNING
- [ ] Missing null checks in incentive calculations - 🟡 WARNING
- [ ] Missing input validation - 🟡 WARNING

### Error Handling
- [ ] Background jobs - 🟡 MISSING ALERTING
- [ ] External API calls - 🟡 MISSING RETRY LOGIC
- [ ] Database transactions - 🟡 MISSING RETRY LOGIC

---

**End of Broken Links, Missing Logic & Logic Errors Audit**

