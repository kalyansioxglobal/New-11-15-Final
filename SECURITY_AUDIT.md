# Security Audit Summary

This document tracks the P1 cross-vertical security hardening work. It complements `API_LINK_SCAN.md` by focusing on **auth, scope, RBAC, pagination, and validation** across APIs.

## Logistics Domain (Freight / 3PL)

### Overview

Logistics APIs are primarily under:
- `pages/api/logistics/**`
- `pages/api/freight/**`
- `pages/api/freight-kpi/**`

The goals of this pass:
- Ensure all sensitive endpoints require authentication.
- Enforce venture/office scoping using existing helpers.
- Apply RBAC checks for P&L and other high-sensitivity data.
- Guard destructive/admin/dev-only routes.
- Tighten pagination/date filters and basic validation on heavy endpoints.

### Endpoints Reviewed (Logistics)

#### 1) `/api/logistics/freight-pnl`
- File: `pages/api/logistics/freight-pnl.ts`
- Purpose: Freight P&L summary (revenue, cost, margin, RPM) by day/customer/office.
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Uses `applyLoadScope(user, baseWhere)` to restrict loads by user scope.
- RBAC: ❌ No explicit `can(user, action, resource)` yet – currently relies on scope only.
- Pagination / Limits:
  - Uses `take: 5000` on `prisma.load.findMany`.
  - Date filters via `from` / `to` applied to `billingDate` / `arInvoiceDate`.
- Validation:
  - `from` / `to` parsed as strings, passed to `new Date(...)` without explicit validation.

**Changes to apply (planned):**
- Add RBAC check for P&L access, e.g. `can(user, "view", "LOGISTICS_PNL")`.
- Add basic validation for `from` / `to` (reject obviously invalid dates with 400).
- Consider making `take` configurable with a capped `limit` query param instead of hard-coded 5000.

#### 2) `/api/logistics/dashboard`
- File: `pages/api/logistics/dashboard.ts`
- Purpose: Logistics dashboard (load coverage, margins, office stats, loss reasons).
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Uses `getUserScope(user)` + `ventureId` check.
- RBAC: ❌ No explicit role check – dashboard visible to any authenticated user with venture access.
- Pagination / Limits:
  - Uses bounded time windows (today, last 7 days, last 30 days).
  - GroupBy aggregations are inherently bounded by time windows.
- Validation:
  - Validates `ventureId` is provided; returns 400 if missing.

**Changes to apply (planned):**
- Add RBAC check for dashboard access, e.g. `can(user, "view", "LOGISTICS_DASHBOARD")`.
- Optionally log access for audit in a future pass.

#### 3) `/api/logistics/customers` & `/api/logistics/customers/[id]`
- Files:
  - `pages/api/logistics/customers/index.ts`
  - `pages/api/logistics/customers/[id].ts`
- Purpose:
  - List and manage logistics customers.
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Uses `customerWhereForUser(user)` and `canViewCustomer(user, customer)`.
- RBAC:
  - `createCustomer`: ✅ gated by `isManagerLike(user)`.
  - `updateCustomer`: ✅ gated by `isManagerLike(user)`.
  - `deleteCustomer`: ✅ gated by `isGlobalAdmin(user)`.
- Pagination / Limits:
  - List endpoint currently returns all matching customers (no explicit pagination).
- Validation:
  - `name` required for create; basic ID validation for detail endpoint.

**Changes to apply (planned):**
- Add pagination to `/api/logistics/customers` with `page` / `pageSize` (bounded) for large portfolios.
- Add optional `q` search filter if needed (future UX improvement).

#### 4) `/api/logistics/shippers` & `/api/logistics/shippers/[id]`
- Files:
  - `pages/api/logistics/shippers/index.ts`
  - `pages/api/logistics/shippers/[id].ts`
- Purpose:
  - List, create, update, and (soft) delete shippers.
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Uses `getUserScope(user)` + venture checks.
- RBAC:
  - `POST /shippers`: ✅ gated via `canCreateTasks(user.role)`.
  - `PATCH /shippers/[id]`: ✅ gated via `canCreateTasks(user.role)`.
  - `DELETE /shippers/[id]`: ✅ gated via `isSuperAdmin(user.role)` and only performs a soft delete (`isActive=false`).
