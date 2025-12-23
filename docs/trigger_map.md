# Trigger Map - Incentive & Gamification Code Paths

**Generated**: December 15, 2025  
**Scope**: All incentive calculations and gamification point awards with exact code paths

---

## Overview

This document maps every trigger that awards incentives or gamification points, showing the complete code path from trigger event to database write.

---

## 1. INCENTIVE TRIGGERS

### 1.1 Load Completion → Freight Incentives

**Trigger Event**: Load marked as DELIVERED with billingDate set

**Code Path**:
```
[Database] Load record:
  - loadStatus: 'DELIVERED'
  - billingDate: Date (when billing completed)
       │
       ▼
[Scheduler/Manual] /api/incentives/run or /api/incentives/commit
       │
       ▼
lib/incentives/engine.ts
  └── computeIncentivesForDayWithRules(opts)
      │
      ├── line 66-97: loadFreightMetrics(ventureId, start, end)
      │   └── prisma.load.findMany({
      │         where: {
      │           ventureId,
      │           loadStatus: "DELIVERED",
      │           billingDate: { gte: start, lte: end }
      │         }
      │       })
      │
      │   For each load:
      │   ├── loads_completed += 1
      │   ├── loads_revenue += billAmount
      │   ├── loads_miles += miles
      │   └── loads_margin += marginAmount
      │
      ├── line 176-206: computeAmountForRule(rule, metricValue, allMetrics)
      │   └── Calculation types:
      │       ├── PERCENT_OF_METRIC: metricValue * rate
      │       ├── FLAT_PER_UNIT: metricValue * rate
      │       └── BONUS_ON_TARGET: bonusAmount if threshold met
      │
      └── Returns: EngineIncentiveDaily[]
             │
             ▼
lib/incentives/engine.ts
  └── saveIncentivesForDay(planId, date) [line 349-417]
      │
      └── For each computed incentive:
          ├── prisma.incentiveDaily.findFirst (check existing)
          │
          ├── If new: prisma.incentiveDaily.create({
          │     userId, ventureId, date, amount, breakdown: {rules: [...]}
          │   })
          │
          └── If exists: prisma.incentiveDaily.update({
                amount: existing + new,
                breakdown: {..., rules: [...updated]}
              })
```

**Database Tables Affected**:
- Read: `Load`
- Write: `IncentiveDaily`

---

### 1.2 BPO Call Activity → BPO Incentives

**Trigger Event**: BpoCallLog records with callStartedAt in target date range

**Code Path**:
```
[Database] BpoCallLog record:
  - callStartedAt: Date
  - dialCount: number
  - isConnected: boolean
  - dealWon: boolean
  - callEndedAt: Date
  - agent → userId
       │
       ▼
lib/incentives/engine.ts
  └── computeIncentivesForDayWithRules(opts)
      │
      ├── line 99-145: loadBpoMetrics(ventureId, start, end)
      │   └── prisma.bpoCallLog.findMany({
      │         where: {
      │           ventureId,
      │           callStartedAt: { gte: start, lte: end }
      │         }
      │       })
      │
      │   For each callLog:
      │   ├── bpo_dials += dialCount
      │   ├── bpo_connects += 1 (if isConnected)
      │   ├── bpo_deals += 1 (if dealWon)
      │   └── bpo_talk_seconds += (callEndedAt - callStartedAt)
      │
      └── Same incentive calculation & save flow as freight
```

**Database Tables Affected**:
- Read: `BpoCallLog`, `BpoAgent`
- Write: `IncentiveDaily`

---

### 1.3 Hotel Review Response → Hotel Incentives

**Trigger Event**: HotelReview record with respondedById set within date range

**Code Path**:
```
[Database] HotelReview record:
  - respondedById: number (user who responded)
  - reviewDate: Date
  - hotel → ventureId
       │
       ▼
lib/incentives/engine.ts
  └── computeIncentivesForDayWithRules(opts)
      │
      ├── line 147-174: loadHotelMetrics(ventureId, start, end)
      │   └── prisma.hotelReview.findMany({
      │         where: {
      │           respondedById: { not: null },
      │           reviewDate: { gte: start, lte: end },
      │           hotel: { ventureId }
      │         }
      │       })
      │
      │   For each review:
      │   └── hotel_reviews_responded += 1
      │
      ├── line 271-286: Hotel ADR/RevPAR (venture-level)
      │   └── prisma.hotelKpiDaily.findMany (averages)
      │
      └── Same incentive calculation & save flow
```

