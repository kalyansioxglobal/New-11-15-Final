# RBAC Policy – SIOX Command Center

This document captures **actual, implemented** resource → action → roles mappings for key operational APIs. It is aligned with `lib/permissions.ts`, `lib/scope.ts`, and the handlers under `pages/api`.

Below we document the endpoints touched through Waves 6B and 7 (Logistics, Incentives, Hotels, Tasks/EOD).

---

## 1. Logistics

### 1.1 `/api/logistics/freight-pnl`

**Purpose**  
Portfolio-level freight P&L summary by day, customer, and office.

**Allowed roles**  
Enforced via `canViewPortfolioResource(user, "LOGISTICS_PNL_VIEW")`:
- `CEO`
- `ADMIN`
- `COO`
- `VENTURE_HEAD`
- `FINANCE`

**Auth behavior**  
- Uses `requireUser(req, res)`:
  - On failure, helper returns `401 { error: "UNAUTHENTICATED" }` and the handler returns early.

**Venture / office scope**  
- `applyLoadScope(user, baseWhere)` applies venture/office scoping to all queries based on the user’s allowed ventures/offices.
- Optional filters:
  - `officeId` query param further restricts loads to a specific office.
  - `customerId` query param further restricts to a specific customer.

**Important caps**  
- Date range:
  - Parsed from `from`/`to` query params.
  - If parsing fails, handler falls back to a **30-day default window** instead of returning 400.
  - Maximum: **365 days** between `from` and `to`; if exceeded, returns `400 { error: "Date range too large" }`.
- Row limit:
  - `limit` query param, capped at a maximum of **2000** rows (`take: safeLimit`).

**Logging**  
- Wrapped with `withRequestLogging`, which records structured `api_request` logs (endpoint, user, timing). No payloads are logged.

---

### 1.2 `/api/logistics/loss-insights`

**Purpose**  
Lost loads analytics (by reason category and specific reasons) over a recent time window.

**Allowed roles**  
Enforced via `canViewPortfolioResource(user, "LOGISTICS_LOSS_INSIGHTS_VIEW")`:
- `CEO`
- `ADMIN`
- `COO`
- `VENTURE_HEAD`
- `FINANCE`

**Auth behavior**  
- `requireUser(req, res)` handles unauthenticated requests (401 `UNAUTHENTICATED`).

**Venture / office scope**  
- `getUserScope(user)` returns `{ allVentures, ventureIds, officeIds }`.
- `ventureId` query param is **required**:
  - If missing: `400 { error: 'ventureId is required' }`.
  - If user’s scope does not include this venture (`!allVentures && !ventureIds.includes(ventureId)`): `403 { error: 'FORBIDDEN_VENTURE' }`.
- No office-level filter here; it is a venture-level view.

**Important caps**  
- `days` query param controls the lookback window:
  - Default: **30** days.
  - Minimum: **1** day.
  - Maximum: **90** days, enforced via `Math.min(90, Number(daysParam))`.

**Logging**  
- On handler entry:
  - `logger.info("api_request", { endpoint: "/api/logistics/loss-insights", userId, userRole, outcome: "start" })`.
- On error:
  - `logger.error("api_request_error", { endpoint: "/api/logistics/loss-insights", userId, userRole, outcome: "error" })`.

---

## 2. Incentives

### 2.1 `/api/incentives/plan`

**Purpose**  
Read/write active incentive plan definition for a venture (rules, qualifications, effective dates).

**Allowed roles**  
Enforced directly on the `user.role` from `getEffectiveUser(req, res)`:
- Allowed: `CEO`, `ADMIN`, `COO`, `VENTURE_HEAD`, `FINANCE`.
- All other roles: `403 { error: "Forbidden"/"FORBIDDEN" }` depending on the path taken in the handler.

**Auth behavior**  
- `getEffectiveUser(req, res)` handles unauthenticated requests and returns early after writing a 401; handler does not override.

**Venture scope**  
- Required query param: `ventureId` (string, parsed to positive integer).
- If missing or invalid: `400 { error: "Missing or invalid ventureId" }`.
- Venture scoping beyond this validation is currently implicit; there is no additional `getUserScope` check in this handler.

**Important caps**  
- No explicit date-range or row-count caps here. Complexity is bounded by the number of plan rules per venture.

---

### 2.2 `/api/incentives/user-timeseries`

**Purpose**  
Per-user incentives timeseries for a specific venture (aggregated by day).

