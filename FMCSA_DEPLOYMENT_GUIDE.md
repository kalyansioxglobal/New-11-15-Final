# FMCSA Implementation - Deployment & Testing Guide

## Quick Start

### Prerequisites
- Node.js + Yarn
- PostgreSQL database
- .env.local with DATABASE_URL

### Installation & Testing

```bash
# 1. Install dependencies (already done)
yarn install

# 2. Apply database migration
yarn prisma migrate deploy

# 3. Run FMCSA tests only
yarn test --testPathPatterns="fmcsa|matching_carrier_filters" --runInBand

# 4. Run full test suite (regression)
yarn test --runInBand

# Expected: 180/180 tests passing
```

## Testing in Development

### Run FMCSA-Related Tests
```bash
# Option 1: FMCSA tests only
yarn test --testPathPatterns="carriers_fmcsa_refresh|fmcsaAutosyncJob|matching_carrier_filters" --runInBand

# Option 2: All critical tests
yarn test --testPathPatterns="critical" --runInBand

# Option 3: Full suite
yarn test --runInBand
```

### Expected Test Output
```
Test Suites: 60 passed, 60 total
Tests:       180 passed, 180 total
Snapshots:   0 total
Time:        2.77 s
```

## Manual Testing

### Test with cURL

#### 1. Get a Valid Carrier ID
```bash
# First, check what carriers exist in your database
# Option A: Via Prisma console
yarn prisma studio

# Option B: Via API (get a load and check its matches)
curl -X GET http://localhost:3000/api/freight/loads/1/matches \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. Test Manual Refresh Endpoint

```bash
# With CEO role (should succeed)
curl -X POST http://localhost:3000/api/carriers/1/fmcsa-refresh \
  -H "Authorization: Bearer YOUR_CEO_TOKEN" \
  -H "Content-Type: application/json"

# Expected Response (200 OK):
{
  "id": 1,
  "name": "ABC Logistics",
  "mcNumber": "123456",
  "fmcsaStatus": "ACTIVE",
  "fmcsaAuthorized": true,
  "fmcsaLastSyncAt": "2025-01-12T16:30:00.000Z",
  "fmcsaSyncError": null
}
```

```bash
# With CSR role (should fail 403)
curl -X POST http://localhost:3000/api/carriers/1/fmcsa-refresh \
  -H "Authorization: Bearer YOUR_CSR_TOKEN" \
  -H "Content-Type: application/json"

# Expected Response (403 Forbidden):
{
  "error": "Unauthorized"
}
```

```bash
# With missing carrier ID (should fail 404)
curl -X POST http://localhost:3000/api/carriers/999999/fmcsa-refresh \
  -H "Authorization: Bearer YOUR_CEO_TOKEN" \
  -H "Content-Type: application/json"

# Expected Response (404 Not Found):
{
  "error": "Carrier not found"
}
```

### Test Autosync Job in Node REPL

```bash
# Enter Node REPL
node

# Inside REPL:
const { runFMCSAAutosyncJob } = require('./lib/jobs/fmcsaAutosyncJob');
await runFMCSAAutosyncJob();

// Watch console for logs:
// - fmcsa_autosync_start
// - fmcsa_fetch (for each carrier)
// - fmcsa_autosync_success (final summary)

// Check database:
const prisma = require('./lib/prisma').default;
await prisma.carrier.findFirst({
  where: { fmcsaLastSyncAt: { not: null } }
});

