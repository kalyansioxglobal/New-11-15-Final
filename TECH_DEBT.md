# Tech Debt Hotspots – December 2025

This file tracks technical debt discovered through Waves 1–16. Items are prioritized by impact and effort. Completed items have been removed; this reflects the current (post-Wave-16) state.

---

## Codebase Statistics (Post-Wave 16)

| Category | Files | Lines | Status |
|----------|-------|-------|--------|
| Page Components (.tsx) | 105 | ~32,000 | Growing (AI modules added) |
| API Routes (.ts) | 220+ | ~26,000 | Growing (AI + Wave 16 endpoints) |
| React Components | 32 | ~5,200 | Growing (UI enhancements) |
| Library Modules | 68 | ~12,500 | Growing (AI assistants, dispatchers) |
| Database Models | 70+ | — | Added: CarrierDispatcher, GamificationEvent, etc. |
| Test Suites | 50+ | ~6,500 | Growing (Wave 16 tests added) |
| **Total** | **495+** | **~82,200** | Increased from 65K (25% growth) |

---

## Recent Waves Completed (Waves 10–16)

### ✅ Wave 10 – Shipper Churn & Freight Intelligence
- Churn scoring system with dynamic thresholds
- Seasonality detection helpers
- Lane risk and carrier intelligence scaffolding
- **Tech Debt Impact**: Added new analysis helpers but no schema breaking changes

### ✅ Wave 12 – Hotel Disputes + Gamification
- Hotel dispute chargeback workflow
- Gamification points and leaderboards
- **Tech Debt Impact**: Two new feature areas added; need consolidation

### ✅ Wave 15/15b/15c-lite – AI Drafting System
- AI-powered freight carrier outreach assistant
- AI templates system with configurable prompts
- Tone/template selector UI
- **Tech Debt Impact**: Added `lib/ai/` module; templates stored in JSON config; **needs DB-backed template storage in Wave 17**

### ✅ Wave 16 – DB-backed Carriers & Dispatchers
- CarrierDispatcher model + migration
- Carrier search endpoint
- Dispatcher list endpoint
- UI carrier/dispatcher selectors with DB resolution
- **Tech Debt Impact**: Carrier/dispatcher management fully integrated; free-form fallback preserved for backward compatibility

---

## Priority Tech Debt Items (Post-Wave 16)

### 🔴 HIGH PRIORITY (Blocks Wave 17+)

#### AI Template Storage in Database
**Status**: Currently hardcoded JSON in `lib/ai/templates.ts`
**Impact**: Cannot add new templates without code redeploy
**Effort**: 2 weeks
**Wave**: 17
**Action**: 
- Add `AiTemplate` model to Prisma
- Create admin UI for template CRUD
- Migrate existing templates to DB
- **Blocker for**: AI Playbook Engine (Wave 17)

#### Generic Dispatcher Resolution Pattern
**Status**: Implemented in Wave 16, but similar pattern needed for other models
**Impact**: Load creation / Shipper selection / Carrier contact patterns repeat dispatcher logic
**Effort**: 1 week
**Wave**: 17
**Action**:
- Extract to shared `lib/entityResolution.ts` helper
- Use for dispatchers, contacts, sales reps
- Add tests for each pattern

---

## 1. Refactoring Opportunities

### High Impact - Low Effort

#### Custom useFetch Hook
**Files affected**: 67+ pages
**Estimated reduction**: ~1,420 lines (15-25%)

Almost every page repeats this pattern:
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch("/api/...");
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []);
```

**Action**: Create `hooks/useFetch.ts` with generic data fetching.

#### Shared Formatters
**Files affected**: 54+ usages
**Estimated reduction**: ~270 lines

Duplicated across pages:
```typescript
const formatCurrency = (val) => `$${val.toLocaleString(...)}`;
const formatPercent = (val) => `${val.toFixed(1)}%`;
```

**Action**: Create `lib/formatters.ts` with `formatCurrency`, `formatPercent`, `formatDate`.

#### Loading/Error Components
**Files affected**: 71 pages
**Estimated reduction**: ~210 lines

Repeated UI pattern:
```tsx
{loading && <div className="text-gray-500">Loading...</div>}
{error && <div className="text-red-500">{error}</div>}
```

**Action**: Create `components/LoadingState.tsx` and `components/ErrorState.tsx`.

### Medium Impact - Medium Effort

#### API Handler Wrapper
**Files affected**: 200 API routes
**Estimated reduction**: ~1,600 lines (10-20%)

Every API repeats:
```typescript
const user = await requireUser(req, res);
if (!user) return;

if (req.method !== "GET") {
  return res.status(405).json({ error: "Method not allowed" });
}