**Allowed roles**  
- Leadership-only guard:
  - `CEO`, `ADMIN`, `COO`, `VENTURE_HEAD`, `FINANCE`.
- Enforced by checking `user.role` after `getEffectiveUser(req, res)`; non-leadership roles receive `403 { error: "FORBIDDEN" }`.

**Auth behavior**  
- `getEffectiveUser(req, res)` handles unauthenticated requests; handler returns early without overriding the 401.

**Venture / user scope**  
- Required query params:
  - `userId`: must be a positive integer; otherwise `400 { error: "Invalid userId" }`.
  - `ventureId`: must be a positive integer; otherwise `400 { error: "Invalid ventureId" }`.
- `getUserScope(user)` determines venture-level access:
  - If `!scope.allVentures && !scope.ventureIds.includes(ventureId)`: `403 { error: "FORBIDDEN_VENTURE" }`.

**Important caps**  
- Date range:
  - When no `from`/`to` are supplied, defaults to **30 days** (last 30 days including today).
  - Absolute maximum: **90 days** between `from` and `to`; otherwise `400 { error: "Date range too large" }`.

**Logging**  
- Entry and error logs via `logger.info("api_request", ...)` and `logger.error("api_request_error", ...)` with endpoint, userId/userRole, and outcome.

---

### 2.3 `/api/incentives/venture-summary`

**Purpose**  
Venture-level incentives summary, aggregated by user over a date range.

**Allowed roles**  
Leadership/finance-only pattern:
- `CEO`
- `ADMIN`
- `COO`
- `VENTURE_HEAD`
- `FINANCE`

Non-leadership roles receive:  
`403 { error: "FORBIDDEN" }`.

**Auth behavior**  
- `getEffectiveUser(req, res)` handles unauthenticated requests; handler returns early.

**Venture scope**  
- `ventureId` query param (string) is required and must be a positive integer; otherwise `400 { error: "Invalid ventureId" }`.
- `getUserScope(user)` is used to check access:
  - If `!scope.allVentures && !scope.ventureIds.includes(ventureId)`: `403 { error: "FORBIDDEN_VENTURE" }`.

**Important caps**  
- Date range:
  - Default to a **30-day** window (last 30 days including today) when not provided.
  - Maximum window: **90 days**; if exceeded, `400 { error: "Date range too large" }`.

**Logging**  
- Entry and error logs via `logger.info("api_request", ...)` and `logger.error("api_request_error", ...)` with endpoint, userId/userRole, and outcome.

---

### 2.4 Freight Intelligence (read-only helpers)

**Purpose**  
Internal helper modules under `lib/freight-intelligence/` compute **read-only analytics** such as carrier lane affinity, lane risk, shipper seasonality/health, and CSR performance. They do **not** change any business logic or DB state.

**Allowed roles**  
- These helpers run **behind** existing logistics endpoints and will only ever be used where the caller already has read access:
  - `LOGISTICS_PNL_VIEW`, `LOGISTICS_LOSS_INSIGHTS_VIEW`, `LOGISTICS_DASHBOARD_VIEW`, or customer/load visibility via `customerWhereForUser` / `loadWhereForUser`.
- There is no separate RBAC layer for freight intelligence in Wave 10; access is implied by the underlying endpoint.

**Auth behavior**  
- No direct HTTP entry points were added for freight intelligence in Wave 10.
- All future integrations must respect the existing RBAC for freight endpoints.

---


## 3. Hotels / Hospitality

### 3.1 `/api/hotels/loss-nights`

**Purpose**  
High-loss nights report across hotel properties (flagged by `highLossFlag`).

**Allowed roles**  
Enforced via `canViewPortfolioResource(user, "HOTEL_LOSS_NIGHTS_VIEW")`:
- `CEO`
- `ADMIN`
- `COO`
- `VENTURE_HEAD`
- `FINANCE`

**Auth behavior**  
- Uses `requireUser(req, res)` for auth; unauthenticated requests are handled centrally with 401 `UNAUTHENTICATED`.

**Venture / hotel scope**  
- Filters and validations:
  - `ventureId` (optional) – if present and not numeric → `400 { error: "Invalid ventureId" }`.
  - `hotelId` (optional) – if present and not numeric → `400 { error: "Invalid hotelId" }`.
- `getUserScope(user)` is used to scope by `hotel.ventureId`:
  - If `ventureId` is provided: `where.hotel.ventureId = ventureId`.
  - Else if `!scope.allVentures`: `where.hotel.ventureId = { in: scope.ventureIds }`.
