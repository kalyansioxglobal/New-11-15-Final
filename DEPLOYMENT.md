# Deployment Guide

This document explains how to safely build, deploy, and maintain this application.

## Script Reference

| Script | Purpose | Environment |
|--------|---------|-------------|
| `npm run dev` | Start development server on port 5000 | Development only |
| `npm run build` | Build for production (generates Prisma client + Next.js build) | CI/CD, Production |
| `npm run start` | Start production server | Production |
| `npm run db:migrate` | Apply pending database migrations | Production (run manually) |
| `npm run db:push` | Push schema changes to database (no migration history) | Development only |
| `npm run db:studio` | Open Prisma Studio for database inspection | Development only |
| `npm run seed` | Seed database with base data | Development only |
| `npm run seed:comprehensive` | Seed with comprehensive 3-year test data | Development only |
| `npm run seed:audit` | Seed audit check templates | Development only |

## Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# 3. Push schema to development database
npm run db:push

# 4. Seed development data (optional)
npm run seed
# OR for full test data:
npm run seed:comprehensive

# 5. Start development server
npm run dev
```

## Production Deployment

### Build Process

The build script (`npm run build`) ONLY does:
1. `prisma generate` - Generates the Prisma client
2. `next build` - Builds the Next.js application

It does NOT:
- Run database migrations
- Push schema changes
- Seed any data

### Deployment Steps

```bash
# 1. Build the application
npm run build

# 2. Apply database migrations (if any pending)
npm run db:migrate

# 3. Start the application
npm run start
```

### Database Migration Safety

- **NEVER** run `npm run db:push` in production
- **NEVER** run seeding scripts in production
- Always use `npm run db:migrate` for production database changes
- Test migrations in staging before applying to production
- Keep database backups before running migrations

## Environment Variables

Required for production:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `NEXTAUTH_URL` - Public URL of the application

Optional:
- `OPENAI_API_KEY` - For AI-powered features
- `SENDGRID_API_KEY` - For email notifications

## Scheduled Jobs

The following scheduled jobs run via Replit Scheduled Deployments:

| Job | Script | Schedule |
|-----|--------|----------|
| FMCSA Auto-Sync | `npm run fmcsa:autosync` | 5x daily |

## Rollback Procedure

1. Revert to previous deployment
2. If database changes need rollback, restore from backup
3. Prisma migrations do not auto-rollback; manual intervention may be required

## Troubleshooting

### Build fails with Prisma errors
- Ensure `DATABASE_URL` is set correctly
- Run `npx prisma generate` manually to regenerate client

### Database connection errors
- Verify `DATABASE_URL` format
- Check network connectivity to database
- Ensure database user has correct permissions
