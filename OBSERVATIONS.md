# OBSERVATIONS – Wave 2

This document tracks real and anticipated friction points, UX rough edges, and policy nuances.
No changes are implemented here – this is input for future waves.

## Executive / Parent
- **area:** Exec/Parent dashboard
- **type:** Data interpretation
- **summary:** Aggregates are correct but some leadership users are unsure how parent view aligns with per-vertical numbers.
- **details:** The parent dashboard pulls from per-vertical summaries, but there is no in-UI explanation of how metrics are composed (e.g. which ventures/hotels/offices are included). This can cause doubt when numbers do not intuitively match a mental model.
- **potential_wave:** Exec Dashboard Explainability & Help Text

## Logistics
- **area:** Freight dashboards date UX
- **type:** UX
- **summary:** Different logistics dashboards use slightly different date presets and manual date fields.
- **details:** Freight P&L, main logistics dashboard, and at-risk views all support date ranges but with small inconsistencies in defaults and how quick presets are expressed. This can be confusing when comparing charts side by side.
- **potential_wave:** Unified Date-Range UX Wave

## Hospitality / Hotels
- **area:** Portfolio dashboard RBAC nuance
- **type:** RBAC policy
- **summary:** Hospitality dashboard is now guarded by HOTEL_PORTFOLIO_VIEW but shared understanding of who should get this may vary.
- **details:** Some orgs may want hotel dashboards visible to property/cluster managers, others may restrict to central ops/leadership. The permission flag is flexible but policy needs formalization per client.
- **potential_wave:** RBAC Policy Formalization for Hospitality

- **area:** Disputes/reviews pagination
- **type:** UX / Performance
- **summary:** Disputes and reviews endpoints are paginated/capped, but UI does not always make page boundaries obvious for very large portfolios.
- **details:** Operational staff may expect to "see everything" when troubleshooting; instead they see the latest N rows. Without clear pager/total indicators, there is a risk they assume data is missing.
- **potential_wave:** Hotels List UX (Pager, Totals, Filters)

## BPO
- **area:** Who should see BPO dashboards
- **type:** RBAC policy
- **summary:** Venture- and office-level BPO dashboards are intentionally visible to a broad set of manager roles.
- **details:** Some customers may want more restrictive or more permissive access patterns (e.g. team leads only see their campaigns). The current model is safe but may not perfectly fit every structure.
- **potential_wave:** BPO RBAC Tuning Wave

## SaaS
- **area:** SaaS metrics density
- **type:** UX / Performance
- **summary:** SaaS metrics pages are dense and may overwhelm non-analytical users.
- **details:** Charts and tables expose many metrics at once. While technically correct, non-ops users may need guided views (e.g. "health score" tiles) in future.
- **potential_wave:** SaaS KPIs Simplification Wave

## Holdings
- **area:** Bank snapshot semantics
- **type:** Data interpretation
- **summary:** Bank/asset snapshots are point-in-time, but not all users may realize that.
- **details:** Without prominent "as of" dates and clear wording, some may misread snapshots as period flows rather than balances.
- **potential_wave:** Holdings UX & Copy Wave

## Incentives
- **area:** Mid-level manager access
- **type:** RBAC
- **summary:** Venture-level incentives analytics are currently leadership/finance-only.
- **details:** Some mid-level managers may expect to see incentive analytics for their teams; currently they may rely on ad-hoc exports or leadership to share views.
- **potential_wave:** Incentives Manager View Wave

## IT
- **area:** IT incidents helper endpoints
- **type:** Maintainability
- **summary:** Helper endpoints (assign/update-status) wrap canonical incident endpoints.
- **details:** This is safe but adds surface area. A future cleanup wave could consolidate all writes on the canonical /[id] route and simplify frontend wiring.
- **potential_wave:** IT Endpoint Consolidation Wave

## Tasks / My Day / EOD
- **area:** EOD strictness vs culture
- **type:** Policy / UX
- **summary:** EOD logic enforces non-future submissions, missed-checks, and explanations after streaks, which is good technically but may feel strict depending on culture.
- **details:** Some teams may be comfortable with 2-day thresholds, others might want flexibility for timezones, shift patterns, or explicit off-days; these are not yet modeled.
- **potential_wave:** EOD Policy & Configurability Wave

