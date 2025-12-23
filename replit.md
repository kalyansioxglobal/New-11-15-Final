# Overview

This Next.js application serves as a multi-venture command center, centralizing management and oversight for diverse business ventures including Logistics, Transport, Hospitality, BPO, SaaS, and Holdings. Its primary purpose is to provide executives with tools for monitoring venture health, managing operations, and analyzing performance through specialized KPIs, all secured by a robust role-based access control system. The platform aims to streamline executive decision-making and operational efficiency across disparate business units. Key capabilities include bank account tracking, freight mapping, AI-powered lost load detection, advanced shipper churn analysis, IT asset management, audit systems, real-time dashboards for BPO and SaaS, and a document vault.

# Recent Changes

## December 16, 2025 - Supabase Migration & Build Fixes
- **Database Migration**: Migrated from Neon to Supabase PostgreSQL for improved scalability (500-1000+ concurrent users via connection pooling)
- **Supabase Configuration**: All credentials configured in secrets (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- **Schema & Seed Data**: Full 60+ table schema migrated with seed data (9 users, 6 ventures, 25 loads)
- **TypeScript Build Fixes**: Fixed 10+ compilation errors blocking deployment:
  - Async callback patterns (`catch(err =>` → `catch(async (err) =>`)
  - Missing logger imports in `hospitality/reviews/[id].ts`, `hotels/disputes/[id].ts`
  - Customer model field mismatches in `shipper-health/index.ts` (removed non-existent fields)
  - HotelDispute model field mismatches in `hotel-issues/index.ts` (`checkInDate` → `stayFrom`, `amount` → `disputedAmount`)
  - Removed `context.ventureId` reference that didn't exist on type
- **Removed TaskExplanation**: Deleted API endpoint and UI references to non-existent model (P0-only directive)

## December 16, 2025 - UI/Backend Gap Audit & P0 Fixes (Continued)
- **BPO Call Logs UI**: Added call log browser at `/bpo/call-logs` with filtering by venture, campaign, date range, connected status, and deal status; includes cursor-based pagination
- **Navigation Entry**: Added `bpo_call_logs` route entry to route registry for sidebar discoverability
- **TypeScript Build Fixes**: Fixed pre-existing type errors in:
  - `lib/db/transactionRetry.ts` - property names (`delay` -> `initialDelay`, `backoff` -> `backoffMultiplier`, `retryableError` -> `retryableErrors`)
  - `lib/jobs/distributedLock.ts` - catch callback return type annotation
  - `lib/jobs/kpiAggregationJob.ts` - wrong field name (`revenue` -> `billAmount`), wrong table (`Carrier` -> `CarrierVentureStats`), missing logger import
- **API Fix**: Fixed BPO call logs API pagination - replaced undefined `buildCursorPagination` with inline pagination logic
- **Verification**: IncentiveRule tab already has full CRUD (create/edit/delete) - audit finding was incorrect

## December 16, 2025 - UI/Backend Gap Audit & Security Fixes
- **Security Fix**: Removed hardcoded TEST_PASSWORD universal credential from authentication, replaced with proper bcrypt password validation
- **Route Registry Updates**: Fixed 9+ route naming mismatches in `lib/access-control/routes.ts` (freight KPIs, hotel P&L/KPIs, coverage war room, attendance, incentives, holdings documents)
- **New API Endpoints**: Created 5 missing handlers - shipper-health, hotel-issues, admin/roles, admin/explanations, admin/org-chart
- **Dispatch Trucks Feature**: Full CRUD truck management UI at `/dispatch/trucks` with supporting APIs
- **Holdings RBAC**: Added explicit CEO/ADMIN/COO/FINANCE role enforcement to all Holdings module APIs
- **Audit Documentation**: Created comprehensive gap analysis document at `docs/UI_GAPS_AND_MISSING_SURFACES.md`

## December 15, 2025 - Fast Refresh & Performance Fixes
- Switched development mode from webpack to Turbopack (`next dev --turbopack`) to resolve constant Fast Refresh reload issues in the Replit environment
- Migrated `ImpersonateDropdown.tsx` to use SWR for data fetching with caching to prevent fetch storms during page reloads
- Added SWR caching to `Layout.tsx` for accessible sections fetching with 60-second deduping interval
- Added webpack watch options in `next.config.mjs` for development stability (poll: 5000ms, aggregateTimeout: 2000ms)
- Set `reactStrictMode: false` to reduce double-render issues in development

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The frontend is built with Next.js 15, TypeScript, and React 19, utilizing the Pages Router and Server-Side Rendering (SSR). Tailwind CSS 4 handles styling. Core components include a custom `Layout` for consistent navigation, `TestModeContext` and `UserPreferencesContext` for global state management, and Recharts for analytics. Custom hooks manage user sessions, idle timeouts, and time-series data fetching.

## Backend
The backend uses Next.js API Routes for its API layer, interacting with a PostgreSQL database via Prisma Client. API endpoints are organized by business function.

### Authentication & Authorization
NextAuth.js v4 provides email/OTP authentication. A role-based access control (RBAC) system, defined by `ROLE_CONFIG` and `PermissionMatrix`, governs resource access. Middleware enforces authentication, and data access is scoped by venture and office. An impersonation feature with audit logging is available for troubleshooting.

### API Security
All API routes require user authentication, implement database-backed rate limiting (30 requests/min/IP/route), and use input validation. An AI Guardrails System provides rate limiting, daily usage limits, input sanitization against prompt injections, output filtering for sensitive data, and comprehensive usage tracking for all AI calls.

### Business Logic
Core business logic is encapsulated in `lib/` modules, covering AI integrations, analytics, audit, communications, freight operations, KPI calculations, and data scoping. Features include modules for bank account tracking, freight mapping, lost & at-risk load detection, enhanced carrier search, advanced shipper churn analysis, IT asset management, and a comprehensive audit system.

## Data Storage
PostgreSQL is the primary database, managed by Prisma with over 60 models. These models cover core entities like `User`, `Venture`, and `Office`, as well as domain-specific entities for all integrated ventures. Support models track EOD reports, audits, gamification, and activity logs.

## Key Features
- **Multi-Venture Management**: Centralized control for Logistics, Transport, Hospitality, BPO, SaaS, and Holdings.
- **Role-Based Access Control**: Granular permissions ensure secure access to resources.
- **AI-Powered Analytics**: Integrations for lost load detection, shipper churn analysis, and freight intelligence dashboards.
- **Comprehensive Reporting**: Real-time dashboards for BPO and SaaS, and detailed KPI reports for Hospitality.
- **Operational Tools**: Includes freight coverage war room, carrier outreach system, customer/location/quotes system, and IT asset management.
- **Accountability & Gamification**: EOD reports, task tracking, and employee engagement features.
- **User Personalization**: Customizable UI themes, density, font sizes, and landing pages.
- **Enhanced Data Management**: FMCSA carrier import, canonical customer data, and document vault.
- **Feedback System**: User-facing form for bug reports, feature requests, and general feedback with file attachment support (up to 5 files, 10MB each).
- **Attendance Tracking**: Employee self-service attendance marking with statuses (Present, Remote, PTO, Half Day, Sick, Late). Manager team view with override capability. Attendance data integrates with KPI endpoints for fair performance metrics.
- **System Jobs Admin**: Admin-only page (`/admin/jobs`) for manual triggering of background jobs (quote timeout, churn recalculation, task generation) with dry-run option and job history display.
- **Scheduled Jobs Runner**: Automatic daily job execution at 2:00 AM (churn), 6:00 AM (quote timeout), and 6:30 AM EST (task generation) with DST support.
- **Quick Links**: User-customizable external link shortcuts on the CEO overview dashboard. Users can add, edit, and delete links that open in new tabs. Links are stored per-user in UserPreferences.layout JSON field.

# External Dependencies

## Third-Party Services
- **Authentication**: NextAuth.js v4
- **Database**: PostgreSQL (Supabase - connection pooling enabled for 500-1000+ concurrent users)
- **AI**: OpenAI API
- **Email**: SendGrid
- **SMS**: Twilio

## NPM Packages
- **Core Framework**: `next`, `react`, `react-dom`
- **Database & ORM**: `@prisma/client`, `prisma`
- **Styling**: `tailwindcss`
- **Charts**: `recharts`
- **Data Fetching**: `swr`
- **Authentication**: `next-auth`, `bcryptjs`
- **E2E Testing**: `playwright`

## API Integrations
- OpenAI for AI-powered analysis
- FMCSA public API for carrier lookups
- SendGrid for email notifications
- Twilio for SMS communications