**Metrics Calculated**:
- `hotel_reviews_responded` - count per user
- `hotel_adr` - venture-level average (from HotelKpiDaily)
- `hotel_revpar` - venture-level average (from HotelKpiDaily)

**Database Tables Affected**:
- Read: `HotelReview`, `HotelProperty`, `HotelKpiDaily`
- Write: `IncentiveDaily`

---

### 1.4 Incentive Rule Types (calcType)

**Location**: `lib/incentives/engine.ts`, lines 176-206

| calcType | Formula | Example |
|----------|---------|---------|
| `PERCENT_OF_METRIC` | metricValue × rate | 2% of loads_revenue |
| `FLAT_PER_UNIT` | metricValue × rate | $5 per load completed |
| `CURRENCY_PER_DOLLAR` | metricValue × rate | $0.01 per dollar margin |
| `BONUS_ON_TARGET` | bonusAmount if actual ≥ threshold | $100 bonus if 50+ loads |
| `TIERED_SLAB` | (Not implemented in v1) | - |
| `LOAD_LEVEL_BONUS` | (Not implemented in v1) | - |

---

### 1.5 Incentive Plan & Rule CRUD Endpoints

**Location**: `pages/api/incentives/`

| Endpoint | Method | Purpose | DB Table |
|----------|--------|---------|----------|
| `/api/incentives/plan` | GET/POST | List/create plans | IncentivePlan |
| `/api/incentives/rules` | GET/POST/PUT | CRUD for rules | IncentiveRule |
| `/api/incentives/scenarios` | GET/POST | List/create scenarios | IncentiveScenario |
| `/api/incentives/scenarios/[id]` | GET/PUT/DELETE | Manage scenario | IncentiveScenario |
| `/api/incentives/scenarios/compare` | POST | Compare scenarios | (simulation) |
| `/api/incentives/run` | POST | Run calculations | (memory only) |
| `/api/incentives/commit` | POST | Save to DB | IncentiveDaily |
| `/api/incentives/simulate` | POST | Preview calculation | (memory only) |
| `/api/incentives/venture-summary` | GET | Daily totals by venture | IncentiveDaily |
| `/api/incentives/user-daily` | GET | User daily breakdown | IncentiveDaily |
| `/api/incentives/my-daily` | GET | Current user's incentives | IncentiveDaily |

---

### 1.6 Incentive Commit Flow with Audit

**Code Path**:
```
POST /api/incentives/commit
  │
  ├── pages/api/incentives/commit.ts
  │   └── Validates: planId, date, user permissions
  │
  ├── lib/incentives/engine.ts → saveIncentivesForDay()
  │
  └── lib/audit.ts → logAuditEvent({
        domain: 'incentives',
        action: 'commit',
        userId,
        metadata: { planId, date, ... }
      })
      └── prisma.auditLog.create(...)
```

---

## 2. GAMIFICATION TRIGGERS

### 2.1 Automatic Gamification Point Awards

**Updated December 15, 2025**: Gamification now has automatic triggers via `lib/gamification/awardPoints.ts`.

**Core Helper**:
```
lib/gamification/awardPoints.ts
├── awardPoints(input: AwardPointsInput): Promise<AwardPointsResult>
│   ├── Idempotency protection via metadata.idempotencyKey
│   ├── Creates GamificationEvent record
│   └── Upserts GamificationPointsBalance (increments points)
│
├── awardPointsForEvent(userId, ventureId, eventType, options?)
│   ├── Reads point values from GamificationConfig or uses defaults
│   └── Calls awardPoints with computed points
│
└── Default Points:
    ├── EOD_REPORT_SUBMITTED: 10
    ├── LOAD_COMPLETED: 25
    ├── CARRIER_OUTREACH_SENT: 5
    ├── OUTREACH_AWARDED: 15
    ├── TASK_COMPLETED: 10
    └── QUOTE_CONVERTED: 50
```