- **area:** Overdue thresholds per priority
- **type:** Policy / UX
- **summary:** Overdue thresholds are hard-coded per priority (CRITICAL/HIGH/MEDIUM/LOW).
- **details:** These defaults make sense but may not fit every team. Users might expect to manage these thresholds via config in future.
- **potential_wave:** Task Threshold Config Wave


- **area:** Freight seasonality & churn safeguards
- **type:** Policy / Analytics
- **summary:** Wave 10 introduced `shipperSeasonality` helpers that detect simple calendar-based seasonality (Q4, Q1, winter, summer) from pre-aggregated monthly load counts.
- **details:** The helper avoids aggressive flags by only marking seasonality when one quarter/season is ~40%+ above overall average and by treating moderate dips (down to ~40–60% of expected volume) as "normal". Existing churn logic was **not** changed; future waves can use this signal to avoid false churn alerts for seasonal shippers.
- **potential_wave:** Freight Churn Intelligence Wave (integrate seasonality + health scores into churn alerts without schema changes at first).

- **area:** Lane risk & carrier intelligence signals
- **type:** Analytics scaffolding
- **summary:** Wave 10 added pure functions for lane risk, carrier lane affinity, and carrier availability that operate only on in-memory aggregates.
- **details:** These helpers expect pre-aggregated metrics (historical load counts, win rates, margin, falloff/late pickup rates) from existing queries and emit simple `{ score, signals }` objects. They are not wired into any live flows yet; they exist to standardize how lane/coverage risk is computed once product requirements are defined.
- **potential_wave:** Freight Intelligence Surfacing Wave (attach scores to dashboards and internal summaries, potentially feeding read-only AI explanations in Wave 11).

- **area:** Shipper health & CSR performance scoring
- **type:** Analytics scaffolding
- **summary:** Read-only helpers now compute shipper health and CSR/Sales freight performance from pre-aggregated stats.
- **details:** Both helpers are intentionally conservative (0–100 scores with green/yellow/red or strength/weakness breakdowns) and do **not** write to the DB. They are suitable for future use in logistics dashboards, account views, and AI explanations once UX is defined.
- **potential_wave:** Freight Account Intelligence Wave (surface health/performance scores in UI, with drill-down into contributing factors).

- **area:** Freight observability & correlation IDs
- **type:** Logging / Observability
- **summary:** Logistics endpoints (freight P&L, loss insights, customers, loads, dashboard) now emit `freight_api` logs with a requestId correlation field.
- **details:** A lightweight `generateRequestId` helper is used when `x-request-id` is absent. IDs are only used in logs (no DB writes, no response fields). This enables cross-service tracing of freight calls without changing contracts.
- **potential_wave:** Centralized Freight Tracing / SLO Wave (aggregate `freight_api` logs for latency/error dashboards).


- **area:** Tasks & EOD policy coverage
- **type:** Testing / Policy clarification
- **summary:** Wave 9 added policy-focused Jest tests for `/api/tasks`, `/api/tasks/overdue-check`, and the EOD index/team/missed flows to lock in current behavior.
- **details:** Tests now explicitly cover:
  - Task creation vs assignment permissions (`canCreateTasks` vs `canAssignTasks`) and venture scoping on POST `/api/tasks`.
  - Overdue summary behavior for `/api/tasks/overdue-check`, including auth delegation to `requireUser` and the public response shape.
  - EOD visibility rules in `/api/eod-reports` (employees vs managers, userId filters, venture scoping) and `/api/eod-reports/team` (manager-only, scoped ventures, empty-team behavior).
  - Missed-EOD flows across `/api/eod-reports/missed-check`, `/missed-explanation`, and `/notify-manager`, including HR-only access, venture scoping, streak thresholds, and ownership/global-admin rules.
- **potential_wave:** Future Task/EOD Policy Wave may revisit thresholds (e.g. `CONSECUTIVE_DAYS_THRESHOLD`, priority overdue days) and configurability, but Wave 9 intentionally only documented and tested current behavior.

## Wave 5 Candidate Directions (Draft)

