# Logistics & Freight Systems Audit Report

**Date:** December 15, 2025  
**Auditor:** Senior Logistics & Freight Systems Architect  
**Scope:** Full codebase review for domain compliance and engineering standards

---

## 1. Architecture Summary (Current State)

### 1.1 System Overview

This is a **multi-venture command center** built with Next.js 15, TypeScript, React 19, and PostgreSQL (via Prisma ORM). The freight/logistics module operates as a **freight brokerage management system** supporting:

- Load management (quoting, booking, tracking, delivery)
- Carrier management (FMCSA compliance, dispatchers, lane matching)
- Customer/Shipper management (churn analysis, touch tracking)
- AI-powered analytics (lost load detection, carrier outreach drafts)

### 1.2 Key Entities Identified

| Entity | Model | Purpose |
|--------|-------|---------|
| Load | `Load` | Core shipment record (quote → delivery lifecycle) |
| Carrier | `Carrier` | Trucking companies with FMCSA data |
| Customer | `Customer` | Broker customers (shippers) |
| LogisticsShipper | `LogisticsShipper` | Location-level shipper with churn tracking |
| FreightQuote | `FreightQuote` | Sales quotes before load booking |
| CarrierContact | `CarrierContact` | Outreach history for carriers |
| LogisticsLoadEvent | `LogisticsLoadEvent` | Immutable event log per load |
| CarrierPreferredLane | `CarrierPreferredLane` | Carrier lane preferences |
| ShipperPreferredLane | `ShipperPreferredLane` | Shipper lane preferences with bonus |

### 1.3 Business Flows Identified

```
Quote → Load Creation → Carrier Matching → Tender → 
Pickup Scheduled → In Transit → Delivered → POD → Invoiced → Paid
                     ↓
              [Exception Paths]
              - AT_RISK → FELL_OFF → LOST
              - CLAIM_FILED → CLAIM_RESOLVED
              - TONU / RESCHEDULED / DETENTION
```

### 1.4 Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| FMCSA API | ✅ Implemented | Carrier lookup via `lib/fmcsa.ts` |
| TMS Sync | ✅ Implemented | 3PL load mapping via `ThreePlLoadMapping` |
| SendGrid | ✅ Configured | Email notifications |
| Twilio | ✅ Configured | SMS communications |
| OpenAI | ✅ Implemented | AI-powered analysis |

---

## 2. Domain Compliance Findings

### 2.1 Identifiers & Codes

| Item | Status | Finding |
|------|--------|---------|
| SCAC Codes | ⚠️ **MISSING** | No SCAC code field on Carrier model |
| MC Number | ✅ Present | `Carrier.mcNumber` with unique constraint |
| DOT Number | ✅ Present | `Carrier.dotNumber` with unique constraint |
| UN/LOCODE | ❌ **MISSING** | No standardized location codes |
| ISO 6346 Container | ❌ N/A | Not applicable (no intermodal support) |
| PRO Number | ⚠️ **MISSING** | No PRO number field for carrier tracking |
| BOL Reference | ⚠️ **PARTIAL** | Only `reference` field exists; no dedicated BOL field |
| Seal Numbers | ❌ **MISSING** | No seal number tracking |

### 2.2 Addresses & Locations

| Item | Status | Finding |
|------|--------|---------|
| Address Validation | ⚠️ **MISSING** | No address validation/normalization |
| Structured Addresses | ✅ Partial | City/State/Zip separate fields |
| Geo Coordinates | ❌ **MISSING** | No lat/lng on loads or stops |
| Timezone Storage | ⚠️ **PARTIAL** | Office has timezone; stops do not |
| Freeform vs Structured | ⚠️ **ISSUE** | `shipperName` is freeform string |

### 2.3 Units & Currency

| Item | Status | Finding |
|------|--------|---------|
| Weight Units | ⚠️ **IMPLICIT** | `weightLbs` implies pounds; no unit field |
| Dimensional Weight | ❌ **MISSING** | No dim weight calculation |
| Currency Codes | ✅ Present | `currency` field with default "USD" |
| FX Handling | ❌ **MISSING** | No FX rate storage or conversion |
| Rate Per Mile | ✅ Present | `rpm` field on Load |
| Distance Units | ⚠️ **IMPLICIT** | `miles` field implies US miles |