- Pagination / Limits:
  - `/shippers` implements `page` / `pageSize` with max 200.
- Validation:
  - Validates `shipperId` for `[id]` route; basic required `ventureId` on POST.

**Changes to apply (planned):**
- Optionally tighten input validation on POST/PATCH (max lengths, email/phone format in a later pass).

#### 5) `/api/logistics/loss-insights`
- File: `pages/api/logistics/loss-insights.ts`
- Purpose: Aggregated insights on lost loads by category and reason.
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Uses `getUserScope(user)` and `ventureId` check.
- RBAC: ❌ No explicit role guard; currently any user with venture access can see portfolio loss analytics.
- Pagination / Limits:
  - Limits window to max 90 days via `days` query param.
- Validation:
  - `ventureId` required; `days` is clamped between 1 and 90.

**Changes to apply (planned):**
- Add RBAC check, e.g. `can(user, "view", "LOGISTICS_LOSS_INSIGHTS")`.

#### 6) `/api/logistics/missing-mappings`
- File: `pages/api/logistics/missing-mappings.ts`
- Purpose: Diagnostics for missing mappings (users without mappings, shippers/carriers without codes, orphan loads).
- Auth: ✅ Uses `requireUser`.
- Scope: ⚠️ Currently **no venture scoping** in queries (`user`, `logisticsShipper`, `carrier`, `load`).
- RBAC: ❌ No role guard – any authenticated user could see global diagnostics.
- Pagination / Limits:
  - `orphanLoads`: limited to 200; other queries unbounded.

**Changes to apply (planned):**
- Treat this as an **admin-only diagnostic** endpoint:
  - Add RBAC check: restrict access to `CEO` / `ADMIN` / similar.
  - Add venture-aware filters for shippers/loads, or clearly document this as global only for super‑admins.
- Optionally add `NODE_ENV` guard if intended as dev‑only.

### P2 Step 3 – Admin / Diagnostic Tightening (Finalized)

**Completion Criteria (P2):**
- Sensitive diagnostics restricted to high‑privilege roles via central RBAC helpers.
- Destructive / test‑data admin endpoints blocked in `NODE_ENV=production`.
- Admin‑only analytics confirmed and documented as global tools.

#### Logistics – `/api/logistics/missing-mappings`
- **Before:**
  - Auth: `requireUser` (any authenticated user).
  - Scope: No venture scoping; global view across all ventures.
  - RBAC: None; any logged‑in user could reach diagnostics.
  - Limits: `orphanLoads` capped at 200; other queries unbounded.
- **After (P2 Step 3):**
  - Auth: `requireAdminPanelUser` (must be able to access admin panel).
  - Scope: Still intentionally **global** for admins across ventures.
  - RBAC: Effectively restricted to `CEO`, `ADMIN`, `HR_ADMIN` and any future roles flagged `canAccessAdminPanel` in `ROLE_CONFIG`.
  - Limits: `orphanLoads` still capped at 200; other queries unchanged.
- **Notes:**
  - Treated as **global admin diagnostics only**; no venture scoping added in P2.
  - Pagination and further output trimming can be revisited in P2.5 if scale requires.

#### BPO – `/api/bpo/agent-kpi`
- **Status:**
  - Auth: `requireAdminPanelUser` (admin‑panel only).
  - Scope: Global across ventures by design for BI/ops analytics.
  - RBAC: Restricted to the same high‑privilege admin‑panel roles as above.
  - Bounds: Date‑range required; volume determined by metric density.
- **P2 verdict:**
  - Considered **conforming to Step 3** as an admin‑only analytics endpoint; any further venture‑scoping is a P2.5+/policy decision.

#### Admin – Destructive / Test‑Data Endpoints under `/api/admin/**`

The following endpoints were specifically hardened in P2 Step 3:

1) `/api/admin/clear-test-data`
   - **Before:**
     - Method: `DELETE` only.
     - Auth: `getServerSession` required.
     - RBAC: Custom `hasPermission(session.user, "delete", "task")` gate.
     - Env Guard: None – callable in production.
   - **After (P2 Step 3):**
     - Added `NODE_ENV` guard: blocks with `403 { error: "Disabled in production" }` when `NODE_ENV === "production"` **before** method/permission checks.
     - Retains existing auth + RBAC for non‑production usage.