1. **Testing & Observability Wave 3**
   - Continue extending Jest/TS coverage and start systematically covering Task/EOD and IT flows, plus basic smoke tests for all dashboards.

2. **Hotels UX & Lists Wave 2**
   - Turn backend-safe lists into more transparent UI, with explicit paging controls, totals, and contextual explanations around KPIs and loss-nights.

3. **Tasks/EOD Policy & UX Wave**
   - Decide on cultural defaults for lateness, explanations, and off-days; reflect them in copy and a few configuration points.

4. **RBAC Tuning & Manager Views Wave**
   - Based on real users, refine which manager roles get which dashboards (Hotels, BPO, Incentives), and optionally add curated manager-tier views.

---

## Additional observations from Wave 6B – Track A

These items were surfaced while adding RBAC and validation tests. They are **descriptive only** and do not imply changes in this wave.

### 1. Mixed unauthenticated handling
- **area:** API auth patterns across verticals
- **type:** Consistency
- **summary:** Some handlers explicitly return `401` with a JSON body when authentication fails, while others rely on helpers like `getEffectiveUser` or `requireUser` that may short-circuit and return early without setting a status/JSON.

## Wave 11 – AI Internal Assistant (Freight)

- **area:** AI gateway & safety
- **type:** Architecture / Safety
- **summary:** Wave 11 introduced a single AI gateway (`lib/ai/aiClient.ts`) and central AI config (`lib/config/ai.ts`) to control all freight-related AI usage behind feature flags.
- **details:**
  - Flags: `AI_ENABLED`, `AI_ASSISTANT_FREIGHT_ENABLED`, `AI_MODEL_FREIGHT_ASSISTANT`, `AI_MAX_TOKENS_PER_REQUEST`, `AI_MAX_DAILY_CALLS` (read from environment with conservative defaults).
  - When flags are off, `callFreightAssistant` throws `AiDisabledError` and `/api/ai/freight-summary` returns `503 { error: "AI_ASSISTANT_DISABLED" }`.
  - A simple token-estimation heuristic enforces `AI_MAX_TOKENS_PER_REQUEST` to avoid oversized prompts.
  - All AI calls are logged with `logger.info("ai_call", { feature: "freight_internal_assistant", model, estimatedTokens, requestId, userId })`.

- **area:** Freight summary assistant
- **type:** Analytics + AI prompt scaffolding
- **summary:** `lib/ai/freightSummaryAssistant.ts` builds compact prompts from freight KPIs and `lib/freight-intelligence/*` outputs, then calls the AI gateway.
- **details:**
  - Inputs are **plain objects**: `FreightSummaryMetricsInput` + `FreightIntelligenceSnapshot` (no Prisma inside the assistant).
  - Prompts include window size, loads/coverage/margins, top lanes/shippers/carriers/CSRs, and lane/shipper/CSR scores.
  - Instructions explicitly forbid inventing new numbers and restrict output to 4–7 advisory bullet points.

- **area:** Freight ops / SRE assistant
- **type:** Logs analysis
- **summary:** `lib/ai/freightOpsAssistant.ts` accepts in-memory `freight_api` log samples and constructs an SRE-focused prompt for AI-based diagnostics.
- **details:**
  - No log storage or querying happens in the assistant; callers must pass `FreightLogEntry[]` explicitly.
  - Prompts list compact JSON lines (endpoint, outcome, errorCode, durationMs) and ask for 3–6 bullets about failing endpoints, common errors, and suggested manual follow-ups.
  - This helper is not yet wired to an HTTP endpoint; it exists for future usage (e.g., `/api/ai/freight-ops-diagnostics`).

- **area:** AI assistant surface – `/api/ai/freight-summary`
- **type:** Internal API
- **summary:** A new GET-only endpoint returns an AI-generated freight summary plus the underlying metrics and intelligence snapshot.
- **details:**
  - RBAC mirrors cross-venture freight analytics (P&L/loss) and is restricted to leadership roles (CEO/ADMIN/COO/VENTURE_HEAD/FINANCE).
  - Aggregation uses existing `load`, `shipper`, `carrier`, and `user` tables to compute a 7-day snapshot (loads, coverage, margins, basic per-lane/shipper/carrier/CSR counts) and then passes aggregates to `lib/freight-intelligence/*` helpers.
  - No new schema, no writes, and no side effects beyond logging.

