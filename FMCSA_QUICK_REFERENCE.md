# FMCSA Integration - Developer Quick Reference

## Files Modified/Created

### Schema & Migrations
- `prisma/schema.prisma` — Added fmcsaAuthorized, fmcsaLastSyncAt, fmcsaSyncError to Carrier
- `prisma/migrations/20250112000000_add_fmcsa_fields/migration.sql` — SQL migration

### Implementation
- `lib/integrations/fmcsaClient.ts` — FMCSA API client (mock implementation)
- `lib/jobs/fmcsaAutosyncJob.ts` — Batch sync job for all carriers
- `pages/api/carriers/[id]/fmcsa-refresh.ts` — Manual refresh endpoint (POST)
- `lib/logistics/matching.ts` — Updated to filter by fmcsaAuthorized (line ~60)

### Tests (9 new tests, all passing)
- `tests/critical/api/carriers_fmcsa_refresh.test.ts` — 4 endpoint tests
- `tests/critical/jobs/fmcsaAutosyncJob.test.ts` — 2 job tests
- `tests/critical/freight/matching_carrier_filters.test.ts` — 3 matching filter tests

## How It Works

1. **Sync FMCSA Data** → Autosync job fetches carrier status from FMCSA API
2. **Update Database** → Stores status, authorization flag, last sync time
3. **Filter Matches** → Matching engine excludes carriers with fmcsaAuthorized: false
4. **Manual Refresh** → Admins can trigger refresh for a single carrier via POST endpoint

## Key Functions

### Fetch from FMCSA
```typescript
import { fetchCarrierFromFMCSA } from '@/lib/integrations/fmcsaClient';

const fmcsaData = await fetchCarrierFromFMCSA('123456'); // MC number
// Returns: { status: 'ACTIVE', authorized: true, safetyRating: 4.5, lastUpdated: ... }
```

### Run Autosync
```typescript
import { runFMCSAAutosyncJob } from '@/lib/jobs/fmcsaAutosyncJob';

await runFMCSAAutosyncJob(); // Syncs all carriers with MC numbers
```

### Trigger Manual Refresh
```bash
curl -X POST http://localhost:3000/api/carriers/123/fmcsa-refresh \
  -H "Authorization: Bearer admin-token"
```

## Matching Filter

The carrier query now includes:
```typescript
fmcsaAuthorized: { not: false }
```

This:
- ✅ Includes `fmcsaAuthorized: true`
- ✅ Includes `fmcsaAuthorized: null` (backwards compat)
- ❌ Excludes `fmcsaAuthorized: false`

## Testing

Run FMCSA tests only:
```bash
yarn test --testPathPatterns="fmcsa|matching_carrier_filters" --runInBand
```

Run all tests (full regression):
```bash
yarn test --runInBand
```

All 180 tests should pass with zero failures.

## Database Fields

```typescript
// New Carrier fields
fmcsaAuthorized?: boolean | null      // FMCSA authorization status
fmcsaLastSyncAt?: Date | null         // Last successful sync
fmcsaSyncError?: string | null        // Error from last failed sync
fmcsaStatus?: string | null           // Status from FMCSA (ACTIVE, SUSPENDED, etc.)
fmcsaLastUpdated?: Date | null        // Last update timestamp (existing field)
```

## Logging

All operations logged with structured JSON:
- `requestId` — Unique request ID for tracing
- `timestamp` — ISO 8601 timestamp
- `meta` — Operation metadata (carrier count, errors, etc.)

Example: `logger.info('fmcsa_autosync_success', { meta: { requestId, successCount, failureCount } })`

## Production Setup

Before going live:
1. Replace mock FMCSA client with real API
2. Add FMCSA API credentials to environment
3. Configure autosync job scheduler (daily recommended)
4. Set up monitoring/alerting for sync failures
5. Test with real carrier data

See `FMCSA_IMPLEMENTATION.md` for full details.