**Automatic Triggers (Implemented)**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Event                    │ Points │ Trigger Location               │ Key    │
├─────────────────────────────────────────────────────────────────────────────┤
│ EOD_REPORT_SUBMITTED     │ 10     │ /api/eod-reports (POST new)    │ eod-{id}│
│ LOAD_COMPLETED           │ 25     │ /api/freight/loads/update      │ load-delivered-{id}│
│ CARRIER_OUTREACH_SENT    │ 5      │ /api/freight/outreach/send     │ outreach-sent-{id}│
│ OUTREACH_AWARDED         │ 15     │ /api/freight/outreach/award    │ outreach-awarded-{loadId}│
│ TASK_COMPLETED           │ 10     │ /api/tasks/[id] (PATCH→DONE)   │ task-completed-{id}│
│ QUOTE_CONVERTED          │ 50     │ /api/freight/quotes/[id]/convert-to-load│ quote-converted-{id}│
└─────────────────────────────────────────────────────────────────────────────┘
```

**Code Paths**:

1. **EOD Report Submitted** (pages/api/eod-reports/index.ts):
```
POST /api/eod-reports
  │
  └── After prisma.eodReport.create (new reports only)
      └── awardPointsForEvent(userId, ventureId, 'EOD_REPORT_SUBMITTED', {
            officeId, metadata: { eodReportId }, idempotencyKey: `eod-${id}`
          })
```

2. **Load Delivered** (pages/api/freight/loads/update.ts):
```
POST /api/freight/loads/update
  │
  └── When loadStatus changes to 'DELIVERED' (from non-DELIVERED)
      └── awardPointsForEvent(userId, ventureId, 'LOAD_COMPLETED', {
            officeId, metadata: { loadId }, idempotencyKey: `load-delivered-${id}`
          })
```

3. **Carrier Outreach Sent** (pages/api/freight/outreach/send.ts):
```
POST /api/freight/outreach/send
  │
  └── After successful send (sentCount > 0, not dry run)
      └── awardPointsForEvent(userId, ventureId, 'CARRIER_OUTREACH_SENT', {
            metadata: { messageId, channel, sentCount }, idempotencyKey: `outreach-sent-${id}`
          })
```

4. **Outreach Awarded** (pages/api/freight/outreach/award.ts):
```
POST /api/freight/outreach/award
  │
  └── After successful award (load assigned to carrier)
      └── awardPointsForEvent(userId, ventureId, 'OUTREACH_AWARDED', {
            metadata: { loadId, carrierId }, idempotencyKey: `outreach-awarded-${loadId}`
          })
```

5. **Task Completed** (pages/api/tasks/[id].ts):
```
PATCH /api/tasks/[id]
  │
  └── When status changes to 'DONE' (from non-DONE)
      └── awardPointsForEvent(assigneeId, ventureId, 'TASK_COMPLETED', {
            officeId, metadata: { taskId }, idempotencyKey: `task-completed-${id}`
          })
```

6. **Quote Converted** (pages/api/freight/quotes/[id]/convert-to-load.ts):
```
POST /api/freight/quotes/[id]/convert-to-load
  │
  └── After successful conversion to load
      └── awardPointsForEvent(userId, ventureId, 'QUOTE_CONVERTED', {
            metadata: { quoteId, loadId }, idempotencyKey: `quote-converted-${quoteId}`
          })
```

**Idempotency Protection**:
All triggers use unique idempotency keys stored in metadata to prevent duplicate awards:
```typescript
// Check for existing event with same idempotency key
const existing = await prisma.gamificationEvent.findFirst({
  where: {
    userId, ventureId, type: eventType,
    metadata: { path: ['idempotencyKey'], equals: idempotencyKey }
  }
});
if (existing) return { success: true, skipped: true };
```

**Venture-Specific Configuration**:
Point values can be customized per venture via GamificationConfig:
```sql
GamificationConfig { ventureId, config: { "EOD_REPORT_SUBMITTED": 20, ... } }
```

---

### 2.2 Manual Endpoint (Still Available)

The manual endpoint remains available for admin use:
```
POST /api/gamification/points
  │
  ├── pages/api/gamification/points.ts [line 43-74]
  │   ├── Required: userId, ventureId, eventType, points
  │   │
  │   ├── prisma.gamificationEvent.create({
  │   │     userId, ventureId, officeId, type, points, metadata
  │   │   })
  │   │
  │   └── prisma.gamificationPointsBalance.upsert({
  │         where: { userId },
  │         update: { points: { increment: points } },
  │         create: { userId, points }
  │       })
  │
  └── Response: { event }