- **area:** Future AI expansion hooks
- **type:** Forward-looking
- **summary:** Current AI scope is freight-only, read-only, and behind hard flags.
- **details:**
  - Future waves could add assistants for Tasks/EOD, Hotels, and BPO using the same pattern (central gateway, feature flags, leadership-only RBAC, read-only analytics).
  - Any future write-capable AI (e.g., carrier outreach, workflow suggestions) will require a new guardrails design, explicit product decisions, and possibly additional audit logging.


## Wave 12 – AI Carrier Outreach (Drafting-Only)

- **area:** AI carrier outreach drafting
- **type:** AI prompt scaffolding / Safety
- **summary:** Wave 12 introduced a dedicated carrier outreach drafting helper (`lib/ai/freightCarrierOutreachAssistant.ts`) and a single internal endpoint (`POST /api/ai/freight-carrier-draft`) for CSR/Dispatch/Leadership to request draft-only carrier messages.
- **details:**
  - The assistant supports three draft types: `inquiry`, `coverage_request`, and `relationship`.
  - Prompts include carrier name, lane, basic load details, and optional internal notes, plus strict safety instructions:
    - no sending, no automation language, no pricing or contractual promises, and no AI self-reference.
  - The `/api/ai/freight-carrier-draft` endpoint:
    - Is POST-only, uses `requireUser`, and is restricted to roles: CEO, ADMIN, COO, VENTURE_HEAD, CSR, DISPATCHER.
    - Enforces `AI_ENABLED` and `AI_ASSISTANT_FREIGHT_ENABLED` flags, returning `503 { error: "AI_ASSISTANT_DISABLED" }` when disabled.
    - Validates body shape and returns `400` on invalid input; returns `{ draft, tokensEstimated }` on success.
  - There are **no DB writes** and no external communications; humans must copy/paste drafts manually.


## Wave 13 – Multi-Vertical Drafting Suite + Ops Diagnostics

- **area:** AI drafting expansion across freight, hotels, BPO, and ops
- **type:** Multi-vertical AI scaffolding
- **summary:** Wave 13 extended the Wave 11/12 AI gateway and drafting-only safety model to additional domains: CEO freight EOD summaries, hotel partner outreach, BPO client outreach, and freight ops diagnostics.
- **details:**
  - All new helpers live under `lib/ai/*Assistant.ts` and use `callFreightAssistant` with strict prompt instructions (no pricing, no contractual promises, no automation).
  - Four new POST-only endpoints were added (`/api/ai/freight-eod-draft`, `/api/ai/hotel-outreach-draft`, `/api/ai/bpo-client-draft`, `/api/ai/freight-ops-diagnostics`), each with tight RBAC and AI flag enforcement.
  - Each endpoint accepts pre-validated JSON payloads (metrics, property/client names, log samples) and returns a single draft string; no DB writes or external communications are performed.
  - Corresponding UI pages under `/freight/ai/*`, `/hotels/ai/*`, and `/bpo/ai/*` provide simple forms with read-only outputs and copy buttons, reinforcing the "AI suggestion only — human must verify" contract.
- **potential_wave:** Template & Tone Controls Wave (add reusable templates, tone presets, and optional multi-draft generation while keeping the same gateway and safety guarantees).

- **potential_wave:** Multi-Vertical Outreach Wave (extend the same drafting-only pattern to hotel partners, BPO clients, and internal coaching emails, still behind the AI gateway and feature flags).

- **details:**
  - Examples that explicitly return `401` include `/api/tasks` (UNAUTHENTICATED) and `/api/eod-reports`.
  - Examples that rely on `getEffectiveUser` returning `null` simply `return;` from the handler; the helper itself handles the HTTP response.
  - This is functionally acceptable but makes it harder to reason about unauthenticated behavior purely from the handler code.
- **potential_wave:** Auth Flow Normalization (document and, if desired, standardize how 401s are surfaced per domain).