### 2.4 Time & Events

| Item | Status | Finding |
|------|--------|---------|
| UTC Storage | ✅ Present | Prisma uses UTC by default |
| Timezone Conversions | ⚠️ **MISSING** | No explicit TZ per stop |
| Event Ordering | ✅ Present | `LogisticsLoadEvent` with createdAt |
| Immutable History | ✅ Present | Events are create-only |
| SLA Clocks | ❌ **MISSING** | No SLA tracking for pickup/delivery |
| Appointment Windows | ⚠️ **PARTIAL** | `deliveryAppointment` exists; no pickup appointment |

### 2.5 Shipment Lifecycle

| Item | Status | Finding |
|------|--------|---------|
| State Machine | ⚠️ **IMPLICIT** | `LoadStatus` enum exists; no explicit transitions enforced |
| Allowed Transitions | ❌ **MISSING** | No guard rails on status changes |
| Idempotent Updates | ⚠️ **PARTIAL** | Some endpoints lack idempotency keys |
| Cancellation Flow | ⚠️ **MISSING** | No explicit cancellation status |
| Rebook Flow | ❌ **MISSING** | No rebook tracking |

**LoadStatus Values:**
```
OPEN → WORKING → COVERED → DELIVERED
         ↓          ↓
      DORMANT   AT_RISK → FELL_OFF → LOST
         ↓
       MAYBE → MOVED
```

### 2.6 Stops/Legs

| Item | Status | Finding |
|------|--------|---------|
| Multi-Stop | ❌ **MISSING** | Only origin/destination; no intermediate stops |
| Appointment Windows | ⚠️ **PARTIAL** | Single delivery appointment only |
| Dwell Time | ❌ **MISSING** | No dwell time tracking |
| Detention | ✅ **PARTIAL** | `detentionCost` field; no start/end times |
| Demurrage | ❌ **MISSING** | Not tracked |
| Partial Delivery | ❌ **MISSING** | No partial delivery support |

### 2.7 Rating & Charges

| Item | Status | Finding |
|------|--------|---------|
| Linehaul | ✅ Present | `lineHaulRevenue`, `lineHaulCost` |
| Fuel | ✅ Present | `fuelRevenue`, `fuelCost` |
| Accessorials | ✅ **PARTIAL** | `accessorialRevenue` but no itemization |
| Minimums | ❌ **MISSING** | No minimum charge enforcement |
| Lane/Zone Logic | ⚠️ **IMPLICIT** | Carrier matching uses ZIP-3 regions |
| Rate Audit Trail | ❌ **MISSING** | No history of rate changes |
| Margin Calculation | ✅ Present | `lib/freight/margins.ts` |

### 2.8 Documents & Compliance

| Item | Status | Finding |
|------|--------|---------|
| BOL | ⚠️ **MISSING** | No BOL document model |
| POD | ✅ **EVENT ONLY** | `POD_RECEIVED` event type; no document storage |
| Commercial Invoice | ❌ **MISSING** | Not tracked |
| Packing List | ❌ **MISSING** | Not tracked |
| HS Codes | ❌ N/A | No international shipments |
| Hazmat Flags | ❌ **MISSING** | No hazmat tracking |

### 2.9 Exception Management

| Item | Status | Finding |
|------|--------|---------|
| Damage/Loss | ⚠️ **PARTIAL** | `CLAIM_*` event types exist |
| Late Delivery | ⚠️ **PARTIAL** | Calculated from scheduled vs actual |
| Reconsign | ❌ **MISSING** | Not tracked |
| Refused Delivery | ❌ **MISSING** | Not tracked |
| Address Correction | ❌ **MISSING** | Not tracked |
| OS&D | ❌ **MISSING** | No overage/shortage/damage tracking |
| Claims Workflow | ⚠️ **PARTIAL** | Event types exist; no Claims model |
| TONU | ✅ Present | `TONU` event type |

