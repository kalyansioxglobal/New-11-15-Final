# Build and Deployment Guide

## 📋 Quick Summary

**Build Command:** `npm run build`  
**Start Command:** `npm start`  
**Database:** PostgreSQL (Supabase/Neon)

---

## 🚀 Step 1: Build Process

### Local Build (Test Before Deployment)

```bash
# Install dependencies (if not already done)
npm ci

# Build the application
# This will:
# 1. Generate Prisma client (prisma generate)
# 2. Build Next.js production bundle (next build)
npm run build
```

**Expected Output:**
- ✅ Prisma client generated
- ✅ Next.js build completes successfully
- ⚠️ Warnings are OK (React Hook dependencies, etc.)
- ❌ Errors must be fixed before deployment

---

## 🗄️ Step 2: Database Configuration

### For NEW Database (First Time Setup)

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Push schema to database (creates all tables)
npx prisma db push

# 3. Seed initial data (optional)
npm run seed
```

### For EXISTING Database (Production)

```bash
# 1. BACKUP YOUR DATABASE FIRST! (via Neon/Supabase dashboard)

# 2. Generate Prisma client
npx prisma generate

# 3. Apply migrations (safe, preserves data)
npm run db:migrate
# OR
npx prisma migrate deploy

# 4. Verify connection
npx prisma db pull
```

**⚠️ IMPORTANT:** 
- **NEVER** use `npm run db:push` in production (only for development)
- **NEVER** run seeding scripts in production
- Always backup database before migrations
- Test migrations in staging first

---

## 🔐 Step 3: Environment Variables

### Required Environment Variables

Set these in your deployment platform (Replit Secrets, Vercel Environment Variables, etc.):

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `NEXTAUTH_SECRET` | Session encryption key (32+ chars) | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL | `https://your-app.replit.app` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | AI features (summaries, analysis) | None |
| `SENDGRID_API_KEY` | Email notifications | None |
| `FMCSA_API_KEY` | Carrier lookup | None |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | None |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | None |
| `NEXT_PUBLIC_BASE_URL` | Public base URL | None |

### Production Database URL Format

For better connection pooling, add these parameters to `DATABASE_URL`:

```
postgresql://user:pass@host/db?connection_limit=20&pool_timeout=30&sslmode=require
```

---

## 🚢 Step 4: Deployment Steps

### Option A: Replit Deployment

1. **Set Deployment Target:**
   - Go to Replit Dashboard
   - Select "VM" (Always-On) deployment target

2. **Configure Build:**
   - Build Command: `npm run build`
   - Run Command: `npm start`

3. **Set Environment Variables:**
   - Go to Secrets tab
   - Add all required environment variables (see Step 3)

4. **Deploy:**
   - If connected to GitHub: Auto-deploys on push to main
   - Manual: Click "Deploy" button

### Option B: Manual Deployment (Vercel, etc.)

```bash
# 1. Install dependencies
npm ci

# 2. Build the application
npm run build

# 3. Apply database migrations (if needed)
npm run db:migrate

# 4. Start production server
npm start
```

---

## ✅ Step 5: Post-Deployment Verification

### 1. Health Checks

```bash
# Basic health check
curl https://your-app-url/api/health
# Expected: {"status":"ok","time":"..."}

# Full status (includes DB check)
curl https://your-app-url/api/status
# Expected: {"status":"ok","db":"ok",...}
```

### 2. Critical Pages Test

Test these pages after deployment:
- `/` - Home page loads
- `/login` - Login page works
- `/dashboard` - Main dashboard loads
- `/hospitality/hotels` - Hotel list displays
- `/logistics/freight-pnl` - Freight data displays
- `/admin/users` - User management works

### 3. Authentication Flow

1. Visit `/login`
2. Enter admin email
3. Check for OTP (email or console logs)
4. Verify login works and session persists

---

## 🔧 Step 6: Database Migration Checklist

### Before Running Migrations:

- [ ] **Backup database** (via Neon/Supabase dashboard)
- [ ] Test migrations in staging environment
- [ ] Review migration files: `prisma/migrations/`
- [ ] Check for breaking changes
- [ ] Verify `DATABASE_URL` is correct

### During Migration:

```bash
# Check migration status
npx prisma migrate status

# Apply pending migrations
npm run db:migrate

# Verify migration applied
npx prisma migrate status
```

### After Migration:

- [ ] Verify application starts successfully
- [ ] Test critical database operations
- [ ] Check application logs for errors
- [ ] Monitor database connection pool

---

## 📊 Monitoring

### Key Metrics to Watch

1. **Response Times:** p99 should stay under 1s
2. **Error Rate:** Should be < 1%
3. **Database Connections:** Watch for pool exhaustion
4. **Memory Usage:** Node.js should stay under 512MB

### Log Access

```bash
# Check Replit logs panel
# OR via terminal:
grep -i error /path/to/logs
grep slow_query /path/to/logs
```

---

## 🔄 Rollback Procedure

If deployment fails:

1. **Replit:**
   - Click "View Checkpoints"
   - Select last known working state
   - Restore code and database

2. **Manual:**
   ```bash
   # Revert code
   git revert HEAD
   git push origin main
   
   # Restore database from backup
   # (via Neon/Supabase dashboard)
   ```

---

## 🛠️ Troubleshooting

### Build Fails with Prisma Errors

```bash
# Regenerate Prisma client
npx prisma generate

# Verify DATABASE_URL is set
echo $DATABASE_URL

# Check Prisma schema
npx prisma validate
```

### Database Connection Errors

```bash
# Test database connection
npx prisma db pull

# Verify DATABASE_URL format
# Should be: postgresql://user:pass@host:port/db

# Check network connectivity
# Ensure database allows connections from deployment IP
```

### Application Won't Start

```bash
# Check environment variables
env | grep DATABASE_URL
env | grep NEXTAUTH

# Verify port is available
# Default: port 3000

# Check for port conflicts
lsof -i :3000
```

---

## 📝 Script Reference

| Script | Purpose | Environment |
|--------|---------|-------------|
| `npm run dev` | Start development server (port 5000) | Development |
| `npm run build` | Build for production | Production |
| `npm run start` | Start production server (port 3000) | Production |
| `npm run db:migrate` | Apply pending migrations | Production |
| `npm run db:push` | Push schema changes (no migrations) | Development only |
| `npm run db:studio` | Open Prisma Studio GUI | Development |
| `npx prisma generate` | Generate Prisma client | All |

---

## ✅ Pre-Deployment Checklist

Before deploying:

- [ ] Code builds successfully (`npm run build`)
- [ ] All tests pass (if applicable)
- [ ] Environment variables configured
- [ ] Database migrations tested in staging
- [ ] Database backup created
- [ ] NEXTAUTH_SECRET generated securely
- [ ] NEXTAUTH_URL matches production domain
- [ ] DATABASE_URL configured correctly
- [ ] Review deployment logs for errors

---

## 🎯 Quick Command Summary

```bash
# Complete deployment flow
npm ci                           # Install dependencies
npm run build                    # Build application
npx prisma generate              # Generate Prisma client (if needed)
npm run db:migrate              # Apply migrations (if needed)
npm start                        # Start production server

# Or use the build script (includes prisma generate)
npm run build && npm start
```

---

## 📚 Additional Resources

- **Deployment Docs:** `DEPLOYMENT.md`
- **Deployment Notes:** `DEPLOY_NOTES.md`
- **Environment Setup:** `ENVIRONMENT.md`
- **Database Schema:** `prisma/schema.prisma`

---

**Last Updated:** Based on current codebase (December 2025)  
**Node.js Version:** 20.x  
**Next.js Version:** 15.x  
**Prisma Version:** 6.x  
**PostgreSQL:** 15.x (Neon/Supabase)

