# Environment Variables

This document lists all environment variables used by the SIOX Command Center application.

## Required Environment Variables

| Name | Description | Where Used | Example Value |
|------|-------------|------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | `lib/prisma.ts`, Prisma ORM | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js JWT signing (falls back to SESSION_SECRET) | `pages/api/auth/[...nextauth].ts` | 32+ character random string |
| `NEXTAUTH_URL` | Base URL for authentication callbacks | NextAuth configuration | `https://your-domain.com` |

## Database Variables (Auto-set by Replit/Neon)

| Name | Description | Where Used |
|------|-------------|------------|
| `PGHOST` | PostgreSQL host | Database connection |
| `PGPORT` | PostgreSQL port | Database connection |
| `PGUSER` | PostgreSQL user | Database connection |
| `PGPASSWORD` | PostgreSQL password | Database connection |
| `PGDATABASE` | PostgreSQL database name | Database connection |

## Optional Environment Variables

### AI/OpenAI Integration

| Name | Description | Default | Where Used |
|------|-------------|---------|------------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | None (AI disabled) | `lib/ai/*.ts` |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o-mini` | AI integrations |
| `AI_ENABLED` | Enable/disable AI features | `false` | AI feature flags |
| `AI_MAX_DAILY_CALLS` | Max AI API calls per day | `100` | Rate limiting |
| `AI_MAX_TOKENS_PER_REQUEST` | Max tokens per AI request | `4000` | Cost control |
| `AI_ASSISTANT_FREIGHT_ENABLED` | Enable freight AI assistant | `false` | Freight module |
| `AI_MODEL_FREIGHT_ASSISTANT` | Model for freight assistant | `gpt-4o-mini` | Freight module |

### Email (SendGrid)

| Name | Description | Default | Where Used |
|------|-------------|---------|------------|
| `SENDGRID_API_KEY` | SendGrid API key | None (email disabled) | `lib/email.ts` |
| `SENDGRID_FROM_EMAIL` | Default sender email | Required if SendGrid enabled | Email sending |
| `OTP_FROM_EMAIL` | Sender for OTP emails | Falls back to SENDGRID_FROM_EMAIL | Authentication |
| `APPROVALS_FROM_EMAIL` | Sender for approval emails | Falls back to SENDGRID_FROM_EMAIL | Customer approvals |

### File Storage (Supabase)

| Name | Description | Default | Where Used |
|------|-------------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | None | File uploads |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | None | Client-side uploads |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | None | Server-side file ops |
| `SUPABASE_BUCKET_NAME` | Storage bucket name | `files` | File storage |

### External APIs

| Name | Description | Default | Where Used |
|------|-------------|---------|------------|
| `FMCSA_WEBKEY` | FMCSA API key for carrier lookup | None | Carrier import |
| `GOOGLE_PLACES_API_KEY` | Google Places API key | None | Address autocomplete |
| `WHOISXML_API_KEY` | WhoisXML API key | None | Email verification |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | None | SMS features |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | None | SMS features |

### Customer Approval Workflow

| Name | Description | Default | Where Used |
|------|-------------|---------|------------|
| `LOGISTICS_CUSTOMER_APPROVAL_TO` | Recipient for approval requests | None | Approval workflow |
| `LOGISTICS_CUSTOMER_APPROVAL_FROM` | Sender for approval emails | None | Approval workflow |
| `LOGISTICS_CUSTOMER_APPROVAL_CC` | CC for approval emails | None | Approval workflow |

### Application URLs

| Name | Description | Default | Where Used |
|------|-------------|---------|------------|
| `NEXT_PUBLIC_BASE_URL` | Public base URL for the app | Auto-detected | Frontend links |

## Deployment Mapping

### Vercel/Hosting Platform Variables

These should be set in your hosting platform's environment configuration:

```
NEXTAUTH_SECRET
NEXTAUTH_URL
DATABASE_URL
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
OPENAI_API_KEY
FMCSA_WEBKEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_BUCKET_NAME
```

### Database Provider Variables

These are typically auto-configured by managed PostgreSQL providers (Neon, Supabase, etc.):

```
DATABASE_URL
PGHOST
PGPORT
PGUSER
PGPASSWORD
PGDATABASE
```

### Build-Time vs Runtime

| Variable | When Needed |
|----------|-------------|
| `NEXT_PUBLIC_*` | Build time (bundled into client) |
| `DATABASE_URL` | Runtime only |
| `NEXTAUTH_SECRET` | Runtime only |
| All API keys | Runtime only |

## Feature Toggles

| Feature | Required Variables | Fallback Behavior |
|---------|-------------------|-------------------|
| Email/OTP Login | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | Login disabled |
| AI Features | `OPENAI_API_KEY` | AI features hidden |
| File Uploads | `NEXT_PUBLIC_SUPABASE_URL`, Supabase keys | Upload disabled |
| FMCSA Import | `FMCSA_WEBKEY` | Manual carrier entry only |
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | SMS disabled |

## Security Notes

- Never commit `.env` files to version control
- Use separate values for development and production
- Rotate `NEXTAUTH_SECRET` if compromised (will invalidate all sessions)
- API keys should have minimal required permissions
- Database credentials should use read-only replicas where possible for analytics