// Exit REPL
.exit
```

### Test Matching Filter

```bash
# Get matches for a load (should exclude fmcsaAuthorized: false carriers)
curl -X GET http://localhost:3000/api/freight/loads/1/matches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Verify:
# 1. No carriers with fmcsaAuthorized: false in results
# 2. Results include only authorized/null carriers
# 3. Top match has highest score
```

## Staging Deployment

### Pre-Deployment Checklist
- [ ] All tests passing locally (yarn test --runInBand)
- [ ] No TypeScript errors (yarn build or check)
- [ ] Code reviewed and approved
- [ ] Database backup created

### Deploy Steps

1. **Merge to staging branch**
   ```bash
   git checkout staging
   git pull origin main  # or your main branch
   git push origin staging
   ```

2. **Deploy to staging environment**
   ```bash
   # Via your CI/CD pipeline or manual deploy
   # Ensure DATABASE_URL is set
   yarn install
   yarn prisma migrate deploy
   yarn build
   yarn start
   ```

3. **Verify deployment**
   ```bash
   # Test endpoint
   curl -X POST https://staging.app.com/api/carriers/1/fmcsa-refresh \
     -H "Authorization: Bearer STAGING_TOKEN"
   
   # Check logs
   tail -f /var/log/app.log | grep "fmcsa"
   ```

4. **Run smoke tests**
   ```bash
   # Test matching with real staging data
   curl -X GET https://staging.app.com/api/freight/loads/1/matches \
     -H "Authorization: Bearer STAGING_TOKEN"
   ```

## Production Deployment

### Pre-Production Checklist
- [ ] Staging deployment verified for 24 hours
- [ ] No issues or errors in staging logs
- [ ] Manual testing completed
- [ ] Real FMCSA API integration ready (if not using mock)
- [ ] Monitoring and alerting configured
- [ ] Runbook created for ops team
- [ ] Database backup scheduled

### Phased Rollout

**Phase 1: Soft Launch (10% of carriers)**
```bash
# 1. Deploy code to production
# 2. Manually run autosync for sample carriers only
# 3. Monitor for 24 hours
# 4. Verify no matching errors
# 5. Check sync success rate
```

**Phase 2: Gradual Rollout (50% of carriers)**
```bash
# 1. Increase carriers synced in autosync job
# 2. Monitor success rate and error patterns
# 3. Check freight matching results quality
# 4. Verify no CSR/carrier complaints
```

**Phase 3: Full Rollout (100% of carriers)**
```bash
# 1. Enable autosync for all carriers
# 2. Schedule daily autosync job
# 3. Set up monitoring dashboard
# 4. Alert ops team on failures
```

## Monitoring & Observability

### Key Metrics to Track

1. **Autosync Success Rate**
   - Target: >99%
   - Alert if: <95%
   - Check: Logs for fmcsa_autosync_success

2. **Sync Error Rate**
   - Target: <1%
   - Alert if: >5%
   - Check: fmcsaSyncError field in database

3. **Matching Quality**
   - Carriers excluded (fmcsaAuthorized: false)
   - Matches per load (should be similar to before)
   - Average carrier score (should be similar to before)

4. **Endpoint Performance**
   - Manual refresh response time: <1 second
   - Alert if: >5 seconds
   - Check: API response logs

### Log Monitoring Setup

```bash
# Tail FMCSA logs
tail -f /var/log/app.log | grep "fmcsa"

# Alert on errors
grep -c "fmcsa.*error" /var/log/app.log

# Count successful syncs
grep -c "fmcsa_autosync_success" /var/log/app.log
```

### Dashboard Queries (example for Prometheus/Datadog)

```
# Autosync success count
sum(rate(log_lines{message="fmcsa_autosync_success"}[5m]))

# Sync error count
sum(rate(log_lines{message="fmcsa_fetch_error"}[5m]))

# Endpoint latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{path="/api/carriers/*/fmcsa-refresh"}[5m]))
```

## Rollback Plan

If production issues occur:

### Immediate Rollback (No Matching Impact)
```bash
# Just stop the autosync job
# - No database rollback needed
# - Existing fmcsaAuthorized values remain
# - Matching continues to work with existing values
# - Roll back code, restart app
```

### Database Rollback (If Needed)
```bash
# Reverse migration
yarn prisma migrate resolve --rolled-back 20250112000000_add_fmcsa_fields

# This:
# 1. Removes fmcsaAuthorized, fmcsaLastSyncAt, fmcsaSyncError columns
# 2. Matching defaults to including all carriers (backwards compat)
# 3. Requires full app restart and code rollback
```

### Verification After Rollback
```bash
# 1. Verify matching works (carriers returned)
curl http://localhost:3000/api/freight/loads/1/matches

