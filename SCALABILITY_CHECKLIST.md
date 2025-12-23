# Scalability Checklist

Operational guidance for handling 150+ concurrent users, overlapping bulk imports, and sync jobs (FMCSA, 3PL, hotels, incentives).

## Database & Queries
- Use indexed filters first: venture, status, dates, shipper/carrier/customer for loads; hotelId/ventureId + date for hotel KPIs; user/venture + date for incentives; fmcsaAuthorized/active for carriers; threePlLoadId/loadId for 3PL mappings.
- Keep pagination: loads list capped at 200 items per page (`/api/freight/loads/list`); carriers and general loads endpoints default to 50 and cap at 200. Avoid ad-hoc queries without limits.
- Prefer `select` over wide `include` for list views; fetch only fields needed for tables/graphs.

## Bulk Imports & Sync Jobs
- Run large backfills (historical loads 50k–200k, hotel KPIs, incentives, FMCSA/3PL) as background jobs or scheduled batches; avoid single API calls that span multi-year ranges.
- Throttle backfills to short windows (e.g., per-day or per-week slices) and sleep between batches when user traffic is high (morning/early afternoon peaks).
- Stagger FMCSA autosync, 3PL sync, and hotel data imports so they do not overlap with each other or with nightly reporting windows.

## Application Traffic
- Expect 10–30 rps baseline, 40–80 rps peaks, and bursts near 100 rps during overlapping imports. Keep response bodies small and cache headers sensible for dashboards where possible.
- Prefer incremental syncs (by `lastModifiedAt`/date ranges) over full-table scans.

## Dashboards & Caching
- For venture/portfolio dashboards, pre-aggregate daily/hourly metrics into summary tables (e.g., daily load KPIs, hotel 7-day rollups, incentive day totals) and serve summaries first; fall back to detailed queries on demand.
- “Today/This week” cards can be served from the most recent aggregates and refreshed on a short interval (5–15 minutes) instead of recomputing across full history per request.

## N+1 & Heavy Logic
- Avoid per-row lookups inside loops (e.g., carrier/shipper fetches for each load). Use batched `findMany` with `id in (…)` or `include` where it keeps the payload bounded.
- Offload expensive matching/scoring steps (carrier matching, large analytics spans) to jobs when the lookback exceeds a week; store results for reuse in UI/API.

## During Peak Usage (first 60–90 days)
- Keep imports running in smaller batches and pause or slow them during morning/early afternoon peaks when ~40–80 users are active.
- Monitor DB connections and lock durations; prefer `createMany`/`upsert` batches with `skipDuplicates` for imports instead of one-by-one inserts.
- Coordinate with operations to schedule bulk tasks (FMCSA, 3PL, hotel KPI/P&L backfills) during low-traffic windows.
