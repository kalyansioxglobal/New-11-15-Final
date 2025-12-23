# FMCSA Integration Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     FMCSA Integration System                     │
└─────────────────────────────────────────────────────────────────┘

                          External FMCSA API
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  fmcsaClient.ts          │
                    │  fetchCarrierFromFMCSA() │
                    │  (Mock → Real HTTP)      │
                    └──────────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌─────────────────────┐      ┌──────────────────────┐
        │  Autosync Job       │      │  Manual Refresh      │
        │ (fmcsaAutosyncJob)  │      │ Endpoint (/api/...)  │
        │                     │      │                      │
        │ • Batch process all │      │ • Single carrier     │
        │   carriers          │      │ • Admin-only (RBAC)  │
        │ • Handle errors     │      │ • On-demand          │
        │ • Log results       │      │ • Returns updated    │
        └────────┬────────────┘      │   carrier data       │
                 │                   └──────────┬───────────┘
                 │                              │
                 └──────────────┬───────────────┘
                                │
                                ▼
                    ┌───────────────────────────┐
                    │  PostgreSQL Database      │
                    │                           │
                    │  Carrier Table:           │
                    │  • fmcsaStatus            │
                    │  • fmcsaAuthorized        │
                    │  • fmcsaLastSyncAt        │
                    │  • fmcsaSyncError         │
                    └───────────────┬───────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │ Matching Engine (GET /)   │
                    │                           │
                    │ WHERE clause filters:     │
                    │ fmcsaAuthorized:          │
                    │   { not: false }          │
                    │                           │
                    │ Result: Only carriers     │
                    │ with status true/null     │
                    └───────────────┬───────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │ Match Results             │
                    │                           │
                    │ Scoring & Ranking         │
                    │ (Component Scores)        │
                    │                           │
                    │ Top N Matches             │
                    └───────────────────────────┘
```

## Data Flow

### Autosync Path (Scheduled)
```
1. Job Scheduler triggers runFMCSAAutosyncJob()
2. Query all carriers WHERE mcNumber IS NOT NULL
3. For each carrier:
   a. Call fetchCarrierFromFMCSA(mcNumber)
   b. On success:
      - Update fmcsaStatus = response.status
      - Update fmcsaAuthorized = response.authorized
      - Update fmcsaLastSyncAt = NOW()
      - Clear fmcsaSyncError (set to null)
      - Log success: logger.info('fmcsa_sync_success', ...)
   c. On failure:
      - Update fmcsaSyncError = error.message
      - Log error: logger.error('fmcsa_fetch_error', ...)
      - Continue to next carrier
4. Log summary: logger.info('fmcsa_autosync_success', {
     meta: { successCount, failureCount, durationMs }
   })
```

### Manual Refresh Path (Admin)
```
1. Admin POST /api/carriers/{id}/fmcsa-refresh
2. requireUser() checks authentication ✓
3. Role check: user.role in [CEO, ADMIN, COO] ✓
4. Fetch carrier by ID
5. Validate: carrier.mcNumber exists
6. Call fetchCarrierFromFMCSA(mcNumber)
7. Update carrier record (same as autosync)
8. Return 200 + updated carrier JSON
9. Client shows toast: "Carrier synced successfully"
```

### Matching Path (Load Calculation)
```
1. API call: GET /api/freight/loads/{id}/matches
2. Query carriers with WHERE clause:
   a. active = true
   b. blocked = false
   c. disqualified = false
   d. fmcsaAuthorized: { not: false }  ← NEW FILTER
   e. equipmentType includes load.equipmentType
3. Score each carrier:
   - Distance score
   - Equipment score
   - Preferred lane score
   - Bonus score
   - On-time score
   - Capacity score
   - Penalty score
4. Weighted sum to get total score
5. Sort by score (descending)
6. Return top N matches
```

## Component Responsibilities

### `lib/integrations/fmcsaClient.ts`
- **Purpose**: Abstract FMCSA API calls
- **Inputs**: MC number (string)
- **Outputs**: FMCSACarrierData or null
- **Error Handling**: Logs and throws
- **Mock**: Returns realistic test data
- **Future**: Replace with real HTTP client

### `lib/jobs/fmcsaAutosyncJob.ts`
- **Purpose**: Batch sync all carriers
- **Trigger**: Scheduled job (cron/scheduler)
- **Steps**:
  1. Log start with requestId
  2. Fetch all carriers with MC numbers
  3. Call fmcsaClient for each
  4. Update database on success/failure
  5. Log summary
- **Error Handling**: Continues on failures, logs each error

### `pages/api/carriers/[id]/fmcsa-refresh.ts`
- **Purpose**: Manual refresh endpoint
- **Method**: POST
- **RBAC**: CEO, ADMIN, COO only
- **Validation**: Carrier exists, has MC number
- **Steps**:
  1. Authenticate user
  2. Check authorization role
  3. Find carrier
  4. Validate MC number
  5. Call fmcsaClient
  6. Update carrier
  7. Return 200 + carrier data
- **Error Cases**: 401, 403, 404, 400, 500

### `lib/logistics/matching.ts`
- **Purpose**: Calculate match scores
- **Filter**: WHERE fmcsaAuthorized: { not: false }
- **Impact**: Excludes unauthorized carriers before scoring
- **No Changes**: Scoring algorithm unchanged

### `prisma/schema.prisma`
- **Purpose**: Data model definition
- **New Fields**:
  - `fmcsaAuthorized Boolean? @default(true)`
  - `fmcsaLastSyncAt DateTime?`
  - `fmcsaSyncError String?`

## Error Handling Strategy

### Autosync Job
```
Try:
  ✓ Sync all carriers
