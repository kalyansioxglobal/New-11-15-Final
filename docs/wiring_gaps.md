# Freight/Logistics Wiring Gaps Analysis

## Summary
This document identifies potential wiring issues, orphan code paths, and contract mismatches found during the system validation.

## Issues Found

### 1. CRITICAL: Dual Status Fields on Load Model
**Severity**: Medium
**Location**: `prisma/schema.prisma` - Load model

**Issue**: The Load model has two status fields:
- `loadStatus: LoadStatus` (enum with proper values)
- `status: String?` (legacy string field)

**Evidence**:
```prisma
model Load {
  loadStatus  LoadStatus  @default(OPEN)
  status      String?     // Legacy field - potential confusion
}
```

**Impact**: 
- `convert-to-load` API sets `status: 'QUOTED'` (line 82)
- This is NOT the same as `loadStatus` which defaults to OPEN
- Potential confusion for queries and UI

**Recommendation**: 
- Deprecate `status` field or migrate all logic to use `loadStatus` consistently
- Add JSDoc comment clarifying the difference

---

### 2. WARNING: Missing Quote List UI Page
**Severity**: Low
**Location**: `pages/freight/quotes/`

**Issue**: Only `pages/freight/quotes/[id].tsx` exists - no list/index page for browsing quotes

**Evidence**:
```
pages/freight/quotes/
└── [id].tsx    # Detail page only, no index.tsx
```

**Impact**:
- Users cannot browse/search quotes from UI
- Must navigate directly via URL or from load detail

**Recommendation**:
- Create `pages/freight/quotes/index.tsx` for quote list view
- Or document that quotes are accessed via other means

---

### 3. INFO: Event Logging Consistency
**Severity**: Low
**Location**: Various API endpoints

**Issue**: Not all load status changes create LogisticsLoadEvent entries

**APIs with event logging**:
- ✅ `mark-at-risk.ts` → STATUS_CHANGED
- ✅ `mark-lost.ts` → LOST_CONFIRMED
- ✅ `mark-felloff.ts` → FELL_OFF (assumed)
- ✅ `create.ts` → event logged
- ✅ `update.ts` → event logged

**APIs without explicit event logging for status changes**:
- ❓ `outreach/award.ts` → Sets COVERED status but no LogisticsLoadEvent
- ❓ `quotes/[id]/convert-to-load.ts` → Creates load but no event logged

**Recommendation**:
- Add event logging to award and convert-to-load for complete audit trail

---

### 4. INFO: LoadStatus Enum Values vs Usage
**Severity**: Info
**Location**: Schema and codebase

**Enum Values** (from schema):
```
OPEN, WORKING, COVERED, AT_RISK, FELL_OFF, LOST, DELIVERED, DORMANT, MAYBE, MOVED
```

**Actively Used in APIs**:
- OPEN - Default status
- WORKING - via updates
- AT_RISK - mark-at-risk API
- COVERED - award API
- LOST - mark-lost API  
- FELL_OFF - mark-felloff API
- DELIVERED - via updates

**Potentially Unused**:
- DORMANT - mentioned in docs but no API sets this
- MAYBE - not found in any API
- MOVED - not found in any API

**Recommendation**:
- Verify if DORMANT, MAYBE, MOVED are set via import jobs or other means
- If unused, consider deprecating

---

### 5. INFO: Carrier Search Returns Limited Results
**Severity**: Low
**Location**: `lib/freight/carrierSearch.ts`

**Issue**: Search is limited to 100 carriers and 25 results per category

**Evidence**:
```typescript
const carriers = await prisma.carrier.findMany({
  where: { active: true },
  take: 100,  // Hard limit
});
// ...
recommendedCarriers: recommendedCarriers.slice(0, 25),
newCarriers: newCarriers.slice(0, 25),
```

**Impact**: 
- If venture has >100 active carriers, not all are considered
- May miss best matches

**Recommendation**:
- Add pagination or increase limit based on venture size
- Consider async processing for large carrier pools

---

### 6. INFO: Outreach Conversation Creation Path
**Severity**: Info
**Location**: `pages/api/freight/outreach/`

**Issue**: OutreachConversation is created via reply endpoint, not send endpoint

**Flow**:
1. `send.ts` → Creates OutreachMessage + OutreachRecipient records
2. `reply.ts` → Creates/updates OutreachConversation
3. `award.ts` → Requires OutreachConversation.id

**Impact**:
- Cannot award a load to a carrier who never replied
- Must create reply record first (even if implicit)

**Recommendation**:
- Document this as expected behavior
- Or allow award directly from OutreachRecipient if no reply needed

---

## Contract Validation Summary

### API Input/Output Contracts

| API | Input Validation | Output Contract | Status |
|-----|------------------|-----------------|--------|
| POST /api/freight/quotes/create | ✅ Zod-like validation | ✅ Typed response | OK |
| POST /api/freight/quotes/[id]/convert-to-load | ✅ ID validation | ✅ Typed response | OK |
| GET /api/freight/loads/[id]/carrier-suggestions | ✅ ID validation | ✅ CarrierSearchResult | OK |
| POST /api/freight/outreach/send | ✅ Zod schema | ✅ Typed response | OK |
| POST /api/freight/outreach/award | ✅ Zod schema | ✅ Typed response | OK |
| POST /api/freight/loads/mark-at-risk | ⚠️ Basic validation | ✅ Typed response | OK |
| POST /api/freight/loads/mark-lost | ⚠️ Basic validation | ✅ Typed response | OK |

### Database Foreign Key Integrity

| Relationship | Enforced | Notes |
|--------------|----------|-------|
| Load → Customer | Optional (nullable) | ✅ Validated |
| Load → Shipper | Optional (nullable) | ✅ Validated |
| Load → Carrier | Optional (nullable) | ✅ Validated |
| FreightQuote → Customer | Required | ✅ Validated |
| FreightQuote → Load | Optional (nullable) | ✅ Set on conversion |
| OutreachMessage → Load | Required | ✅ Validated |
| OutreachConversation → Load | Optional | ⚠️ May be null |

---

## Orphan Detection

### Unused API Endpoints (Potential)
Based on UI page analysis, these APIs may have limited UI integration:

| API | UI Reference | Status |
|-----|-------------|--------|
| GET /api/freight/low-margin-radar | Not found | ⚠️ Check usage |
| GET /api/freight/carriers/dispatchers | Not found in pages | ⚠️ May be AJAX |
| GET /api/freight/meta | Not found in pages | ⚠️ May be utility |

### Unused Prisma Models (Potential)
Would need deeper analysis to confirm:
- CarrierVentureStats - Check if populated
- ShipperPreferredLane - Check if used in carrier matching

---

## Recommendations Summary

### High Priority
1. Add event logging to `outreach/award.ts` for COVERED status changes

### Medium Priority
2. Document or deprecate the dual status fields on Load
3. Create quotes list page or document access pattern

### Low Priority
4. Review unused LoadStatus enum values
5. Add pagination to carrier search for large datasets
6. Document outreach conversation flow requirements