### 2. Mixed out-of-scope handling
- **area:** Venture scope enforcement
- **type:** Consistency
- **summary:** Some endpoints explicitly return `403` when the requested venture is outside the user’s scope, while others rely on scoped queries that effectively return empty data sets.
- **details:**
  - `/api/logistics/loss-insights` and `/api/eod-reports` explicitly return `FORBIDDEN` / `FORBIDDEN_VENTURE` when scope checks fail.
  - `/api/hotels/loss-nights` scopes through `hotel.ventureId`; out-of-scope ventures typically yield no rows rather than an explicit 403.
  - Both patterns are safe, but the difference may be surprising when comparing behavior across verticals.
- **potential_wave:** Scope Behavior Clarification (decide when to prefer explicit 403 vs empty result, and document per module).

### 3. Logging asymmetry
- **area:** API observability
- **type:** Logging coverage
- **summary:** Some high-value endpoints emit structured logs via `withRequestLogging` and `logger.info`, while others rely primarily on `console.error` in catch blocks.
- **details:**
  - `/api/logistics/freight-pnl` uses `withRequestLogging` to record request/response metadata (endpoint, user, venture, office, latency).
  - Many other analytics and list endpoints only log errors via `console.error` and do not emit structured request logs.
  - This leads to uneven observability across verticals even when the underlying data is comparably critical.
- **potential_wave:** Logging Normalization Wave (extend `withRequestLogging` or similar patterns to a broader set of core endpoints).

---

## Additional observations from Wave 7 – Logging & Auth Normalization

These observations capture behavior verified while adding structured logging and auth/RBAC tests in Wave 7.

### 4. Helper-driven vs handler-driven auth responses
- **area:** Auth helpers (`requireUser`, `getEffectiveUser`)
- **type:** Consistency
- **summary:** Many handlers now rely on `requireUser`/`getEffectiveUser` to emit 401 `UNAUTHENTICATED` responses, and tests assert only that handlers "return early" rather than setting status codes themselves.
- **details:**
  - This is intentionally preserved to avoid changing behavior, but it means the 401 is not always obvious from the handler body alone.
  - New tests added in Wave 7 explicitly call out this pattern by asserting `[200, 401]` where helpers own the unauthenticated behavior.
- **potential_wave:** Auth Helper Documentation (document clearly where unauthenticated behavior lives and how new handlers should integrate).

### 5. Specific vs generic 403 error keys
- **area:** RBAC vs scope enforcement
- **type:** Error taxonomy
- **summary:** Endpoints differentiate between generic RBAC denials (`FORBIDDEN`) and scope-specific failures (`FORBIDDEN_VENTURE`, `FORBIDDEN_OFFICE`, `FORBIDDEN_ASSIGN`).
- **details:**
  - Wave 7 preserved existing specific keys and only uses `FORBIDDEN` for new generic RBAC denials.
  - This is helpful for debugging but requires consumer code to handle a small set of error enums.
- **potential_wave:** Error Enum Documentation (centralize a list of error keys per domain for consumers/tests).

### 6. Logging volume in tests
- **area:** Jest logs
- **type:** DevX
- **summary:** Structured `logger.info("api_request", ...)` calls show up in Jest output and can be noisy when running the full critical suite.
- **details:**
  - This is expected and acceptable for now; logs are small and do not include payloads.
  - A future wave might conditionally suppress info-level logs under test or route them through a test-friendly sink.
- **potential_wave:** Test Logging Tuning (e.g., lower log level or add a test-only logger implementation).

---

## Additional observations from Wave 8 – Cleanup & Scalability Prep

These notes were added after inspecting pagination, error shapes, and structure across core verticals.

### 7. Pagination field naming remains mixed
- **area:** Logistics, BPO, Hotels, Tasks lists
- **type:** Consistency
- **summary:** Different list endpoints use `limit`, `pageSize`, or omit `total` even when computed. Only obviously safe cases were normalized in Waves 6–8; several remain inconsistent.
- **details:**
  - Some logistics and hotel list endpoints expose `items` without explicit `page`/`limit` even though pagination is applied.
  - Tasks `/api/tasks` exposes `page` and `limit`, while some other list endpoints use `pageSize` or no pagination metadata at all.
  - Normalizing all of these would require coordinated frontend changes and is deferred.
- **potential_wave:** Global Pagination Contract Wave (define a single contract and update API + UI together).

