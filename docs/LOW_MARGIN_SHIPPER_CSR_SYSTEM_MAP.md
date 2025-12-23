# Current System Map: Low-Margin Shipper + CSR Detection

**Date:** December 13, 2025  
**Status:** Read-Only Analysis Complete

---

## 1. Existing Models & Fields (Schema)

### A. Customer/Shipper Model (`prisma/schema.prisma` line 914)

| Model | Key Fields | Purpose |
|-------|------------|---------|
| `Customer` | `id`, `name`, `tmsCustomerCode`, `internalCode` | Canonical shipper/customer record |
| | `assignedSalesId`, `assignedCsrId`, `assignedDispatcherId` | **Direct CSR/Sales ownership** |
| | `churnStatus`, `churnRiskScore`, `lifecycleStatus` | Churn tracking |
| | `lastLoadDate`, `loadFrequencyDays` | Activity metrics |
| | `lastTouchAt`, `lastTouchByUserId` | CSR engagement tracking |
| | `ventureId` | Venture scoping |
| `LogisticsShipper` | Separate model for TMS-imported shippers | Links to `Customer` via `customerId` |

**CSR Ownership:** ✅ **Direct relationship exists** via `Customer.assignedCsrId` → `User`

### B. Load/Shipment Model (`prisma/schema.prisma` line 631)

| Field | Type | Purpose |
|-------|------|---------|
| `billAmount` | Float | Sell/revenue amount |
| `costAmount` | Float | Buy/cost amount |
| `buyRate` | Float | Per-mile buy rate |
| `sellRate` | Float | Per-mile sell rate |
| `rate` | Float | Legacy rate field |
| `customerId` | Int | Links load → Customer |
| `shipperId` | Int | Links load → LogisticsShipper |
| `createdById` | Int | User who created/booked the load |
| `ventureId`, `officeId` | Int | Venture/office scoping |
| `isTest` | Boolean | Test data filtering |

**Margin is NOT stored on Load** - it must be computed from `billAmount - costAmount`

### C. FreightQuote Model (`prisma/schema.prisma` line 1211)

| Field | Purpose |
|-------|---------|
| `sellRate` | Quoted sell rate |
| `buyRateEstimate` | Estimated buy rate |
| `marginEstimate` | **Pre-computed margin estimate on quotes** |
| `salespersonUserId` | CSR/Sales who created the quote |
| `customerId` | Customer the quote is for |

### D. EmployeeKpiDaily Model (`prisma/schema.prisma` line 1012)

| Field | Purpose |
|-------|---------|
| `userId`, `ventureId`, `officeId`, `date` | Unique key |
| `loadsTouched`, `loadsCovered` | Load activity |
| `revenueGenerated` | Revenue KPI |
| `quotesGiven`, `quotesWon` | Quote metrics |
| `callsMade`, `totalCallMinutes` | Call activity |
| Unique: `[userId, date, ventureId, officeId]` | Daily per-user per-venture |

**Gap:** No `marginGenerated` or `avgMarginPercent` fields exist in KPI table

---

## 2. Where Margin is Calculated

### File: `lib/freight/margins.ts`

```typescript
export function computeMarginFields(load: MarginLoadLike) {
  const bill = load.billAmount ?? 0;
  const cost = load.costAmount ?? 0;
  const margin = bill - cost;           // Margin dollars
  const marginPercent = bill > 0 ? margin / bill : 0;  // Margin %
  return { margin, marginPercent };
}
```

**Source of Truth:** Margin is **computed on-the-fly** from `Load.billAmount - Load.costAmount`

**Not stored historically** - recalculated each time

---

## 3. Where CSR Ownership is Stored/Derived

### Primary (Recommended): `Customer.assignedCsrId`

The `Customer` model has direct ownership fields:
- `assignedSalesId` → Sales rep
- `assignedCsrId` → Customer Service Rep
- `assignedDispatcherId` → Dispatcher

### Secondary: Load.createdById

Each load has `createdById` which indicates who booked it. Can be used to infer CSR if direct assignment is missing.

### Relationship Chain:
```
Load.customerId → Customer.assignedCsrId → User (CSR)
```

---

## 4. Existing KPIs/Scorecards Related to Margin

### File: `lib/freight-intelligence/shipperHealthScore.ts`

Computes shipper health from:
- `avgMargin` - monetary average margin
- `expectedFrequency`, `actualFrequency` - volume trends
- `responseRate`, `csrTouchpoints` - engagement
- `cancellations`, `latePickups` - reliability

Returns: `score` (0-100), `riskLevel` (green/yellow/red)

### File: `lib/freight-intelligence/csrFreightPerformanceScore.ts`

Computes CSR performance from:
- `loadsSecured`, `totalQuotes` - quote-to-book ratio
- `avgMargin` - monetary
- `medianResponseMinutes` - speed
- `laneDiversity`, `repeatShipperLoads` - retention

Returns: `score` (0-100), `strengths[]`, `weaknesses[]`

---

## 5. Existing Pages/APIs

### Shipper Profitability

