# Git Commit Message

## Commit Message

```
fix: deep dive audit fixes - logging, pagination, audit trails, and resilience

- Standardize pagination: Remove offset pagination from BPO call logs, use cursor-based only
- Replace all console.error/log with structured logger.error across 12+ API routes
- Add audit logging for hotel daily entry and carrier updates
- Create transaction retry utility for database deadlock/connection resilience
- Simplify timezone handling in scheduled jobs using native Intl API
- Fix remaining console.error calls in hospitality reviews and EOD reports

Files changed:
- pages/api/bpo/call-logs/index.ts - cursor pagination only
- pages/api/logistics/dashboard.ts - structured logging
- pages/api/eod-reports/index.ts - structured logging
- pages/api/hotels/disputes/[id].ts - structured logging
- pages/api/hotels/[id]/daily-entry.ts - structured logging + audit
- pages/api/freight/carriers/[carrierId].ts - audit logging
- pages/api/freight/loads/list.ts - structured logging
- pages/api/freight/loads/update.ts - structured logging
- pages/api/hospitality/reviews/[id].ts - structured logging
- pages/api/incentives/commit.ts - structured logging
- pages/api/ventures/[id]/documents.ts - structured logging
- pages/api/jobs/task-generation.ts - structured logging
- pages/api/ai/freight-ops-diagnostics.ts - structured logging
- lib/db/transactionRetry.ts - NEW: transaction retry utility
- lib/utils/timezone.ts - NEW: simplified timezone utilities
- scripts/scheduled-jobs-runner.ts - use simplified timezone utilities
- docs/DEEP_DIVE_FIXES_SUMMARY.md - NEW: summary of all fixes

All changes verified with linter, no errors introduced.
```

## About Error Response Standardization

**Status**: Pending (P2 - Optional Enhancement)

Error response standardization is a larger refactor that would involve:
- Updating all API routes to use `ApiError` class from `lib/api/handler.ts`
- Standardizing on `{ ok: false, error: { code, message } }` format
- This affects 200+ API routes and would be a significant change

**Recommendation**: 
- This can be done incrementally as routes are touched
- Not critical for current fixes
- Consider as part of a future API v2 standardization effort

The current fixes focus on:
1. ✅ Critical logging improvements (done)
2. ✅ Pagination consistency (done)
3. ✅ Audit trails (done)
4. ✅ Resilience patterns (done)

Error response standardization would be a separate, larger effort that should be planned and executed systematically across all routes.


