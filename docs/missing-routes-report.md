# Missing Routes Report - 404 Errors

**Generated**: Based on frontend code analysis  
**Status**: ACTIVE ISSUES

---

## CRITICAL: Missing Routes Causing 404s

### 1. Hospitality Hotel Detail Routes

**Frontend**: `pages/hospitality/hotels/[id].tsx` (lines 119-123)

These routes are called but **DO NOT EXIST**:

| Route | Method | Called From | Status |
|-------|--------|-------------|--------|
| `/api/hospitality/hotels/[id]/metrics` | GET | `pages/hospitality/hotels/[id].tsx:121` | ❌ MISSING |
| `/api/hospitality/hotels/[id]/reviews` | GET | `pages/hospitality/hotels/[id].tsx:122` | ❌ MISSING |
| `/api/hospitality/hotels/[id]/daily-reports` | GET | `pages/hospitality/hotels/[id].tsx:123` | ❌ MISSING |

**Impact**: Hotel detail page loads but metrics, reviews, and daily reports tabs show empty/error states.

**Expected Response Format** (from frontend code):
- Metrics: `{ metrics: Metric[], summary: MetricsSummary }`
- Reviews: `{ reviews: Review[], summary: ReviewsSummary }`
- Daily Reports: `{ reports: DailyReport[] }`

---

## Routes That Exist But May Have Issues

### 2. Freight Load Detail

**Frontend**: `pages/freight/loads/[id].tsx` (line 302)
- Calls: `GET /api/freight/loads/${id}`
- **Status**: ✅ EXISTS at `pages/api/freight/loads/[id].ts`

### 3. Carrier Match

**Frontend**: `pages/freight/loads/[id].tsx` (line 312)
- Calls: `GET /api/freight/carriers/match?pickupState=...&dropState=...&equipmentType=...`
- **Status**: ✅ EXISTS at `pages/api/freight/carriers/match.ts`

---

## Potential Missing Routes (Need Verification)

Based on API_LINK_SCAN.md, these were marked as TODO:

1. `/api/hospitality/hotels/[id]/metrics` - **CONFIRMED MISSING**
2. `/api/hospitality/hotels/[id]/reviews` - **CONFIRMED MISSING**
3. `/api/hospitality/hotels/[id]/daily-reports` - **CONFIRMED MISSING**

---

## Next Steps

1. ✅ **Create the 3 missing hospitality routes** (COMPLETED)
   - ✅ `/api/hospitality/hotels/[id]/metrics.ts` - Created
   - ✅ `/api/hospitality/hotels/[id]/reviews.ts` - Created  
   - ✅ `/api/hospitality/hotels/[id]/daily-reports.ts` - Updated with scope checks
2. **Test hotel detail page** to ensure all tabs work
3. **Check browser console** for any other 404 errors
4. **Update API inventory** once routes are verified working

---

## Routes Created

### `/api/hospitality/hotels/[id]/metrics`
- **Method**: GET
- **Auth**: Required (requireUser)
- **Scope**: Checks hotel access via getUserScope
- **Response**: `{ metrics: Metric[], summary: MetricsSummary }`
- **Query Params**: `limit` (default 30, max 200), `includeTest` (boolean)

### `/api/hospitality/hotels/[id]/reviews`
- **Method**: GET
- **Auth**: Required (requireUser)
- **Scope**: Checks hotel access via getUserScope
- **Response**: `{ reviews: Review[], summary: ReviewsSummary }`
- **Query Params**: `limit` (default 100, max 200), `includeTest` (boolean)

### `/api/hospitality/hotels/[id]/daily-reports`
- **Method**: GET
- **Auth**: Required (requireUser)
- **Scope**: Checks hotel access via getUserScope (updated)
- **Response**: `{ reports: DailyReport[] }`
- **Query Params**: `limit` (default 30, max 200)