2) `/api/admin/seed-test-users`
   - **Before:**
     - Method: `POST` only.
     - Auth: `requireUser`.
     - RBAC: `canManageUsers(current.role)`.
     - Env Guard: None.
   - **After (P2 Step 3):**
     - Added `NODE_ENV` guard at top of handler: blocks with `403 { error: "Disabled in production" }` in production.
     - Keeps `requireUser` + `canManageUsers` checks in non‑production environments.

3) `/api/admin/auto-seed-test-data`
   - **Before:**
     - Method: `POST` only.
     - Auth: `requireUser` (any authenticated user).
     - RBAC: No explicit role gate beyond being logged in.
     - Env Guard: None.
   - **After (P2 Step 3):**
     - Added `NODE_ENV` guard at top: `403 { error: "Disabled in production" }` in production.
     - Retains existing `requireUser` auth for non‑production seeding.

4) `/api/admin/cleanup-test-data`
   - **Before:**
     - Method: `POST` only.
     - Auth: `getEffectiveUser`.
     - RBAC: Inline role check `user.role !== "CEO" && user.role !== "ADMIN"`.
     - Env Guard: None.
   - **After (P2 Step 3):**
     - Added `NODE_ENV` guard at top: blocks in production with `403 { error: "Disabled in production" }`.
     - Keeps strict role check for `CEO` / `ADMIN` for non‑production cleanup.

**P2.5 Follow‑Ups (explicitly deferred):**
- Broader `/api/admin/**` review for:
  - Output sanitization (avoiding oversharing PII in any diagnostic payloads).
  - Optional structured audit logging for destructive actions.
  - Additional pagination/limits for any heavy diagnostic reads.
- Any future change to make `/api/logistics/missing-mappings` venture‑scoped or to introduce a user‑facing scoped variant.


---

Additional sections for Hotels, BPO, and SaaS will be added as their security passes are executed.

## Hotels / Hospitality Domain

### Overview

Hotel and hospitality APIs are primarily under:
- `pages/api/hospitality/**`
- `pages/api/hotel/**`
- `pages/api/hotels/**`
- `pages/api/hotel-kpi/**`

The goals of this pass:
- Ensure all hotel/hospitality endpoints handling KPIs, reviews, disputes, and financials require authentication.
- Enforce venture/property scoping via `getUserScope(user)` and property → venture relationships.
- Apply RBAC or equivalent permission checks for write/admin operations (disputes, KPIs, GL postings).
- Confirm pagination/date-window limits on high-volume lists and time series.
- Keep any further RBAC/validation refinements as P1.5/P2 items, not P1 blockers.

### Endpoints Reviewed (Hotels / Hospitality)

#### 1) `/api/hospitality/dashboard`
- File: `pages/api/hospitality/dashboard.ts`
- Purpose: Portfolio-level hospitality dashboard (per-hotel cards + review summary).
- Auth: ✅ Uses `requireUser` and rejects unauthenticated calls.
- Scope: ✅ Uses `getUserScope(user)`; hotels are filtered by:
  - `ventureId` if provided, otherwise
  - `ventureId IN scope.ventureIds` when `!scope.allVentures`.
  - `isTest` flag is respected via `includeTest`.
- RBAC: ❌ No explicit resource-level role check; any authenticated user with venture access can see aggregated KPIs.
- Pagination / Limits:
  - Implicitly bounded by 7-day/30-day windows for metrics and reviews; no unbounded large scans.
- Validation:
  - `ventureId` is optional; invalid `ventureId` is handled by Number() → NaN (treated as undefined, then scope filter applies).

**P1 verdict:** Acceptable for P1 (auth + scope enforced, bounded time windows). Explicit RBAC on dashboard viewing can be a P1.5 enhancement.

#### 2) `/api/hospitality/hotels` & `/api/hospitality/hotels/[id]`
- Files:
  - `pages/api/hospitality/hotels/index.ts`
  - `pages/api/hospitality/hotels/[id].ts`
- Purpose: List, create, update, and soft-close hotel properties.
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Uses `getUserScope(user)` and enforces:
  - For list: `ventureId` or `ventureId IN scope.ventureIds` (unless `allVentures`).
  - For detail: rejects if property `ventureId` not in `scope.ventureIds` (unless `allVentures`).
