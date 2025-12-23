# Enterprise-Grade System Upgrade - Complete Checklist

**Generated:** December 2025  
**Purpose:** Comprehensive, hands-on checklist to fix and upgrade entire platform to enterprise-grade  
**Scope:** End-to-end system fixes, missing features, logic corrections, user access, gamification, incentives, load logic across all ventures

---

## 📋 Table of Contents

1. [P0 - Financial Integrity (BLOCKER)](#p0---financial-integrity-blocker)
2. [User Access & Navigation Per Venture](#user-access--navigation-per-venture)
3. [Gamification - Complete Wiring](#gamification---complete-wiring)
4. [Incentive System (Incendio) - Complete Fixes](#incentive-system-incendio---complete-fixes)
5. [Load Logic Across All Ventures](#load-logic-across-all-ventures)
6. [Event Triggers - Missing Implementations](#event-triggers---missing-implementations)
7. [Operational Resilience](#operational-resilience)
8. [Scalability Improvements](#scalability-improvements)
9. [Data Integrity & Validation](#data-integrity--validation)
10. [Testing & Verification](#testing--verification)
11. [Monitoring & Alerting](#monitoring--alerting)
12. [Documentation & Handoff](#documentation--handoff)

---

## P0 - Financial Integrity (BLOCKER)

**Priority:** 🔴 **CRITICAL** - Must complete before any production deployment  
**Timeline:** Week 1 (Days 1-7)

### 1.1 Delete Legacy Incentive Engine

**Files to Modify:**
- `pages/api/incentives/run.ts` - **DELETE ENTIRE FILE**
- `lib/incentives.ts` - **DELETE ENTIRE FILE**
- `lib/incentives/calculateIncentives.ts` - **DELETE ENTIRE FILE** (if exists)

**Steps:**
1. [ ] Search codebase for all references to `calculateIncentivesForDay`:
   ```bash
   grep -r "calculateIncentivesForDay" --include="*.ts" --include="*.tsx"
   ```
2. [ ] Remove all imports of `lib/incentives.ts`
3. [ ] Remove all calls to `/api/incentives/run`
4. [ ] Delete `pages/api/incentives/run.ts`
5. [ ] Delete `lib/incentives.ts`
6. [ ] Update any documentation that references legacy engine
7. [ ] **Verification:** Run `grep -r "incentives/run\|calculateIncentivesForDay"` - should return zero results

**Test:**
- [ ] Verify no TypeScript errors after deletion
- [ ] Verify no runtime errors when accessing incentive pages
- [ ] Verify scheduled job still works (uses new engine)

---

### 1.2 Fix Manual Incentive Commit

**Files to Modify:**
- `pages/api/incentives/commit.ts`
- `lib/incentives/engine.ts`

**Steps:**
1. [ ] Open `pages/api/incentives/commit.ts`
2. [ ] Find where `saveIncentivesForDay()` is called
3. [ ] Replace with `saveIncentivesForDayIdempotent()`:
   ```typescript
   // BEFORE:
   await saveIncentivesForDay(ventureId, date);
   
   // AFTER:
   await saveIncentivesForDayIdempotent(ventureId, date);
   ```
4. [ ] Remove or deprecate increment-based `saveIncentivesForDay()` function in `lib/incentives/engine.ts`
5. [ ] Add comment: `// DEPRECATED: Use saveIncentivesForDayIdempotent() instead`
6. [ ] **Verification:** Manual commit endpoint uses idempotent version

**Test:**
- [ ] Call `/api/incentives/commit` twice with same parameters
- [ ] Verify no double-counting (check IncentiveDaily records)
- [ ] Verify same result both times

---

### 1.3 Add Unique Constraint to IncentivePayout

**Files to Modify:**
- `prisma/schema.prisma`
- Create migration file

**Steps:**
1. [ ] Open `prisma/schema.prisma`
2. [ ] Find `model IncentivePayout`
3. [ ] Add unique constraint:
   ```prisma
   model IncentivePayout {
     // ... existing fields ...
     
     @@unique([userId, ventureId, periodStart, periodEnd])
   }
   ```
4. [ ] Create migration:
   ```bash
   npx prisma migrate dev --name add_incentive_payout_unique_constraint
   ```
5. [ ] Add validation in `pages/api/incentives/payouts/*.ts`:
   ```typescript
   // Before creating payout, check if exists:
   const existing = await prisma.incentivePayout.findUnique({
     where: {
       userId_ventureId_periodStart_periodEnd: {
         userId,
         ventureId,
         periodStart,
         periodEnd,
       },
     },
   });
   
   if (existing) {
     return res.status(400).json({ error: "Payout already exists for this period" });
   }
   ```
6. [ ] **Verification:** Cannot create duplicate payouts

**Test:**
- [ ] Try to create payout for same user/venture/period twice
- [ ] Verify second attempt fails with error
- [ ] Verify database constraint prevents duplicates

---

### 1.4 Add Idempotency Tests

**Files to Create:**
- `tests/flows/incentive-engine.test.ts`

**Steps:**
1. [ ] Create test file:
   ```typescript
   describe('Incentive Engine Idempotency', () => {
     test('manual commit is idempotent', async () => {
       // Test: Run commit twice, verify same result
     });
     
     test('payout creation prevents duplicates', async () => {
       // Test: Try to create duplicate payout, verify error
     });
     
     test('scheduled job is idempotent', async () => {
       // Test: Run job twice, verify same result
     });
   });
   ```
2. [ ] Run tests: `npm test tests/flows/incentive-engine.test.ts`
3. [ ] **Verification:** All tests pass

---

## User Access & Navigation Per Venture

**Priority:** 🟡 **HIGH** - Core user experience  
**Timeline:** Week 2 (Days 8-14)

### 2.1 Verify User-Venture Assignment

**Files to Check:**
- `prisma/schema.prisma` - `VentureUser` model
- `pages/api/user/venture-types.ts`
- `lib/scope.ts`

**Steps:**
1. [ ] Verify `VentureUser` model has proper relationships:
   ```prisma
   model VentureUser {
     userId    Int
     ventureId Int
     user      User    @relation(fields: [userId], references: [id])
     venture   Venture @relation(fields: [ventureId], references: [id])
     
     @@unique([userId, ventureId])
   }
   ```
2. [ ] Verify `getUserScope()` in `lib/scope.ts` correctly reads `VentureUser`:
   ```typescript
   // Should read from user.ventureIds (populated from VentureUser)
   ```
3. [ ] **Verification:** Users assigned to ventures can access those ventures

**Test:**
- [ ] Assign user to Venture A only
- [ ] Verify user sees only Venture A links
- [ ] Assign user to Venture B
- [ ] Verify user sees both Venture A and B links

---

### 2.2 Verify Navigation Links Per Venture

**Files to Check:**
- `lib/access-control/routes.ts` - `ROUTE_REGISTRY`
- `components/Layout.tsx` - Navigation rendering
- `pages/api/user/venture-types.ts` - Accessible sections

**Steps:**
1. [ ] Verify `pages/api/user/venture-types.ts` returns correct `accessibleSections`:
   ```typescript
   // Should return sections based on user's venture types:
   // LOGISTICS/TRANSPORT → "freight"
   // HOSPITALITY → "hotel"
   // BPO → "bpo"
   // SAAS → "saas"
   // HOLDINGS → "holdings"
   ```
2. [ ] Verify `components/Layout.tsx` filters nav items by `accessibleSections`:
   ```typescript
   // Should only show nav items for modules in accessibleSections
   ```
3. [ ] Verify `ROUTE_REGISTRY` in `lib/access-control/routes.ts` has correct `module` assignments
4. [ ] **Verification:** Users only see links for ventures they have access to

**Test:**
- [ ] User with LOGISTICS venture only → sees freight links, not hotel links
- [ ] User with HOSPITALITY venture only → sees hotel links, not freight links
- [ ] User with both → sees both sets of links

---

### 2.3 Add Venture-Specific Quick Links

**Files to Create/Modify:**
- `pages/api/user/quick-links.ts` - Add venture filtering
- `components/QuickLinks.tsx` - Display per-venture links

**Steps:**
1. [ ] Modify `pages/api/user/quick-links.ts` to filter by user's ventures:
   ```typescript
   const scope = getUserScope(user);
   const quickLinks = await prisma.quickLink.findMany({
     where: {
       OR: [
         { ventureId: null }, // Global links
         ...(scope.allVentures ? [] : { ventureId: { in: scope.ventureIds } }),
       ],
     },
   });
   ```
2. [ ] Update `components/QuickLinks.tsx` to group by venture
3. [ ] **Verification:** Quick links show per-venture

**Test:**
- [ ] Create quick link for Venture A
- [ ] User with Venture A access → sees link
- [ ] User without Venture A access → doesn't see link

---

### 2.4 Fix Venture Detail Page Access

**Files to Check:**
- `pages/ventures/[id]/index.tsx`
- `pages/api/ventures/[id]/*.ts`

**Steps:**
1. [ ] Verify venture detail page checks user access:
   ```typescript
   const scope = getUserScope(user);
   if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
     return res.status(403).json({ error: "Access denied" });
   }
   ```
2. [ ] Verify all venture detail API routes check access
3. [ ] **Verification:** Users can only access ventures they're assigned to

**Test:**
- [ ] User with Venture A access → can access `/ventures/1` (if 1 is Venture A)
- [ ] User without Venture A access → gets 403 on `/ventures/1`

---

## Gamification - Complete Wiring

**Priority:** 🟡 **HIGH** - Missing engagement features  
**Timeline:** Week 2-3 (Days 8-21)

### 3.1 Add Hotel Review Response → Gamification

**Files to Modify:**
- `pages/api/hospitality/reviews/[id].ts` (or wherever review response is handled)

**Steps:**
1. [ ] Find where hotel review response is saved (when `respondedById` is set)
2. [ ] Add gamification trigger:
   ```typescript
   import { awardPointsForEvent } from '@/lib/gamification/awardPoints';
   
   // After review response is saved:
   if (review.respondedById && !review.respondedAt) {
     // First time responding
     await awardPointsForEvent(
       review.respondedById,
       review.hotelProperty.ventureId,
       'HOTEL_REVIEW_RESPONDED',
       {
         officeId: review.hotelProperty.officeId,
         metadata: { reviewId: review.id, hotelId: review.hotelPropertyId },
         idempotencyKey: `hotel_review_${review.id}_response`,
       }
     ).catch(err => console.error('[gamification] Hotel review response award error:', err));
   }
   ```
3. [ ] Add default points in `lib/gamification/awardPoints.ts`:
   ```typescript
   const DEFAULT_POINTS: Record<string, number> = {
     // ... existing ...
     HOTEL_REVIEW_RESPONDED: 8, // 5-10 points, using 8 as default
   };
   ```
4. [ ] **Verification:** Responding to hotel review awards points

**Test:**
- [ ] Respond to hotel review
- [ ] Verify `GamificationEvent` is created with type `HOTEL_REVIEW_RESPONDED`
- [ ] Verify `GamificationPointsBalance` is incremented
- [ ] Verify idempotency (respond twice, only one event)

---

### 3.2 Add BPO Call Completion → Gamification

**Files to Modify:**
- `pages/api/bpo/call-logs.ts` (or wherever BPO call log is created)

**Steps:**
1. [ ] Find where BPO call log is created
2. [ ] Add gamification trigger:
   ```typescript
   import { awardPointsForEvent } from '@/lib/gamification/awardPoints';
   
   // After call log is created:
   await awardPointsForEvent(
     callLog.agentId,
     callLog.campaign.ventureId,
     'BPO_CALL_COMPLETED',
     {
       officeId: callLog.campaign.officeId,
       metadata: { 
         callLogId: callLog.id, 
         campaignId: callLog.campaignId,
         duration: callLog.durationMinutes,
       },
       idempotencyKey: `bpo_call_${callLog.id}`,
     }
   ).catch(err => console.error('[gamification] BPO call award error:', err));
   ```
3. [ ] Add default points:
   ```typescript
   BPO_CALL_COMPLETED: 3, // 1-5 points, using 3 as default
   ```
4. [ ] **Verification:** BPO call completion awards points

**Test:**
- [ ] Create BPO call log
- [ ] Verify gamification event is created
- [ ] Verify points are awarded

---

### 3.3 Add Hotel Dispute Resolution → Gamification

**Files to Modify:**
- `pages/api/hotels/disputes/[id].ts` - When dispute status changes to WON/LOST

**Steps:**
1. [ ] Find where dispute status is updated to WON or LOST
2. [ ] Add gamification trigger:
   ```typescript
   import { awardPointsForEvent } from '@/lib/gamification/awardPoints';
   
   // When dispute is resolved (status = WON or LOST):
   if ((newStatus === 'WON' || newStatus === 'LOST') && oldStatus !== newStatus) {
     await awardPointsForEvent(
       dispute.resolvedById || dispute.createdById,
       dispute.property.ventureId,
       'HOTEL_DISPUTE_RESOLVED',
       {
         officeId: dispute.property.officeId,
         metadata: { 
           disputeId: dispute.id, 
           outcome: newStatus,
         },
         idempotencyKey: `hotel_dispute_${dispute.id}_resolve`,
       }
     ).catch(err => console.error('[gamification] Hotel dispute award error:', err));
   }
   ```
3. [ ] Add default points:
   ```typescript
   HOTEL_DISPUTE_RESOLVED: 15, // 10-20 points, using 15 as default
   ```
4. [ ] **Verification:** Resolving hotel dispute awards points

**Test:**
- [ ] Resolve hotel dispute (WON or LOST)
- [ ] Verify gamification event is created
- [ ] Verify points are awarded

---

### 3.4 Add Perfect Week (5 EODs) → Gamification

**Files to Modify:**
- `pages/api/eod-reports/index.ts` - After EOD submission

**Steps:**
1. [ ] After EOD is submitted, check if user has 5 EODs this week:
   ```typescript
   import { awardPointsForEvent } from '@/lib/gamification/awardPoints';
   
   // After EOD is created:
   const weekStart = new Date(eod.date);
   weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
   weekStart.setHours(0, 0, 0, 0);
   
   const weekEnd = new Date(weekStart);
   weekEnd.setDate(weekEnd.getDate() + 7);
   
   const eodCount = await prisma.eodReport.count({
     where: {
       userId: eod.userId,
       ventureId: eod.ventureId,
       date: { gte: weekStart, lt: weekEnd },
     },
   });
   
   if (eodCount === 5) {
     // Perfect week!
     await awardPointsForEvent(
       eod.userId,
       eod.ventureId,
       'PERFECT_WEEK_EOD',
       {
         officeId: eod.officeId,
         metadata: { weekStart: weekStart.toISOString() },
         idempotencyKey: `perfect_week_${eod.userId}_${weekStart.toISOString()}`,
       }
     ).catch(err => console.error('[gamification] Perfect week award error:', err));
   }
   ```
2. [ ] Add default points:
   ```typescript
   PERFECT_WEEK_EOD: 25,
   ```
3. [ ] **Verification:** 5 EODs in a week awards bonus points

**Test:**
- [ ] Submit 5 EODs in same week
- [ ] Verify bonus event is created on 5th EOD
- [ ] Verify points are awarded

---

### 3.5 Add First Daily Login → Gamification

**Files to Modify:**
- `pages/api/auth/verify-otp.ts` or middleware - After successful login

**Steps:**
1. [ ] After successful login, check if this is first login today:
   ```typescript
   import { awardPointsForEvent } from '@/lib/gamification/awardPoints';
   
   // After login:
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   
   const todayLogin = await prisma.gamificationEvent.findFirst({
     where: {
       userId: user.id,
       type: 'FIRST_DAILY_LOGIN',
       createdAt: { gte: today },
     },
   });
   
   if (!todayLogin) {
     // First login today - award points for each venture
     const userVentures = await prisma.ventureUser.findMany({
       where: { userId: user.id },
       include: { venture: true },
     });
     
     for (const vu of userVentures) {
       await awardPointsForEvent(
         user.id,
         vu.ventureId,
         'FIRST_DAILY_LOGIN',
         {
           metadata: { date: today.toISOString() },
           idempotencyKey: `first_login_${user.id}_${today.toISOString()}_${vu.ventureId}`,
         }
       ).catch(err => console.error('[gamification] First login award error:', err));
     }
   }
   ```
2. [ ] Add default points:
   ```typescript
   FIRST_DAILY_LOGIN: 1,
   ```
3. [ ] **Verification:** First login of day awards points

**Test:**
- [ ] Login first time today
- [ ] Verify event is created
- [ ] Login second time today → no event (idempotent)

---

### 3.6 Verify All Existing Gamification Triggers

**Files to Check:**
- `pages/api/freight/loads/[id].ts` - Load DELIVERED
- `pages/api/freight/outreach/award.ts` - Outreach awarded
- `pages/api/freight/outreach/send.ts` - Outreach sent
- `pages/api/tasks/[id].ts` - Task completed
- `pages/api/freight/quotes/[id]/convert-to-load.ts` - Quote converted
- `pages/api/eod-reports/index.ts` - EOD submitted

**Steps:**
1. [ ] Verify each trigger uses `awardPointsForEvent()`
2. [ ] Verify each trigger has `idempotencyKey`
3. [ ] Verify each trigger handles errors gracefully (`.catch()`)
4. [ ] **Verification:** All existing triggers work correctly

**Test:**
- [ ] Complete load → verify points
- [ ] Send outreach → verify points
- [ ] Award outreach → verify points
- [ ] Complete task → verify points
- [ ] Convert quote → verify points
- [ ] Submit EOD → verify points

---

## Incentive System (Incendio) - Complete Fixes

**Priority:** 🔴 **CRITICAL** - Financial system  
**Timeline:** Week 1-2 (Days 1-14)

### 4.1 Verify Incentive Engine Reads All Verticals

**Files to Check:**
- `lib/incentives/engine.ts` - `loadFreightMetrics()`, `loadBpoMetrics()`, `loadHotelMetrics()`

**Steps:**
1. [ ] Verify `loadFreightMetrics()` reads from `Load` table:
   ```typescript
   // Should read loads with status DELIVERED and billingDate in range
   ```
2. [ ] Verify `loadBpoMetrics()` reads from `BpoCallLog`:
   ```typescript
   // Should read call logs with callStartedAt in range
   ```
3. [ ] Verify `loadHotelMetrics()` reads from `HotelReview` and `HotelKpiDaily`:
   ```typescript
   // Should read reviews with respondedById and HotelKpiDaily records
   ```
4. [ ] **Verification:** Engine reads from all verticals correctly

**Test:**
- [ ] Create test data in each vertical
- [ ] Run incentive calculation
- [ ] Verify metrics are loaded from all verticals

---

### 4.2 Verify Incentive Rules Apply Correctly

**Files to Check:**
- `lib/incentives/engine.ts` - `computeAmountForRule()`
- `lib/incentives/calculateIncentives.ts` - Rule application logic

**Steps:**
1. [ ] Verify `computeAmountForRule()` handles all `calcType` values:
   - `PERCENT_OF_METRIC`
   - `FLAT_PER_UNIT`
   - `CURRENCY_PER_DOLLAR`
   - `BONUS_ON_TARGET`
   - `TIERED_SLAB`
   - `LOAD_LEVEL_BONUS`
2. [ ] Verify null handling:
   ```typescript
   if (metricValue === null || metricValue === undefined) {
     if (rule.calcType !== "BONUS_ON_TARGET") return 0;
   }
   ```
3. [ ] **Verification:** All rule types calculate correctly

**Test:**
- [ ] Test each `calcType` with sample data
- [ ] Verify calculations match expected results
- [ ] Test with null/zero values

---

### 4.3 Verify Incentive Payout Aggregation

**Files to Check:**
- `pages/api/incentives/payouts/*.ts` - Payout creation/aggregation

**Steps:**
1. [ ] Verify payout aggregation sums `IncentiveDaily` correctly:
   ```typescript
   const total = await prisma.incentiveDaily.aggregate({
     where: {
       userId,
       ventureId,
       date: { gte: periodStart, lte: periodEnd },
     },
     _sum: { amount: true },
   });
   ```
2. [ ] Verify currency handling (USD vs INR)
3. [ ] Verify unique constraint prevents duplicates (from 1.3)
4. [ ] **Verification:** Payouts aggregate correctly

**Test:**
- [ ] Create incentive daily records
- [ ] Create payout for period
- [ ] Verify total matches sum of daily records

---

### 4.4 Add Incentive UI Per Venture

**Files to Check:**
- `pages/incentives/[ventureId].tsx` - Incentive page per venture
- `pages/incentives/my.tsx` - My incentives page

**Steps:**
1. [ ] Verify `/incentives/[ventureId]` shows incentives for that venture only
2. [ ] Verify `/incentives/my` shows incentives for all user's ventures
3. [ ] Verify navigation shows incentive links per venture
4. [ ] **Verification:** Users can access incentives for their ventures

**Test:**
- [ ] User with Venture A → sees incentives for Venture A
- [ ] User with Ventures A & B → sees incentives for both
- [ ] User without venture access → gets 403

---

## Load Logic Across All Ventures

**Priority:** 🟡 **HIGH** - Core business logic  
**Timeline:** Week 2-3 (Days 8-21)

### 5.1 Verify Load Scoping Per Venture

**Files to Check:**
- `prisma/schema.prisma` - `Load` model
- `pages/api/freight/loads/*.ts` - All load API routes

**Steps:**
1. [ ] Verify `Load` model has `ventureId`:
   ```prisma
   model Load {
     ventureId Int
     venture   Venture @relation(fields: [ventureId], references: [id])
     // ...
   }
   ```
2. [ ] Verify all load API routes filter by `ventureId`:
   ```typescript
   const scope = getUserScope(user);
   const where = {
     ...(scope.allVentures ? {} : { ventureId: { in: scope.ventureIds } }),
     // ... other filters
   };
   ```
3. [ ] Verify load creation requires `ventureId`
4. [ ] **Verification:** Loads are properly scoped to ventures

**Test:**
- [ ] Create load for Venture A
- [ ] User with Venture A access → sees load
- [ ] User with only Venture B access → doesn't see load

---

### 5.2 Verify Load Status Updates Trigger Events

**Files to Check:**
- `pages/api/freight/loads/[id].ts` - Load status update
- `pages/api/freight/loads/update.ts` - Load update

**Steps:**
1. [ ] Verify load status change to DELIVERED triggers:
   - Gamification points (already implemented)
   - Should trigger KPI recalculation (see 6.3)
2. [ ] Verify load status change to LOST triggers:
   - Should trigger briefing update (see 6.4)
3. [ ] **Verification:** Load status changes trigger all events

**Test:**
- [ ] Change load to DELIVERED → verify gamification event
- [ ] Change load to LOST → verify briefing update (after 6.4)

---

### 5.3 Verify Load Logic for All Venture Types

**Files to Check:**
- `pages/api/freight/loads/*.ts` - All load endpoints
- `lib/freight/*.ts` - Load business logic

**Steps:**
1. [ ] Verify loads work for LOGISTICS ventures
2. [ ] Verify loads work for TRANSPORT ventures
3. [ ] Verify loads don't appear for non-freight ventures (HOSPITALITY, BPO, SAAS)
4. [ ] **Verification:** Load logic works correctly per venture type

**Test:**
- [ ] LOGISTICS venture → can create/view loads
- [ ] TRANSPORT venture → can create/view loads
- [ ] HOSPITALITY venture → cannot access load pages

---

## Event Triggers - Missing Implementations

**Priority:** 🟡 **HIGH** - System completeness  
**Timeline:** Week 3-4 (Days 15-28)

### 6.1 Add Load DELIVERED → KPI Recalculation

**Files to Modify:**
- `pages/api/freight/loads/[id].ts` - When load status changes to DELIVERED
- Create: `lib/jobs/kpiAggregationJob.ts`

**Steps:**
1. [ ] Create scheduled job for KPI aggregation:
   ```typescript
   // lib/jobs/kpiAggregationJob.ts
   export async function aggregateFreightKpis(ventureId: number, date: Date) {
     // Aggregate loads, calculate KPIs, upsert FreightKpiDaily
   }
   ```
2. [ ] Add to scheduled jobs runner (runs daily after incentive job):
   ```typescript
   // scripts/scheduled-jobs-runner.ts
   // 7:30 AM - After incentive job
   await aggregateFreightKpis(ventureId, yesterday);
   ```
3. [ ] **OR** Add immediate trigger on load DELIVERED:
   ```typescript
   // pages/api/freight/loads/[id].ts
   if (newStatus === 'DELIVERED' && oldStatus !== 'DELIVERED') {
     // Queue KPI recalculation (or do it immediately if fast enough)
     await aggregateFreightKpisForDate(load.ventureId, load.deliveredAt || new Date());
   }
   ```
4. [ ] **Verification:** KPIs update when loads are delivered

**Test:**
- [ ] Deliver load
- [ ] Verify `FreightKpiDaily` is updated (or queued for update)

---

### 6.2 Add Hotel KPI Upload → Aggregation

**Files to Modify:**
- `pages/api/hotels/kpi-upload.ts` - After KPI upload
- `pages/api/hotel-kpi/upsert.ts` - After KPI upsert

**Steps:**
1. [ ] After hotel KPI is uploaded, trigger aggregation:
   ```typescript
   // After HotelKpiDaily is created/updated:
   await aggregateHotelKpisForDate(hotel.ventureId, kpi.date);
   ```
2. [ ] Create aggregation function:
   ```typescript
   // lib/jobs/kpiAggregationJob.ts
   export async function aggregateHotelKpis(ventureId: number, date: Date) {
     // Aggregate hotel KPIs for venture/date
   }
   ```
3. [ ] **Verification:** Hotel KPIs aggregate on upload

**Test:**
- [ ] Upload hotel KPI
- [ ] Verify aggregation runs (or is queued)

---

### 6.3 Add BPO KPI Upsert → Aggregation

**Files to Modify:**
- `pages/api/bpo/kpi/upsert.ts` - After BPO KPI upsert

**Steps:**
1. [ ] After BPO KPI is upserted, trigger aggregation:
   ```typescript
   // After BpoKpiRecord is created/updated:
   await aggregateBpoKpisForDate(campaign.ventureId, kpi.date);
   ```
2. [ ] Create aggregation function:
   ```typescript
   export async function aggregateBpoKpis(ventureId: number, date: Date) {
     // Aggregate BPO KPIs for venture/date
   }
   ```
3. [ ] **Verification:** BPO KPIs aggregate on upsert

**Test:**
- [ ] Upsert BPO KPI
- [ ] Verify aggregation runs

---

### 6.4 Add Load DELIVERED → Briefing Update

**Files to Modify:**
- `pages/api/freight/loads/[id].ts` - When load DELIVERED
- `lib/briefing/*.ts` - Briefing update logic

**Steps:**
1. [ ] When load is DELIVERED, check if it's critical:
   ```typescript
   if (newStatus === 'DELIVERED' && load.billAmount > CRITICAL_THRESHOLD) {
     // Trigger briefing update
     await updateBriefingForLoad(load);
   }
   ```
2. [ ] Create briefing update function:
   ```typescript
   export async function updateBriefingForLoad(load: Load) {
     // Add to briefing's freight section
   }
   ```
3. [ ] **Verification:** Critical loads update briefing

**Test:**
- [ ] Deliver critical load (high value)
- [ ] Verify briefing is updated

---

### 6.5 Add Load LOST → Briefing Update (Firefront)

**Files to Modify:**
- `pages/api/freight/loads/[id].ts` - When load LOST
- `lib/briefing/*.ts` - Briefing firefront logic

**Steps:**
1. [ ] When load is LOST, add to briefing firefront:
   ```typescript
   if (newStatus === 'LOST') {
     await addToBriefingFirefront(load);
   }
   ```
2. [ ] Create firefront update function:
   ```typescript
   export async function addToBriefingFirefront(load: Load) {
     // Add lost load to briefing's firefront section
   }
   ```
3. [ ] **Verification:** Lost loads appear in briefing firefront

**Test:**
- [ ] Mark load as LOST
- [ ] Verify briefing firefront is updated

---

## Operational Resilience

**Priority:** 🟡 **HIGH** - System reliability  
**Timeline:** Week 2-3 (Days 8-21)

### 7.1 Add Retry Logic to External API Calls

**Files to Modify:**
- `lib/integrations/fmcsaClient.ts`
- `lib/outreach/providers/sendgrid.ts`
- `lib/outreach/providers/twilio.ts`

**Steps:**
1. [ ] Create retry utility:
   ```typescript
   // lib/utils/retry.ts
   export async function withRetry<T>(
     fn: () => Promise<T>,
     maxRetries = 3,
     delay = 1000
   ): Promise<T> {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (err) {
         if (i === maxRetries - 1) throw err;
         await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
       }
     }
   }
   ```
2. [ ] Wrap FMCSA calls:
   ```typescript
   return await withRetry(() => fetchCarrierFromFMCSA(mcNumber));
   ```
3. [ ] Wrap SendGrid calls
4. [ ] Wrap Twilio calls
5. [ ] **Verification:** External API failures retry automatically

**Test:**
- [ ] Simulate external API failure
- [ ] Verify retry logic triggers
- [ ] Verify eventual success or proper error

---

### 7.2 Add Circuit Breaker for External APIs

**Files to Create:**
- `lib/circuit-breaker.ts`

**Steps:**
1. [ ] Create circuit breaker implementation:
   ```typescript
   // lib/circuit-breaker.ts
   export class CircuitBreaker {
     private failures = 0;
     private lastFailureTime = 0;
     private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
     
     async execute<T>(fn: () => Promise<T>): Promise<T> {
       if (this.state === 'OPEN') {
         if (Date.now() - this.lastFailureTime > this.timeout) {
           this.state = 'HALF_OPEN';
         } else {
           throw new Error('Circuit breaker is OPEN');
         }
       }
       
       try {
         const result = await fn();
         this.onSuccess();
         return result;
       } catch (err) {
         this.onFailure();
         throw err;
       }
     }
   }
   ```
2. [ ] Use circuit breaker for external APIs
3. [ ] **Verification:** Circuit breaker prevents cascading failures

**Test:**
- [ ] Simulate repeated API failures
- [ ] Verify circuit opens after threshold
- [ ] Verify circuit closes after timeout

---

### 7.3 Add Job Concurrency Control

**Files to Modify:**
- `scripts/scheduled-jobs-runner.ts`

**Steps:**
1. [ ] Add distributed lock:
   ```typescript
   // Use database lock or Redis
   const lockKey = `job:${jobName}:${date}`;
   const lock = await acquireLock(lockKey, 3600000); // 1 hour
   
   if (!lock) {
     console.log(`Job ${jobName} already running, skipping`);
     return;
   }
   
   try {
     await runJob();
   } finally {
     await releaseLock(lockKey);
   }
   ```
2. [ ] Add job status tracking:
   ```typescript
   await prisma.jobRunLog.create({
     data: {
       jobName,
       status: 'RUNNING',
       startedAt: new Date(),
     },
   });
   ```
3. [ ] **Verification:** Jobs cannot run concurrently

**Test:**
- [ ] Trigger same job twice simultaneously
- [ ] Verify only one runs
- [ ] Verify second is skipped or queued

---

### 7.4 Add Job Timeout & Alerting

**Files to Modify:**
- `scripts/scheduled-jobs-runner.ts`

**Steps:**
1. [ ] Add timeout per job:
   ```typescript
   const timeout = setTimeout(() => {
     console.error(`Job ${jobName} timed out after 1 hour`);
     process.exit(1); // Or kill job gracefully
   }, 3600000);
   
   try {
     await runJob();
   } finally {
     clearTimeout(timeout);
   }
   ```
2. [ ] Add alerting for failures:
   ```typescript
   if (jobFailed) {
     await sendAlert({
       type: 'job_failure',
       jobName,
       error: err.message,
     });
   }
   ```
3. [ ] **Verification:** Stuck jobs are killed, failures are alerted

**Test:**
- [ ] Create job that hangs
- [ ] Verify timeout kills it
- [ ] Verify alert is sent

---

## Scalability Improvements

**Priority:** 🟡 **MEDIUM** - Performance  
**Timeline:** Week 3-4 (Days 15-28)

### 8.1 Migrate to Cursor-Based Pagination

**Files to Modify:**
- `pages/api/freight/loads/list.ts`
- Other critical list endpoints

**Steps:**
1. [ ] Update load list endpoint:
   ```typescript
   // BEFORE: offset-based
   const loads = await prisma.load.findMany({
     skip: (page - 1) * pageSize,
     take: pageSize,
   });
   
   // AFTER: cursor-based
   const loads = await prisma.load.findMany({
     take: pageSize + 1, // Fetch one extra to check if more exists
     ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
     orderBy: { id: 'asc' },
   });
   
   const hasMore = loads.length > pageSize;
   const items = hasMore ? loads.slice(0, -1) : loads;
   const nextCursor = hasMore ? items[items.length - 1].id : null;
   
   return { items, hasMore, nextCursor };
   ```
2. [ ] Update frontend to use cursor pagination
3. [ ] **Verification:** Pagination works efficiently at scale

**Test:**
- [ ] Test pagination with 1000+ records
- [ ] Verify performance is acceptable
- [ ] Verify all records are accessible

---

### 8.2 Pre-Aggregate Dashboard Metrics

**Files to Create/Modify:**
- `lib/jobs/kpiAggregationJob.ts` - Scheduled aggregation
- `pages/api/logistics/dashboard.ts` - Read from pre-aggregated data

**Steps:**
1. [ ] Create scheduled job to pre-aggregate KPIs:
   ```typescript
   // Runs daily after incentive job (7:30 AM)
   export async function aggregateFreightKpis(ventureId: number, date: Date) {
     // Calculate all KPIs, upsert FreightKpiDaily
   }
   ```
2. [ ] Update dashboard to read from pre-aggregated data:
   ```typescript
   // Read from FreightKpiDaily instead of calculating on-demand
   const kpis = await prisma.freightKpiDaily.findMany({
     where: { ventureId, date: { gte: from, lte: to } },
   });
   ```
3. [ ] Add fallback to on-demand calculation if missing
4. [ ] **Verification:** Dashboard loads quickly from pre-aggregated data

**Test:**
- [ ] Run aggregation job
- [ ] Load dashboard
- [ ] Verify response time < 200ms

---

### 8.3 Add Response Caching

**Files to Create/Modify:**
- Create `lib/cache.ts`
- Update dashboard endpoints

**Steps:**
1. [ ] Create cache utility (Redis or in-memory):
   ```typescript
   // lib/cache.ts
   export async function getCached<T>(
     key: string,
     ttl: number,
     fn: () => Promise<T>
   ): Promise<T> {
     const cached = await redis.get(key);
     if (cached) return JSON.parse(cached);
     
     const result = await fn();
     await redis.setex(key, ttl, JSON.stringify(result));
     return result;
   }
   ```
2. [ ] Wrap dashboard endpoints:
   ```typescript
   const result = await getCached(
     `dashboard:${ventureId}:${date}`,
     300, // 5 minutes
     () => calculateDashboard(ventureId, date)
   );
   ```
3. [ ] Add cache invalidation on data updates
4. [ ] **Verification:** Dashboard responses are cached

**Test:**
- [ ] Load dashboard (first request slow)
- [ ] Load dashboard again (cached, fast)
- [ ] Update data, verify cache invalidated

---

## Data Integrity & Validation

**Priority:** 🟡 **HIGH** - Data quality  
**Timeline:** Week 2-3 (Days 8-21)

### 9.1 Make ventureId Required for Key Models

**Files to Modify:**
- `prisma/schema.prisma`
- Create migration

**Steps:**
1. [ ] Update schema:
   ```prisma
   model Load {
     ventureId Int // Remove ? to make required
     // ...
   }
   
   model Customer {
     ventureId Int // Remove ? to make required
     // ...
   }
   
   model LogisticsShipper {
     ventureId Int // Remove ? to make required
     // ...
   }
   ```
2. [ ] Create migration with data backfill:
   ```sql
   -- Backfill existing records
   UPDATE "Load" SET "ventureId" = 1 WHERE "ventureId" IS NULL;
   -- (Use appropriate default venture)
   ```
3. [ ] Add validation in API routes:
   ```typescript
   if (!ventureId) {
     return res.status(400).json({ error: "ventureId is required" });
   }
   ```
4. [ ] **Verification:** All records have ventureId

**Test:**
- [ ] Try to create record without ventureId → should fail
- [ ] Verify existing records have ventureId

---

### 9.2 Add Input Validation with Zod

**Files to Create/Modify:**
- Create `lib/validation/schemas.ts`
- Update API routes

**Steps:**
1. [ ] Create Zod schemas:
   ```typescript
   // lib/validation/schemas.ts
   import { z } from 'zod';
   
   export const createLoadSchema = z.object({
     ventureId: z.number().int().positive(),
     pickupCity: z.string().min(1),
     // ... all fields
   });
   ```
2. [ ] Update API routes to use schemas:
   ```typescript
   const validated = createLoadSchema.parse(req.body);
   ```
3. [ ] **Verification:** Invalid input is rejected

**Test:**
- [ ] Send invalid data to API
- [ ] Verify 400 error with validation details

---

### 9.3 Fix Null Handling in KPI Calculations

**Files to Modify:**
- `lib/kpiFreight.ts`

**Steps:**
1. [ ] Fix margin calculation:
   ```typescript
   // BEFORE:
   const profit = totalRevenue - totalCost; // If totalCost is null, profit is NaN
   
   // AFTER:
   const totalCost = input.totalCost ?? 0;
   const profit = totalRevenue - totalCost;
   ```
2. [ ] Add validation:
   ```typescript
   if (typeof totalCost !== 'number' || isNaN(totalCost)) {
     throw new Error('totalCost must be a valid number');
   }
   ```
3. [ ] **Verification:** Null costs don't cause NaN

**Test:**
- [ ] Create KPI with null cost
- [ ] Verify calculation doesn't return NaN
- [ ] Verify margin is calculated correctly

---

## Testing & Verification

**Priority:** 🟡 **HIGH** - Quality assurance  
**Timeline:** Week 4 (Days 22-28)

### 10.1 Add Cross-Vertical Flow Tests

**Files to Create:**
- `tests/flows/cross-vertical-flows.test.ts`

**Steps:**
1. [ ] Test: Load DELIVERED → Incentive → Gamification
2. [ ] Test: EOD submission → Gamification → Briefing
3. [ ] Test: Cross-venture data isolation
4. [ ] **Verification:** All cross-vertical flows work

**Test Cases:**
```typescript
describe('Cross-Vertical Flows', () => {
  test('load delivered triggers incentive and gamification', async () => {
    // Create load, mark as DELIVERED
    // Verify incentive daily record created
    // Verify gamification event created
  });
  
  test('eod submission triggers gamification and briefing', async () => {
    // Submit EOD
    // Verify gamification event
    // Verify briefing updated
  });
  
  test('venture data isolation', async () => {
    // Create data for Venture A
    // User with only Venture B access → cannot see Venture A data
  });
});
```

---

### 10.2 Add Event Trigger Tests

**Files to Create:**
- `tests/flows/event-triggers.test.ts`

**Steps:**
1. [ ] Test all gamification triggers
2. [ ] Test all KPI recalculation triggers
3. [ ] Test all briefing update triggers
4. [ ] **Verification:** All triggers work correctly

---

### 10.3 Add Idempotency Tests

**Files to Create:**
- `tests/flows/idempotency.test.ts`

**Steps:**
1. [ ] Test incentive calculation idempotency
2. [ ] Test gamification award idempotency
3. [ ] Test payout creation idempotency
4. [ ] **Verification:** All operations are idempotent

---

## Monitoring & Alerting

**Priority:** 🟡 **MEDIUM** - Observability  
**Timeline:** Week 3-4 (Days 15-28)

### 11.1 Add Job Health Monitoring

**Files to Create:**
- `pages/api/admin/jobs/health.ts`

**Steps:**
1. [ ] Create health check endpoint:
   ```typescript
   // Returns job status, last run time, failures, etc.
   ```
2. [ ] Add to monitoring dashboard
3. [ ] **Verification:** Job health is visible

---

### 11.2 Add Error Tracking

**Files to Create/Modify:**
- Integrate error tracking (Sentry, etc.)
- Update error handlers

**Steps:**
1. [ ] Set up error tracking service
2. [ ] Add to all error handlers
3. [ ] **Verification:** Errors are tracked

---

## Documentation & Handoff

**Priority:** 🟢 **MEDIUM** - Knowledge transfer  
**Timeline:** Week 4 (Days 25-30)

### 12.1 Update Architecture Documentation

**Files to Update:**
- `docs/platform-map.md`
- `docs/full-module-inventory.md`
- Create `docs/ARCHITECTURE.md`

**Steps:**
1. [ ] Document all fixes
2. [ ] Update architecture diagrams
3. [ ] Document event flows
4. [ ] **Verification:** Documentation is complete

---

### 12.2 Create Runbook

**Files to Create:**
- `docs/RUNBOOK.md`

**Steps:**
1. [ ] Document operational procedures
2. [ ] Document troubleshooting steps
3. [ ] Document deployment process
4. [ ] **Verification:** Team can operate independently

---

## Final Verification Checklist

Before considering the system enterprise-grade, verify:

### Financial Integrity
- [ ] Legacy incentive engine deleted
- [ ] Manual commit is idempotent
- [ ] Unique constraint on IncentivePayout
- [ ] All idempotency tests pass

### User Access
- [ ] Users see only their venture links
- [ ] Navigation filters correctly
- [ ] Quick links work per venture
- [ ] Venture detail pages check access

### Gamification
- [ ] All event triggers implemented
- [ ] Hotel review response awards points
- [ ] BPO call completion awards points
- [ ] Hotel dispute resolution awards points
- [ ] Perfect week awards points
- [ ] First daily login awards points
- [ ] All triggers are idempotent

### Incentive System
- [ ] Engine reads from all verticals
- [ ] Rules apply correctly
- [ ] Payouts aggregate correctly
- [ ] UI works per venture

### Load Logic
- [ ] Loads scoped to ventures
- [ ] Load status updates trigger events
- [ ] Load logic works for all venture types

### Event Triggers
- [ ] Load DELIVERED → KPI recalculation
- [ ] Hotel KPI upload → aggregation
- [ ] BPO KPI upsert → aggregation
- [ ] Load DELIVERED → briefing update
- [ ] Load LOST → briefing firefront

### Operational Resilience
- [ ] Retry logic for external APIs
- [ ] Circuit breaker implemented
- [ ] Job concurrency control
- [ ] Job timeout & alerting

### Scalability
- [ ] Cursor-based pagination
- [ ] Pre-aggregated dashboard metrics
- [ ] Response caching

### Data Integrity
- [ ] ventureId required for key models
- [ ] Input validation with Zod
- [ ] Null handling fixed

### Testing
- [ ] Cross-vertical flow tests
- [ ] Event trigger tests
- [ ] Idempotency tests

### Monitoring
- [ ] Job health monitoring
- [ ] Error tracking

### Documentation
- [ ] Architecture documentation updated
- [ ] Runbook created

---

## Success Criteria

The system is enterprise-grade when:

1. ✅ **Financial integrity:** No risk of double-counting, all operations idempotent
2. ✅ **User access:** Users see only their venture links, proper access control
3. ✅ **Gamification:** All events trigger points, system fully wired
4. ✅ **Incentive system:** Works correctly across all verticals, per venture
5. ✅ **Load logic:** Properly scoped, triggers events, works for all venture types
6. ✅ **Event triggers:** All missing triggers implemented
7. ✅ **Operational resilience:** Retry logic, circuit breakers, job safety
8. ✅ **Scalability:** Cursor pagination, pre-aggregation, caching
9. ✅ **Data integrity:** Proper validation, null handling, required fields
10. ✅ **Testing:** Comprehensive test coverage
11. ✅ **Monitoring:** Health checks, error tracking, alerting
12. ✅ **Documentation:** Complete and up-to-date

---

**End of Enterprise-Grade System Upgrade Checklist**