### 2.10 Data Integrity

| Item | Status | Finding |
|------|--------|---------|
| Required Fields | ⚠️ **ISSUE** | Most Load fields are nullable |
| Referential Integrity | ✅ Present | Foreign keys defined |
| Uniqueness | ✅ Present | Unique constraints on MC/DOT/TMS codes |
| Soft Delete | ⚠️ **PARTIAL** | Files have `deletedAt`; others use hard delete |
| Mode Validation | ❌ **MISSING** | No mode field (LTL/FTL/etc.) |

---

## 3. Engineering Findings

### 3.1 Correctness & Safety

| Item | Status | Finding | Location |
|------|--------|---------|----------|
| Input Validation | ⚠️ **PARTIAL** | Some endpoints lack validation | `pages/api/freight/loads/[id].ts:79` |
| Schema Validation | ❌ **MISSING** | No Zod schemas for API payloads | API routes |
| Type Safety | ✅ Present | TypeScript throughout | - |
| Invariants | ⚠️ **MISSING** | No state machine guards | Load updates |
| Deterministic Calcs | ✅ Present | Margin/score calculations are pure | `lib/freight/` |

### 3.2 Security

| Item | Status | Finding | Location |
|------|--------|---------|----------|
| Authentication | ✅ Present | `requireUser()` on all routes | API routes |
| Authorization | ✅ Present | `can()` permission checks | API routes |
| Secrets Handling | ✅ Present | Environment variables | - |
| PII in Logs | ⚠️ **REVIEW** | Error logging may expose data | `lib/freight/customerChurn.ts:144` |
| Rate Limiting | ✅ Present | Database-backed rate limiting | `lib/rateLimit.ts` |

### 3.3 Reliability

| Item | Status | Finding | Location |
|------|--------|---------|----------|
| Idempotency Keys | ❌ **MISSING** | No idempotency for carrier notifications | `pages/api/freight/loads/[id]/notify-carriers.ts` |
| Retries/Backoff | ⚠️ **PARTIAL** | Not consistent across integrations | - |
| Dead Letter Queue | ❌ **MISSING** | No DLQ for failed jobs | Scheduled jobs |
| Graceful Degradation | ⚠️ **PARTIAL** | Some AI calls have fallbacks | `lib/ai/` |

### 3.4 Observability

| Item | Status | Finding | Location |
|------|--------|---------|----------|
| Structured Logs | ⚠️ **PARTIAL** | Some use console.log/error | Various |
| Correlation IDs | ✅ Present | `requestId` in AuditLog | `lib/requestId.ts` |
| Tracing | ⚠️ **MISSING** | No distributed tracing | - |
| Metrics | ⚠️ **PARTIAL** | KPI calculations but no real-time metrics | - |
| AI Usage Tracking | ✅ Present | `AiUsageLog` model | Schema |

### 3.5 Testing

| Item | Status | Finding | Location |
|------|--------|---------|----------|
| Unit Tests | ✅ Present | Critical path coverage | `tests/critical/` |
| E2E Tests | ✅ Present | Playwright specs | `tests/e2e/` |
| Rating Tests | ⚠️ **PARTIAL** | Some margin tests exist | - |
| Timezone Tests | ❌ **MISSING** | No timezone-specific tests | - |
| Unit Conversion Tests | ❌ N/A | No unit conversions implemented | - |

### 3.6 Performance

| Item | Status | Finding | Location |
|------|--------|---------|----------|
| N+1 Queries | ⚠️ **ISSUE** | Carrier search loops per carrier | `lib/freight/carrierSearch.ts:299-305` |
| Pagination | ✅ Present | Most list endpoints paginated | - |
| Batch Operations | ⚠️ **PARTIAL** | Churn update is sequential | `lib/freight/customerChurn.ts:138-148` |
| Caching | ⚠️ **MISSING** | No caching layer | - |
| Indexes | ✅ Present | Good index coverage on Load | Schema |

### 3.7 Maintainability

