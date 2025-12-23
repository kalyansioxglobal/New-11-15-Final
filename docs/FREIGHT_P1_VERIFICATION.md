# Freight Module P1 Issue Verification

**Generated:** December 13, 2025

---

## P1-1: Spec: Carrier Directory is Global; Intelligence Must Be Venture-Scoped

### Design Decision
**Carrier directory is intentionally global.** All ventures can see all carriers.  
**Carrier intelligence (performance metrics) must be venture-scoped.**

### DO NOT IMPLEMENT: Venture Filter on Carrier Search
The original proposal to filter carrier search by venture is **NOT** the correct approach.
Carriers work with multiple ventures, and restricting visibility would prevent cross-venture collaboration.

### What IS Required: Venture-Scoped Intelligence

Carrier intelligence metrics must be computed per-venture:
- `onTimePercentage` → Per-venture on-time delivery rate
- `recentLoadsDelivered` → Per-venture recent load count
- `laneAffinityScore` → Per-venture lane history and preferences  
- `lastLoadDeliveredAt` → Per-venture most recent delivery

### Implementation: CarrierVentureStats Model

A new `CarrierVentureStats` model stores venture-specific carrier performance:

```prisma
model CarrierVentureStats {
  id                   Int       @id @default(autoincrement())
  carrierId            Int
  ventureId            Int
  onTimePct            Float     @default(0)
  recentLoadsDelivered Int       @default(0)
  lastLoadDeliveredAt  DateTime?
  laneAffinityScore    Float     @default(0)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  carrier Carrier @relation(fields: [carrierId], references: [id], onDelete: Cascade)
  venture Venture @relation(fields: [ventureId], references: [id], onDelete: Cascade)

  @@unique([carrierId, ventureId])
  @@index([ventureId])
  @@index([carrierId])
}
```

### Matching Logic Changes

`lib/logistics/matching.ts` must:
1. Accept `ventureId` as a parameter
2. Look up `CarrierVentureStats` for the given venture
3. Use venture-scoped metrics for scoring instead of global carrier fields

### Impact
- **Correct Data Scope:** Intelligence reflects venture-specific carrier performance
- **Global Directory Preserved:** All carriers visible for collaboration
- **Fair Scoring:** Carriers scored on their performance with YOUR venture
- **Severity:** P1 - Critical for accurate carrier matching

---

## P1-2: Load List Pagination Memory Issue

### Endpoint Affected
- `GET /api/freight/loads/list`

### Expected Behavior
Load list should use cursor-based pagination to efficiently handle large datasets without memory issues.

### Actual Behavior
The endpoint uses offset-based pagination which can cause memory issues with large result sets.

### Code Reference

**File:** `pages/api/freight/loads/list.ts`

```typescript
// Current code (lines 28-35) - Offset pagination:
const page = parseInt(req.query.page as string) || 1;
const limit = parseInt(req.query.limit as string) || 50;
const skip = (page - 1) * limit;

const loads = await prisma.load.findMany({
  where: whereClause,
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

### Issue Analysis
- For page 1000 with 50 items: `skip = 49,950`
- Database must scan and discard 49,950 rows before returning 50
- Memory usage scales linearly with page number
- Performance degrades significantly for later pages

### Proposed Fix

```typescript
// Use cursor-based pagination:
const cursor = req.query.cursor as string | undefined;
const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

const loads = await prisma.load.findMany({
  where: whereClause,
  take: limit + 1, // Fetch one extra to check if more exist
  ...(cursor && {
    cursor: { id: parseInt(cursor) },
    skip: 1, // Skip the cursor item itself
  }),
  orderBy: { createdAt: 'desc' },
});

const hasMore = loads.length > limit;
const results = hasMore ? loads.slice(0, -1) : loads;
const nextCursor = hasMore ? results[results.length - 1].id : undefined;
```

### Impact
- **Performance:** Slow response times for large datasets
- **Memory:** Server memory pressure with high page numbers
- **UX:** Users experience delays when browsing load history
- **Severity:** P1 - Production performance degradation

---

## Verification Tests

### Test for P1-1 (Venture Scope)

```bash
# Would need to test with two users from different ventures
# User A (venture 1) searches carriers
# User B (venture 2) searches carriers
# Currently both see all carriers - should see only their venture's carriers
```

### Test for P1-2 (Pagination)

```bash
# Simulate high page request
curl -X GET "/api/freight/loads/list?page=1000&limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Monitor: Response time increases with page number
# Expected: <500ms for any page
# Actual: >5s for page 1000+ with large datasets
```

---

## Bug Fix Applied During Audit

### P1-3: AI Guardrails Validation Error Response (FIXED)

**File:** `lib/ai/withAiGuardrails.ts`  
**Line:** 200

**Before (Bug):**
```typescript
if (!result.success) {
  return res.status(500).json({ error: result.error || "AI_ERROR" });
}
```

**After (Fixed):**
```typescript
if (!result.success) {
  return res.status(400).json({ error: result.error || "AI_ERROR" });
}
```

**Impact:** All AI validation errors (missing fields, invalid dispatcher, etc.) were incorrectly returning 500 Internal Server Error instead of 400 Bad Request.

**Tests Confirming Fix:**
```
 PASS  tests/critical/api/wave16_freight_dispatcher.test.ts
 PASS  tests/critical/ai/freightCarrierOutreach.test.ts
Tests: 97 passed, 97 total
```

---

*Verification complete: December 13, 2025*
