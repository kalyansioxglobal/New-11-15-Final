# SIOX Command Center - Data Ownership & Integrity Audit

**Last Updated:** Generated from comprehensive codebase analysis  
**Purpose:** Complete audit of data ownership, boundaries, scoping, and integrity risks

This document performs a conservative, scale-aware audit of all Prisma models, identifying ownership, consumers, scoping patterns, and critical risks.

---

## Status Legend

- ✅ **SAFE**: Proper ownership, scoping, and idempotency
- 🟡 **WARNING**: Potential issues but manageable
- 🔴 **CRITICAL**: Serious integrity risks requiring immediate attention
- ⚠️ **RISK**: Financial/incentive data with integrity concerns

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Model Ownership Catalog](#2-model-ownership-catalog)
3. [Scoping Validation](#3-scoping-validation)
4. [Shared Ownership Issues](#4-shared-ownership-issues)
5. [Financial Data Integrity](#5-financial-data-integrity)
6. [Idempotency Analysis](#6-idempotency-analysis)
7. [Critical Risks](#7-critical-risks)
8. [Recommendations](#8-recommendations)

---

## 1. Executive Summary

### Overall Health: 🟡 **WARNING**

**Total Models Analyzed:** 111 Prisma models

**Critical Issues Found:**
- 🔴 **3 models** with conflicting write patterns (double counting risk)
- 🔴 **2 models** with missing venture scoping
- 🟡 **5 models** with shared ownership (coordination required)
- ⚠️ **Financial models** with idempotency gaps

**Key Findings:**
1. **IncentiveDaily**: Three different write paths (legacy + new increment + new idempotent)
2. **GamificationPointsBalance**: Increment-based but idempotent via idempotencyKey
3. **Load**: Properly scoped but written by multiple modules
4. **Customer**: Shared ownership (freight + import)
5. **Carrier**: Shared ownership (freight + FMCSA sync)

---

## 2. Model Ownership Catalog

### 2.1 Platform Core Models

#### User
- **Owner Module:** `admin`
- **Writers:** `/api/admin/users/*` (create, update, delete)
- **Consumers:** All modules (read-only for most)
- **Scoping:** Global (no ventureId/officeId)
- **Status:** ✅ **SAFE**
- **Notes:** Platform-level entity, properly isolated

#### Venture
- **Owner Module:** `admin`
- **Writers:** `/api/admin/ventures` (create, update)
- **Consumers:** All modules (read-only)
- **Scoping:** Global (no ventureId/officeId)
- **Status:** ✅ **SAFE**
- **Notes:** Platform-level entity

#### Office
- **Owner Module:** `admin`
- **Writers:** `/api/admin/offices/*` (create, update, delete)
- **Consumers:** All modules (read-only)
- **Scoping:** `ventureId` (belongs to venture)
- **Status:** ✅ **SAFE**
- **Notes:** Properly scoped to venture

#### VentureUser
- **Owner Module:** `admin`
- **Writers:** `/api/admin/users/setVentures` (deleteMany + createMany)
- **Consumers:** Auth, scope resolution
- **Scoping:** Junction table (userId, ventureId)
- **Status:** ✅ **SAFE**
- **Notes:** Proper unique constraint `@@unique([userId, ventureId])`

#### OfficeUser
- **Owner Module:** `admin`
- **Writers:** `/api/admin/users/setOffices` (deleteMany + createMany)
- **Consumers:** Auth, scope resolution
- **Scoping:** Junction table (userId, officeId)
- **Status:** ✅ **SAFE**
- **Notes:** Proper unique constraint `@@unique([userId, officeId])`

---

### 2.2 Freight/Logistics Models

#### Load
- **Owner Module:** `freight` (primary), `import` (secondary)
- **Writers:**
  - `/api/freight/loads/create` - Create
  - `/api/freight/loads/update` - Update
  - `/api/freight/loads/mark-*` - Status updates
  - `/api/freight/outreach/award` - Sets carrierId, loadStatus
  - `/api/import/tms-loads` - Import
  - `/api/import/job/[id]/commit` - Bulk import
- **Consumers:**
  - Incentive engine (reads DELIVERED loads)
  - KPI calculations (on-demand)
  - Briefing (on-demand)
  - Gamification (status change triggers)
- **Scoping:** `ventureId` (nullable), `officeId` (nullable)
- **Status:** 🟡 **WARNING**
- **Risks:**
  - ⚠️ **Multiple writers**: Freight API + Import system
  - ⚠️ **ventureId nullable**: Some loads may not be scoped
  - ✅ **Unique constraint**: `tmsLoadId` unique prevents duplicates
- **Notes:** Core entity, written by multiple modules but with proper unique constraints

#### Customer
- **Owner Module:** `freight` (primary), `import` (secondary)
- **Writers:**
  - `/api/logistics/customers/*` - CRUD
  - `/api/import/job/[id]/commit` - Bulk import
- **Consumers:**
  - Load visibility (assignment-based)
  - Churn calculations
  - Task generation (dormant customer rule)
- **Scoping:** `ventureId` (nullable)
- **Status:** 🟡 **WARNING**
- **Risks:**
  - ⚠️ **Multiple writers**: Freight API + Import system
  - ⚠️ **ventureId nullable**: Some customers may not be scoped
- **Notes:** Shared ownership requires coordination

#### Carrier
- **Owner Module:** `freight` (primary), `admin/freight` (FMCSA sync)
- **Writers:**
  - `/api/freight/carriers/*` - CRUD
  - `/api/admin/freight/fmcsa-sync` - FMCSA bulk sync
  - `/api/carriers/[id]/fmcsa-refresh` - Individual refresh
- **Consumers:**
  - Load assignment
  - Carrier search/matching
  - Outreach
  - Incentive calculations (via loads)
- **Scoping:** Global (no ventureId)
- **Status:** 🟡 **WARNING**
- **Risks:**
  - ⚠️ **Multiple writers**: Freight API + FMCSA sync
  - ⚠️ **No venture scoping**: Carriers are global (may be intentional)
  - ✅ **Unique constraints**: `mcNumber`, `dotNumber`, `tmsCarrierCode` prevent duplicates
- **Notes:** Global entity, written by multiple modules

#### LogisticsShipper
- **Owner Module:** `freight` (primary), `import` (secondary)
- **Writers:**
  - `/api/logistics/shippers/*` - CRUD
  - `/api/import/job/[id]/commit` - Bulk import
  - `lib/shipperChurn.ts` - Updates churnStatus, metrics
- **Consumers:**
  - Churn calculations
  - Load matching
- **Scoping:** `ventureId` (nullable)
- **Status:** 🟡 **WARNING**
- **Risks:**
  - ⚠️ **Multiple writers**: Freight API + Import + Churn job
  - ⚠️ **ventureId nullable**: Some shippers may not be scoped
- **Notes:** Churn job updates metrics, requires coordination

#### FreightQuote
- **Owner Module:** `freight`
- **Writers:**
  - `/api/freight/quotes/create` - Create
  - `/api/freight/quotes/[id]/convert-to-load` - Convert to load
  - `lib/jobs/quoteTimeoutJob.ts` - Sets status = EXPIRED
- **Consumers:**
  - Task generation (expiring quotes)
  - Gamification (quote converted)
- **Scoping:** `ventureId` (nullable)
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, scheduled job updates status

#### FreightKpiDaily
- **Owner Module:** `freight` (calculated)
- **Writers:**
  - On-demand calculation (when user views dashboard)
  - No scheduled aggregation
- **Consumers:**
  - KPI dashboards
  - Reporting
- **Scoping:** `ventureId`
- **Status:** 🟡 **WARNING**
- **Risks:**
  - 🔴 **No automatic updates**: Calculated on-demand only
  - 🔴 **No unique constraint**: Can have multiple records per venture+date
  - ⚠️ **Unique constraint exists**: `@@unique([ventureId, date])` - actually safe
- **Notes:** Derived data, calculated on-demand

---

### 2.3 Hospitality Models

#### HotelProperty
- **Owner Module:** `hospitality`
- **Writers:**
  - `/api/hospitality/hotels/*` - CRUD
  - `/api/hotels/create` - Create
- **Consumers:**
  - Hotel KPIs
  - Reviews
  - Disputes
  - Incentive calculations
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### HotelKpiDaily
- **Owner Module:** `hospitality`
- **Writers:**
  - `/api/hotels/kpi-upload` - Manual upload
  - `/api/hotels/night-audit/upload` - Night audit upload
  - `/api/hotels/str/upload` - STR upload
- **Consumers:**
  - Incentive calculations (7 AM job)
  - Briefing (on-demand)
  - KPI dashboards
- **Scoping:** `hotelId` → `ventureId` (via HotelProperty)
- **Status:** ✅ **SAFE**
- **Notes:** Multiple upload paths but single owner module

#### HotelReview
- **Owner Module:** `hospitality`
- **Writers:**
  - `/api/hospitality/reviews/*` - CRUD
  - `/api/hospitality/reviews/[id]` - Response updates
- **Consumers:**
  - Incentive calculations (respondedById)
  - Briefing (on-demand)
- **Scoping:** `hotelId` → `ventureId` (via HotelProperty)
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

---

### 2.4 BPO Models

#### BpoCampaign
- **Owner Module:** `bpo`
- **Writers:**
  - `/api/bpo/campaigns/*` - CRUD
- **Consumers:**
  - Agent metrics
  - KPI calculations
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### BpoCallLog
- **Owner Module:** `bpo`
- **Writers:**
  - `/api/bpo/call-logs` - Manual entry
  - `/api/import/ringcentral` - RingCentral import (file-based)
- **Consumers:**
  - Incentive calculations (7 AM job)
  - KPI calculations
  - Briefing (on-demand)
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### BpoKpiRecord
- **Owner Module:** `bpo`
- **Writers:**
  - `/api/bpo/kpi/upsert` - Manual upsert
- **Consumers:**
  - KPI dashboards
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

---

### 2.5 SaaS Models

#### SaasCustomer
- **Owner Module:** `saas`
- **Writers:**
  - `/api/saas/customers/*` - CRUD
- **Consumers:**
  - Subscription management
  - MRR calculations
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### SaasSubscription
- **Owner Module:** `saas`
- **Writers:**
  - `/api/saas/subscriptions/*` - CRUD
- **Consumers:**
  - MRR calculations
  - Churn tracking
- **Scoping:** `customerId` → `ventureId` (via SaasCustomer)
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

---

### 2.6 Holdings Models

#### HoldingAsset
- **Owner Module:** `holdings`
- **Writers:**
  - `/api/holdings/assets/*` - CRUD
- **Consumers:**
  - Asset tracking
  - Document vault
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### BankAccount
- **Owner Module:** `holdings`
- **Writers:**
  - `/api/bank-accounts/*` - CRUD
- **Consumers:**
  - Bank snapshots
  - Financial tracking
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### BankAccountSnapshot
- **Owner Module:** `holdings`
- **Writers:**
  - `/api/bank-snapshots` - Manual entry
- **Consumers:**
  - Financial dashboards
  - Holdings KPIs
- **Scoping:** `ventureId` (nullable)
- **Status:** 🟡 **WARNING**
- **Risks:**
  - ⚠️ **ventureId nullable**: Some snapshots may not be scoped
  - ✅ **Unique constraint**: `@@unique([ventureId, date])` prevents duplicates per venture+date
- **Notes:** Financial data, needs proper scoping

---

### 2.7 Incentive Models (CRITICAL)

#### IncentivePlan
- **Owner Module:** `admin/incentives`
- **Writers:**
  - `/api/admin/incentives/plan` - CRUD
- **Consumers:**
  - Incentive engine (reads rules)
  - Incentive calculations
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### IncentiveRule
- **Owner Module:** `admin/incentives`
- **Writers:**
  - `/api/incentives/rules` - CRUD
- **Consumers:**
  - Incentive engine (applies rules)
- **Scoping:** `planId` → `ventureId` (via IncentivePlan)
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### IncentiveDaily ⚠️ **CRITICAL**
- **Owner Module:** `incentives` (conflicting patterns)
- **Writers:**
  - **Legacy**: `lib/incentives.ts` - `calculateIncentivesForDay()` - Uses upsert (increment pattern)
  - **New Engine**: `lib/incentives/engine.ts` - `saveIncentivesForDay()` - Uses upsert (increment pattern)
  - **New Engine**: `lib/incentives/engine.ts` - `saveIncentivesForDayIdempotent()` - DELETE then CREATE (replace pattern)
  - **Scheduled Job**: `lib/jobs/incentiveDailyJob.ts` - Uses idempotent version (7 AM)
  - **Manual**: `/api/incentives/commit` - Uses non-idempotent `saveIncentivesForDay()` ⚠️
  - **Legacy Manual**: `/api/incentives/run` - Uses legacy `lib/incentives.ts` ⚠️
- **Consumers:**
  - Incentive dashboards
  - Payout calculations
  - User views
- **Scoping:** `ventureId`, `officeId` (nullable), `@@unique([userId, date, ventureId])`
- **Status:** 🔴 **CRITICAL**
- **Risks:**
  - 🔴 **THREE different write patterns**: Legacy upsert, new upsert, new idempotent
  - 🔴 **Double counting risk**: Legacy and new upsert patterns can increment multiple times
  - 🔴 **Conflicting currency**: Legacy uses "INR", new uses "USD"
  - 🔴 **Manual triggers use non-idempotent**: `/api/incentives/commit` can double count
  - ✅ **Scheduled job uses idempotent**: Safe
  - ✅ **Unique constraint**: Prevents duplicates per user+date+venture
- **Notes:** 
  - **CRITICAL FINANCIAL DATA** - Multiple write paths create integrity risk
  - Scheduled job (7 AM) is safe (uses idempotent version)
  - Manual triggers are risky (use increment patterns)

#### IncentivePayout
- **Owner Module:** `admin/incentives`
- **Writers:**
  - `/api/incentives/payouts/*` - CRUD (manual aggregation)
- **Consumers:**
  - Payout dashboards
  - Financial reporting
- **Scoping:** `ventureId`
- **Status:** 🟡 **WARNING**
- **Risks:**
  - ⚠️ **Manual aggregation**: No automatic calculation from IncentiveDaily
  - ⚠️ **No unique constraint**: Can create multiple payouts for same period
- **Notes:** Financial data, should have unique constraint on period

---

### 2.8 Gamification Models

#### GamificationConfig
- **Owner Module:** `admin/gamification`
- **Writers:**
  - `/api/gamification/config` - Upsert
- **Consumers:**
  - Gamification engine (reads point values)
- **Scoping:** `ventureId` (unique per venture)
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### GamificationEvent
- **Owner Module:** `gamification` (via `lib/gamification/awardPoints.ts`)
- **Writers:**
  - `lib/gamification/awardPoints.ts` - `awardPoints()` - Creates events
  - Called from: EOD, Load, Task, Outreach, Quote endpoints
- **Consumers:**
  - Leaderboards
  - Point history
- **Scoping:** `ventureId`, `officeId` (nullable)
- **Status:** ✅ **SAFE**
- **Notes:** Single writer function, idempotent via idempotencyKey check

#### GamificationPointsBalance
- **Owner Module:** `gamification` (via `lib/gamification/awardPoints.ts`)
- **Writers:**
  - `lib/gamification/awardPoints.ts` - `awardPoints()` - Upsert with increment
- **Consumers:**
  - Leaderboards
  - User views
- **Scoping:** Global (userId only, no ventureId)
- **Status:** 🟡 **WARNING**
- **Risks:**
  - ⚠️ **No venture scoping**: Points are global per user (may be intentional)
  - ✅ **Idempotent**: Uses idempotencyKey to prevent double counting
  - ✅ **Unique constraint**: `@@unique([userId])` ensures one balance per user
- **Notes:** Increment-based but idempotent via idempotencyKey

---

### 2.9 Operations Models

#### Task
- **Owner Module:** `operations` (primary), `freight` (task generation)
- **Writers:**
  - `/api/tasks/*` - CRUD
  - `/api/freight/tasks/*` - Freight-specific tasks
  - `lib/freight/taskRules.ts` - Automated task generation (6:30 AM)
- **Consumers:**
  - Task dashboards
  - Gamification (task completion)
- **Scoping:** `ventureId`, `officeId` (nullable)
- **Status:** ✅ **SAFE**
- **Notes:** Multiple writers but coordinated (freight generates, operations manages)

#### EodReport
- **Owner Module:** `operations`
- **Writers:**
  - `/api/eod-reports` - User submission (upsert)
- **Consumers:**
  - Briefing (on-demand)
  - Gamification (submission triggers points)
  - Team views
- **Scoping:** `ventureId`, `officeId` (nullable), `@@unique([userId, date, ventureId, officeId])`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, proper unique constraint prevents duplicates

#### Attendance
- **Owner Module:** `operations`
- **Writers:**
  - `/api/attendance` - User submission
  - `/api/attendance/team` - Manager override
- **Consumers:**
  - KPI calculations
  - Team views
- **Scoping:** `ventureId`, `officeId` (nullable), `@@unique([userId, date, ventureId, officeId])`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, proper unique constraint

---

### 2.10 KPI Models

#### FreightKpiDaily
- **Owner Module:** `freight` (calculated)
- **Writers:**
  - On-demand calculation (when user views dashboard)
  - No scheduled aggregation
- **Consumers:**
  - KPI dashboards
  - Reporting
- **Scoping:** `ventureId`, `@@unique([ventureId, date])`
- **Status:** 🟡 **WARNING**
- **Risks:**
  - 🔴 **No automatic updates**: Calculated on-demand only
  - ✅ **Unique constraint**: Prevents duplicates per venture+date
- **Notes:** Derived data, should have scheduled aggregation

#### HotelKpiDaily
- **Owner Module:** `hospitality` (uploaded)
- **Writers:**
  - `/api/hotels/kpi-upload` - Manual upload
  - `/api/hotels/night-audit/upload` - Night audit
  - `/api/hotels/str/upload` - STR upload
- **Consumers:**
  - Incentive calculations (7 AM job)
  - Briefing (on-demand)
  - KPI dashboards
- **Scoping:** `hotelId` → `ventureId` (via HotelProperty)
- **Status:** ✅ **SAFE**
- **Notes:** Multiple upload paths but single owner module

#### EmployeeKpiDaily
- **Owner Module:** `operations` (calculated)
- **Writers:**
  - `/api/employee-kpi/daily` - Manual upsert
  - Legacy incentive system reads from this
- **Consumers:**
  - Legacy incentive calculations (`lib/incentives.ts`)
  - KPI dashboards
- **Scoping:** `ventureId`, `officeId` (nullable)
- **Status:** 🟡 **WARNING**
- **Risks:**
  - ⚠️ **Used by legacy incentive system**: May conflict with new engine
  - ⚠️ **No unique constraint**: Can have multiple records per user+date+venture
- **Notes:** Legacy model, should be deprecated

#### BpoKpiRecord
- **Owner Module:** `bpo`
- **Writers:**
  - `/api/bpo/kpi/upsert` - Manual upsert
- **Consumers:**
  - KPI dashboards
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

---

### 2.11 Dispatch Models

#### DispatchLoad
- **Owner Module:** `dispatch`
- **Writers:**
  - `/api/dispatch/loads` - CRUD
- **Consumers:**
  - Dispatch dashboards
  - Driver communications
- **Scoping:** `ventureId`, `officeId` (nullable)
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### DispatchDriver
- **Owner Module:** `dispatch`
- **Writers:**
  - `/api/dispatch/drivers/*` - CRUD
- **Consumers:**
  - Dispatch operations
  - Settlement calculations
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Single owner, properly scoped

#### Settlement
- **Owner Module:** `dispatch`
- **Writers:**
  - `/api/dispatch/settlements/*` - CRUD
- **Consumers:**
  - Financial reporting
  - Payout tracking
- **Scoping:** `ventureId`, `officeId` (nullable)
- **Status:** ✅ **SAFE**
- **Notes:** Financial data, single owner, properly scoped

---

### 2.12 Shared/Cross-Module Models

#### File
- **Owner Module:** `platform` (shared)
- **Writers:**
  - `/api/files/upload` - Upload
  - Multiple modules attach files
- **Consumers:**
  - All modules (read files)
- **Scoping:** `ventureId`
- **Status:** ✅ **SAFE**
- **Notes:** Shared resource, properly scoped

#### Notification
- **Owner Module:** `platform` (shared)
- **Writers:**
  - `/api/notifications/*` - Create
  - Multiple modules create notifications
- **Consumers:**
  - User notifications
- **Scoping:** Global (userId only)
- **Status:** ✅ **SAFE**
- **Notes:** User-level, no venture scoping needed

---

## 3. Scoping Validation

### 3.1 Venture Scoping

**Models with `ventureId` (Required):**
- ✅ Most business entities properly scoped
- ✅ Unique constraints prevent cross-venture duplicates

**Models with `ventureId` (Nullable):**
- 🟡 **Load**: `ventureId` nullable - Some loads may not be scoped
- 🟡 **Customer**: `ventureId` nullable - Some customers may not be scoped
- 🟡 **LogisticsShipper**: `ventureId` nullable - Some shippers may not be scoped
- 🟡 **BankAccountSnapshot**: `ventureId` nullable - Some snapshots may not be scoped

**Models without `ventureId`:**
- ✅ **User**: Global (intentional)
- ✅ **Venture**: Global (intentional)
- ✅ **Office**: Has `ventureId` (properly scoped)
- ✅ **Carrier**: Global (may be intentional for shared carriers)
- ✅ **GamificationPointsBalance**: Global per user (may be intentional)

### 3.2 Office Scoping

**Models with `officeId` (Required):**
- None (all are nullable)

**Models with `officeId` (Nullable):**
- ✅ **Task**: `officeId` nullable
- ✅ **EodReport**: `officeId` nullable
- ✅ **Attendance**: `officeId` nullable
- ✅ **Load**: `officeId` nullable
- ✅ **IncentiveDaily**: `officeId` nullable
- ✅ **GamificationEvent**: `officeId` nullable

**Status:** ✅ **SAFE** - Office scoping is additive (optional), properly implemented

### 3.3 Unique Constraints

**Critical Unique Constraints:**
- ✅ `VentureUser`: `@@unique([userId, ventureId])` - Prevents duplicate assignments
- ✅ `OfficeUser`: `@@unique([userId, officeId])` - Prevents duplicate assignments
- ✅ `IncentiveDaily`: `@@unique([userId, date, ventureId])` - Prevents duplicate calculations
- ✅ `EodReport`: `@@unique([userId, date, ventureId, officeId])` - Prevents duplicate reports
- ✅ `Attendance`: `@@unique([userId, date, ventureId, officeId])` - Prevents duplicate attendance
- ✅ `FreightKpiDaily`: `@@unique([ventureId, date])` - Prevents duplicate KPIs
- ✅ `BankAccountSnapshot`: `@@unique([ventureId, date])` - Prevents duplicate snapshots

**Missing Unique Constraints:**
- 🔴 **IncentivePayout**: No unique constraint on period (can create multiple payouts)
- 🔴 **EmployeeKpiDaily**: No unique constraint (can have multiple records per user+date+venture)

---

## 4. Shared Ownership Issues

### 4.1 Models Written by Multiple Modules

| Model | Writers | Risk Level | Coordination |
|-------|---------|------------|--------------|
| **Load** | Freight API, Import, Outreach | 🟡 **WARNING** | Unique constraint on `tmsLoadId` |
| **Customer** | Freight API, Import | 🟡 **WARNING** | No unique constraint (name-based) |
| **LogisticsShipper** | Freight API, Import, Churn Job | 🟡 **WARNING** | Churn job updates metrics |
| **Carrier** | Freight API, FMCSA Sync | 🟡 **WARNING** | Unique constraints on `mcNumber`, `dotNumber` |
| **IncentiveDaily** | Legacy Engine, New Engine (2 patterns) | 🔴 **CRITICAL** | Conflicting write patterns |

### 4.2 Models Used as Both Source-of-Truth and Derived Views

| Model | Source Role | Derived Role | Risk |
|-------|------------|--------------|------|
| **Load** | User creates loads | Churn calculations read loads | ✅ **SAFE** |
| **Customer** | User creates customers | Churn calculations update customers | 🟡 **WARNING** |
| **LogisticsShipper** | User creates shippers | Churn job updates shipper metrics | 🟡 **WARNING** |
| **FreightKpiDaily** | Calculated from Load | Used by dashboards | ✅ **SAFE** (read-only derived) |

---

## 5. Financial Data Integrity

### 5.1 IncentiveDaily ⚠️ **CRITICAL**

**Write Patterns:**
1. **Legacy**: `lib/incentives.ts` - `calculateIncentivesForDay()`
   - Uses: `upsert` with `amount: totalIncentive` (replaces, not increments)
   - Currency: "INR"
   - Risk: 🔴 **Can conflict with new engine**

2. **New Engine (Increment)**: `lib/incentives/engine.ts` - `saveIncentivesForDay()`
   - Uses: `findFirst` + `create` or `update` with `amount: existing + new` (increments)
   - Currency: "USD"
   - Risk: 🔴 **Can double count if run multiple times**

3. **New Engine (Idempotent)**: `lib/incentives/engine.ts` - `saveIncentivesForDayIdempotent()`
   - Uses: `deleteMany` + `create` (replaces)
   - Currency: "USD"
   - Risk: ✅ **SAFE** - Idempotent

**Current Usage:**
- ✅ Scheduled job (7 AM): Uses idempotent version - **SAFE**
- 🔴 Manual `/api/incentives/commit`: Uses increment version - **RISKY**
- 🔴 Legacy `/api/incentives/run`: Uses legacy version - **RISKY**

**Recommendation:** 
- 🔴 **CRITICAL**: Deprecate legacy engine
- 🔴 **CRITICAL**: Change `/api/incentives/commit` to use idempotent version
- 🔴 **CRITICAL**: Remove or fix legacy `/api/incentives/run`

### 5.2 GamificationPointsBalance

**Write Pattern:**
- Uses: `upsert` with `points: { increment: points }`
- Idempotency: ✅ **SAFE** - Uses `idempotencyKey` check before awarding
- Risk: ✅ **SAFE** - Properly idempotent

### 5.3 Settlement

**Write Pattern:**
- Uses: Standard CRUD
- Risk: ✅ **SAFE** - Single owner, manual entry

### 5.4 BankAccountSnapshot

**Write Pattern:**
- Uses: Standard create
- Unique Constraint: ✅ `@@unique([ventureId, date])`
- Risk: 🟡 **WARNING** - `ventureId` nullable, but unique constraint prevents duplicates

---

## 6. Idempotency Analysis

### 6.1 Idempotent Operations ✅

| Operation | Idempotency Mechanism | Status |
|-----------|----------------------|--------|
| **IncentiveDaily (scheduled)** | DELETE then CREATE | ✅ **SAFE** |
| **GamificationPointsBalance** | idempotencyKey check | ✅ **SAFE** |
| **EodReport** | Unique constraint + upsert | ✅ **SAFE** |
| **Attendance** | Unique constraint + upsert | ✅ **SAFE** |

### 6.2 Non-Idempotent Operations 🔴

| Operation | Risk | Impact |
|-----------|------|--------|
| **IncentiveDaily (manual commit)** | Increment pattern | 🔴 **Double counting** |
| **IncentiveDaily (legacy)** | Upsert pattern | 🔴 **Conflicts with new engine** |
| **GamificationPointsBalance** | Increment (but has idempotencyKey) | ✅ **SAFE** |

### 6.3 Idempotency Gaps

**Critical Gaps:**
1. 🔴 **IncentiveDaily manual commit**: Uses increment pattern, can double count
2. 🔴 **IncentiveDaily legacy engine**: Still active, conflicts with new engine
3. 🟡 **IncentivePayout**: No idempotency, can create multiple payouts for same period

---

## 7. Critical Risks

### 7.1 Double Counting Risks

| Model | Risk | Likelihood | Impact |
|-------|------|------------|--------|
| **IncentiveDaily** | Multiple write patterns | 🔴 **HIGH** | 🔴 **CRITICAL** (Financial) |
| **GamificationPointsBalance** | Increment without idempotencyKey | 🟡 **LOW** | 🟡 **MEDIUM** (Engagement) |

**Mitigation:**
- ✅ Gamification has idempotencyKey check
- 🔴 IncentiveDaily needs unified write path

### 7.2 Inconsistent Calculations

| Model | Risk | Likelihood | Impact |
|-------|------|------------|--------|
| **IncentiveDaily** | Legacy vs New engine | 🔴 **HIGH** | 🔴 **CRITICAL** (Financial) |
| **FreightKpiDaily** | On-demand only | 🟡 **MEDIUM** | 🟡 **MEDIUM** (Reporting) |

**Mitigation:**
- 🔴 Deprecate legacy incentive engine
- 🟡 Add scheduled KPI aggregation

### 7.3 Cross-Venture Data Leakage

**Risk Assessment:**
- ✅ **SAFE**: Most models properly scoped with `ventureId`
- 🟡 **WARNING**: Some models have nullable `ventureId`
- ✅ **SAFE**: Unique constraints prevent duplicates
- ✅ **SAFE**: RBAC enforces venture scoping in API routes

**Potential Leakage Points:**
- 🟡 **Load.ventureId nullable**: Some loads may not be scoped
- 🟡 **Customer.ventureId nullable**: Some customers may not be scoped
- 🟡 **LogisticsShipper.ventureId nullable**: Some shippers may not be scoped

**Recommendation:**
- 🟡 Make `ventureId` required (non-nullable) for Load, Customer, LogisticsShipper
- Or: Add data migration to backfill `ventureId` for existing records

### 7.4 Missing Unique Constraints

| Model | Missing Constraint | Risk |
|-------|-------------------|------|
| **IncentivePayout** | Period uniqueness | 🔴 **Can create multiple payouts for same period** |
| **EmployeeKpiDaily** | User+date+venture uniqueness | 🟡 **Can have duplicate KPIs** |

---

## 8. Recommendations

### 8.1 Immediate Actions (Critical)

1. **🔴 Deprecate Legacy Incentive Engine**
   - Remove `/api/incentives/run` (legacy)
   - Remove `lib/incentives.ts` - `calculateIncentivesForDay()`
   - Use only new engine via scheduled job or idempotent manual trigger

2. **🔴 Fix IncentiveDaily Manual Commit**
   - Change `/api/incentives/commit` to use `saveIncentivesForDayIdempotent()`
   - Remove increment-based `saveIncentivesForDay()` or mark as deprecated

3. **🔴 Add Unique Constraint to IncentivePayout**
   - Add `@@unique([userId, ventureId, periodStart, periodEnd])`
   - Prevents multiple payouts for same period

4. **🟡 Make ventureId Required**
   - Load: Make `ventureId` non-nullable
   - Customer: Make `ventureId` non-nullable
   - LogisticsShipper: Make `ventureId` non-nullable
   - Add data migration to backfill existing records

### 8.2 Short-Term Actions (High Priority)

1. **🟡 Add Unique Constraint to EmployeeKpiDaily**
   - Add `@@unique([userId, date, ventureId])`
   - Prevents duplicate KPIs

2. **🟡 Add Scheduled KPI Aggregation**
   - Schedule FreightKpiDaily calculation (daily)
   - Ensures KPIs are always up-to-date

3. **🟡 Document Shared Ownership**
   - Document Load ownership (Freight API + Import)
   - Document Carrier ownership (Freight API + FMCSA Sync)
   - Add coordination guidelines

### 8.3 Long-Term Actions (Medium Priority)

1. **🟡 Centralize KPI Calculation**
   - Create unified KPI calculation service
   - Scheduled aggregation for all KPI models

2. **🟡 Add Data Validation Layer**
   - Validate venture scoping on all writes
   - Reject writes without proper scoping

3. **🟡 Add Audit Trail for Financial Data**
   - Track all IncentiveDaily writes
   - Track all IncentivePayout creates
   - Enable reconciliation

---

## 9. Summary: Risk Matrix

### Critical Risks (🔴)

| Risk | Model | Impact | Mitigation Priority |
|------|-------|--------|---------------------|
| **Double counting** | IncentiveDaily | Financial | 🔴 **IMMEDIATE** |
| **Conflicting engines** | IncentiveDaily | Financial | 🔴 **IMMEDIATE** |
| **Missing unique constraint** | IncentivePayout | Financial | 🔴 **IMMEDIATE** |

### High Risks (🟡)

| Risk | Model | Impact | Mitigation Priority |
|------|-------|--------|---------------------|
| **Nullable ventureId** | Load, Customer, LogisticsShipper | Data isolation | 🟡 **HIGH** |
| **No scheduled KPI updates** | FreightKpiDaily | Reporting | 🟡 **HIGH** |
| **Missing unique constraint** | EmployeeKpiDaily | Data integrity | 🟡 **HIGH** |

### Medium Risks (🟡)

| Risk | Model | Impact | Mitigation Priority |
|------|-------|--------|---------------------|
| **Shared ownership** | Load, Customer, Carrier | Coordination | 🟡 **MEDIUM** |
| **Nullable ventureId** | BankAccountSnapshot | Data isolation | 🟡 **MEDIUM** |

---

## 10. Data Flow Integrity

### 10.1 Financial Data Flows

```
Load DELIVERED
    │
    └─► Incentive Engine (7 AM)
            │
            ├─► [Idempotent] DELETE + CREATE IncentiveDaily ✅
            │
            └─► [Manual] Increment IncentiveDaily 🔴 RISKY

IncentiveDaily
    │
    └─► Manual Payout Aggregation
            │
            └─► IncentivePayout (no unique constraint) 🔴 RISKY
```

**Issues:**
- 🔴 Manual incentive commit can double count
- 🔴 Payout can be created multiple times for same period

### 10.2 Gamification Data Flows

```
Event Triggered
    │
    └─► awardPointsForEvent()
            │
            ├─► Check idempotencyKey ✅
            │
            └─► Upsert GamificationPointsBalance (increment) ✅
```

**Status:** ✅ **SAFE** - Properly idempotent

---

**End of Data Ownership & Integrity Audit**