### 8. Error shape divergence across legacy handlers
- **area:** Older BPO and IT endpoints
- **type:** Error handling
- **summary:** A few older handlers still return plain strings or `{ message: ... }` on error instead of `{ error: ... }`. These were left untouched in Wave 8 to avoid unexpected UI impact.
- **details:**
  - Some BPO routes and IT helpers short-circuit with `res.status(400).json("Bad request")`-style responses.
  - The rest of the verticals have largely converged on `{ error: string }` with specific keys where needed.
- **potential_wave:** Error Shape Unification Wave (start with lower-usage endpoints and gradually unify to `{ error: string; code?: string }`).

### 9. Suspected dead or legacy helpers
- **area:** Shared utility modules
- **type:** Potential dead code
- **summary:** A small number of helpers appear unused by current code paths but were not removed in Wave 8 due to ambiguity.
- **details:**
  - Certain date and formatting helpers in shared libs have 0 internal references but may be exported for external or future use.
  - Without clear ownership and usage guarantees, they have been left in place.
- **potential_wave:** Dedicated Dead Code Audit (with maintainers validating removal of specific helpers).

### 10. Test organization could be more hierarchical
- **area:** `tests/critical/api`
- **type:** Test structure
- **summary:** Tests are accurate but live in a relatively flat structure; grouping by vertical (e.g. `logistics/`, `incentives/`, `tasks/`) would aid navigation but was not performed in Wave 8 to avoid churn.
- **details:**
  - File naming now encodes vertical and endpoint well enough for navigation.
  - A future structural pass could reorganize folders with minimal content changes.
- **potential_wave:** Test Tree Restructure Wave (purely organizational).

---

## Wave 15 / 15b / 15c-lite – AI Freight Drafting & Template Engine

- **area:** AI freight drafting system
- **type:** AI feature scaffolding
- **summary:** Waves 15, 15b, and 15c-lite introduced a three-stage AI carrier outreach drafting system with tone/template controls and backward-compatible contact resolution.
- **details:**
  - Wave 15: Initial `/api/ai/freight-carrier-draft` endpoint with basic tone control (professional, casual, urgent).
  - Wave 15b: Added configurable templates in `lib/ai/templates.ts` (hardcoded JSON) with per-tone versions for `inquiry`, `coverage_request`, and `relationship` draft types.
  - Wave 15c-lite: Enhanced contact role resolution (owner vs dispatcher) with free-form name/email entry and optional tone field.
  - **Important tech debt**: Templates are currently hardcoded JSON in code; Wave 17 requires moving to DB-backed template storage (`AiTemplate` Prisma model) with admin CRUD interface.
  - **Safety model preserved**: All outputs are draft-only, no sending/automation, no pricing promises, and human copy-paste required.

- **area:** AI template storage & customization
- **type:** Scaffolding / Tech debt
- **summary:** Current templates are hard-coded JSON, which prevents adding new templates without code deployment.
- **details:**
  - Templates live in `lib/ai/templates.ts` as a simple object mapping `tone => draftType => template`.
  - This works for MVP but creates friction for template A/B testing and client customization.
  - Wave 17 must migrate to Prisma `AiTemplate` model with fields: `id`, `name`, `tone`, `draftType`, `content`, `createdBy`, `updatedAt`, plus admin endpoints for CRUD.

- **area:** Contact role resolution with fallback
- **type:** API pattern / Backward compatibility
- **summary:** The `/api/ai/freight-carrier-draft` endpoint supports three contact modes: `dispatcher` (DB-backed with free-form fallback), `owner` (default), and `unknown` (returns error).
- **details:**
  - When `contactRole = "dispatcher"` and `dispatcherId` is provided, the endpoint performs a DB lookup; if not found, returns `DISPATCHER_NOT_FOUND` (400).
  - When `contactRole = "dispatcher"` but no `dispatcherId` is provided, the endpoint requires `dispatcherName` and optional `dispatcherEmail` as free-form input.
  - When `contactRole = "owner"` (or omitted), the endpoint uses free-form `dispatcherName` for owner name or defaults to generic "load coordinator".
  - This three-branch pattern (DB lookup → free-form → default) is now the template for future entity resolution (salesrep, shipper contact, etc.) and should be extracted to `lib/entityResolution.ts` in Wave 17.