| Item | Status | Finding | Location |
|------|--------|---------|----------|
| Separation of Concerns | ✅ Good | Clear lib/api/page structure | - |
| Module Organization | ✅ Good | `lib/freight/`, `lib/freight-intelligence/` | - |
| Naming | ⚠️ **INCONSISTENT** | "Load" vs "Shipment" terminology | Throughout |
| Documentation | ⚠️ **PARTIAL** | Some JSDoc; no API docs | - |
| Config Management | ✅ Present | Environment-based config | - |

---

## 4. Prioritized Punch List

### P0 - Must Fix Now (Critical)

| # | Issue | File | Function/Class | Risk | Recommended Fix | Acceptance Criteria |
|---|-------|------|----------------|------|-----------------|---------------------|
| 1 | **N+1 Query in Carrier Search** | `lib/freight/carrierSearch.ts` | `searchCarriersForLoad()` L299-305 | Performance degradation at scale | Batch lane history queries using `findMany` with carrier IDs | Search returns <500ms for 100+ carriers |
| 2 | **No Load State Machine Guards** | `pages/api/freight/loads/[id].ts` | PATCH handler | Invalid state transitions possible | Implement `validateStatusTransition()` guard | Only valid transitions succeed; invalid return 400 |
| 3 | **Missing Input Validation** | `pages/api/freight/loads/[id].ts` | PATCH handler L49-107 | Invalid data persisted | Add Zod schema validation | Malformed requests return 400 with clear errors |
| 4 | **Dual Status Fields** | `prisma/schema.prisma` | `Load` model | Data inconsistency between `status` and `loadStatus` | Migrate to single `loadStatus` enum field | One source of truth for status |

### P1 - Should Fix Soon (High Priority)

| # | Issue | File | Function/Class | Risk | Recommended Fix | Acceptance Criteria |
|---|-------|------|----------------|------|-----------------|---------------------|
| 5 | **No SCAC Code on Carrier** | `prisma/schema.prisma` | `Carrier` model | EDI integration blocked | Add `scac` field with 2-4 char validation | SCAC stored and validated |
| 6 | **No PRO Number Tracking** | `prisma/schema.prisma` | `Load` model | Cannot track carrier-assigned numbers | Add `proNumber` field | PRO numbers stored per load |
| 7 | **Missing Idempotency for Notifications** | `pages/api/freight/loads/[id]/notify-carriers.ts` | POST handler | Duplicate notifications possible | Add idempotency key header check | Same key returns cached response |
| 8 | **Sequential Churn Updates** | `lib/freight/customerChurn.ts` | `updateAllCustomerChurnMetrics()` L138 | Slow batch processing | Use Promise.allSettled with chunking | 1000 customers processed in <30s |
| 9 | **No Multi-Stop Support** | `prisma/schema.prisma` | `Load` model | Cannot handle LTL multi-stop | Add `Stop` model with sequence ordering | Multi-stop loads supported |
| 10 | **Missing Appointment Windows** | `prisma/schema.prisma` | `Load` model | No pickup appointment tracking | Add `pickupAppointment`, `pickupFlexHours` | Both ends have appointment windows |

### P2 - Should Fix (Medium Priority)

| # | Issue | File | Function/Class | Risk | Recommended Fix | Acceptance Criteria |
|---|-------|------|----------------|------|-----------------|---------------------|
| 11 | **Implicit Weight Units** | `prisma/schema.prisma` | `Load.weightLbs` | Metric confusion for international | Add `weightUnit` enum field or rename clearly | Units explicit in model |
| 12 | **No Address Validation** | Multiple API routes | Load creation | Invalid addresses stored | Integrate address validation service | Addresses validated on save |
| 13 | **No Mode Field** | `prisma/schema.prisma` | `Load` model | Cannot distinguish LTL/FTL/Parcel | Add `mode` enum field | Mode tracked per load |
| 14 | **Missing BOL Document Model** | `prisma/schema.prisma` | - | No document tracking | Add `LoadDocument` model with type enum | BOL/POD/Invoice documents tracked |
| 15 | **No Hazmat Flags** | `prisma/schema.prisma` | `Load` model | Hazmat loads not identified | Add `isHazmat`, `hazmatClass` fields | Hazmat loads flagged |
| 16 | **PII in Error Logs** | `lib/freight/customerChurn.ts` | L144 | Privacy/compliance risk | Use structured logger with PII redaction | No PII in logs |
| 17 | **Accessorials Not Itemized** | `prisma/schema.prisma` | `Load` model | Cannot audit individual charges | Add `LoadAccessorial` model | Accessorials tracked individually |
| 18 | **No Claims Model** | `prisma/schema.prisma` | - | Claims workflow incomplete | Add `Claim` model with status workflow | Claims fully tracked |
| 19 | **Missing Cancellation Status** | `prisma/schema.prisma` | `LoadStatus` enum | No explicit cancellation tracking | Add `CANCELLED` status with reason | Cancellations tracked |
| 20 | **No Rate Audit Trail** | `prisma/schema.prisma` | - | Rate changes not auditable | Add `LoadRateHistory` model | All rate changes logged |

