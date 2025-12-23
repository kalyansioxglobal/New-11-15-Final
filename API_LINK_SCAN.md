# API & Link Scan Summary

This document tracks the review of client-side `/api/*` calls against backend routes in `pages/api/**`.

## Legend

- **OK** – Frontend call matches an existing API route and contract.
- **FIXED** – An issue was found and corrected in this pass.
- **TODO** – Needs deeper refactor or additional check in a later pass.

## Logistics / Freight Domain

### `/freight/pnl` → `/api/logistics/freight-pnl`

- Frontend: `pages/freight/pnl.tsx`
  - `GET /api/logistics/freight-pnl?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Backend: `pages/api/logistics/freight-pnl.ts`
  - Accepts `from`, `to` query params and returns `summary`, `byDay`, `byCustomer`, `byOffice`.
- Status: **OK** – Methods and parameters match; response shape matches expected frontend types.

### `/freight/loads` list & meta

- Frontend:
  - `pages/freight/loads/index.tsx` – `GET /api/freight/meta` & `GET /api/freight/loads?ventureId&officeId&status&q`
- Backend:
  - `pages/api/freight/meta.ts` – `GET` only, returns `{ ventures, offices }`.
  - `pages/api/freight/loads/index.ts` – `GET` with `ventureId`, `officeId`, `status`, `q`.
- Status: **OK** – Both routes exist with matching query params and return shapes.

### `/freight/loads` create

- Frontend:
  - `pages/freight/loads/new.tsx` – `POST /api/freight/loads` with JSON body describing the load.
- Backend:
  - `pages/api/freight/loads/index.ts` – `POST` supported; validates required fields and creates load.
- Status: **OK** – Shape and required fields align with the UI form.

### At-Risk / Lost Loads (AI Coach)

- Frontend:
  - `pages/freight/at-risk.tsx` – `GET /api/freight/loads/list?atRisk=true&limit=100`
  - `pages/freight/lost.tsx` – `GET /api/freight/loads/list?lost=true&limit=100`
  - `pages/freight/lost-and-at-risk.tsx`
    - `GET /api/freight/at-risk-loads?hoursUntilPickup`
    - `GET /api/freight/lost-loads?from&to`
    - `POST /api/freight/loads/[id]/run-lost-load-agent` with `{ autoSend, maxEmails }`
    - `POST /api/freight/lost-postmortem` with `{ from, to, filterShipper, filterRep, filterLane }`
- Backend:
  - `pages/api/freight/loads/list.ts` – supports `atRisk`, `lost`, `limit`, `page` query params.
  - `pages/api/freight/at-risk-loads.ts` – `GET` with `hoursUntilPickup`, supports pagination.
  - `pages/api/freight/lost-loads.ts` – `GET` with date filters and pagination.
  - `pages/api/freight/loads/[id]/run-lost-load-agent.ts` – exists, POST; body matches usage.
  - `pages/api/freight/lost-postmortem.ts` – exists, POST; expects the same fields used by UI.
- Status: **OK** – All endpoints exist and parameters/HTTP methods match frontend usage.

### Carrier Outreach AI Drafting (Wave 15-16)

- Frontend:
  - `pages/freight/ai/carrier-draft.tsx`
    - `GET /api/freight/carriers/search?q=<query>` – carrier typeahead.
    - `GET /api/freight/carriers/<carrierId>/dispatchers` – dispatcher list for selected carrier.
    - `POST /api/ai/freight-carrier-draft` – generate outreach draft.
- Backend:
  - `pages/api/freight/carriers/search.ts` – **Wave 16 new endpoint**
    - `GET` accepts `q` query param, searches across carrier name, mcNumber, tmsCarrierCode, returns max 10 results.
    - Response: `{ carriers: [{ id, name, mcNumber, tmsCarrierCode, createdAt, updatedAt }, ...] }`.
  - `pages/api/freight/carriers/[carrierId]/dispatchers.ts` – **Wave 16 new endpoint**
    - `GET` retrieves all dispatchers for a carrier via `carrierId` route param.
    - Response: `{ dispatchers: [{ id, name, email, phone, isPrimary, createdAt, updatedAt }, ...] }`.
    - Returns empty array if no dispatchers found; no error on missing carrier.
  - `pages/api/ai/freight-carrier-draft.ts` – **Wave 15 initial, Wave 16 enhanced**
    - `POST` accepts JSON body with `carrierName`, `lane`, `load`, `draftType`, plus **Wave 16 new fields**: `carrierId?`, `dispatcherId?`, `contactRole?`.
    - Contact role resolution:
      - If `contactRole === "dispatcher"` and `dispatcherId` provided: DB lookup via `prisma.carrierDispatcher.findUnique()`.
      - If dispatcher not found: `400 { error: "DISPATCHER_NOT_FOUND" }`.
      - If `contactRole === "dispatcher"` but no `dispatcherId`: requires `dispatcherName` free-form field.
      - If `contactRole === "owner"` (default): uses free-form owner name.
    - Returns: `{ draft, tokensEstimated }`.
    - RBAC: CEOs, ADMINs, COOs, VENTURE_HEADs, CSRs, DISPATCHERs only; AI_ENABLED & AI_ASSISTANT_FREIGHT_ENABLED flags required.
- Status: **OK** – Wave 16 new endpoints implemented and fully wired; carrier search, dispatcher list, and DB-backed drafting all functional.

### Incentives Admin & My Incentives

- Frontend: `pages/incentives/[ventureId].tsx`
  - Uses `GET /api/me` to determine admin role.
- Backend:
  - `pages/api/me.ts` – **added in this pass**, returns effective user with `role`.
- Status: **FIXED** – Missing route implemented so incentives page can detect admins correctly.



## BPO / Call Center Domain

### `/bpo/dashboard` → `/api/ventures`, `/api/bpo/dashboard`
- Frontend: `pages/bpo/dashboard.tsx`
  - `GET /api/ventures?types=BPO&includeTest=${testMode}` – loads BPO ventures.
  - `GET /api/bpo/dashboard?ventureId=<id>&includeTest=${testMode}` – loads 7‑day summary, campaign cards, and agent leaderboard.
- Backend:
  - `pages/api/ventures/index.ts` – supports filtering by `types=BPO` and `includeTest`.
  - `pages/api/bpo/dashboard.ts` – requires auth (`requireUser`), applies venture scope via `getUserScope`, and aggregates last 7 days of `bpoDailyMetric` + `bpoAgentMetric` into `summary`, `campaigns`, and `leaderboard`.
- Status: **OK** – Endpoint exists, params match, and response shape aligns with the dashboard UI.

### `/bpo/kpi` → `/api/bpo/kpi`
- Frontend: `pages/bpo/kpi.tsx`
  - `GET /api/bpo/kpi?from=<ISO>&to=<ISO>&ventureId?&officeId?&campaignId?&agentId?`
    - For now, only `from`, `to`, and `campaignId`/`ventureId` are actually consumed by the backend.
- Backend: `pages/api/bpo/kpi/index.ts`
  - Wrapped with `withUser`, uses `getUserScope` for venture scoping.
  - Parses `ventureId` and `campaignId`, validates integers, enforces scope.
  - Uses `parseDateRange(req.query)` to derive `from`/`to` date filters.
  - Queries `bpoDailyMetric` (max 90 rows) and returns `{ summary, rows }`.
- Status: **OK** – Core filters and response structure match the BPO Agent KPIs table; extra frontend query params (`officeId`, `agentId`) are currently ignored but harmless.

### `/bpo/realtime` → `/api/ventures`, `/api/bpo/realtime-stats`
- Frontend: `pages/bpo/realtime.tsx`
  - `GET /api/ventures?types=BPO` – populates venture selector.
  - `GET /api/bpo/realtime-stats?ventureId=<id>` – initial + auto‑refresh real‑time stats.
- Backend:
  - `pages/api/ventures/index.ts` – supports `types=BPO`.
  - `pages/api/bpo/realtime-stats.ts` – requires auth (`requireUser`), uses `getUserScope`, enforces `ventureId` present + scoped, aggregates today’s `bpoCallLog`, `bpoDailyMetric`, `bpoAgentMetric` into `summary`, `agents`, `campaigns`.
- Status: **OK** – Real‑time dashboard wiring is complete and scoped per venture.

### `/bpo/incentives` → `/api/ventures`
- Frontend: `pages/bpo/incentives.tsx`
  - `GET /api/ventures?types=BPO&includeTest=${testMode}` – loads BPO ventures, then links to `/incentives/[ventureId]`.
- Backend: `pages/api/ventures/index.ts` – as above, supports BPO and test filters.
- Status: **OK** – Incentives landing page for BPO ventures is fully wired.

### `/bpo/agents` → `/api/ventures`, `/api/bpo/campaigns`, `/api/bpo/agents`
- Frontend: `pages/bpo/agents/index.tsx`
  - `GET /api/ventures?types=BPO` – loads BPO ventures for venture filter.
  - `GET /api/bpo/campaigns?ventureId?` – loads campaigns to filter agents.
  - `GET /api/bpo/agents?ventureId?&campaignId?&includeTest=true|false&search?&page?&pageSize?` – loads paginated agents list.
- Backend:
  - `pages/api/ventures/index.ts` – BPO venture list.
  - `pages/api/bpo/campaigns/index.ts` – `GET` lists active BPO campaigns, scoped by `ventureId`/`scope.ventureIds` via `getUserScope`.
  - `pages/api/bpo/agents/index.ts` –
    - `GET` requires auth (`requireUser`), applies venture scoping via `getUserScope` + `applyBpoScope`, supports `ventureId`, `campaignId`, `page`, `pageSize`, `search` and returns `{ items, total, page, pageSize, totalPages }`.
    - `POST` (not yet used by UI) creates agents for super‑admins.
- Status: **FIXED** – Frontend previously assumed a flat array; now aligned with paginated `{ items, total, ... }` response, and endpoint enforces BPO scope.

### `/bpo/campaigns` → `/api/ventures`, `/api/bpo/campaigns`
- Frontend: `pages/bpo/campaigns/index.tsx`
  - `GET /api/ventures?types=BPO` – venture filter.
  - `GET /api/bpo/campaigns?ventureId?` – loads list of campaigns with venture + counts.
- Backend: `pages/api/bpo/campaigns/index.ts`
  - `GET` requires auth, scopes to `ventureId` or `scope.ventureIds`, returns campaigns including `venture`, `office`, and `_count` (agents, kpiRecords).
  - `POST` allows super‑admins to create campaigns; used by `/bpo/campaigns/new`.
- Status: **OK** – List and create paths are correctly wired to the same API.

### `/bpo/campaigns/new` → `/api/ventures`, `/api/bpo/campaigns`
- Frontend: `pages/bpo/campaigns/new.tsx`
  - `GET /api/ventures?types=BPO` – populates Venture dropdown.
  - `POST /api/bpo/campaigns` with `{ name, clientName?, description?, ventureId }`.
- Backend: `pages/api/bpo/campaigns/index.ts`
  - `POST` accepts these fields and additional optional config (vertical, timezone, officeId, formulaJson), enforcing super‑admin + venture scope.
- Status: **OK** – New campaign creation flow is consistent and scoped.

### `/bpo/campaigns/[id]` → `/api/bpo/campaigns/[id]`, `/api/bpo/campaigns/[id]/metrics`
- Frontend: `pages/bpo/campaigns/[id].tsx`
  - `GET /api/bpo/campaigns/<id>` – loads campaign detail + venture/office + counts.
  - `GET /api/bpo/campaigns/<id>/metrics?includeTest=true|false` – loads daily BPO metrics (90‑day window default).
- Backend:
  - `pages/api/bpo/campaigns/[id].ts` – requires auth + venture scoping via `getUserScope`; `GET` returns campaign details; `PATCH` lets super‑admins update.
  - `pages/api/bpo/campaigns/[id]/metrics.ts` – requires auth + scope, supports `from`, `to`, `includeTest`, `limit`; `GET` returns ordered `bpoDailyMetric[]`, `POST` bulk upserts metric rows.
- Status: **OK** – Detail and metrics flows are fully wired.

### `/bpo/agents` / KPIs (aggregate) → `/api/bpo/agent-kpi` (admin-only)
- Frontend: (used by admin tooling / future BPO analytics; not yet wired into a main page in this pass).
- Backend: `pages/api/bpo/agent-kpi.ts`
  - Requires `requireAdminPanelUser` (admin‑level access).
  - Accepts `startDate`, `endDate` and aggregates `bpoAgentMetric` into per‑agent KPI rows.
- Status: **OK** – Endpoint is implemented and secured; currently a backend utility for future admin views.


## Hotels / Hospitality Domain

### `/hotels` → `/api/hospitality/hotels`
- Frontend: `pages/hotels/index.tsx`
  - `GET /api/hospitality/hotels?includeTest=true|false`
- Backend: `pages/api/hospitality/hotels/index.ts`
  - `GET` supports `ventureId?`, `includeTest` and returns active `hotelProperty` rows with `venture` relation.
- Status: **OK** – Methods and parameters match; response shape matches frontend usage (list of hotels with venture info).

### `/hotels/kpi` → `/api/ventures`, `/api/hospitality/hotels`, `/api/analytics/series`
- Frontend: `pages/hotels/kpi.tsx`
  - `GET /api/ventures?types=HOSPITALITY&includeTest=${testMode}`
  - `GET /api/hospitality/hotels?includeTest=${testMode}`
  - Uses `<AnalyticsChart metric="hotel_*" />` which calls `/api/analytics/series` under the hood.
- Backend:
  - `pages/api/ventures/index.ts` – supports `types`, `includeTest` filters.
  - `pages/api/hospitality/hotels/index.ts` – see above.
  - `pages/api/analytics/series.ts` – supports hotel metrics including `hotel_revpar`, `hotel_adr`, `hotel_occupancy_pct`, `hotel_housekeeping_cost_per_occ_room`, `hotel_loss_nights` via `metric` + `filters` props.
- Status: **OK** – All endpoints exist and align with frontend usage.

### `/hotels/loss-nights` → `/api/hotels/loss-nights`, `/api/ventures`
- Frontend: `pages/hotels/loss-nights.tsx`
  - `GET /api/ventures?limit=200`
  - `GET /api/hotels/loss-nights?ventureId?&from?&to?&limit=200&includeTest=true|false`
- Backend:
  - `pages/api/ventures/index.ts` – supports `limit` and venture filtering.
  - `pages/api/hotels/loss-nights.ts` – supports `ventureId`, `hotelId`, `from`, `to`, `limit`, `includeTest`; returns `{ items: LossNight[] }` which matches the fields expected in the table.
- Status: **OK** – Routes and parameters match; error states are handled in frontend.

### `/hotels/new` → `/api/ventures`, `/api/hospitality/hotels`
- Frontend: `pages/hotels/new.tsx`
  - `GET /api/ventures?types=HOSPITALITY`
  - `POST /api/hospitality/hotels` with `{ name, code?, brand?, ventureId, city?, state?, country, rooms? }`.
- Backend:
  - `pages/api/ventures/index.ts` – supports `types` filter for `HOSPITALITY`.
  - `pages/api/hospitality/hotels/index.ts` – `POST` accepts these fields and creates `hotelProperty` with `ventureId` and optional metadata.
- Status: **OK** – Create flow is wired to a working API and venture scoping is enforced server-side.

### `/hotels/snapshot` → `/api/hotels/snapshot`
- Frontend: `pages/hotels/snapshot.tsx`
  - `GET /api/hotels/snapshot?includeTest=true|false`
- Backend: `pages/api/hotels/snapshot.ts`
  - Computes per-hotel MTD/YTD metrics and portfolio totals; supports `ventureId?` and `includeTest` guards.
- Status: **OK** – Response shape (`snapshot`, `totals`) matches UI expectations (hotel cards + portfolio summary).

### `/hotel/[id]` → `/api/hotel/dashboard`
- Frontend: `pages/hotel/[id].tsx`
  - `GET /api/hotel/dashboard?id=<ventureId>`
- Backend: `pages/api/hotel/dashboard.ts`
  - Uses `requireUser`, `can(user, "view", "VENTURE")`, and `getUserScope`.
  - Returns `{ hotel, kpi, tasks, policies, alerts }` in shape consumed by the page.
- Status: **OK** – Venture-scoped hotel dashboard is correctly wired.

### `/hotels/[id]` KPI & reviews → `/api/hotel-kpi`, `/api/hospitality/reviews`
- Frontend: `pages/hotels/[id]/index.tsx`
  - `GET /api/hotel-kpi?hotelId=<id>&from?&to?` for KPI rows + summary.
  - `POST /api/hotels/<id>/daily-entry` to save manual daily report.
  - `GET /api/hospitality/hotels/<id>/reviews` – **INTENDED but MISSING**.
  - `POST /api/hospitality/reviews` to add a guest review.
- Backend:
  - `pages/api/hotel-kpi/index.ts` – implements hotel KPI fetching with `hotelId` + optional date filters.
  - `pages/api/hotels/[id]/daily-entry.ts` – persists both `hotelKpiDaily` and `hotelDailyReport` with thresholds.
  - `pages/api/hospitality/reviews/index.ts` – supports `POST` for creating reviews, but **there is no per‑hotel `GET /api/hospitality/hotels/[id]/reviews` route yet.**
- Status: **TODO** – KPI and daily-entry flows are wired and working; per-hotel reviews list currently points to a non-existent route and needs a new API handler.

### `/hospitality/dashboard` → `/api/hospitality/dashboard`, `/api/ventures`
- Frontend: `pages/hospitality/dashboard.tsx`
  - `GET /api/ventures?types=HOSPITALITY&includeTest=true|false`
  - `GET /api/hospitality/dashboard?ventureId?&includeTest=true|false`
- Backend:
  - `pages/api/ventures/index.ts` – venture list with type/test filters.
  - `pages/api/hospitality/dashboard.ts` – portfolio KPIs & review summary.
- Status: **OK** – Dashboard wiring and filters match the API.

### `/hospitality/hotels` & `/hospitality/hotels/new` → `/api/hospitality/hotels`
- Frontend:
  - `pages/hospitality/hotels/index.tsx` – `GET /api/hospitality/hotels?ventureId?&includeTest=true|false`.
  - `pages/hospitality/hotels/new.tsx` – `POST /api/hospitality/hotels` with hotel payload.
- Backend: `pages/api/hospitality/hotels/index.ts` – supports both `GET` and `POST` with venture scoping.
- Status: **OK** – List and create paths are correctly wired.

### `/hospitality/hotels/[id]` → `/api/hospitality/hotels/[id]`, `/api/hospitality/hotels/[id]/metrics`, `/api/hospitality/hotels/[id]/daily-reports`, `/api/hospitality/hotels/[id]/reviews`
- Frontend: `pages/hospitality/hotels/[id].tsx`
  - `GET /api/hospitality/hotels/<id>` – hotel detail.
  - `GET /api/hospitality/hotels/<id>/metrics?limit=30&includeTest=true|false` – **MISSING**.
  - `GET /api/hospitality/hotels/<id>/reviews?limit=100&includeTest=true|false` – **MISSING**.
  - `GET /api/hospitality/hotels/<id>/daily-reports?limit=30` – **MISSING**.
- Backend:
  - `pages/api/hospitality/hotels/[id].ts` – exists for hotel detail (GET/PATCH/DELETE).
  - No `metrics.ts`, `daily-reports.ts`, or `reviews.ts` under `pages/api/hospitality/hotels/[id]/` yet.
- Status: **TODO** – Three per-hotel API routes must be added to back the metrics, daily reports, and reviews tabs.

### `/hospitality/reviews` → `/api/hospitality/reviews`
- Frontend: `pages/hospitality/reviews/index.tsx`
  - `GET /api/hospitality/reviews?source?&unresponded?` for aggregated reviews list.
- Backend: `pages/api/hospitality/reviews/index.ts`
  - `GET` supports `hotelId?`, `ventureId?`, `source?`, `unresponded?`, `includeTest` and returns enriched review rows.
- Status: **OK** – Global reviews list is fully wired.

*(Additional sections will be added as more API calls are reviewed.)*


### `/hotels/disputes` → `/api/hotels/disputes`, `/api/hotels/disputes/summary`
- Frontend: `pages/hotels/disputes/index.tsx`
  - `GET /api/hotels/disputes?status?&includeTest=true|false` – loads the disputes table.
  - `GET /api/hotels/disputes/summary?includeTest=true|false` – loads per‑hotel chargeback summary and totals.
- Backend:
  - `pages/api/hotels/disputes/index.ts` –
    - `GET` returns `{ disputes: HotelDispute[] }` including `property` and `owner` relations.
    - `POST` creates a new hotel dispute with fields expected by the UI and stamps `createdById` from the authenticated user.
    - Auth & scoping: uses `requireHotelAccess` to enforce user and venture/hotel scoping.
  - `pages/api/hotels/disputes/summary.ts` –
    - `GET` aggregates disputes by property into `summary[]` and `totals` objects consumed by the summary cards and table.
    - Respects `includeTest` by filtering on the underlying hotel property’s `isTest` flag.
- Status: **FIXED** – New disputes API list + summary endpoints implemented and wired; list page now has working data flow.

### `/hotels/disputes/new` → `/api/hotels/disputes`, `/api/meta/hotel-properties`
- Frontend: `pages/hotels/disputes/new.tsx`
  - `GET /api/meta/hotel-properties` – loads properties for the selector.
  - `POST /api/hotels/disputes` – creates a new hotel dispute and navigates to its detail page on success.
- Backend:
  - `pages/api/meta/hotel-properties.ts` – returns `{ properties }` with basic hotel property info.
  - `pages/api/hotels/disputes/index.ts` – `POST` as above, with basic validation and date parsing.
- Status: **FIXED** – New dispute creation path is wired end‑to‑end.

### `/hotels/disputes/[id]` → `/api/hotels/disputes/[id]`, `/api/hotels/disputes/[id]/notes`
- Frontend: `pages/hotels/disputes/[id].tsx`
  - `GET /api/hotels/disputes/<id>` – loads dispute details, related property, owner, createdBy, and notes.
  - `PUT /api/hotels/disputes/<id>` – updates status, dates, notes, and outcome information.
  - `POST /api/hotels/disputes/<id>/notes` – appends an activity note on the dispute.
- Backend:
  - `pages/api/hotels/disputes/[id].ts` –
    - `GET` returns `{ dispute }` with property, owner, createdBy, and notes (including author info).
    - `PUT` updates mutable fields (status, notes, dates) with basic type checks; denies writes for view‑only hotel permission.
  - `pages/api/hotels/disputes/[id]/notes.ts` –
    - `POST` creates a new `hotelDisputeNote` tied to the dispute and the current user.
    - Validates that `body` is present; denies writes for view‑only.
  - All three use `requireHotelAccess` to enforce auth and hotel/venture scoping.
- Status: **FIXED** – Dispute detail and notes flows are fully wired to APIs.
