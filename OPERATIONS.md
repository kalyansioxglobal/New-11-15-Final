# Operations Runbook

SIOX Command Center - Operational Procedures

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Incident Response](#incident-response)
3. [Database Operations](#database-operations)
4. [User Management](#user-management)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Daily Operations

### Health Check

Verify system health daily:

```bash
curl https://your-app.replit.app/api/health
curl https://your-app.replit.app/api/status
```

Expected responses:
- `{"status":"ok"}` - App is running
- `{"db":"ok"}` - Database connected

### Log Review

Check for issues in server logs:

1. Open Replit Logs panel
2. Look for `"level":"error"` entries
3. Look for `"type":"slow_query"` entries (queries > 300ms)

### Database Maintenance

No daily maintenance required. Neon handles:
- Connection pooling
- Automatic backups
- Storage scaling

---

## Incident Response

### App Not Loading

1. **Check Replit deployment status**
   - View deployment logs
   - Restart deployment if needed

2. **Check health endpoints**
   ```bash
   curl https://your-app/api/health
   ```

3. **Check database connection**
   ```bash
   curl https://your-app/api/status
   ```
   If `db: "error"`, check DATABASE_URL and Neon status

4. **Review recent changes**
   - Use Replit checkpoints to rollback if needed

### Login Not Working

1. **Verify NEXTAUTH_SECRET is set**
   - Check Secrets tab in Replit
   - Must be at least 32 characters

2. **Verify NEXTAUTH_URL matches deployment URL**
   - Should be `https://your-app.replit.app`

3. **Check email delivery**
   - If using OTP via email, verify SENDGRID_API_KEY
   - Check spam folders

4. **Clear cookies and retry**

### Database Errors

1. **Connection refused**
   - Check Neon project status at https://console.neon.tech
   - Verify DATABASE_URL is correct
   - Check for connection pool exhaustion

2. **Query timeouts**
   - Check slow query logs
   - Reduce date range filters
   - Contact support if persistent

3. **Data corruption**
   - Use Replit checkpoint to restore
   - Contact support if severe

### High Latency

1. **Identify slow endpoints**
   - Check logs for `slow_query` entries
   - Note which endpoints are affected

2. **Short-term mitigation**
   - Reduce concurrent users if possible
   - Narrow date ranges on dashboards

3. **Long-term fixes**
   - Add indexes for slow queries
   - Implement caching
   - Scale database resources

---

## Database Operations

### View Schema

```bash
npx prisma db pull
```

### Apply Schema Changes

```bash
# For development (no existing data):
npx prisma db push

# For production (with existing data):
# First backup via Neon dashboard, then:
npx prisma migrate deploy
```

**Warning**: Always backup data before schema changes in production. Never use `--accept-data-loss` flag.

### Reset Development Database

```bash
npx prisma migrate reset
```

**Warning**: This deletes ALL data. Only use in development.

### Seed Test Data

```bash
# Via API endpoint (requires admin login)
POST /api/admin/auto-seed-test-data
```

### Query Database Directly

Use Replit's Database panel or:

```bash
npx prisma studio
```

### Backup Database

Neon provides automatic backups. For manual backup:

```bash
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql
```

---

## User Management

### Create Admin User

1. Go to `/admin/users`
2. Click "Add User"
3. Fill in details with role = "CEO" or "ADMIN"
4. User receives OTP to verify email

### Reset User Password/OTP

Users authenticate via OTP (one-time password) sent to email. No passwords to reset.

### Disable User

1. Go to `/admin/users`
2. Find user
3. Set `isActive = false`

### View User Activity

1. Go to `/admin/activity-log`
2. Filter by user
3. Review recent actions

### Impersonate User (Admin Only)

1. Admin logs in normally
2. Go to `/admin/impersonate`
3. Select user to impersonate
4. All actions are logged with original admin ID

---

## Monitoring

### Key Metrics

| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| Response time (p99) | < 500ms | > 1000ms |
| Error rate | < 0.5% | > 1% |
| Database connections | 1-10 | > 15 |
| Memory usage | < 400MB | > 500MB |

### Slow Query Threshold

Currently set to 300ms in `lib/prisma.ts`:

```typescript
const SLOW_QUERY_THRESHOLD_MS = 300;
```

Queries exceeding this are logged as warnings.

### Rate Limiting

Limit: 30 requests per minute per IP per route

Location: `lib/rateLimit.ts`

Rate limit hits are logged and return HTTP 429.

---

## Troubleshooting

### "Unauthorized" on all pages

**Cause**: Session expired or invalid

**Fix**: 
1. Clear browser cookies
2. Log in again
3. If persists, check NEXTAUTH_SECRET hasn't changed

### "Database connection failed"

**Cause**: Connection pool exhausted or Neon issue

**Fix**:
1. Wait 30 seconds (connections auto-close)
2. Check Neon status
3. Restart deployment

### "Page loads slowly"

**Cause**: Complex query or large dataset

**Fix**:
1. Check slow query logs
2. Reduce date range filter
3. Check if indexes exist for query pattern

### "Email not received"

**Cause**: SendGrid issue or spam filter

**Fix**:
1. Check spam folder
2. Verify SENDGRID_API_KEY
3. Check SendGrid dashboard for delivery status
4. Use console OTP as fallback

### "Charts not loading"

**Cause**: No data in date range or API error

**Fix**:
1. Check browser console for errors
2. Try different date range
3. Verify venture has data

### "Import failed"

**Cause**: CSV format issue or missing columns

**Fix**:
1. Check CSV has required columns
2. Verify date formats (YYYY-MM-DD preferred)
3. Check for special characters in data
4. Review import error message

---

## Escalation

### Level 1 - Self-Service
- Clear cookies and retry
- Check health endpoints
- Review recent changes

### Level 2 - Technical Review
- Check server logs
- Review slow queries
- Database inspection

### Level 3 - Infrastructure
- Neon database issues
- Replit platform issues
- Contact support

---

## Contacts

- **Replit Support**: support@replit.com
- **Neon Status**: https://status.neon.tech
- **Replit Status**: https://status.replit.com