- Out-of-scope ventures typically yield **empty result sets** rather than explicit 403, because scoping is applied via `hotel.ventureId` in the query (documented as current behavior).

**Important caps**  
- `limit` query param:
  - Default: **100**.
  - Valid range: **1–500**; otherwise `400 { error: "Invalid limit" }`.
- Date range:
  - Optional `from` / `to` filters.
  - If both present and the window exceeds **90 days**: `400 { error: "Date range too large" }`.
- Results are ordered by `date DESC` and capped with `take: limit`.

**Logging**  
- Entry and error logs via `logger.info("api_request", ...)` and `logger.error("api_request_error", ...)` with endpoint, userId/userRole, and outcome.

---

## 4. Tasks

### 4.1 `/api/tasks` (GET)

**Purpose**  
Paginated list of tasks visible to the current user, scoped by ventures/offices.

**Allowed roles**  
- Any **authenticated** user can call GET.
- Role primarily impacts POST/assignment rules, not listing.

**Auth behavior**  
- Uses `requireUser(req, res)`; unauthenticated requests receive 401 `UNAUTHENTICATED` from the helper.

**Venture / office scope**  
- `getUserScope(user)` controls filtering:
  - If `!scope.allVentures && scope.ventureIds.length > 0`: `where.ventureId = { in: scope.ventureIds }`.
  - If `!scope.allOffices && scope.officeIds.length > 0`: `where.officeId = { in: scope.officeIds }`.

