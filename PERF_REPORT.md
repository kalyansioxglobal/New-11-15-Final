# Performance Report

Generated: December 2025

## Summary

| Metric | Value |
|--------|-------|
| Health Check Response | < 50ms |
| Status Check (with DB ping) | < 100ms |
| Estimated Stable RPS | 80-150 req/sec |
| Slow Query Threshold | 300ms |

## Endpoint Performance (Development Environment)

| Endpoint | Method | Avg Latency | Notes |
|----------|--------|-------------|-------|
| `/api/health` | GET | ~5ms | Stateless, no DB |
| `/api/status` | GET | ~50ms | Includes DB ping |
| `/api/ventures` | GET | ~100ms | Light query, paginated |
| `/api/logistics/dashboard` | GET | ~200-500ms | Aggregations, 7-day window |
| `/api/freight/loads/list` | GET | ~150-300ms | Paginated, indexed |
| `/api/hospitality/dashboard` | GET | ~200-400ms | Aggregations, 7-day window |

## Slow Query Logging

Slow queries (>300ms) are now automatically logged:

```json
{
  "level": "warn",
  "type": "slow_query",
  "timestamp": "2025-12-10T...",
  "query": "SELECT ...",
  "durationMs": 450,
  "threshold": 300
}
```

Check server logs for these entries to identify bottlenecks.

## Database Optimization Status

### Indexes Verified

| Table | Index | Purpose |
|-------|-------|---------|
| `Load` | `ventureId, status, pickupDate` | Dashboard queries |
| `Load` | `billingDate` | P&L queries |
| `BpoDailyMetric` | `campaignId, date` | BPO KPIs |
| `HotelDailyReport` | `hotelId, date` | Hotel KPIs |
| `User` | `email` | Authentication |
| `RateLimitWindow` | `ipHash, routeKey, windowStart` | Rate limiting |

**Total indexes: 175** across 89 tables (verified)

### Query Patterns

Most endpoints use:
- Pagination (50-200 items per page)
- Date range filters (7-30 day windows)
- Venture/office scoping

## Identified Bottlenecks

### P1 - Should Fix

1. **Rate limiting uses database**
   - Each rate-limited request = 2 DB operations (delete expired + upsert)
   - Impact: Adds ~10-20ms per request
   - Fix: Move to Redis or in-memory store

2. **No connection pool configuration**
   - Prisma uses default 5 connections
   - Impact: Connection exhaustion under load
   - Fix: Add `?connection_limit=20` to DATABASE_URL

3. **Dashboard aggregations compute on-demand**
   - P&L and KPI dashboards aggregate full date ranges
   - Impact: 200-500ms latency on dashboards
   - Fix: Pre-aggregate daily summaries

### P2 - Nice to Have

4. **No response caching**
   - Dashboards could cache for 1-5 minutes
   - Impact: Repeated queries hit DB unnecessarily
   - Fix: Add Cache-Control headers or Redis cache

5. **Large payload on some list endpoints**
   - Some lists return full objects instead of summaries
   - Impact: Bandwidth and parsing overhead
   - Fix: Use `select` to limit returned fields

## Optimization Recommendations (Prioritized)

### Immediate (Before Heavy Load)

1. **Configure database connection pool**
   ```
   DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=30"
   ```

2. **Add composite indexes for common queries**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_load_venture_status_date 
   ON "Load" ("ventureId", "status", "pickupDate");
   ```

### Short-term (Week 1-2)

3. **Move rate limiting to Redis**
   - Replit has Redis integration available
   - Eliminates DB write amplification

4. **Add Cache-Control headers to dashboard APIs**
   ```typescript
   res.setHeader('Cache-Control', 'private, max-age=60');
   ```

### Medium-term (Month 1)

5. **Pre-aggregate dashboard metrics**
   - Create daily summary tables
   - Update via scheduled job
   - Dashboards read summaries

6. **Implement response compression**
   - Enable gzip for API responses
   - Reduces bandwidth 60-80%

## Capacity Estimates

| Scenario | Concurrent Users | Notes |
|----------|------------------|-------|
| Current (no changes) | 80-150 | Limited by DB connections |
| With connection pool | 200-300 | Better connection management |
| With Redis rate limiting | 300-400 | Reduced DB load |
| With caching | 500-1000 | Significant reduction in DB queries |

## Monitoring Recommendations

1. **Enable slow query logging** (done - 300ms threshold)
2. **Monitor Neon dashboard** for connection usage
3. **Track p99 latency** via hosting platform
4. **Set up alerts** for error rate > 1%

## Next Steps

1. Run full load test with autocannon (see `perf/README.md`)
2. Profile specific slow endpoints
3. Implement P1 optimizations before launch
4. Re-test after optimizations