try {
  // logic
} catch (error) {
  return res.status(500).json({ error: "Internal server error" });
}
```

**Action**: Create `lib/apiHandler.ts` wrapper with auth, method checking, and error handling.

#### Generic KPI Service
**Files affected**: 5 lib files (552 lines)
**Estimated reduction**: ~350 lines (30-40%)

Similar pattern in `kpiFreight.ts`, `kpiHotel.ts`, `kpiBpo.ts`, `kpiSaas.ts`, `kpiHoldings.ts`:
- Type definition for input
- `upsert*KpiDaily` with identical structure
- `summarize*Kpis` with same loop pattern

**Action**: Create `lib/kpi/factory.ts` with `createKpiService<T>()`.

#### DataTable Component
**Files affected**: 30+ pages
**Estimated reduction**: ~300 lines

Same table classes everywhere:
```tsx
<table className="min-w-full text-sm border border-gray-200">
  <thead className="bg-gray-100">
    <th className="px-3 py-2 border text-left">
```

**Action**: Create `components/DataTable.tsx` with standardized styling.

### Lower Priority

#### Merge Similar Pages
**Files affected**: at-risk.tsx, lost.tsx
**Estimated reduction**: ~125 lines

These pages share 80% of code. Consolidate into shared `LoadsTable` component.

---

## 2. TypeScript Suppressions

### High Priority
- [ ] `pages/api/logistics/customer-approval-requests.ts` (782 lines)
  - Notes: Tighten types for external API responses, remove `any` around FMCSA/WHOIS responses.

- [ ] `pages/freight/sales-kpi.tsx` (613 lines)
  - Notes: Define proper KPI types for chart data.

- [ ] `pages/api/import/tms-loads.ts`
  - Notes: Define strict types for TMS row parsing.

### Medium Priority
- [ ] `lib/fmcsa.ts`
  - Notes: Define FMCSA API response types (30+ fields now captured).

- [ ] `lib/freight/carrierSearch.ts`
  - Notes: Define carrier search result types.

- [ ] `pages/api/freight/lost-postmortem.ts`
  - Notes: Type OpenAI response handling.

- [ ] `lib/shipperChurn.ts`
  - Notes: Define types for churn metrics and risk scoring.

---

## 3. Big Files (> 500 lines)

| File | Lines | Recommended Action |
|------|-------|-------------------|
| `pages/freight/lost-and-at-risk.tsx` | 877 | Split into AtRiskLoads, LostLoads, Postmortem components |
| `pages/import/index.tsx` | 816 | Split into tabs: FreightImport, HotelImport, BpoImport |
| `pages/api/logistics/customer-approval-requests.ts` | 782 | Extract approval logic to lib/approvals.ts |
| `pages/freight/carriers/[id].tsx` | 649 | Split into CarrierDetails, CarrierContacts, CarrierLoads |
| `pages/freight/sales-kpi.tsx` | 613 | Extract chart components, define KPI types |
| `pages/freight/loads/[id].tsx` | 570 | Split into LoadDetails, LoadEvents, LoadDocuments |
| `pages/mappings/index.tsx` | 539 | Split into UserMappings, ShipperMappings, CarrierMappings |
| `pages/hospitality/hotels/[id].tsx` | 534 | Split into HotelDetails, HotelReports, HotelReviews |
| `pages/admin/users.tsx` | 523 | Extract UserTable, UserFilters, UserForm |

---

## 4. Shared Helpers to Extract

### Freight Module
- [ ] Load margin + risk calculation → `lib/freight/margins.ts` (exists, extend)
- [ ] Lane formatting (origin → destination) → `lib/freight/lanes.ts`
- [ ] Load status helpers → `lib/freight/loadStatus.ts`
- [ ] Shipper churn calculations → `lib/shipperChurn.ts` (exists)

### Hospitality Module
- [ ] Hotel KPI date-range builder → `lib/hospitality/dateRanges.ts`
- [ ] Metrics aggregation (MTD, YTD, LY) → `lib/hospitality/metrics.ts`
- [ ] Occupancy/ADR/RevPAR calculations → `lib/hospitality/kpiCalc.ts`
- [ ] Dispute summary calculations → `lib/hospitality/disputes.ts`

### BPO Module
- [ ] Agent performance aggregators → `lib/bpo/agentMetrics.ts`
- [ ] Campaign rollups → `lib/bpo/campaignMetrics.ts`

### Shared
- [ ] Pagination helper → `lib/pagination.ts`
- [ ] Date range parsing → `lib/dateRange.ts`

---

## 5. API Patterns to Standardize

- [ ] Apply `withApiErrorHandling` wrapper to all API routes
- [ ] Ensure all routes use `requireUser` before try-catch
- [ ] Add rate limiting to remaining sensitive endpoints
- [ ] Standardize pagination response format: `{ items, total, page, pageSize, totalPages }`

---

## 6. Database Indexes to Review

- [ ] `Load.pickupDate` - Frequently filtered for at-risk loads
- [ ] `Load.lostAt` - Frequently filtered for lost load analysis
- [ ] `HotelDailyReport.date` - Date range queries
- [ ] `BpoAgentMetric.date` - Date range queries
- [ ] `LogisticsShipper.churnRiskScore` - High-risk shipper queries
- [ ] `LogisticsShipper.expectedNextLoadDate` - Churn prediction queries
- [ ] `Carrier.dotNumber` - FMCSA lookup deduplication

---

## 7. Security Improvements

### Security Audit Summary (December 2025)

| Check | Status | Details |
|-------|--------|---------|
| API Authentication | PASS | All 200+ API routes protected with auth guards |
| Auth Guards Used | PASS | requireUser, requireAdminPanelUser, getServerSession |
| PII Logging | PASS | All sensitive logging protected with NODE_ENV checks |
| Rate Limiting | PASS | 10 critical endpoints rate-limited (30 req/min/IP) |
| Bulk Operations | PASS | All deleteMany/updateMany properly scoped |
| Password Handling | PASS | Only test seeding uses plaintext passwords |
| User Data Selection | PASS | No password fields exposed in API responses |

### Completed
- [x] Database-backed rate limiting (RateLimitWindow table)
- [x] Email-based rate limiting for OTP endpoints
- [x] Dev-only OTP logging (pages/api/auth/send-otp.ts:44)
- [x] Dev-only email logging (pages/api/logistics/customer-approval-requests.ts:565)
- [x] Audit trail for approval workflows
- [x] Activity logging for user actions
- [x] FMCSA carrier safety blocking (OUT_OF_SERVICE, NOT_AUTHORIZED)
- [x] All API routes require authentication (no unprotected business logic endpoints)
- [x] Impersonation audit logging with permission checks

### Pending
- [ ] Add CSRF protection for state-changing endpoints
- [ ] Implement request signing for sensitive operations
- [ ] Add input sanitization middleware
- [ ] Add pagination to 171 findMany calls without explicit limits

---

## 8. Performance Optimizations

### Database
- [ ] Add connection pooling configuration
- [ ] Review N+1 query patterns in list endpoints
- [ ] Add database query caching for static lookups

### Frontend
- [ ] Implement React.memo for heavy list components
- [ ] Add virtualization for long lists (loads, carriers)
- [ ] Lazy load chart libraries

### Build
- [ ] Configure tree shaking for production
- [ ] Add bundle size analysis
- [ ] Optimize Tailwind CSS purging

---

## 9. Testing

### Current State
- No automated tests

### Recommended
- [ ] Add Jest + React Testing Library setup
- [ ] Unit tests for lib/ calculations (especially shipperChurn.ts, fmcsa.ts)
- [ ] API endpoint tests for critical paths
- [ ] E2E tests for key workflows (login, load creation, carrier import)

---

## 10. Recent Additions to Monitor

### Shipper Churn Module
- `lib/shipperChurn.ts` - Complex risk scoring logic, needs unit tests
- Pattern-based calculations with dynamic thresholds

### FMCSA Integration
- `lib/fmcsa.ts` - 30+ fields captured, type definitions needed
- Status detection logic (OOS, NOT_AUTHORIZED)

### Hotel Disputes
- Summary calculations per hotel
- Chargeback tracking and resolution workflow

### SaaS Sales KPI
- Demos booked and client onboarding tracking
- Conversion rate calculations

---

## 11. Summary of Potential Reductions

| Opportunity | Files Affected | Est. Line Reduction |
|-------------|---------------|---------------------|
| Custom useFetch hook | 67+ pages | ~1,420 |
| API handler wrapper | 200 files | ~1,600 |
| Generic KPI service | 5 lib files | ~350 |
| Shared formatters | 54 usages | ~270 |
| Loading/Error components | 71 pages | ~210 |
| DataTable component | 30+ pages | ~300 |
| Similar page merge | 2+ pages | ~125 |
| **Total Potential** | | **~4,275 lines (7%)** |

---

## Priority Order

1. **Quick wins** (1-2 hours each):
   - Create `useFetch` hook
   - Create `lib/formatters.ts`
   - Create `LoadingState`/`ErrorState` components

2. **Medium effort** (4-8 hours each):
   - Create API handler wrapper
   - Create `DataTable` component
   - Consolidate at-risk/lost pages

3. **Larger refactors** (1-2 days each):
   - Split large files (800+ lines)
   - Generic KPI service
   - Add test infrastructure

---

*Last updated: December 2025*
