# Deployment Notes

Last Updated: December 2025

## Build Status

**Build: PASSING**

The production build (`npm run build`) completes successfully. There are some React Hook dependency warnings that can be addressed post-launch but do not affect functionality.

## Deployment Type

**Recommended: VM (Always-On)**

The SIOX Command Center is a stateful application with:
- Session-based authentication (NextAuth)
- Database connections that benefit from connection pooling
- Real-time dashboard data

Use Replit's "VM" deployment target for always-on availability.

## Pre-Deployment Checklist

### 1. Environment Variables (Required)

Ensure these are set in **Production** environment:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Session encryption key (32+ chars) | Yes |
| `NEXTAUTH_URL` | Production URL (e.g., `https://your-app.replit.app`) | Yes |

### 2. Environment Variables (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | AI features (summaries, analysis) | None |
| `SENDGRID_API_KEY` | Email notifications | None |
| `FMCSA_API_KEY` | Carrier lookup | None |

### 3. Database Preparation

```bash
# Generate Prisma client
npx prisma generate

# For NEW databases only (first deployment):
npx prisma db push

# For EXISTING databases with data:
# First, backup your database via Neon dashboard
# Then apply migrations safely:
npx prisma migrate deploy

# Verify connection
npx prisma db pull
```

**IMPORTANT**: Never use `--accept-data-loss` on production databases with real data. Always backup first via Neon dashboard.

### 4. Production Secrets

Generate a secure NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

## Deployment Commands

### Replit Deployment

1. Set deployment target to "VM"
2. Set build command: `npm run build`
3. Set run command: `npm start`
4. Configure environment variables in Secrets tab

### Manual Deployment

```bash
# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Build production bundle
npm run build

# Start production server
npm start
```

## Post-Deployment Verification

### 1. Health Checks

Test these endpoints immediately after deployment:

```bash
# Basic health
curl https://your-app.replit.app/api/health
# Expected: {"status":"ok","time":"..."}

# Full status (includes DB)
curl https://your-app.replit.app/api/status
# Expected: {"status":"ok","db":"ok",...}
```

### 2. Authentication Flow

1. Visit `/login`
2. Enter admin email
3. Check for OTP (email or console)
4. Verify login works

### 3. Critical Pages

- `/dashboard` - Main dashboard loads
- `/logistics/freight-pnl` - Freight data displays
- `/hospitality/hotels` - Hotel list loads
- `/admin/users` - User management works

## Rollback Plan

Replit provides automatic checkpoints. If deployment fails:

1. Click "View Checkpoints" in Replit
2. Select last known working state
3. Restore code and database

## Production Configuration

### Recommended Database Settings

Add to DATABASE_URL for production:

```
?connection_limit=20&pool_timeout=30&sslmode=require
```

Example:
```
postgresql://user:pass@host/db?connection_limit=20&pool_timeout=30&sslmode=require
```

### Rate Limiting

Current: 30 requests/minute per IP per route
Location: `lib/rateLimit.ts`

To adjust for production:
```typescript
const MAX_REQUESTS = 60; // Increase if needed
```

## Monitoring

### Key Metrics to Watch

1. **Response times** - p99 should stay under 1s
2. **Error rate** - Should be < 1%
3. **Database connections** - Watch for pool exhaustion
4. **Memory usage** - Node.js should stay under 512MB

### Log Access

Check Replit logs panel or use:
```bash
# Look for errors
grep -i error /path/to/logs

# Look for slow queries
grep slow_query /path/to/logs
```

## Known Limitations

1. **Rate limiting uses database** - May cause slight latency under heavy load
2. **No CDN** - Static assets served directly from server
3. **Single instance** - No horizontal scaling by default

## Scaling Notes

If traffic exceeds 500 concurrent users:

1. **Add Redis** for session storage and rate limiting
2. **Enable autoscaling** on Replit (if available)
3. **Consider read replicas** for heavy reporting

## Support Contacts

For deployment issues:
- Check Replit status: https://status.replit.com
- Database issues: Check Neon dashboard
- Application errors: Review server logs

## Version Info

- Node.js: 20.x
- Next.js: 15.x
- Prisma: 6.x
- PostgreSQL: 15.x (Neon)
