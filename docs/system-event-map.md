# SIOX Command Center - System Event Map

**Last Updated:** Generated from comprehensive codebase analysis  
**Purpose:** Complete mapping of system events, triggers, and cross-vertical data flows

This document identifies all system events, maps how they propagate across verticals, and highlights missing triggers, broken chains, and duplicate sources of truth.

---

## Status Legend

- ✅ **Implemented**: Event trigger exists and is working
- 🟡 **Partial**: Event trigger exists but incomplete
- 🔴 **Missing**: Event should trigger but doesn't
- ⚠️ **Broken**: Event trigger exists but chain is broken
- 🔄 **Batch**: Event processed in batch/scheduled job
- 👤 **Manual**: Event requires manual/admin trigger

---

## Table of Contents

1. [System Events Catalog](#1-system-events-catalog)
2. [Event Propagation Map](#2-event-propagation-map)
3. [Flow Types](#3-flow-types)
4. [Missing Triggers](#4-missing-triggers)
5. [Broken Chains](#5-broken-chains)
6. [Duplicate Sources of Truth](#6-duplicate-sources-of-truth)
7. [Cross-Vertical Dependencies](#7-cross-vertical-dependencies)

---

## 1. System Events Catalog

### 1.1 Status Changes

#### Freight/Logistics

| Event | Trigger Location | Status | Reacts To |
|-------|-----------------|--------|-----------|
| **Load Status: OPEN → WORKING** | `POST /api/freight/loads/update` | ✅ | Manual update |
| **Load Status: WORKING → COVERED** | `POST /api/freight/outreach/award` | ✅ | Outreach award |
| **Load Status: WORKING → AT_RISK** | `POST /api/freight/loads/mark-at-risk` | ✅ | Manual flag |
| **Load Status: WORKING → LOST** | `POST /api/freight/loads/mark-lost` | ✅ | Manual mark |
| **Load Status: COVERED → FELL_OFF** | `POST /api/freight/loads/mark-felloff` | ✅ | Manual mark |
| **Load Status: COVERED → DELIVERED** | `POST /api/freight/loads/update` | ✅ | Manual update |
| **Load Status: * → DELIVERED** | `POST /api/freight/loads/update` | ✅ | Manual update |
| **Quote Status: PENDING → EXPIRED** | `lib/jobs/quoteTimeoutJob.ts` (6:00 AM) | ✅ | Scheduled job |
| **Customer Churn Status** | `lib/jobs/churnRecalcJob.ts` (2:00 AM) | ✅ | Scheduled job |

**Reactions:**
- ✅ Load → DELIVERED: Gamification points (25 points)
- ✅ Load → DELIVERED: Incentive engine reads on next run (7:00 AM)
- 🔴 Load → DELIVERED: **NO immediate KPI recalculation** (calculated on-demand)
- 🔴 Load → DELIVERED: **NO immediate briefing update** (briefing reads on-demand)
- ✅ Load status change: `LogisticsLoadEvent` logged
- ✅ Load status change: Audit log created

#### Hospitality

| Event | Trigger Location | Status | Reacts To |
|-------|-----------------|--------|-----------|
| **Hotel Review: respondedById set** | `POST /api/hotels/reviews/[id]` | ✅ | Manual response |
| **Hotel Dispute Status Change** | `PUT /api/hotels/disputes/[id]` | ✅ | Manual update |
| **Hotel KPI Upload** | `POST /api/hotels/kpi-upload` | ✅ | Manual upload |

**Reactions:**
- ✅ Review response: `hotel_reviews_responded` metric available for incentives
- 🔴 Review response: **NO gamification points** (should award points)
- ✅ Hotel KPI upload: Available for incentive calculations (7:00 AM)
- 🔴 Hotel KPI upload: **NO immediate briefing update**

#### BPO

| Event | Trigger Location | Status | Reacts To |
|-------|-----------------|--------|-----------|
| **BPO Call Log Created** | `POST /api/bpo/call-logs` | ✅ | Manual entry |
| **BPO KPI Upsert** | `POST /api/bpo/kpi/upsert` | ✅ | Manual entry |

**Reactions:**
- ✅ BPO call log: Available for incentive calculations (7:00 AM)
- 🔴 BPO call log: **NO gamification points** (should award points)
- 🔴 BPO KPI upsert: **NO immediate briefing update**

#### Tasks

| Event | Trigger Location | Status | Reacts To |
|-------|-----------------|--------|-----------|
| **Task Status: * → DONE** | `PATCH /api/tasks/[id]` | ✅ | Manual completion |

**Reactions:**
- ✅ Task → DONE: Gamification points (10 points)
- 🔴 Task → DONE: **NO immediate briefing update**

#### EOD Reports

| Event | Trigger Location | Status | Reacts To |
|-------|-----------------|--------|-----------|
| **EOD Report Submitted** | `POST /api/eod-reports` | ✅ | User submission |

**Reactions:**
- ✅ EOD submitted: Gamification points (10 points)
- ✅ EOD submitted: Briefing reads on-demand
- 🔴 EOD submitted: **NO immediate briefing update** (briefing reads on-demand)

---

### 1.2 Completions

| Event | Trigger Location | Status | Reactions |
|-------|-----------------|--------|-----------|
| **Load Delivered** | `POST /api/freight/loads/update` (status → DELIVERED) | ✅ | Gamification (25 pts), Incentives (7 AM), KPI (on-demand) |
| **Task Completed** | `PATCH /api/tasks/[id]` (status → DONE) | ✅ | Gamification (10 pts) |
| **EOD Report Submitted** | `POST /api/eod-reports` | ✅ | Gamification (10 pts), Briefing (on-demand) |
| **Quote Converted to Load** | `POST /api/freight/quotes/[id]/convert-to-load` | ✅ | Gamification (50 pts) |

---

### 1.3 Submissions

| Event | Trigger Location | Status | Reactions |
|-------|-----------------|--------|-----------|
| **EOD Report** | `POST /api/eod-reports` | ✅ | Gamification (10 pts) |
| **Attendance** | `POST /api/attendance` | ✅ | None (used for KPIs) |
| **Feedback** | `POST /api/feedback/submit` | ✅ | None |
| **Hotel KPI Upload** | `POST /api/hotels/kpi-upload` | ✅ | Incentives (7 AM) |
| **BPO KPI Upsert** | `POST /api/bpo/kpi/upsert` | ✅ | Incentives (7 AM) |

---

### 1.4 Awards

| Event | Trigger Location | Status | Reactions |
|-------|-----------------|--------|-----------|
| **Outreach Awarded** | `POST /api/freight/outreach/award` | ✅ | Load → COVERED, Gamification (15 pts), Attribution tracking |
| **Outreach Sent** | `POST /api/freight/outreach/send` | ✅ | Gamification (5 pts) |

---

### 1.5 Commits

| Event | Trigger Location | Status | Reactions |
|-------|-----------------|--------|-----------|
| **Incentive Daily Commit** | `lib/jobs/incentiveDailyJob.ts` (7:00 AM) | ✅ | Reads Load, BpoCallLog, HotelReview, HotelKpiDaily |
| **Import Commit** | `POST /api/import/job/[id]/commit` | ✅ | Creates/updates multiple tables |

---

### 1.6 Syncs

| Event | Trigger Location | Status | Reactions |
|-------|-----------------|--------|-----------|
| **FMCSA Sync** | `lib/jobs/fmcsaAutosyncJob.ts` | 🟡 | Updates Carrier records (🟡 Mock client) |
| **RingCentral Sync** | `scripts/ringcentral-kpi-scheduler.ts` | 🔴 | File import only, no live API |
| **3PL Sync** | `lib/threepl/client.ts` | 🟡 | Load mapping updates |

---

## 2. Event Propagation Map

### 2.1 Load Lifecycle Flow

```
Load Created
    │
    ├─► LogisticsLoadEvent (STATUS_CHANGED)
    ├─► Audit Log
    │
    └─► [Status Changes]
            │
            ├─► WORKING
            │   └─► [Outreach Sent] ──► Gamification (5 pts)
            │
            ├─► COVERED (via award)
            │   ├─► Load.carrierId set
            │   ├─► Load.loadStatus = COVERED
            │   ├─► OutreachAttribution created
            │   └─► Gamification (15 pts)
            │
            └─► DELIVERED
                ├─► Load.loadStatus = DELIVERED
                ├─► Load.billingDate set (when billing complete)
                ├─► LogisticsLoadEvent (DELIVERED)
                ├─► Gamification (25 pts) ✅
                ├─► Incentive Engine (reads on 7 AM run) ✅
                ├─► KPI Calculations (on-demand) 🔴 NO immediate
                └─► Briefing (reads on-demand) 🔴 NO immediate
```

**Issues:**
- 🔴 **Missing**: No immediate KPI recalculation when load delivered
- 🔴 **Missing**: No immediate briefing update when load delivered
- ✅ **Working**: Gamification points awarded immediately
- ✅ **Working**: Incentive engine reads on scheduled run

---

### 2.2 Incentive Calculation Flow

```
[Scheduled: 7:00 AM EST]
    │
    └─► Incentive Daily Commit Job
            │
            ├─► For each active Venture + IncentivePlan
            │
            ├─► Reads Data:
            │   ├─► Load (DELIVERED, billingDate in range)
            │   ├─► BpoCallLog (callStartedAt in range)
            │   ├─► HotelReview (respondedById set)
            │   └─► HotelKpiDaily (date in range)
            │
            ├─► Calculates Metrics:
            │   ├─► loads_completed, loads_revenue, loads_miles, loads_margin
            │   ├─► bpo_dials, bpo_connects, bpo_talk_seconds, bpo_deals
            │   └─► hotel_reviews_responded, hotel_adr, hotel_revpar
            │
            ├─► Applies Rules:
            │   ├─► PERCENT_OF_METRIC
            │   ├─► FLAT_PER_UNIT
            │   ├─► BONUS_ON_TARGET
            │   └─► Other calc types
            │
            └─► Writes:
                ├─► DELETE existing IncentiveDaily (venture, date)
                └─► CREATE fresh IncentiveDaily records (idempotent)
```

**Issues:**
- ✅ **Working**: Idempotent (safe to run multiple times)
- ✅ **Working**: Processes all active ventures
- 🔴 **Missing**: No real-time incentive calculation (only batch)
- 🔴 **Missing**: No notification when incentives calculated

---

### 2.3 Gamification Flow

```
Event Triggers:
    │
    ├─► EOD Report Submitted
    │   └─► awardPointsForEvent('EOD_REPORT_SUBMITTED', 10 pts) ✅
    │
    ├─► Load Delivered
    │   └─► awardPointsForEvent('LOAD_COMPLETED', 25 pts) ✅
    │
    ├─► Outreach Sent
    │   └─► awardPointsForEvent('CARRIER_OUTREACH_SENT', 5 pts) ✅
    │
    ├─► Outreach Awarded
    │   └─► awardPointsForEvent('OUTREACH_AWARDED', 15 pts) ✅
    │
    ├─► Task Completed
    │   └─► awardPointsForEvent('TASK_COMPLETED', 10 pts) ✅
    │
    └─► Quote Converted
        └─► awardPointsForEvent('QUOTE_CONVERTED', 50 pts) ✅

All Events:
    │
    └─► GamificationEvent.create (with idempotencyKey)
        └─► GamificationPointsBalance.upsert (increment points)
```

**Issues:**
- ✅ **Working**: All freight events trigger gamification
- 🔴 **Missing**: Hotel review response should award points (doesn't)
- 🔴 **Missing**: BPO call completion should award points (doesn't)
- 🔴 **Missing**: Hotel dispute resolution should award points (doesn't)

---

### 2.4 Task Generation Flow

```
[Scheduled: 6:30 AM]
    │
    └─► Task Generation Job
            │
            ├─► For each active Venture
            │
            ├─► Dormant Customer Rule
            │   ├─► Find customers: no load in 21 days + no touch in 7 days
            │   └─► Create Task (DORMANT_CUSTOMER_FOLLOWUP) ✅
            │
            ├─► Quote Expiring Rule
            │   ├─► Find quotes: expiring in 24 hours
            │   └─► Create Task (QUOTE_EXPIRING) ✅
            │
            └─► Quote No Response Rule
                ├─► Find quotes: no response in 48 hours
                └─► Create Task (QUOTE_NO_RESPONSE) ✅
```

**Issues:**
- ✅ **Working**: All three rules implemented
- 🔴 **Missing**: No real-time task generation (only batch)
- 🔴 **Missing**: No task generation for hotel/BPO events

---

### 2.5 Briefing Generation Flow

```
[On-Demand: GET /api/briefing]
    │
    └─► buildDailyBriefing(user)
            │
            ├─► Reads Logistics Data:
            │   ├─► Loads (yesterday, last week)
            │   ├─► Lost loads analysis
            │   └─► Rate loss analysis
            │
            ├─► Reads Hospitality Data:
            │   ├─► HotelKpiDaily (last 7 days)
            │   └─► Occupancy/RevPAR trends
            │
            ├─► Reads BPO Data:
            │   └─► BpoCallLog (yesterday)
            │
            └─► Generates Sections:
                ├─► Firefront (CRITICAL issues)
                ├─► Stormfront (WARN issues)
                ├─► Watch (INFO issues)
                └─► Wins (positive items)
```

**Issues:**
- 🔴 **Missing**: Briefing is on-demand only (not pushed/real-time)
- 🔴 **Missing**: No notification when critical issues detected
- 🔴 **Missing**: No automatic briefing generation (manual trigger only)

---

## 3. Flow Types

### 3.1 Event-Driven Flows

**✅ Implemented:**
- Load status → DELIVERED → Gamification points (immediate)
- Task status → DONE → Gamification points (immediate)
- EOD submitted → Gamification points (immediate)
- Outreach sent → Gamification points (immediate)
- Outreach awarded → Load COVERED + Gamification points (immediate)
- Quote converted → Gamification points (immediate)

**🔴 Missing:**
- Load DELIVERED → KPI recalculation (should be immediate or queued)
- Load DELIVERED → Briefing update (should be queued)
- Hotel review response → Gamification points
- BPO call completion → Gamification points
- Hotel dispute resolution → Gamification points
- Task completion → Briefing update

---

### 3.2 Batch-Driven Flows

**✅ Implemented:**
- **2:00 AM**: Churn recalculation (all shippers/customers)
- **6:00 AM**: Quote timeout (expired quotes)
- **6:30 AM**: Task generation (dormant, expiring, no-response)
- **7:00 AM**: Incentive daily commit (all ventures)

**🟡 Partial:**
- FMCSA sync (mock client, not real API)
- RingCentral sync (file import only)

---

### 3.3 Manual/Admin-Triggered Flows

**✅ Implemented:**
- Load status updates (manual)
- Task creation (manual)
- EOD submission (user-driven)
- Incentive calculation (admin can trigger manually)
- Import commits (user-driven)
- Audit runs (admin-triggered)

---

## 4. Missing Triggers

### 4.1 Gamification Missing Triggers

| Event | Should Trigger | Current Status |
|-------|----------------|----------------|
| Hotel review response | 5-10 points | 🔴 **MISSING** |
| BPO call completion | 1-5 points | 🔴 **MISSING** |
| Hotel dispute resolution | 10-20 points | 🔴 **MISSING** |
| Perfect week (5 EODs) | 25 points | 🔴 **MISSING** |
| First daily login | 1 point | 🔴 **MISSING** |

**Impact:** Gamification system is underutilized, missing engagement opportunities.

---

### 4.2 KPI Recalculation Missing Triggers

| Event | Should Trigger | Current Status |
|-------|----------------|----------------|
| Load DELIVERED | FreightKpiDaily recalculation | 🔴 **MISSING** (on-demand only) |
| Hotel KPI upload | HotelKpiDaily aggregation | 🔴 **MISSING** (on-demand only) |
| BPO KPI upsert | BpoKpiRecord aggregation | 🔴 **MISSING** (on-demand only) |

**Impact:** KPIs may be stale until manually refreshed or on-demand calculation.

---

### 4.3 Briefing Missing Triggers

| Event | Should Trigger | Current Status |
|-------|----------------|----------------|
| Load DELIVERED | Briefing update (if critical) | 🔴 **MISSING** |
| Load LOST | Briefing update (firefront) | 🔴 **MISSING** |
| Hotel performance drop | Briefing update (stormfront) | 🔴 **MISSING** |
| BPO performance drop | Briefing update (stormfront) | 🔴 **MISSING** |
| Task overdue | Briefing update (watch) | 🔴 **MISSING** |

**Impact:** Briefing is reactive (on-demand) rather than proactive (event-driven).

---

### 4.4 Task Generation Missing Triggers

| Event | Should Trigger | Current Status |
|-------|----------------|----------------|
| Hotel review needs response | Task (REVIEW_RESPONSE) | 🔴 **MISSING** |
| Hotel dispute opened | Task (DISPUTE_RESOLUTION) | 🔴 **MISSING** |
| BPO campaign low performance | Task (CAMPAIGN_REVIEW) | 🔴 **MISSING** |
| SaaS customer churn risk | Task (CHURN_PREVENTION) | 🔴 **MISSING** |

**Impact:** Task automation only covers freight, missing other verticals.

---

## 5. Broken Chains

### 5.1 Load → KPI Chain

**Current Flow:**
```
Load DELIVERED
    │
    └─► [No immediate action]
            │
            └─► KPI calculated on-demand when user views dashboard
```

**Expected Flow:**
```
Load DELIVERED
    │
    ├─► Queue KPI recalculation job
    │   └─► FreightKpiDaily updated
    │
    └─► OR: Immediate calculation (if lightweight)
```

**Status:** 🔴 **BROKEN** - No automatic KPI update

---

### 5.2 Load → Briefing Chain

**Current Flow:**
```
Load DELIVERED
    │
    └─► [No immediate action]
            │
            └─► Briefing reads on-demand when user requests
```

**Expected Flow:**
```
Load DELIVERED
    │
    ├─► If critical (lost load, high value, etc.)
    │   └─► Queue briefing update
    │       └─► Briefing section updated
    │
    └─► OR: Briefing reads on-demand (acceptable for non-critical)
```

**Status:** 🔴 **BROKEN** - No proactive briefing updates

---

### 5.3 Hotel Review → Gamification Chain

**Current Flow:**
```
Hotel Review Response
    │
    └─► [No gamification trigger]
```

**Expected Flow:**
```
Hotel Review Response
    │
    └─► awardPointsForEvent('HOTEL_REVIEW_RESPONDED', 5-10 pts)
        └─► GamificationEvent created
            └─► GamificationPointsBalance incremented
```

**Status:** 🔴 **BROKEN** - Missing gamification trigger

---

## 6. Duplicate Sources of Truth

### 6.1 Incentive Calculation

**Issue:** Two different incentive calculation engines exist:

1. **Legacy Engine**: `lib/incentives.ts` + `lib/incentives/calculateIncentives.ts`
   - Uses `EmployeeKpiDaily` as source
   - Upsert-based (updates existing records)
   - Still available via `/api/incentives/run`

2. **New Engine**: `lib/incentives/engine.ts` + `lib/jobs/incentiveDailyJob.ts`
   - Reads directly from source tables (Load, BpoCallLog, HotelReview, HotelKpiDaily)
   - Idempotent (DELETE then CREATE)
   - Used by scheduled job (7:00 AM)

**Impact:** ⚠️ **CONFLICTING** - Two different calculation methods can produce different results.

**Recommendation:** Deprecate legacy engine, use only new engine.

---

### 6.2 KPI Calculations

**Issue:** KPI calculations happen in multiple places:

1. **On-Demand**: When user views dashboard/API endpoint
2. **Manual Upload**: Hotel KPI upload, BPO KPI upsert
3. **Scheduled**: None (should have scheduled aggregation)

**Impact:** 🟡 **INCONSISTENT** - KPIs may be stale or calculated differently.

**Recommendation:** Centralize KPI calculation, add scheduled aggregation jobs.

---

### 6.3 Customer Churn Status

**Issue:** Churn calculation happens in:

1. **Scheduled Job**: `lib/jobs/churnRecalcJob.ts` (2:00 AM)
2. **On-Demand**: `lib/shipperChurn.ts` (when user views shipper health)

**Impact:** ✅ **OK** - Both use same calculation logic, but scheduled job is primary source.

---

## 7. Cross-Vertical Dependencies

### 7.1 Incentives Depend On

| Vertical | Data Source | Update Frequency |
|----------|-------------|------------------|
| **Freight** | `Load` (DELIVERED, billingDate) | Real-time (read on 7 AM job) |
| **BPO** | `BpoCallLog` (callStartedAt) | Real-time (read on 7 AM job) |
| **Hospitality** | `HotelReview` (respondedById), `HotelKpiDaily` | Real-time (read on 7 AM job) |

**Status:** ✅ **Working** - Incentive engine reads from all verticals correctly.

---

### 7.2 Briefing Depends On

| Vertical | Data Source | Update Frequency |
|----------|-------------|------------------|
| **Freight** | `Load` (yesterday, last week) | On-demand (when briefing requested) |
| **Hospitality** | `HotelKpiDaily` (last 7 days) | On-demand (when briefing requested) |
| **BPO** | `BpoCallLog` (yesterday) | On-demand (when briefing requested) |

**Status:** 🔴 **Missing** - Briefing should be event-driven, not only on-demand.

---

### 7.3 Gamification Depends On

| Vertical | Data Source | Update Frequency |
|----------|-------------|------------------|
| **Freight** | Load status, Outreach, Quotes | ✅ Real-time (immediate) |
| **Tasks** | Task status | ✅ Real-time (immediate) |
| **EOD** | EOD submission | ✅ Real-time (immediate) |
| **Hospitality** | Hotel reviews | 🔴 **MISSING** |
| **BPO** | BPO calls | 🔴 **MISSING** |

**Status:** 🟡 **Partial** - Only freight/tasks/EOD trigger gamification.

---

## 8. Summary: Critical Issues

### 🔴 High Priority

1. **Missing Gamification Triggers**: Hotel/BPO events don't award points
2. **No Real-Time KPI Updates**: KPIs calculated on-demand only
3. **No Event-Driven Briefing**: Briefing is reactive, not proactive
4. **Duplicate Incentive Engines**: Two different calculation methods exist

### 🟡 Medium Priority

1. **Missing Task Generation**: Only freight has automated task generation
2. **No Real-Time Briefing Updates**: Critical events don't trigger briefing updates
3. **Inconsistent KPI Calculation**: Multiple calculation paths

### ✅ Working Well

1. **Gamification for Freight**: All freight events trigger gamification correctly
2. **Scheduled Jobs**: All scheduled jobs working correctly
3. **Incentive Engine**: New engine reads from all verticals correctly
4. **Event Logging**: All events logged correctly

---

## 9. Recommendations

### Immediate Actions

1. **Add Missing Gamification Triggers**:
   - Hotel review response → 5-10 points
   - BPO call completion → 1-5 points
   - Hotel dispute resolution → 10-20 points

2. **Deprecate Legacy Incentive Engine**:
   - Remove `/api/incentives/run` (legacy)
   - Use only new engine via scheduled job

3. **Add Real-Time KPI Updates**:
   - Queue KPI recalculation when load delivered
   - Or: Lightweight immediate calculation

### Future Enhancements

1. **Event-Driven Briefing**:
   - Queue briefing updates for critical events
   - Real-time briefing section updates

2. **Cross-Vertical Task Generation**:
   - Hotel review response tasks
   - BPO campaign review tasks
   - SaaS churn prevention tasks

3. **Unified KPI Calculation**:
   - Centralized KPI calculation service
   - Scheduled aggregation jobs
   - Real-time updates for critical KPIs

---

**End of System Event Map**


