# Freight Module QA Audit - Evidence Appendix

**Generated:** December 13, 2025  
**Audit Report:** FREIGHT_FULL_REPORT.md

---

## 0. Repository Snapshot

```
Commit: 50a9cfaf65db7d3aaf3b73464d5067655b10974e
Node: v20.19.3
NPM: 10.8.2
```

---

## 1. Test Files Inventory

**Command:** `npm test -- --listTests | grep freight`

```
/home/runner/workspace/tests/critical/api/wave16_freight_dispatcher.test.ts
/home/runner/workspace/tests/critical/ai/freightCarrierOutreach.test.ts
/home/runner/workspace/tests/critical/api/freight_quotes_status.test.ts
/home/runner/workspace/tests/critical/freight/matching_carrier_filters.test.ts
/home/runner/workspace/tests/critical/api/freight_quotes_convert_to_load.test.ts
/home/runner/workspace/tests/critical/api/freight_quotes_create.test.ts
/home/runner/workspace/tests/critical/freight/freight_stats.test.ts
/home/runner/workspace/tests/critical/api/freight_load_matches.test.ts
/home/runner/workspace/tests/critical/freight_intelligence/shipperHealthScore.test.ts
/home/runner/workspace/tests/critical/ai/freightCeoEodAssistant.test.ts
/home/runner/workspace/tests/critical/api/logistics_freight_pnl_happy_rbac.test.ts
/home/runner/workspace/tests/critical/api/freight_carrier_preferred_lanes.test.ts
/home/runner/workspace/tests/critical/api/freight_shipper_preferred_lanes.test.ts
/home/runner/workspace/tests/critical/freight_intelligence/carrierIntelligence.test.ts
/home/runner/workspace/tests/critical/freight_intelligence/csrFreightPerformanceScore.test.ts
/home/runner/workspace/tests/critical/ai/freightOpsDiagnosticsApi.test.ts
/home/runner/workspace/tests/critical/freight_intelligence/shipperSeasonality.test.ts
/home/runner/workspace/tests/critical/api/logistics_freight_pnl_limits.test.ts
/home/runner/workspace/tests/critical/ai/freightSummaryApi.test.ts
/home/runner/workspace/tests/critical/api/freight_dormant_customers.test.ts
/home/runner/workspace/tests/critical/ai/freightSummaryAssistant.test.ts
/home/runner/workspace/tests/critical/pages/admin_freight_carrier_preferred_lanes_ssr.test.ts
/home/runner/workspace/tests/critical/pages/admin_freight_shipper_preferred_lanes_ssr.test.ts
/home/runner/workspace/tests/critical/ai/freightOpsDiagnostics.test.ts
/home/runner/workspace/tests/critical/ai/freightEodDraftApi.test.ts
```

**Total: 25 test files**

---

## 2. Freight Test Run Output

**Command:** `npm test -- --testPathPatterns="freight" --runInBand`

```
> my-app@0.1.0 test
> jest --testPathPatterns=freight --runInBand

 PASS  tests/critical/api/wave16_freight_dispatcher.test.ts
 PASS  tests/critical/ai/freightCarrierOutreach.test.ts
 PASS  tests/critical/api/freight_quotes_status.test.ts
 PASS  tests/critical/freight/matching_carrier_filters.test.ts
 PASS  tests/critical/api/freight_quotes_convert_to_load.test.ts
 PASS  tests/critical/api/freight_quotes_create.test.ts
 PASS  tests/critical/freight/freight_stats.test.ts
 PASS  tests/critical/api/freight_load_matches.test.ts
 PASS  tests/critical/freight_intelligence/shipperHealthScore.test.ts
 PASS  tests/critical/ai/freightCeoEodAssistant.test.ts
 PASS  tests/critical/api/logistics_freight_pnl_happy_rbac.test.ts
 PASS  tests/critical/api/freight_carrier_preferred_lanes.test.ts
 PASS  tests/critical/api/freight_shipper_preferred_lanes.test.ts
 PASS  tests/critical/freight_intelligence/carrierIntelligence.test.ts
 PASS  tests/critical/freight_intelligence/csrFreightPerformanceScore.test.ts
 PASS  tests/critical/ai/freightOpsDiagnosticsApi.test.ts
 PASS  tests/critical/freight_intelligence/shipperSeasonality.test.ts
 PASS  tests/critical/api/logistics_freight_pnl_limits.test.ts
 PASS  tests/critical/ai/freightSummaryApi.test.ts
 PASS  tests/critical/api/freight_dormant_customers.test.ts
 PASS  tests/critical/ai/freightSummaryAssistant.test.ts
 PASS  tests/critical/pages/admin_freight_carrier_preferred_lanes_ssr.test.ts
 PASS  tests/critical/pages/admin_freight_shipper_preferred_lanes_ssr.test.ts
 PASS  tests/critical/ai/freightOpsDiagnostics.test.ts
 PASS  tests/critical/ai/freightEodDraftApi.test.ts

Test Suites: 25 passed, 25 total
Tests:       97 passed, 97 total
Snapshots:   0 total
Time:        5.164 s
```

---

## 3. Coverage Report

**Command:** `npm test -- --coverage --testPathPatterns="freight" --runInBand`