```

---

### 2.3 Gamification Data Model

```
GamificationEvent
├── id: Int
├── userId: Int → User
├── ventureId: Int → Venture
├── officeId: Int? → Office
├── type: String (event type identifier)
├── points: Int
├── metadata: Json?
└── createdAt: DateTime

GamificationPointsBalance
├── userId: Int (primary key) → User
├── points: Int (running total)
└── updatedAt: DateTime

GamificationConfig
├── id: Int
├── ventureId: Int → Venture
├── config: Json (venture-specific settings)
└── updatedAt: DateTime
```

---

### 2.4 Leaderboard Calculation

**Code Path**:
```
GET /api/gamification/leaderboard
  │
  ├── pages/api/gamification/leaderboard.ts
  │   └── prisma.gamificationEvent.groupBy({
  │         by: ['userId'],
  │         _sum: { points: true },
  │         orderBy: { _sum: { points: 'desc' } },
  │         take: limit
  │       })
  │
  └── Returns ranked list with user info
```

---

## 3. SCHEDULED JOB TRIGGERS

### 3.1 Churn Recalculation Job

**Schedule**: Daily at 2:00 AM EST  
**Location**: `scripts/scheduled-jobs-runner.ts`, lines 97-114

**Verified Code** (from lines 97-114):
```typescript
const schedule: ScheduledJob[] = [
  {
    name: "Churn Recalculation",
    hour: 2,
    minute: 0,
    run: async () => {
      console.log(`[${new Date().toISOString()}] Running Churn Recalculation job...`);
      try {
        const result = await runChurnRecalcJob({ dryRun: false });
        // logs shipperUpdated, customerUpdated, jobRunLogId
      } catch (err: any) {
        console.error(`[${new Date().toISOString()}] Churn Recalc failed:`, err.message);
      }
    },
  },
```

**Code Path**:
```
schedule[0].run()
  │
  └── lib/jobs/churnRecalcJob.ts → runChurnRecalcJob()
      │
      ├── For each Shipper:
      │   └── Calculate churnScore based on:
      │       - Days since last load
      │       - Load frequency trend
      │       - Revenue trend
      │   └── prisma.shipper.update({ churnScore, churnRisk })
      │
      ├── For each FreightCustomer:
      │   └── Similar churn calculation
      │   └── prisma.freightCustomer.update({ churnScore })
      │
      └── prisma.jobRunLog.create({ jobName: 'CHURN_RECALC', ... })
```

**Database Tables Affected**:
- Read: `Shipper`, `FreightCustomer`, `Load`
- Write: `Shipper`, `FreightCustomer`, `JobRunLog`

---

### 3.2 Quote Timeout Job

**Schedule**: Daily at 6:00 AM EST  
**Location**: `scripts/scheduled-jobs-runner.ts`, lines 116-132

**Verified Code** (from lines 116-132):
```typescript
  {
    name: "Quote Timeout",
    hour: 6,
    minute: 0,
    run: async () => {
      console.log(`[${new Date().toISOString()}] Running Quote Timeout job...`);
      try {
        const result = await runQuoteTimeoutJob({ dryRun: false, limit: 5000 });
        // logs scanned, updated, jobRunLogId
      } catch (err: any) {
        console.error(`[${new Date().toISOString()}] Quote Timeout failed:`, err.message);
      }
    },
  },
```

**Code Path**:
```
schedule[1].run()
  │
  └── lib/jobs/quoteTimeoutJob.ts → runQuoteTimeoutJob()
      │
      ├── Find quotes where:
      │   - status = 'PENDING' or 'SENT'
      │   - expiresAt < now
      │
      ├── prisma.freightQuote.updateMany({
      │     where: { ... },
      │     data: { status: 'EXPIRED' }
      │   })
      │
      └── prisma.jobRunLog.create({ jobName: 'QUOTE_TIMEOUT', ... })
```

**Database Tables Affected**:
- Read/Write: `FreightQuote`
- Write: `JobRunLog`

---

### 3.3 Task Generation Job

**Schedule**: Daily at 6:30 AM EST  
**Location**: `scripts/scheduled-jobs-runner.ts`, lines 134-200

**Verified Code** (from lines 134-200):
```typescript
  {
    name: "Task Generation",
    hour: 6,
    minute: 30,
    run: async () => {
      const startedAt = new Date();
      console.log(`[${new Date().toISOString()}] Running Task Generation jobs...`);
      
      const ventures = await prisma.venture.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      for (const venture of ventures) {
        // Line 155: runDormantCustomerRule({ ventureId, daysNoLoad: 21, daysNoTouch: 7 })
        // Line 162: runQuoteExpiringRule({ ventureId, hoursUntilExpiry: 24 })
        // Line 168: runQuoteNoResponseRule({ ventureId })
      }
      
      // Line 189-198: prisma.jobRunLog.create({ jobName: TASK_GENERATION, ... })
    },
  },
```

**Code Path**:
```
schedule[2].run()
  │
  └── For each active Venture:
      │
      ├── lib/freight/taskRules.ts → runDormantCustomerRule()
      │   └── Find customers with:
      │       - No load in last 21 days
      │       - No touch in last 7 days
      │   └── prisma.task.create({ type: 'DORMANT_CUSTOMER', ... })
      │
      ├── lib/freight/taskRules.ts → runQuoteExpiringRule()
      │   └── Find quotes expiring in next 24 hours
      │   └── prisma.task.create({ type: 'QUOTE_EXPIRING', ... })
      │
      └── lib/freight/taskRules.ts → runQuoteNoResponseRule()
          └── Find quotes sent without response
          └── prisma.task.create({ type: 'QUOTE_NO_RESPONSE', ... })

prisma.jobRunLog.create({ jobName: 'TASK_GENERATION', ... })
```

**Database Tables Affected**:
- Read: `Venture`, `FreightCustomer`, `FreightQuote`, `CustomerTouch`, `Load`
- Write: `Task`, `JobRunLog`

---

## 4. AUDIT EVENT TRIGGERS

### 4.1 Audit Event Locations

**lib/audit.ts** → `logAuditEvent()` is called from:

| Domain | Action | File Location |
|--------|--------|---------------|
| freight | outreach.send | /api/freight/outreach/send.ts |
| freight | outreach.award | /api/freight/outreach/award.ts |
| freight | load.update | /api/freight/loads/update.ts |
| hotels | dispute.update | /api/hotels/disputes/[id].ts |
| hotels | nightaudit.upload | /api/hotels/night-audit/upload.ts |
| hotels | str.upload | /api/hotels/str/upload.ts |
| it | asset.create | /api/it-assets/create.ts |
| it | asset.update | /api/it-assets/[id].ts |
| it | asset.assign | /api/it-assets/assign.ts |
| it | asset.return | /api/it-assets/return.ts |
| it | incident.create | /api/it-incidents/create.ts |
| it | incident.update | /api/it-incidents/[id].ts |
| carriers | dispatcher.add | /api/carriers/dispatchers/add.ts |
| carriers | dispatcher.remove | /api/carriers/dispatchers/remove.ts |
| incentives | rule.create/update | /api/incentives/rules.ts |
| incentives | scenario.create/update/delete | /api/incentives/scenarios/*.ts |
| incentives | commit | /api/incentives/commit.ts |
| incentives | run | /api/incentives/run.ts |
| bpo | kpi.upsert | /api/bpo/kpi/upsert.ts |
| admin | template.create/update/delete | /api/admin/ai-templates/*.ts |
| admin | cleanup | /api/admin/cleanup-test-data.ts |
| auth | impersonate.start | /api/impersonation/start.ts |
| auth | impersonate.stop | /api/impersonation/stop.ts |

---

## 5. TRIGGER DEPENDENCY DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EVENT → CONSEQUENCE FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

FREIGHT:
Load created → status changes → DELIVERED
                                    │
                                    ├──► FreightKpiDaily recalculated
                                    ├──► Incentive engine reads on next run
                                    └──► P&L calculations include load

Quote created → PENDING
      │
      ├─[24hr before expiry]─► Task created (QUOTE_EXPIRING)
      ├─[no response 48hr]─► Task created (QUOTE_NO_RESPONSE)
      └─[past expiry]─► Status = EXPIRED (by quote timeout job)

Customer touch created
      │
      └─[dormant check]─► If no touch + no load in thresholds → Task created

HOTELS:
HotelReview.respondedById set
      │
      └──► hotel_reviews_responded metric incremented

HotelKpiDaily record created
      │
      └──► ADR/RevPAR available for incentive calculations

SCHEDULED:
2:00 AM ──► Churn scores recalculated for all shippers/customers
6:00 AM ──► Expired quotes marked EXPIRED
6:30 AM ──► Tasks auto-generated for dormant, expiring, no-response
7:00 AM ──► Incentive Daily Commit (idempotent, replaces day's amounts)

SCHEDULED (Incentives - 7:00 AM EST):
Incentive Daily Commit job runs
      │
      ├──► For each active venture with active IncentivePlan
      ├──► Reads: Load, BpoCallLog, HotelReview, HotelKpiDaily
      ├──► Calculates: Per IncentiveRule
      ├──► DELETES existing IncentiveDaily for (venture, date)
      └──► CREATES fresh IncentiveDaily records (idempotent)

MANUAL (Incentives - Still Available):
Admin triggers /api/incentives/run or /api/jobs/incentive-daily
      │
      ├──► Reads: Load, BpoCallLog, HotelReview, HotelKpiDaily
      ├──► Calculates: Per IncentiveRule
      └──► On commit ──► IncentiveDaily records created/replaced

AUTOMATIC (Gamification):
EOD submitted ──► awardPointsForEvent('EOD_REPORT_SUBMITTED')
Load DELIVERED ──► awardPointsForEvent('LOAD_COMPLETED')
Outreach sent ──► awardPointsForEvent('CARRIER_OUTREACH_SENT')
Outreach awarded ──► awardPointsForEvent('OUTREACH_AWARDED')
Task DONE ──► awardPointsForEvent('TASK_COMPLETED')
Quote converted ──► awardPointsForEvent('QUOTE_CONVERTED')
      │
      ├──► GamificationEvent created (with idempotency)
      └──► GamificationPointsBalance incremented
```

---

## 6. FUTURE ENHANCEMENT RECOMMENDATIONS

### Priority 1: Additional Gamification Triggers (Optional)
Consider adding these optional triggers:

| Event | Points | Code Location |
|-------|--------|---------------|
| Review Response | 5 | /api/hospitality/reviews |
| First Daily Login | 1 | Session middleware |
| Perfect Week (5 EODs) | 25 | Scheduled job |

### ~~Priority 2: Incentive Auto-Commit~~ ✅ IMPLEMENTED (December 15, 2025)

**Status**: This feature has been implemented.

**Implementation Details**:
- **Scheduled Job**: `Incentive Daily Commit` runs at 7:00 AM EST daily
- **Location**: `scripts/scheduled-jobs-runner.ts`
- **Job File**: `lib/jobs/incentiveDailyJob.ts`
- **API Endpoint**: `POST /api/jobs/incentive-daily` (admin only, with dry-run option)
- **Admin UI**: Available in `/admin/jobs` page

**Key Features**:
- **Idempotent**: Uses `saveIncentivesForDayIdempotent()` which DELETES then CREATES
- Running twice for the same date will NOT double pay
- Processes all active ventures with active IncentivePlans
- Logs results to `JobRunLog` table with `INCENTIVE_DAILY` job name

**Code Path**:
```
scripts/scheduled-jobs-runner.ts (7:00 AM EST)
  └── lib/jobs/incentiveDailyJob.ts → runIncentiveDailyJob()
      │
      ├── For each active Venture:
      │   └── For each active IncentivePlan:
      │       └── lib/incentives/engine.ts → saveIncentivesForDayIdempotent()
      │           ├── DELETE: IncentiveDaily where (ventureId, date)
      │           ├── CALCULATE: Using calculateIncentivesForDay()
      │           └── CREATE: Fresh IncentiveDaily records
      │
      └── DB: JobRunLog.create({ jobName: 'INCENTIVE_DAILY', ... })
```