**Important caps**  
- Pagination:
  - `page`: defaults to **1**, clamped with `Math.max(1, Number(page) || 1)`.
  - `limit`: minimum **1**, maximum **100**, default **50`.
- Response includes `tasks`, `page`, `limit`, `totalCount`, `totalPages`.

**Logging**  
- `logger.info("api_request", { endpoint: "/api/tasks", userId, userRole, outcome: "start" })` at entry.
- On error: `logger.error("api_request_error", { endpoint: "/api/tasks", userId, userRole, outcome: "error" })`.

---

## 5. AI Internal Assistant – Freight

### 5.1 `/api/ai/freight-summary` (GET)

**Purpose**  
Provide leadership with a read-only, AI-generated summary of freight health using existing freight KPIs and the `lib/freight-intelligence/*` helpers. This is an internal advisory tool only.

**Allowed roles**  
- Restricted to the same leadership roles that can view cross-venture freight analytics (P&L / loss insights):
  - `CEO`
  - `ADMIN`
  - `COO`
  - `VENTURE_HEAD`
  - `FINANCE`
- Other roles (EMPLOYEE, CSR, DISPATCHER, etc.) are **not** permitted unless explicitly added in a future wave.

**Auth behavior & feature flags**  
- Uses `requireUser(req, res)` for authentication.
- AI feature flags from `lib/config/ai.ts` gate behavior:
  - If `AI_ENABLED` or `AI_ASSISTANT_FREIGHT_ENABLED` are not `true`, the endpoint returns `503 { error: "AI_ASSISTANT_DISABLED" }`.

**Venture scope**  
- Requires `ventureId` query param:
  - Missing → `400 { error: "ventureId is required" }`.
  - Parsed to number; if invalid → `400` (default Next.js/handler behavior).
- `getUserScope(user)` enforces venture access:
  - If `!scope.allVentures && !scope.ventureIds.includes(ventureId)`: `403 { error: "FORBIDDEN_VENTURE" }`.

**Behavior**  
- Aggregates a small, read-only snapshot for the last N days (currently 7):
  - Load counts, coverage rate, average margin.
  - Top lanes, shippers, carriers, and CSRs by volume.
  - Lightweight scores from freight-intelligence helpers (lane risk, shipper health, carrier availability/affinity, CSR performance).
- Calls `generateFreightSummary(...)`, which in turn calls `callFreightAssistant(...)` behind the AI gateway.
- Returns:
  - `summary`: string (AI-generated advisory text).
  - `metrics`: raw numeric KPIs used to build the prompt.
  - `intelligence`: score objects from helper modules.

**Safety guarantees**  
- No DB writes, no dispatch/actions, no external communications.
- AI output is **advisory only**; it does not trigger any workflows or mutate business state.

---

### 5.2 `/api/ai/freight-carrier-draft` (POST)

**Purpose**  
Draft-only AI-assisted carrier outreach messages (lane availability inquiries, coverage requests, or relationship follow-ups) for internal use by freight teams.

**Allowed roles**  
- `CEO`
- `ADMIN`
- `COO`
- `VENTURE_HEAD`
- `CSR`
- `DISPATCHER`

All other roles receive `403 { error: "FORBIDDEN" }`.

**Auth behavior & feature flags**  
- Uses `requireUser(req, res)` for authentication.
- Requires `AI_ENABLED=true` and `AI_ASSISTANT_FREIGHT_ENABLED=true` via `lib/config/ai.ts`; otherwise `503 { error: "AI_ASSISTANT_DISABLED" }`.

**Behavior**  
- Accepts a JSON body:
  - `carrierName: string` (required)
  - `lane: { origin: string; destination: string }` (required)
  - `load: { pickupDate?: string; weight?: number; equipment?: string; commodity?: string }` (required object, fields optional)
  - `contextNotes?: string`
  - `draftType: "inquiry" | "coverage_request" | "relationship"` (required)
  - **Wave 16 enhancement:**
    - `carrierId?: string` (optional, for DB-backed carrier)
    - `dispatcherId?: string` (optional, for DB-backed dispatcher lookup)
    - `contactRole?: "dispatcher" | "owner"` (optional, defaults to "owner")
    - When `contactRole === "dispatcher"` and `dispatcherId` provided, performs DB lookup via `prisma.carrierDispatcher.findUnique()`.
    - If dispatcher not found: `400 { error: "DISPATCHER_NOT_FOUND" }`.
    - If `dispatcherId` not provided but `contactRole === "dispatcher"`: requires `dispatcherName` (free-form).
- Validates all required fields and returns `400 { error: ... }` on invalid payloads.
- Calls `generateCarrierOutreachDraft(...)` in `lib/ai/freightCarrierOutreachAssistant.ts`, which in turn calls `callFreightAssistant(...)` behind the AI gateway.
- Returns:
  - `draft`: string – the suggested outreach text.
  - `tokensEstimated`: number – a rough token estimate based on the draft length.

**Safety guarantees**  
- No DB reads beyond `requireUser` (for auth), role checks, and optional dispatcher lookup in Wave 16.
- No DB writes, no dispatch or workflow triggers, no external communications.
- Drafts explicitly avoid pricing, contractual commitments, or automation language; a human must copy/paste and approve any final message.

---

### 5.3 `/api/freight/carriers/search` (GET) – Wave 16

**Purpose**  
Typeahead search endpoint for carrier selection in AI drafting UI. Returns up to 10 carriers matching the search query.

**Allowed roles**  
- `CEO`
- `ADMIN`
- `COO`
- `VENTURE_HEAD`
- `CSR`
- `DISPATCHER`

All other roles receive `403 { error: "FORBIDDEN" }`.

**Auth behavior**  
- Uses `requireUser(req, res)` for authentication; unauthenticated requests receive 401 `UNAUTHENTICATED` from the helper.

**Query parameters**  
- `q: string` (required):
  - Search query; if empty or missing: returns `200 { carriers: [] }`.
  - Matches against `carrier.name`, `carrier.mcNumber`, and `carrier.tmsCarrierCode` (case-insensitive partial match).
  - Results are limited to **10** carriers max via `take: 10`.

**Response shape**  
- `200 { carriers: [{ id, name, mcNumber, tmsCarrierCode, createdAt, updatedAt }, ...] }`.

**Behavior**  
- No venture scoping is applied; all carriers in the system are searchable by any authorized user.
- Results are ordered by creation date descending (newest first); no pagination controls.
- If no matches: returns `200 { carriers: [] }`.

---

### 5.4 `/api/freight/carriers/[carrierId]/dispatchers` (GET) – Wave 16

**Purpose**  
Retrieve all dispatchers for a specific carrier. Used by the AI drafting UI to populate dispatcher dropdown after carrier selection.

**Allowed roles**  
- `CEO`
- `ADMIN`
- `COO`
- `VENTURE_HEAD`
- `CSR`
- `DISPATCHER`

All other roles receive `403 { error: "FORBIDDEN" }`.

**Auth behavior**  
- Uses `requireUser(req, res)` for authentication; unauthenticated requests receive 401 `UNAUTHENTICATED` from the helper.

**Route parameters**  
- `carrierId: string` (required, URL path):
  - Parsed to integer; if invalid (non-numeric): `400 { error: "Invalid carrierId" }`.

**Response shape**  
- `200 { dispatchers: [{ id, name, email, phone, isPrimary, createdAt, updatedAt }, ...] }`.

**Behavior**  
- Queries `prisma.carrierDispatcher.findMany({ where: { carrierId } })` and returns all matching records.
- If carrier not found or has no dispatchers: returns `200 { dispatchers: [] }` (does not error).
- Results are ordered by `isPrimary DESC` (primary dispatchers first), then `createdAt DESC`.
- No pagination controls; returns all dispatchers for the carrier (typically 1–10 per carrier).

**Important notes**  
- No venture scoping is applied; any authorized user can query any carrier's dispatchers.
- Dispatcher contact information (email, phone) is exposed; future waves may add role-based restrictions on PII visibility if needed.





### 4.2 `/api/tasks` (POST)

**Purpose**  
Create a new task within a venture/office, optionally assigned to a user.

**Allowed roles**  
- Requires authentication.
- `canCreateTasks(user.role)` must be `true`; otherwise: `403 { error: 'FORBIDDEN' }`.
- If `assignedToId` is provided, `canAssignTasks(user.role)` must be `true`; otherwise: `403 { error: 'FORBIDDEN_ASSIGN' }`.

**Auth behavior**  
- Same `requireUser(req, res)` as GET.

**Venture / office scope**  
- Body must include `title` and `ventureId`.
- `getUserScope(user)` used for scope:
  - Venture: if `!scope.allVentures && !scope.ventureIds.includes(vId)`: `403 { error: 'FORBIDDEN_VENTURE' }`.
  - Office: if `oId` set and `!scope.allOffices && !scope.officeIds.includes(oId)`: `403 { error: 'FORBIDDEN_OFFICE' }`.

**Important caps / validations**  
- Validates `dueDate`:
  - If invalid: `400 { error: 'INVALID_DUE_DATE' }`.
  - If in the past: `400 { error: 'DUE_DATE_CANNOT_BE_IN_PAST' }`.

**Logging**  
- Same pattern as GET for entry and error logs.

### 4.3 `/api/tasks/overdue-check` (GET)

**Purpose**  
Summarize overdue tasks for a target user (defaulting to the caller) and flag which ones require explanations based on priority-specific thresholds.

**Allowed roles**  
- Any authenticated user can call GET.
- Role does not change behavior; venture scoping and ownership rules enforce who can be inspected.

**Auth behavior**  
- Uses `requireUser(req, res)`; unauthenticated requests receive 401 `UNAUTHENTICATED` from the helper.

**User / venture scope**  
- Query params:
  - `userId` (optional):
    - If omitted: defaults to `user.id`.
    - If provided and `userId !== user.id` and `!scope.allVentures`: `403 { error: 'FORBIDDEN' }`.
  - `includeTest` (optional):
    - When not set or not `'true'`, results are filtered to `isTest: false` tasks.
- No additional venture/office filter is applied here; tasks are implicitly scoped by assignee.

**Important caps / policy**  
- Only considers tasks where:
  - `status` ∈ `{ 'OPEN', 'IN_PROGRESS', 'BLOCKED' }` and
  - `dueDate < today` (normalized to midnight).
- Priority thresholds (days overdue before explanation required):
  - `CRITICAL` / `HIGH`: 3 days.
  - `MEDIUM`: 7 days.
  - `LOW`: 14 days.
- Response shape:
  - `userId`, `totalOverdue`, `requiresExplanation`, `explained`, `tasks`, `thresholds`.
  - Each task entry includes `daysOverdue`, `threshold`, `requiresExplanation`, `hasExplanation`, and basic task + venture/office info.

---


---

## 5. EOD Reports

### 5.1 `/api/eod-reports` (GET)

**Purpose**  
List EOD reports visible to the current user, with optional filtering by date, user, and venture.

**Allowed roles**  
- Any authenticated user can call GET.
- Team visibility is controlled via `ROLE_CONFIG[user.role]?.task?.assign`:
  - If `canViewTeam` is `true` (e.g. managers), they may query for other users’ reports.
  - If `canViewTeam` is `false`, they are restricted to their **own** reports.

**Auth behavior**  
- Uses `requireUser(req, res)`; unauthenticated callers receive 401 `UNAUTHENTICATED` from the helper.

**Venture / user scope**  
- Query params:
  - `date`: optional; if provided, constrained to that day (start/end of day window).
  - `userId`:
    - If provided and `requestedUserId !== user.id` and `!canViewTeam`: `403 { error: 'FORBIDDEN' }`.
    - Else: filters by requested user.
    - If not provided and `!canViewTeam`: defaults to `user.id`.
  - `ventureId`:
    - Parsed to number; if `!scope.allVentures && !scope.ventureIds.includes(requestedVentureId)`: `403 { error: 'FORBIDDEN_VENTURE' }`.
    - Else if not provided and `!scope.allVentures` and `scope.ventureIds.length === 0`: returns `200 []`.


### 5.3 `/api/eod-reports/team` (GET)

**Purpose**  
Provide managers with a per-day summary of EOD submission status for their team, including basic per-user status, hours, tasks completed, and blockers.

**Allowed roles**  
- Only roles where `ROLE_CONFIG[user.role].task.assign === true` (e.g. `MANAGER` per current config) may access this endpoint.
- All other roles receive `403 { error: 'FORBIDDEN' }`.

**Auth behavior**  
- Uses `requireUser(req, res)`; unauthenticated requests receive 401 `UNAUTHENTICATED` from the helper.

**Venture scope**  
- `getUserScope(user)` is used to scope which users can appear in the team list:
  - `ventureId` query param (optional):
    - Parsed to number; if `!scope.allVentures && !scope.ventureIds.includes(requestedVentureId)`: `403 { error: 'FORBIDDEN_VENTURE' }`.
    - When valid, limits team users to those with membership in that venture.
  - If `ventureId` is not provided and `!scope.allVentures`:
    - If `scope.ventureIds.length === 0`: returns `200` with an empty team and zeroed summary.
    - Otherwise, team users are limited to ventures within `scope.ventureIds`.

## 6. AI Multi-Vertical Drafting (Wave 13)

### 6.1 `/api/ai/freight-eod-draft` (POST)

**Purpose**  
Draft-only CEO/leadership EOD summaries for freight using pre-aggregated metrics and intelligence snapshots.

**Allowed roles**  
- `CEO`
- `ADMIN`
- `COO`
- `VENTURE_HEAD`

**Auth & flags**  
- Uses `requireUser(req, res)`.
- Requires `AI_ENABLED=true` and `AI_ASSISTANT_FREIGHT_ENABLED=true`; otherwise `503 { error: "AI_ASSISTANT_DISABLED" }`.

**Behavior**  
- Accepts JSON body with:
  - `draftType` ∈ `{"daily_summary","csr_performance","freight_intelligence","risk_overview"}`.
  - `metrics` object with at least `windowLabel` and optional numeric KPIs.
  - Optional `intelligence` object with lane/shipper/CSR scores.
- Validates `draftType` and `metrics.windowLabel`; invalid payload → `400`.
- Calls `generateFreightCeoEodDraft(...)` and returns `{ draft }`.
- No DB reads/writes inside the handler; metrics are provided by the caller.

**Safety**  
- Drafts explicitly avoid commitments, pricing, and invented numbers; leadership must review before any external use.

---

### 6.2 `/api/ai/hotel-outreach-draft` (POST)

**Purpose**  
Draft-only hotel partner outreach messages (OTA parity, rate update follow-ups, performance notes, thank-you, or escalation).

**Allowed roles**  
- Any role that can view `HOTEL_PORTFOLIO_VIEW` via `canViewPortfolioResource` (typically `CEO`, `ADMIN`, `COO`, `VENTURE_HEAD`, `FINANCE`).
- Additionally, hotel-specific leads such as `HOTEL_LEAD` and `RMN_MANAGER`.

**Auth & flags**  
- Uses `requireUser(req, res)`.
- Requires AI flags (`AI_ENABLED`, `AI_ASSISTANT_FREIGHT_ENABLED`) as above; disabled → `503`.

**Behavior**  
- Accepts JSON body with:
  - `draftType` ∈ `{"ota_parity_issue","rate_update_followup","performance_outreach","thank_you","escalation"}`.
  - `propertyName: string`.
  - Optional `platform`, `issueContext`, `notes`.
- Validates `draftType` and `propertyName`; invalid → `400`.
- Calls `generateHotelOutreachDraft(...)` and returns `{ draft }`.

**Safety**  
- Drafts avoid rate suggestions, ADR/RevPAR recommendations, contractual changes, or OTA/PMS actions; human must copy/paste and send manually.

---

### 6.3 `/api/ai/bpo-client-draft` (POST)

**Purpose**  
Draft-only outreach messages to BPO clients or prospects (cold outreach, follow-ups, KPI notes, SLA reviews, appreciation).

**Allowed roles**  
- `CEO`
- `ADMIN`
- `COO`
- `BPO_MANAGER`
- `ACCOUNT_MANAGER`

**Auth & flags**  
- Uses `requireUser(req, res)`.
- Requires AI flags; disabled → `503`.

**Behavior**  
- Accepts JSON body with:
  - `draftType` ∈ `{"cold_outreach","warm_followup","monthly_kpi","sla_review","appreciation"}`.
  - `clientName: string`.
  - Optional `contextNotes`.
- Validates `draftType` and `clientName`; invalid → `400`.
- Calls `generateBpoClientOutreachDraft(...)` and returns `{ draft }`.

**Safety**  
- Drafts avoid pricing and SLA/contract changes; no CRM writes or automation.

---

### 6.4 `/api/ai/freight-ops-diagnostics` (POST)

**Purpose**  
Draft SRE-style diagnostics based on a provided sample of freight API logs.

**Allowed roles**  
- Restricted to internal ops/engineering leadership roles (e.g. `ADMIN`, `CEO`, `COO`, and other internal tech/ops roles as configured).

**Auth & flags**  
- Uses `requireUser(req, res)`.
- Requires AI flags; disabled → `503`.

**Behavior**  
- Accepts JSON body with:
  - `draftType` ∈ `{"sre_summary","error_clusters","slow_endpoints"}`.
  - `recentLogSample`: non-empty array of `{ endpoint, outcome, errorCode?, durationMs? }`.
- Validates type and non-empty log sample; invalid → `400`.
- Calls `generateFreightOpsDiagnosticsDraft(...)` and returns `{ diagnosticsDraft }`.

**Safety**  
- Drafts do not propose code, deploy commands, or infrastructure changes; they only provide human-readable observations and suggested manual follow-ups.

---


**Important caps / behavior**  
- Defaults `date` to **today** if not provided; normalized to start-of-day.
- Filters to active, non-test users unless `includeTest=true`.
- Response shape:
  - `date` (ISO date string),
  - `summary` object with `total`, `submitted`, `pending`, `needsAttention`, `withBlockers` counts,
  - `team` array, one entry per user, including basic identity, ventures/offices, submitted flag, status, and key numeric fields.

---

### 5.4 `/api/eod-reports/missed-check` (GET)

**Purpose**  
Evaluate whether the current user has missed enough recent working days of EOD submissions to require an explanation, and surface any unresolved explanation record.

**Allowed roles**  
- Any authenticated user can call GET for themselves.

**Auth behavior**  
- Uses `requireUser(req, res)`; unauthenticated requests receive 401 `UNAUTHENTICATED` from the helper.

**Venture scope**  
- Optional `ventureId` query param:
  - Parsed to number; if `!scope.allVentures && !scope.ventureIds.includes(targetVentureId)`: `403 { error: 'FORBIDDEN_VENTURE' }`.
  - When omitted and `!scope.allVentures`, behavior is "current scoped ventures" (per implementation), not changed in this wave.

**Important caps / policy**  
- Looks back **14 calendar days** and derives working days (Mon–Fri).
- Missed days defined as working days with **no** corresponding `eodReport` for the user in the target venture(s).
- Computes `consecutiveMissed` from most recent working day backwards.
- Threshold: `CONSECUTIVE_DAYS_THRESHOLD = 2` (hard-coded).
- If `consecutiveMissed >= threshold`:
  - `requiresExplanation = true` and the handler attempts to load the latest unresolved `missedEodExplanation` for the user (and venture if specified).
- Response shape includes:
  - `userId`, `checkPeriod`, `workingDaysChecked`, `totalMissed`, `consecutiveMissed`, `consecutiveMissedDates`, `threshold`, `requiresExplanation`, `hasExplanation`, and basic explanation metadata when present.

---

### 5.5 `/api/eod-reports/missed-explanation` (GET/POST)

**Purpose**  
Manage EOD missed-explanation records:
- GET: HR/leadership view across users and ventures.
- POST: employee flow to submit or update their own explanation when required.

**Allowed roles**  
- GET:
  - Restricted to roles where `user.role` ∈ `{ 'HR_ADMIN', 'ADMIN', 'CEO' }`.
  - Others receive `403 { error: 'HR_ADMIN_ONLY' }`.
- POST:
  - Any authenticated employee may submit for themselves, subject to scope and threshold checks.

**Auth behavior**  
- Uses `requireUser(req, res)`; unauthenticated requests receive 401 `UNAUTHENTICATED` from the helper.

**Venture scope**  
- Both GET and POST enforce venture scoping via `getUserScope(user)`:
  - If `ventureId` is provided and `!scope.allVentures && !scope.ventureIds.includes(ventureId)`: `403 { error: 'FORBIDDEN_VENTURE' }`.
  - For GET without `ventureId` and `!scope.allVentures`:
    - If `scope.ventureIds.length === 0`: returns `200 { explanations: [] }`.
    - Else limits to ventures in `scope.ventureIds`.

**Important caps / policy**  
- GET:
  - Optional filters: `userId`, `resolved` (`'true'` / `'false'`).
  - Returns at most 100 records, ordered by `createdAt DESC`.
- POST:
  - Requires `ventureId` and non-empty `explanation` string; otherwise `400 { error: 'MISSING_FIELDS' }`.
  - Enforces minimum explanation length (10 chars): too short -> `400 { error: 'EXPLANATION_TOO_SHORT' }` with a descriptive message.
  - Uses the same **14-day working window** and `CONSECUTIVE_DAYS_THRESHOLD = 2` as `/missed-check`.
  - If the current missed streak is **below** threshold: `400 { error: 'NO_EXPLANATION_NEEDED' }`.
  - If an unresolved record already exists for `(userId, ventureId)`, it is updated in place; otherwise a new record is created.

---

### 5.6 `/api/eod-reports/notify-manager` (POST)

**Purpose**  
Mark a `missedEodExplanation` as manager-notified and log an activity entry indicating that notification has been triggered.

**Allowed roles / ownership rules**  
- Authenticated owner of the explanation may notify.
- Global admins (roles where `ROLE_CONFIG[user.role].ventureScope === 'all'`, e.g. `ADMIN` per current config) may notify for any explanation.
- Users who neither own the explanation nor have global venture scope but also lack venture membership for the explanation’s venture receive `403 { error: 'FORBIDDEN' }`.
- Users with venture access but who are not owners and not global admins receive `403 { error: 'ONLY_OWNER_CAN_NOTIFY' }`.

**Auth behavior**  
- Uses `requireUser(req, res)`; unauthenticated requests receive 401 `UNAUTHENTICATED` from the helper.

**Important caps / behavior**  
- Requires `explanationId` in the POST body; missing -> `400 { error: 'MISSING_EXPLANATION_ID' }`.
- If the explanation is not found: `404 { error: 'EXPLANATION_NOT_FOUND' }`.
- If `managerNotified` is already true, returns `200 { alreadyNotified: true }` without changing the record.
- Otherwise:
  - Updates the explanation with `managerNotified = true` and `notifiedAt = now`.
  - Writes an `activityLog` entry with action `MISSED_EOD_EXPLANATION_NOTIFIED` and basic metadata.

---

**Important caps**  
- Results capped with `take: 100` and ordered by `date DESC`, then `createdAt DESC`.

**Logging**  
- Entry and error logs via `logger.info("api_request", ...)` and `logger.error("api_request_error", ...)` with endpoint, userId/userRole, and outcome.

---

### 5.2 `/api/eod-reports` (POST)

**Purpose**  
Create or update an EOD report for the current user and venture.

**Allowed roles**  
- Any authenticated user can submit their own EOD for allowed ventures.

**Auth behavior**  
- Uses `requireUser(req, res)`; unauthenticated requests handled centrally (401 `UNAUTHENTICATED`).

**Venture / office scope**  
- Body must include:
  - `ventureId`
  - `summary`
- `getUserScope(user)` ensures venture is in-scope:
  - If `!scope.allVentures && !scope.ventureIds.includes(vId)`: `403 { error: 'FORBIDDEN_VENTURE' }`.

**Important caps / validations**  
- Prevent future-dated reports:
  - If `reportDate` (body or today) is after **today** (normalized): `400 { error: 'CANNOT_SUBMIT_FUTURE_REPORT' }`.
- Upsert semantics:
  - Existing report found via `userId_date_ventureId` yields an update; status upgraded from `DRAFT` to `SUBMITTED` otherwise preserved.
  - No existing report: creates new with `status: 'SUBMITTED'`.

**Logging**  
- Same `api_request` / `api_request_error` pattern as GET.

---

This policy reflects the **implemented** behavior after Waves 6B and 7, including:
- Auth handling via `requireUser`/`getEffectiveUser`.
- Status codes and error keys for unauthenticated, RBAC-denied, and out-of-scope cases.
- Core caps on date windows and result sizes.