---

## Wave 16 – DB-backed Carriers & Dispatchers

- **area:** Database-backed dispatcher management
- **type:** Data model + API expansion
- **summary:** Wave 16 introduces the `CarrierDispatcher` Prisma model and three new API endpoints to support DB-backed carrier/dispatcher selection in the AI drafting UI.
- **details:**
  - **Prisma model** (`CarrierDispatcher`): New table with fields `id` (cuid), `name`, `email`, `phone`, `isPrimary`, `carrierId` (FK), timestamps, and index on `carrierId`.
  - **API endpoints**:
    - `POST /api/ai/freight-carrier-draft` (enhanced from Wave 15c): Now accepts optional `carrierId` and `dispatcherId` fields; contact role resolution logic now checks DB first before falling back to free-form.
    - `GET /api/freight/carriers/search?q=...` (new): Typeahead search returning up to 10 carriers matching name, mcNumber, or tmsCarrierCode; used by UI to populate carrier dropdown.
    - `GET /api/freight/carriers/[carrierId]/dispatchers` (new): Returns list of all dispatchers for a carrier; used to populate dispatcher dropdown after carrier selection.
  - **UI rewrite** (`pages/freight/ai/carrier-draft.tsx`): Complete rewrite with:
    - Carrier search input with real-time typeahead (calls search endpoint).
    - Dispatcher dropdown that appears only when contact role is "dispatcher" and a carrier is selected.
    - Free-form dispatcher name/email fields shown as fallback when no DB dispatcher is selected.
    - Payload logic: If `dispatcherId` is set, send it; otherwise send `dispatcherName` and `dispatcherEmail`.
  - **Backward compatibility**: Free-form dispatcher input is fully preserved; DB lookup is optional. Existing free-form-only workflows are not broken.
  - **Testing**: New comprehensive test file (`tests/critical/api/wave16_freight_dispatcher.test.ts`) covers DB dispatcher lookup, invalid ID error, missing name error, free-form fallback, and contact role validation.

- **area:** Carrier/Dispatcher UI patterns
- **type:** Frontend pattern
- **summary:** The Wave 16 UI establishes a reusable pattern for DB-backed entity selection with optional free-form fallback.
- **details:**
  - Pattern: Search input → Dropdown (if DB records found) → Free-form fallback fields.
  - This pattern can be applied to other entities in Wave 17+ (sales reps for outreach, shipper contacts, freight forwarders, etc.).
  - Key insight: Conditional rendering based on `contactRole`, `carrierId`, and available dispatchers makes the form adaptive without adding to form complexity.

- **area:** RBAC for dispatcher management
- **type:** RBAC expansion
- **summary:** Dispatcher-related endpoints (`/api/freight/carriers/search`, `/api/freight/carriers/[carrierId]/dispatchers`) inherit the same RBAC as freight analytics and AI drafting.
- **details:**
  - Search and list endpoints are read-only and available to CSR, DISPATCHER, VENTURE_HEAD, COO, ADMIN roles (same as freight drafting).
  - No new write endpoints for dispatcher CRUD in Wave 16; future admin panel (Wave 17+) will require new `/api/freight/carriers/[carrierId]/dispatchers` POST/PUT/DELETE endpoints.
  - This preserves the "operationals-only" access pattern for carrier/dispatcher data until admin panel is added.

- **area:** Future dispatcher management roadmap
- **type:** Forward-looking scaffolding
- **summary:** Wave 16 provides the foundation for future dispatcher CRUD and carrier contact synchronization.
- **details:**
  - **Wave 17+**: Add admin panel with dispatcher CRUD (create, update, delete, mark primary).
  - **Wave 17+**: Add webhook/integration layer to sync dispatchers from TMS systems (e.g., periodic `POST /api/freight/carriers/[carrierId]/dispatchers/sync-from-tms`).
  - **Wave 18+**: Extend to other carrier contact types (billing, compliance, accounting) using the same DB-backed + free-form pattern.
  - **Key scalability**: Current pattern handles 100+ dispatchers per carrier and 10,000+ carriers without schema issues; no pagination added yet (list endpoint returns all for now).