- RBAC:
  - Create (`POST /hospitality/hotels`): ✅ gated via `canCreateTasks(user.role)`.
  - Update (`PATCH /hospitality/hotels/[id]`): ✅ also gated via `canCreateTasks`.
  - Delete (`DELETE /hospitality/hotels/[id]`): ✅ soft-closes the hotel (`status='CLOSED'`), also gated via `canCreateTasks`.
- Pagination / Limits:
  - List endpoint returns all active scoped properties (no explicit pagination). For typical hotel portfolios this is acceptable for P1.
- Validation:
  - Validates `hotelId` for `[id]`. Requires `name` for create; checks for valid `ventureId` when creating.

**P1 verdict:** Auth + scope + RBAC are correctly enforced; lack of pagination is a scale concern, not a security blocker.

#### 3) `/api/hotel/dashboard`
- File: `pages/api/hotel/dashboard.ts`
- Purpose: Venture-level "hotel" dashboard (KPI tiles, tasks, policies, alerts) for hospitality ventures.
- Auth: ✅ Uses `requireUser` and returns 401 if user missing.
- Scope: ✅ Uses `getUserScope(user)` + `can(user, "view", "VENTURE", { ventureId })`:
  - Validates `ventureId` from query.
  - Ensures user can view that venture and restricts tasks/policies by `officeIds` in user scope.
- RBAC: ✅ Uses `can(user, "view", "VENTURE", ...)` to gate access to the venture dashboard.
- Pagination / Limits:
  - Tasks limited to 20 and policies to 10; both filtered by venture and optionally by office.
  - Date windows (last 7 days) used for KPIs.
- Validation:
  - Validates `ventureId` numeric and non-zero; rejects invalid ID with 400.

**P1 verdict:** Already at P1+ standard (auth, scope, RBAC, bounded results).

#### 4) `/api/hotel-kpi/**` (index, upsert, bulk-upsert)
- Files:
  - `pages/api/hotel-kpi/index.ts`
  - `pages/api/hotel-kpi/upsert.ts`
  - `pages/api/hotel-kpi/bulk-upsert.ts`
- Purpose:
  - `index`: read-only KPI time series/summary per hotel or venture.
  - `upsert`/`bulk-upsert`: write KPIs for daily metrics.
- Auth:
  - `index`: ✅ uses `withUser` wrapper and `getUserScope(user)`.
  - `upsert`/`bulk-upsert`: ✅ uses `withUser` + `hasPermission` to ensure only admins/venture heads can upload KPIs.
- Scope:
  - `index`:
    - Requires either `hotelId` or `ventureId`.
    - Validates ID numerics.
    - For `ventureId`, checks membership in `scope.ventureIds`.
    - For `hotelId`, fetches property to get `ventureId` then checks membership.
  - `upsert`/`bulk-upsert`:
    - Validate venture/hotel IDs, but scoping is currently based on role permissions (admin/venture head) rather than `getUserScope`.
- RBAC:
  - `index`: read-only, scoped by venture/hotel; no extra RBAC required for P1.
  - Writes: ✅ strong RBAC via `hasPermission(dbUser, "adminPanel", "admin")` or `role === 'VENTURE_HEAD'`.
- Pagination / Limits:
  - `index` uses `take: 90` (90-day cap) and date range filters via `parseDateRange`.
- Validation:
  - Validates IDs and dates; returns 400 for invalid inputs.

**P1 verdict:** KPI read/write endpoints meet P1 requirements; explicit scope checks for KPI writers could be added later for finer-grained control.

#### 5) `/api/hospitality/reviews` & `/api/hospitality/reviews/[id]`
- Files:
  - `pages/api/hospitality/reviews/index.ts`
  - `pages/api/hospitality/reviews/[id].ts`
- Purpose:
  - List/ingest hotel reviews (OTA/Google/etc.).
  - View and respond to specific reviews.