# 2. Check no FMCSA errors in logs
grep "fmcsa.*error" /var/log/app.log | wc -l  # Should be 0

# 3. Monitor CSR complaints
# 4. Monitor freight matching quality metrics
```

## Production Maintenance

### Daily Checks
```bash
# 1. Verify autosync completed successfully
grep "fmcsa_autosync_success" /var/log/app.log | tail -1

# 2. Check error rate
grep "fmcsa_fetch_error" /var/log/app.log | wc -l

# 3. Verify matching quality
curl http://prod.api.com/api/freight/loads/1/matches | jq '.matches | length'
```

### Weekly Maintenance
```bash
# 1. Review sync error patterns
grep "fmcsa_fetch_error" /var/log/app.log | jq '.meta.error' | sort | uniq -c

# 2. Check for stuck syncs
SELECT COUNT(*) FROM "Carrier" WHERE "fmcsaLastSyncAt" < NOW() - INTERVAL '7 days';

# 3. Verify no carriers unexpectedly excluded
SELECT COUNT(*) FROM "Carrier" WHERE "fmcsaAuthorized" = false;
```

### Monthly Audit
```bash
# 1. Audit all FMCSA changes
SELECT * FROM "Carrier" WHERE "fmcsaLastSyncAt" > NOW() - INTERVAL '1 month' ORDER BY "fmcsaLastSyncAt" DESC;

# 2. Review error patterns
grep "fmcsa_fetch_error" /var/log/app.log | jq '.meta.error' | sort | uniq -c | sort -rn | head -10

# 3. Performance analysis
# - Check sync duration trends
# - Verify no matching performance regression
# - Review carrier load distribution
```

## Troubleshooting

### Autosync Not Running
```bash
# Check if job is scheduled
# (Depends on your scheduler setup)

# Manually trigger to test
curl -X POST http://localhost:3000/api/admin/jobs/fmcsa-sync \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Check logs
grep "fmcsa_autosync" /var/log/app.log
```

### Manual Refresh Returns 400
```bash
# Likely cause: Carrier missing MC number
SELECT id, name, mcNumber FROM "Carrier" WHERE "id" = 1;

# Fix: Add MC number to carrier
UPDATE "Carrier" SET "mcNumber" = '123456' WHERE id = 1;

# Retry refresh
curl -X POST http://localhost:3000/api/carriers/1/fmcsa-refresh \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Manual Refresh Returns 403
```bash
# Likely cause: User doesn't have required role
# User roles required: CEO, ADMIN, COO

# Check user role
SELECT id, email, roles FROM "User" WHERE id = YOUR_USER_ID;

# Fix: Update user role (via admin panel or directly)
UPDATE "User" SET roles = ARRAY['ADMIN'] WHERE id = YOUR_USER_ID;
```

### Matching Returns No Matches
```bash
# Check if all carriers are filtered out
SELECT COUNT(*) FROM "Carrier" WHERE "fmcsaAuthorized" = false;

# If high number, likely all marked as unauthorized
# Options:
# 1. Run autosync to update statuses
# 2. Manually update carriers: UPDATE "Carrier" SET "fmcsaAuthorized" = null;
# 3. Check FMCSA API for systematic issues
```

## Support & Escalation

For issues:
1. Check logs: `/var/log/app.log | grep "fmcsa"`
2. Review FMCSA_IMPLEMENTATION.md for architecture
3. Check FMCSA_QUICK_REFERENCE.md for API usage
4. Escalate to engineering team if critical

## Related Documentation

- `FMCSA_IMPLEMENTATION.md` — Complete implementation guide
- `FMCSA_QUICK_REFERENCE.md` — Developer quick reference
- `FMCSA_ARCHITECTURE.md` — System architecture and design
- `WAVE_18_TRACK_E_COMPLETION.md` — Track completion summary