| Endpoint/Page | Path | Inputs | Outputs |
|---------------|------|--------|---------|
| Shipper Churn | `/api/freight/shipper-churn` | ventureId | Churn risk list |
| Shipper ICP | `/api/freight/shipper-icp` | ventureId | Ideal customer profiles |
| Freight Intelligence | `/api/freight/intelligence` | ventureId | Shipper health scores |

### CSR Performance

| Endpoint/Page | Path | Inputs | Outputs |
|---------------|------|--------|---------|
| CSR KPI | `/api/freight/kpi/csr` | ventureId, dateRange | CSR metrics |
| Freight Sales KPI | `/pages/freight/sales-kpi.tsx` | venture filter | CSR scorecard UI |

### Load Profitability

| Endpoint/Page | Path | Inputs | Outputs |
|---------------|------|--------|---------|
| Freight P&L | `/api/freight/pnl` | ventureId, dateRange | Revenue, cost, margin |
| P&L Summary | `/api/freight/pnl/summary` | ventureId | Aggregated P&L |
| Logistics Dashboard | `/api/logistics/dashboard` | ventureId | Load metrics with margin |

### Lane Profitability

| Endpoint | Path | Notes |
|----------|------|-------|
| Lane Risk | `lib/freight-intelligence/laneRiskScore.ts` | Risk scoring per lane |
| Carrier Lane Affinity | `lib/freight-intelligence/carrierLaneAffinity.ts` | Lane-carrier matching |

---

## 6. Gaps to Implement Low-Margin Radar

### Gap 1: No Stored Margin on Loads
- Margin is computed, not persisted
- Need to either: add `margin`, `marginPercent` fields to Load, OR always compute on query

### Gap 2: No Margin KPIs in EmployeeKpiDaily
- Missing: `marginGenerated`, `avgMarginPercent`, `loadsWithNegativeMargin`
- Would need migration + daily aggregation job

### Gap 3: No "Low Margin Alert" Entity
- No table to track low-margin shipper alerts
- No threshold configuration per venture

### Gap 4: No CSR-Shipper Margin Aggregation Table
- Would need a materialized view or summary table: `ShipperCsrMarginSummary`
- Fields: `customerId`, `csrUserId`, `periodStart`, `totalLoads`, `totalMargin`, `avgMarginPercent`

### Gap 5: No Alert/Notification for Margin Threshold Breach
- Need scheduled job to detect and alert

---

## 7. Recommended Minimal Additions (No Big Refactors)

### Option A: Query-Only Approach (Simplest)

1. **New API endpoint:** `/api/freight/low-margin-radar`
   - Queries loads grouped by Customer + CSR
   - Computes margin on-the-fly
   - Returns low-margin shippers with assigned CSR

2. **Filter params:** `ventureId`, `marginThreshold` (e.g., 10%), `dateRange`

3. **Response shape:**
```typescript
{
  lowMarginShippers: [{
    customerId: number,
    customerName: string,
    assignedCsrId: number,
    assignedCsrName: string,
    totalLoads: number,
    totalRevenue: number,
    totalCost: number,
    avgMarginPercent: number,
    trend: "declining" | "stable" | "improving"
  }]
}
```

### Option B: Materialized Summary Table (Better Performance)

1. **Add model:** `ShipperMarginSummary`
   - `customerId`, `csrUserId`, `ventureId`
   - `periodStart`, `periodEnd`
   - `loadCount`, `totalBill`, `totalCost`, `avgMarginPct`

2. **Daily job:** Aggregate loads into summary table

3. **API:** Query summary table with threshold filter

### Option C: Add Margin KPIs to EmployeeKpiDaily

1. **Migration:** Add fields to EmployeeKpiDaily:
   - `marginGenerated` (sum of margin $)
   - `avgMarginPercent` (weighted average)
   - `lowMarginLoadCount` (loads under threshold)

2. **Update KPI aggregation job** to compute these

---

## Summary Decision Table

| What Exists | What's Missing |
|-------------|----------------|
| ✅ `Customer.assignedCsrId` - direct CSR ownership | ❌ Margin not stored on Load |
| ✅ `Load.billAmount`, `costAmount` - margin inputs | ❌ No margin fields in EmployeeKpiDaily |
| ✅ `computeMarginFields()` function | ❌ No shipper-CSR-margin summary table |
| ✅ Shipper health score with margin input | ❌ No low-margin alert/notification system |
| ✅ CSR performance score with margin input | ❌ No threshold configuration per venture |
| ✅ Freight P&L endpoints | ❌ No "Low Margin Radar" UI/API |

---

## Files Referenced

- `prisma/schema.prisma` - All models
- `lib/freight/margins.ts` - Margin computation
- `lib/freight-intelligence/shipperHealthScore.ts` - Shipper scoring
- `lib/freight-intelligence/csrFreightPerformanceScore.ts` - CSR scoring
- `pages/api/freight/pnl.ts` - P&L API
- `pages/api/freight/shipper-churn/index.ts` - Churn analysis
- `pages/api/freight/kpi/csr.ts` - CSR KPIs