- Auth: ✅ Uses `requireUser`.
- Scope:
  - List:
    - Filters by `hotelId` or `ventureId`.
    - When `ventureId` omitted, falls back to `hotel.ventureId IN scope.ventureIds` if `!scope.allVentures`.
    - Respects `isTest` flag.
  - Detail:
    - Loads review + hotel, then ensures `review.hotel.ventureId ∈ scope.ventureIds` (or `allVentures`).
- RBAC:
  - `GET` list/detail: any scoped user can view.
  - `POST /reviews` (create import/manual review): ✅ gated by `canCreateTasks(user.role)`.
  - `PATCH /reviews/[id]` (respond to review): ✅ gated by `canCreateTasks(user.role)` with audit fields `respondedById`/`respondedAt`.
- Pagination / Limits:
  - List: uses `take: 200` with filters; no unbounded query.
- Validation:
  - Requires `hotelId` and `source` for `POST`.
  - Validates review ID numerically for `[id]`.

**P1 verdict:** Reviews endpoints are properly scoped and RBAC’d for write operations; list volume is bounded.

#### 6) `/api/hotels/loss-nights`
- File: `pages/api/hotels/loss-nights.ts`
- Purpose: Pulls high-loss daily reports for hotel properties (loss nights view).
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Uses `getUserScope(user)` and enforces:
  - `hotel.ventureId = ventureId` if provided, otherwise
  - `hotel.ventureId IN scope.ventureIds` if `!scope.allVentures`.
- RBAC: ❌ Read-only analytics, no extra role checks; acceptable for P1.
- Pagination / Limits:
  - Requires `limit` (defaults to 100) and enforces `0 < limit ≤ 500`.
  - Date range optionally bounded via `from`/`to` with end-of-day expansion.
- Validation:
  - Validates `limit` and numeric `hotelId`.

**P1 verdict:** Meets P1 criteria (auth, scope, bounded volume, basic validation).

#### 7) `/api/hotels/[id]/daily-entry`
- File: `pages/api/hotels/[id]/daily-entry.ts`
- Purpose: Write daily hotel KPI + daily report rows.
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Loads property, checks `hotel.ventureId ∈ scope.ventureIds` (or `allVentures`).
- RBAC: ✅ Uses `ROLE_CONFIG[user.role].canUploadKpis` to restrict writes.
- Validation:
  - Validates `hotelId` numeric.
  - Requires `date` and checks parseability.
  - Validates rooms sold vs available (no oversell; available must be > 0).
  - Numeric coercion and safety checks for revenue, cash/credit/online/refund/dues.
- Pagination / Limits: N/A (single daily entry per call).

**P1 verdict:** Strong write‑side controls already in place.

#### 8) `/api/hotels/disputes/**` (index, detail, summary)
- Files:
  - `pages/api/hotels/disputes/index.ts`
  - `pages/api/hotels/disputes/[id].ts`
  - `pages/api/hotels/disputes/summary.ts`
- Purpose: Manage hotel chargebacks/disputes and aggregate property-level dispute metrics.
- Auth & Scope: ✅ All three use `requireHotelAccess(req, res)` from `lib/hotelAuth`, which:
  - Authenticates the user.
  - Enforces property/venture scoping for accessible hotels.
  - Provides `hotelPerm` indicating view-only vs write permissions.
- RBAC:
  - List (`GET /disputes`), Summary (`GET /disputes/summary`): accessible to users with at least view access through `requireHotelAccess`.
  - Create (`POST /disputes`): ✅ requires `hotelPerm !== 'view'`.
  - Update (`PUT /disputes/[id]`): ✅ also requires `hotelPerm !== 'view'`.
- Pagination / Limits:
  - Disputes list currently unpaged but filtered by accessible properties and primarily used for operational dashboards.
  - Summary endpoint aggregates via `findMany` then in-memory grouping—bounded by the number of disputes in scoped hotels.
- Validation:
  - Validates dispute ID for `[id]` route.
  - Parses dates for posted/stay/evidence/decision fields.

**P1 verdict:** Auth and scoping are strong via `requireHotelAccess`; write RBAC enforced via `hotelPerm`. Pagination would be a scale improvement but not a P1 blocker.




## BPO Domain (Contact Center / BPO)

### Overview

BPO APIs are primarily under:
- `pages/api/bpo/**`