Catch per carrier:
  → Update fmcsaSyncError
  → Log error with carrierId
  → Continue to next
Finally:
  → Log summary (success count + failure list)
  → Alert if failureCount > threshold
```

### Manual Refresh Endpoint
```
Try:
  ✓ Validate user auth + role
  ✓ Find carrier
  ✓ Validate MC number
  ✓ Fetch from FMCSA
  ✓ Update database
Catch:
  401 → Not authenticated
  403 → Wrong role
  404 → Carrier not found
  400 → Missing MC number
  500 → FMCSA API error
```

## Database State Transitions

### New Carrier (Never Synced)
```
fmcsaAuthorized: null or true (default)
fmcsaLastSyncAt: null
fmcsaSyncError: null
↓
Autosync runs
↓
fmcsaAuthorized: true/false (from FMCSA)
fmcsaLastSyncAt: NOW()
fmcsaSyncError: null (or error message if sync fails)
```

### Active Carrier (Previously Synced)
```
fmcsaAuthorized: true
fmcsaLastSyncAt: 2025-01-12T10:00:00Z
fmcsaSyncError: null
↓
Admin manually triggers refresh
↓
fmcsaAuthorized: true/false (from FMCSA)
fmcsaLastSyncAt: NOW()
fmcsaSyncError: null
```

### FMCSA Sync Failure
```
Autosync attempt
↓
FMCSA API timeout or error
↓
fmcsaAuthorized: unchanged (not updated)
fmcsaLastSyncAt: unchanged
fmcsaSyncError: "Connection timeout"
↓
Logged with carrierId for manual remediation
```

## Logging Patterns

### Job Start
```json
{
  "level": "info",
  "message": "fmcsa_autosync_start",
  "meta": {
    "requestId": "uuid-here",
    "timestamp": "2025-01-12T16:30:00Z"
  }
}
```

### Individual Carrier Fetch
```json
{
  "level": "info",
  "message": "fmcsa_fetch",
  "meta": {
    "mcNumber": "123456",
    "status": "success"
  }
}
```

### Individual Carrier Error
```json
{
  "level": "error",
  "message": "fmcsa_fetch_error",
  "meta": {
    "requestId": "uuid-here",
    "carrierId": 42,
    "mcNumber": "123456",
    "error": "Connection timeout"
  }
}
```

### Job Completion
```json
{
  "level": "info",
  "message": "fmcsa_autosync_success",
  "meta": {
    "requestId": "uuid-here",
    "totalCarriers": 100,
    "successCount": 98,
    "failureCount": 2,
    "durationMs": 5234,
    "errors": [
      { "carrierId": 42, "error": "API timeout" },
      { "carrierId": 87, "error": "Invalid MC number" }
    ]
  }
}
```

## Testing Strategy

### Unit Tests
- FMCSA client mock returns realistic data
- Autosync job handles success/failure
- Endpoint validates RBAC and input

### Integration Tests
- Matching engine excludes fmcsaAuthorized: false
- Matching engine includes fmcsaAuthorized: true
- Matching engine includes fmcsaAuthorized: null (backwards compat)

### Manual Testing
- POST /api/carriers/{id}/fmcsa-refresh with admin token
- Verify carrier fields are updated
- Check logs for proper logging

### Load Testing (Future)
- Autosync performance with 10k+ carriers
- FMCSA API rate limiting handling
- Matching query performance with filter

## Performance Considerations

1. **Autosync Job**: Run during off-peak (2 AM UTC)
   - ~100ms per carrier (network + DB)
   - For 1000 carriers: ~1.5-2 minutes total
   - Parallelization possible for future optimization

2. **Matching Query**: Filter at WHERE clause
   - Query execution plan unchanged
   - Index on `fmcsaAuthorized` optional (low cardinality)
   - Reduces scoring iterations (fewer carriers)

3. **Database**: New columns are nullable with default
   - Minimal migration impact
   - Backwards compatible with existing carriers

## Security Considerations

1. **Manual Refresh RBAC**
   - CEO, ADMIN, COO roles only
   - Prevents unauthorized carriers from being marked as authorized

2. **Database Fields**
   - fmcsaAuthorized controls matching logic
   - Admin-verified before sync
   - Cannot be set by end users

3. **API Rate Limiting**
   - Manual refresh endpoint: throttle per IP
   - Autosync job: respect FMCSA API limits

## Future Enhancements

1. **Real FMCSA API Integration**
   - Replace mock client with HTTP calls
   - Implement retry logic with exponential backoff
   - Cache FMCSA responses for performance

2. **Advanced Scheduling**
   - Configurable sync frequency (hourly/daily/weekly)
   - Webhook support from FMCSA
   - Priority syncing (new carriers immediately)

3. **Monitoring & Alerting**
   - Dashboard for sync success rate
   - Alerts on failed syncs > threshold
   - Carrier-level status tracking

4. **Carrierside Integration**
   - API for carriers to update their FMCSA status
   - Self-service status verification
   - Email notifications on status changes

5. **Compliance Reporting**
   - Audit trail of all FMCSA updates
   - Compliance report generation
   - Historical tracking of status changes