```
File                                                    | % Stmts | % Branch | % Funcs | % Lines |
--------------------------------------------------------|---------|----------|---------|---------|
All files                                               |    72.8 |    53.75 |   65.82 |   75.22 |
lib/ai/withAiGuardrails.ts                              |   78.18 |    69.81 |     100 |   79.62 |
lib/ai/freightCarrierOutreachAssistant.ts               |   83.07 |       75 |      50 |   81.96 |
lib/ai/freightOpsDiagnosticsAssistant.ts                |   80.76 |    58.33 |   66.66 |   80.76 |
lib/ai/freightSummaryAssistant.ts                       |     100 |       50 |     100 |     100 |
pages/api/ai/freight-carrier-draft.ts                   |   78.84 |    77.27 |     100 |   78.84 |
pages/api/ai/freight-eod-draft.ts                       |   73.68 |    71.05 |     100 |   75.67 |
pages/api/ai/freight-ops-diagnostics.ts                 |   73.52 |    65.21 |     100 |   75.75 |
pages/api/freight/dormant-customers.ts                  |   88.23 |    92.59 |     100 |    90.9 |
pages/api/freight/quotes/create.ts                      |   83.67 |    59.78 |     100 |   85.41 |
pages/api/freight/quotes/[id]/convert-to-load.ts        |   86.11 |    72.47 |     100 |   88.57 |
pages/api/freight/quotes/[id]/status.ts                 |    87.5 |    69.56 |     100 |   88.88 |
```

---

## 4. E2E Test Files

**Command:** `ls tests/e2e/specs/freight_*.spec.ts`

```
tests/e2e/specs/freight_injection.spec.ts
tests/e2e/specs/freight_loads_isolation.spec.ts
tests/e2e/specs/freight_war_room_action_isolation.spec.ts
tests/e2e/specs/freight_whoami_and_venture_switch.spec.ts
```

---

## 5. Prisma Validation

**Command:** `npx prisma validate && npx prisma migrate status`

```
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀

Datasource "db": PostgreSQL database "heliumdb", schema "public" at "helium"

7 migrations found in prisma/migrations
Following migrations have not yet been applied:
20250112000000_add_fmcsa_fields
20251204000000_baseline
20251208233157_wave16_carrier_dispatcher
20251209000000_add_hotel_pnl_monthly
20251209093000_scalability_indexes
20260101000000_wave16_carrier_dispatchers
20260201000000_wave17_carrier_dispatchers
```

---

## 6. VERIFIED Claims - Code Citations

### 6.1 Margin Computation

**File:** `lib/freight/margins.ts`  
**Function:** `computeMarginFields`  
**Lines:** 8-14

```typescript
export function computeMarginFields(load: MarginLoadLike) {
  const bill = load.billAmount ?? 0;
  const cost = load.costAmount ?? 0;
  const margin = bill - cost;
  const marginPercent = bill > 0 ? margin / bill : 0;

  return { margin, marginPercent };
}
```

**Verification:** Formula correctly computes `margin = bill - cost` and `marginPercent = margin / bill` with null safety.

---

### 6.2 Shipper Health Score

**File:** `lib/freight-intelligence/shipperHealthScore.ts`  
**Function:** `computeShipperHealthScore`  
**Lines:** 28-85

```typescript
const raw =
  0.3 * marginSignal +
  0.25 * volumeSignal +
  0.2 * responseSignal +
  0.2 * retentionSignal -
  0.25 * reliabilityPenalty;

const bounded = Math.max(0, Math.min(1, raw));
const score = Math.round(bounded * 100);

let riskLevel: "green" | "yellow" | "red" = "green";
if (score < 40) riskLevel = "red";
else if (score < 70) riskLevel = "yellow";
```

**Verification:** Weights sum to 0.95 (with penalty subtracted). Risk levels: red < 40, yellow 40-69, green >= 70.

---

### 6.3 Carrier Matching - Lane History

**File:** `lib/logistics/matching.ts`  
**Function:** `getMatchesForLoad`  
**Lines:** 160-218

```typescript
const laneHistoryData = await prisma.load.groupBy({
  by: ["carrierId", "pickupCity", "pickupState", "dropCity", "dropState"],
  where: {
    carrierId: { in: carrierIds },
    loadStatus: { in: ["DELIVERED", "COVERED"] },
    actualDeliveryAt: { gte: twelveMonthsAgo },
  },
  _count: { id: true },
  _max: { actualDeliveryAt: true },
});

for (const row of laneHistoryData) {
  const exactMatch = 
    row.pickupCity?.toLowerCase() === load.pickupCity?.toLowerCase() &&
    row.dropCity?.toLowerCase() === load.dropCity?.toLowerCase();
  
  const stateMatch = !exactMatch &&
    row.pickupState?.toLowerCase() === load.pickupState?.toLowerCase() &&
    row.dropState?.toLowerCase() === load.dropState?.toLowerCase();
```

**Verification:** Uses 12-month lookback, counts exact city and state matches separately for scoring.

---

## 7. Bug Fix Applied

### File: lib/ai/withAiGuardrails.ts

**Line 200 (Before):**
```typescript
if (!result.success) {
  return res.status(500).json({ error: result.error || "AI_ERROR" });
}
```

**Line 200 (After):**
```typescript
if (!result.success) {
  return res.status(400).json({ error: result.error || "AI_ERROR" });
}
```

**Current code verification (lines 191-204):**
```typescript
      if (!result.success) {
        return res.status(400).json({ error: result.error || "AI_ERROR" });
      }

      return res.json(result.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorType = err instanceof Error ? err.name : "UnknownError";
```

**Tests run after fix:**
```
Test Suites: 25 passed, 25 total
Tests:       97 passed, 97 total
```

---

*Evidence collected: December 13, 2025*