P1 hardening goals for BPO:
- All endpoints exposing agent, campaign, QA, call, or incentive data require authentication.
- All such data is correctly scoped by BPO venture/client (and campaign) via `getUserScope`/`applyBpoScope`.
- Heavy reports are bounded by date windows and/or `take` limits.
- Write/admin surfaces (KPI upsert, bulk metrics, campaign/agent config, admin KPIs) are gated to appropriate roles.

### Endpoints Reviewed (BPO)

#### 1) `/api/bpo/dashboard`
- File: `pages/api/bpo/dashboard.ts`
- Purpose: 7-day BPO portfolio dashboard per venture (campaign cards + agent leaderboard + portfolio summary).
- Auth: ✅ Uses `requireUser` and rejects non-GET methods with 405.
- Scope: ✅ Uses `getUserScope(user)` + `ventureId` check:
  - `ventureId` is required; if not provided → 400.
  - Enforces `ventureId ∈ scope.ventureIds` when `!scope.allVentures`; otherwise 403 Forbidden.
- RBAC: ❌ No additional `can(user, action, resource)` check; currently any user with venture access can view the BPO dashboard for that venture.
- Bounds / Scale:
  - Aggregations are explicitly limited to the **last 7 days** (`sevenStart` → `todayEnd`).
  - No unbounded time-range or unlimited result sets.
- Validation:
  - Validates `ventureId` as numeric; returns 400 when missing or falsy.

**P1 verdict:** Meets P1 bar (auth + strict venture scoping + bounded 7-day window). Explicit RBAC (e.g. `BPO_DASHBOARD_VIEW`) would be P1.5, not a blocker.

#### 2) `/api/bpo/kpi`
- File: `pages/api/bpo/kpi/index.ts`
- Purpose: Read-only BPO KPI series & summary for daily campaign metrics.
- Auth: ✅ Uses `withUser` wrapper from `lib/api` and passes `user` into handler.
- Scope: ✅ Uses `getUserScope(user)` and constrains `bpoDailyMetric` via `campaign.ventureId`:
  - If `ventureId` is provided, validates it and ensures it is in `scope.ventureIds` (unless `allVentures`).
  - If `ventureId` is not provided and `!scope.allVentures`, requires `campaign.ventureId IN scope.ventureIds`.
  - `campaignId` validated as a positive integer and applied when present.
- RBAC: Read-only analytics; no extra role gating beyond auth + scoping.
- Bounds / Scale:
  - Uses `parseDateRange` and **limits to 90 rows** via `take: 90`.
- Validation:
  - Validates `ventureId` and `campaignId` as positive integers; invalid values yield 400.

**P1 verdict:** Fully within P1 criteria for read-only KPIs.

#### 3) `/api/bpo/kpi/upsert`
- File: `pages/api/bpo/kpi/upsert.ts`
- Purpose: Single-day BPO KPI upsert for a campaign.
- Auth: ✅ Uses `withUser` then queries `prisma.user` by ID.
- RBAC: ✅ Uses `hasPermission(dbUser, "adminPanel", "admin")` or `dbUser.role === 'VENTURE_HEAD'` to gate writes.
- Scope:
  - Scope is implicit through who can call it (admin panel / venture heads) and by `campaignId`. There is no further `getUserScope` check here.
  - In practice, this endpoint is intended for internal/admin data loading rather than general UI use.
- Bounds / Scale: N/A – upsert is per single `campaignId` + `date`.
- Validation:
  - Requires `campaignId` and `date`.
  - Validates numeric `campaignId` and parses `date` with UTC normalization.

**P1 verdict:** Appropriate for admin-only write surface; explicit venture-level scope checks can be added in a later pass if needed.

#### 4) `/api/bpo/realtime-stats`
- File: `pages/api/bpo/realtime-stats.ts`
- Purpose: Real-time BPO stats for a given venture (agents + campaigns + today’s call logs/metrics).
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Uses `getUserScope(user)` and enforces:
  - `ventureId` is required; 400 if missing.
  - `ventureId ∈ scope.ventureIds` if `!scope.allVentures`; otherwise 403.
  - Campaigns, agents, calls, and metrics are all filtered by `ventureId` and campaign membership.
- RBAC: Read-only; visibility limited by venture scope.
- Bounds / Scale:
  - Applies a **today-only** window for `bpoCallLog`, `bpoDailyMetric`, and `bpoAgentMetric` using `date >= todayStart`.