---

## 5. Unknowns / Missing Specs

### 5.1 Business Logic Unknowns

| Area | Question | Impact |
|------|----------|--------|
| State Transitions | What are the valid LoadStatus transitions? | Cannot enforce state machine |
| Cancellation Rules | What triggers cancellation? Who can cancel? | Cannot implement cancellation flow |
| Claims SLA | What are claims processing SLAs? | Cannot track claims compliance |
| Detention Rules | What are detention start/end triggers? | Cannot automate detention charges |
| Mode Requirements | Is LTL/FTL/Parcel in scope? What fields differ? | Cannot properly model shipments |

### 5.2 Integration Unknowns

| Integration | Question | Impact |
|-------------|----------|--------|
| TMS Sync | What fields sync bidirectionally? | Data consistency risk |
| EDI | Is EDI 204/214/990 support needed? | Cannot plan integration |
| Carrier APIs | Which carrier APIs for tracking? | Cannot implement live tracking |
| ELD Integration | Is ELD/GPS tracking in scope? | Cannot plan visibility features |

### 5.3 Compliance Unknowns

| Area | Question | Impact |
|------|----------|--------|
| Hazmat | Are hazmat shipments in scope? What classes? | Cannot implement hazmat rules |
| International | Is cross-border in scope? | Cannot plan customs/HS codes |
| Insurance | What carrier insurance minimums? | Cannot validate carrier compliance |
| FMCSA Sync | How often to refresh FMCSA data? | Stale compliance data |

---

## 6. Terminology Standardization Proposal

**Current Inconsistency:** The codebase uses "Load" as the primary term but references "Shipment" in some contexts.

**Proposed Canonical Model:**

| Term | Definition | Model |
|------|------------|-------|
| **Load** | A single movement of freight (the core record) | `Load` |
| **Shipment** | Synonym for Load (avoid using) | - |
| **Quote** | A price offer before booking | `FreightQuote` |
| **Stop** | A pickup or delivery location | *To be created* |
| **Leg** | Movement between two stops | *To be created* |
| **Carrier** | The trucking company | `Carrier` |
| **Shipper** | The customer's pickup location | `LogisticsShipper` |
| **Customer** | The broker's customer (parent of shippers) | `Customer` |
| **Lane** | Origin-destination pair | State-to-state or ZIP3-to-ZIP3 |

---

## 7. Summary

### Strengths
- Solid multi-tenant architecture with venture/office scoping
- Good FMCSA compliance integration
- Comprehensive carrier matching with scoring
- Immutable event logging for loads
- Strong RBAC implementation

### Critical Gaps
- No state machine enforcement for load lifecycle
- N+1 query performance issue in carrier search
- Missing multi-stop/leg support for complex shipments
- No explicit mode (LTL/FTL) differentiation
- Missing industry-standard identifiers (SCAC, PRO, BOL)

### Recommended Next Steps
1. Fix P0 issues immediately (performance + data integrity)
2. Define state machine transitions with stakeholders
3. Plan multi-stop model for future LTL support
4. Add Zod validation to all API endpoints
5. Implement structured logging with correlation IDs

---

*Report generated for internal review. Do not distribute externally.*