- Validation:
  - Validates `ventureId` numeric; `campaignId` optional and numeric.

**P1 verdict:** Meets P1 bar (auth, strict venture scoping, bounded-to-today data).

#### 5) `/api/bpo/agents`
- File: `pages/api/bpo/agents/index.ts`
- Purpose: List and create BPO agents.
- Auth: ✅ Uses `requireUser`.
- Scope: ✅ Uses `getUserScope(user)` and `applyBpoScope(user, where)`:
  - List (`GET`):
    - Filters by `ventureId` or `ventureId IN scope.ventureIds` if `!scope.allVentures`.
    - `applyBpoScope` adds any additional BPO-specific constraints.
  - Create (`POST`):
    - Requires `targetVentureId` in body or query; rejects if not in `scope.ventureIds` and `!scope.allVentures`.
- RBAC:
  - `GET`: any scoped authenticated user can list.
  - `POST`: ✅ restricted via `isSuperAdmin(user.role)`.
- Bounds / Scale:
  - `GET` uses `page`/`pageSize` with `take` clamped between 1 and 200.
- Validation:
  - Validates numeric `ventureId` / `campaignId`. Requires `ventureId` and `userId` for creation.

**P1 verdict:** Auth, scoping, pagination, and RBAC on write are all in place.

#### 6) `/api/bpo/agent-kpi`
- File: `pages/api/bpo/agent-kpi.ts`
- Purpose: Aggregated agent KPI report (admin-level) over a date range.
- Auth: ✅ Uses `requireAdminPanelUser(req, res)` – admin-only.
- Scope:
  - Currently **global over admins**; there is no venture scoping filter.
  - Intended as an admin/BI-style endpoint aggregating `bpoAgentMetric` across ventures.
- RBAC: ✅ Explicitly restricted to admin panel users.
- Bounds / Scale:
  - Requires `startDate` and `endDate`; enforces a bounded date range.
  - No hard cap on number of aggregated rows; volume depends on metric density.
- Validation:
  - Requires both `startDate` and `endDate`; parses into `Date` objects.

**P1 verdict:** Safe as an **admin-only** cross-venture analytics tool. If you want per-venture scoping here, that’s a P1.5 policy decision rather than a P1 security hole.

#### 7) `/api/bpo/campaigns` & `/api/bpo/campaigns/[id]` & `/api/bpo/campaigns/[id]/metrics`
- Files:
  - `pages/api/bpo/campaigns/index.ts`
  - `pages/api/bpo/campaigns/[id].ts`
  - `pages/api/bpo/campaigns/[id]/metrics.ts`
- Purpose:
  - List and create BPO campaigns.
  - Fetch and update campaign detail.
  - Fetch and bulk-upsert daily BPO metrics.
- Auth: ✅ All use `requireUser`.
- Scope:
  - List (`GET /campaigns`):
    - Filters by `ventureId` or `ventureId IN scope.ventureIds` if `!scope.allVentures`.
  - Detail (`GET /campaigns/[id]`):
    - Loads campaign, then enforces `campaign.ventureId ∈ scope.ventureIds` (or `allVentures`).
  - Metrics (`GET /campaigns/[id]/metrics`):
    - Validates `campaignId`, ensures user has access to campaign’s venture.
    - Filters `bpoDailyMetric` by `campaignId` and optional date range; defaults to `take: 90` if no `limit` provided.
- RBAC:
  - Create (`POST /campaigns`): ✅ restricted via `isSuperAdmin(user.role)`.
  - Update (`PATCH /campaigns/[id]`): ✅ also restricted via `isSuperAdmin(user.role)`.
  - Bulk metrics (`POST /campaigns/[id]/metrics`): ✅ restricted via `isSuperAdmin(user.role)`.
- Bounds / Scale:
  - Metrics `GET` uses a `limit` param; defaults to 90 when not provided.
  - Bulk `POST` uses `$transaction` over the submitted records; caller controls batch size.
- Validation:
  - Validates campaign IDs and body payloads; rejects non-array `records` for bulk metrics.

**P1 verdict:** Scoped, authenticated, and properly RBAC’d on write/admin surfaces.

