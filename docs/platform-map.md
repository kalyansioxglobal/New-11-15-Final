# SIOX Command Center - Platform Map

**Last Updated:** Generated from codebase analysis  
**Purpose:** Authoritative inventory of platform architecture, ventures, verticals, and shared services

This document maps the **multi-venture, multi-vertical enterprise platform** structure. It identifies ventures, business verticals, shared platform layers, and how data is scoped across the system.

---

## Platform Overview

SIOX Command Center is a **unified enterprise platform** that manages multiple business ventures across different verticals. The platform provides shared services (auth, RBAC, AI, incentives, etc.) while maintaining data isolation per venture and office.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIOX COMMAND CENTER                          │
│              Multi-Venture Enterprise Platform                   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  SHARED       │    │   VERTICALS    │    │   PLATFORM     │
│  SERVICES     │    │   (Venture-    │    │   LAYERS       │
│               │    │   Specific)    │    │                │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Auth        │    │ • Freight/     │    │ • RBAC        │
│ • RBAC        │    │   Logistics    │    │ • Scoping     │
│ • AI Services │    │ • Hospitality  │    │ • Feature     │
│ • Incentives  │    │ • BPO         │    │   Flags       │
│ • Gamification│    │ • SaaS        │    │ • Audit       │
│ • Tasks       │    │ • Holdings    │    │ • Import      │
│ • EOD Reports │    │ • Dispatch    │    │ • Files       │
│ • Attendance  │    │   (Transport)  │    │ • Notifications│
│ • Briefing    │    │               │    │ • Jobs        │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 1. Ventures & Business Units

### Venture Types (from `VentureType` enum)

| Type | Description | Module Mapping |
|------|-------------|----------------|
| **LOGISTICS** | Freight brokerage companies | `freight` |
| **TRANSPORT** | Transport/carrier companies | `freight` (shared module) |
| **HOSPITALITY** | Hotel properties | `hospitality` |
| **BPO** | Business Process Outsourcing (call centers) | `bpo` |
| **SAAS** | Software-as-a-Service products | `saas` |
| **HOLDINGS** | Asset management, banking, investments | `holdings` |
| **TESTING** | Test/development ventures | `command_center` |

### Venture Representation

**Database Model:**
- `Venture` table: Top-level company/brand
  - Fields: `id`, `slug`, `code`, `name`, `type`, `logisticsRole`, `isActive`, `isTest`
  - Relationships: Many-to-many with `User` via `VentureUser` junction table

**Scoping Pattern:**
- Most business data models include `ventureId: Int` field
- Some models also include `officeId: Int?` for office-level scoping
- Users are assigned to ventures via `VentureUser` table

**Example Ventures:**
- Siox Logistics (LOGISTICS, BROKER)
- MB Logistics (LOGISTICS, BROKER)
- Rank Me Now (SAAS)
- Hotel properties (HOSPITALITY)

---

## 2. Offices

**Database Model:**
- `Office` table: Physical/functional office within a venture
  - Fields: `id`, `ventureId`, `name`, `city`, `country`, `timezone`
  - Relationship: Belongs to one `Venture`

**Scoping Pattern:**
- Users assigned to offices via `OfficeUser` junction table
- Some models include `officeId: Int?` for office-level granularity
- Examples: "Vadodara Sales", "MB Mohali", "US Operations"

**Role-Based Office Access:**
- CEO/ADMIN: `officeScope: "all"` (all offices)
- VENTURE_HEAD: `officeScope: "all"` (within assigned ventures)
- OFFICE_MANAGER: `officeScope: "assigned"` (specific offices only)
- EMPLOYEE: `officeScope: "assigned"` (specific offices only)

---

## 3. Business Verticals

### 3.1 Freight/Logistics (`freight` module)

**Venture Types:** `LOGISTICS`, `TRANSPORT`

**Core Entities:**
- `Load` - Freight loads (shipments)
- `Customer` - Shipper accounts
- `LogisticsShipper` - Shipper locations
- `Carrier` - Transportation carriers
- `FreightQuote` - Load quotes
- `CarrierVentureStats` - Carrier performance per venture

**Key Features:**
- Load management (status: OPEN, WORKING, COVERED, LOST, etc.)
- Shipper churn analytics
- Carrier safety/compliance (FMCSA integration)
- AI carrier outreach drafts
- Freight KPIs (load count, revenue, margins)
- Sales KPIs (per salesperson)
- Dispatch management (separate from freight brokerage)

**API Routes:** ~80+ routes under `/api/freight/*`, `/api/logistics/*`

**Scoping:**
- Most entities scoped by `ventureId`
- Some entities also scoped by `officeId`
- Customer visibility based on assignments (`assignedSalesId`, `assignedCsrId`, `assignedDispatcherId`)

---

### 3.2 Dispatch/Transport (`dispatch` module)

**Venture Types:** `TRANSPORT` (can also be part of `LOGISTICS`)

**Core Entities:**
- `DispatchLoad` - Dispatch-specific load tracking
- `DispatchDriver` - Drivers
- `DispatchTruck` - Trucks/vehicles
- `DispatchConversation` - Driver communications
- `Settlement` - Driver settlements

**Key Features:**
- Dispatch inbox
- Driver management
- Settlement tracking
- Real-time load status

**API Routes:** ~15 routes under `/api/dispatch/*`

**Scoping:**
- Entities scoped by `ventureId` and `officeId`

---

### 3.3 Hospitality (`hospitality` module)

**Venture Types:** `HOSPITALITY`

**Core Entities:**
- `HotelProperty` - Hotel properties
- `HotelKpiDaily` - Daily hotel KPIs (occupancy, ADR, RevPAR)
- `HotelReview` - Guest reviews
- `HotelDispute` - Chargebacks/disputes
- `HotelDailyReport` - Daily operational reports

**Key Features:**
- Hotel property management
- KPI tracking (occupancy, ADR, RevPAR)
- Review management
- Dispute/chargeback tracking
- AI outreach drafts for reviews

**API Routes:** ~15 routes under `/api/hospitality/*`, `/api/hotels/*`, `/api/hotel-kpi/*`

**Scoping:**
- Entities scoped by `ventureId`
- Hotels belong to a venture

---

### 3.4 BPO (`bpo` module)

**Venture Types:** `BPO`

**Core Entities:**
- `BpoCampaign` - Call center campaigns
- `BpoAgent` - Call center agents
- `BpoCallLog` - Call logs
- `BpoAgentMetric` - Agent performance metrics

**Key Features:**
- Campaign management
- Agent performance tracking
- Real-time dashboards
- Incentive tracking
- AI client draft generation

**API Routes:** ~10 routes under `/api/bpo/*`

**Scoping:**
- Entities scoped by `ventureId`

---

### 3.5 SaaS (`saas` module)

**Venture Types:** `SAAS`

**Core Entities:**
- `SaasCustomer` - SaaS customers
- `SaasSubscription` - Customer subscriptions
- `SalesClientOnboarding` - Client onboarding tracking
- `SalesPersonCost` - Salesperson cost tracking

**Key Features:**
- Customer management
- Subscription/MRR tracking
- Sales KPIs (demos booked, conversions)
- Churn prediction (planned)

**API Routes:** ~8 routes under `/api/saas/*`, `/api/sales-kpi/*`

**Scoping:**
- Entities scoped by `ventureId`

---

### 3.6 Holdings (`holdings` module)

**Venture Types:** `HOLDINGS`

**Core Entities:**
- `HoldingAsset` - Assets (properties, investments)
- `BankAccount` - Bank accounts
- `BankAccountSnapshot` - Bank balance snapshots
- `HoldingAssetDocument` - Asset documents

**Key Features:**
- Asset tracking
- Bank account monitoring
- Document vault
- Multi-currency support

**API Routes:** ~5 routes under `/api/holdings/*`, `/api/bank-accounts/*`, `/api/bank-snapshots/*`

**Scoping:**
- Entities scoped by `ventureId`

---

## 4. Shared Platform Layers

### 4.1 Authentication & Authorization

**Components:**
- NextAuth.js integration (`pages/api/auth/[...nextauth].ts`)
- OTP-based authentication
- Session management
- User impersonation (for admins)

**Models:**
- `User` - System users
- `VentureUser` - User-venture assignments
- `OfficeUser` - User-office assignments

**API Routes:** `/api/auth/*`, `/api/me`, `/api/impersonate`, `/api/impersonation/*`

**Scope:** Global (all ventures)

---

### 4.2 RBAC (Role-Based Access Control)

**Components:**
- `lib/permissions.ts` - Role definitions
- `lib/scope.ts` - Scoping logic
- `lib/access-control/` - Access control middleware

**Roles (14 total):**
- CEO, ADMIN, COO, VENTURE_HEAD, OFFICE_MANAGER, TEAM_LEAD
- EMPLOYEE, CONTRACTOR, AUDITOR, FINANCE, HR_ADMIN
- CSR, DISPATCHER, CARRIER_TEAM, ACCOUNTING

**Scoping Levels:**
- `ventureScope`: `"all"` | `"assigned"` | `"none"`
- `officeScope`: `"all"` | `"assigned"` | `"none"`

**Permission Granularity:**
- Task permissions (create, edit, delete, assign, view)
- Policy permissions (create, edit, delete, view, verify)
- KPI permissions (upload, view)
- User management permissions

**API Routes:** `/api/admin/permissions/*`, `/api/admin/roles`

**Scope:** Global (enforced across all modules)

---

### 4.3 AI Services

**Components:**
- `lib/ai/` - AI client and assistants
- `lib/ai/templates/` - Template system
- `lib/ai/guardrails.ts` - Rate limiting and safety

**AI Assistants:**
- `FreightCarrierOutreachAssistant` - Carrier outreach drafts
- `FreightLostLoadAgent` - Lost load analysis
- `FreightOpsDiagnosticsAssistant` - Operations diagnostics
- `FreightSummaryAssistant` - Executive summaries
- `FreightCeoEodAssistant` - CEO EOD summaries
- `HotelOutreachAssistant` - Hotel review responses
- `BpoClientOutreachAssistant` - BPO client communications

**Models:**
- `AiUsageLog` - AI API call tracking
- `AiDraftTemplate` - Configurable AI templates

**API Routes:** `/api/ai/*`, `/api/admin/ai-usage`, `/api/admin/ai-templates/*`

**Scope:** Cross-venture (used by multiple verticals)

---

### 4.4 Incentives

**Components:**
- `lib/incentives/` - Incentive calculation engine
- `lib/incentives/engine.ts` - Rule evaluation
- `lib/incentives/calculateIncentives.ts` - Daily calculations

**Models:**
- `IncentivePlan` - Incentive plans (per venture)
- `IncentiveRule` - Rules within plans
- `IncentiveQualification` - Rule qualifications
- `IncentiveDaily` - Daily incentive calculations
- `IncentivePayout` - Payout records
- `IncentiveScenario` - Scenario testing

**Features:**
- Rule-based incentive calculation
- Daily automatic calculations
- Scenario testing/simulation
- Per-venture configuration

**API Routes:** `/api/incentives/*`, `/api/admin/incentives/*`

**Scope:** Cross-venture (each venture has its own plans)

---

### 4.5 Gamification

**Components:**
- `lib/gamification/awardPoints.ts` - Points awarding logic

**Models:**
- `GamificationConfig` - Per-venture gamification config
- `GamificationEvent` - Point-earning events
- `GamificationPointsBalance` - User point balances

**Features:**
- Points system
- Leaderboards (filterable by venture/office)
- Event-based point awards

**API Routes:** `/api/gamification/*`

**Scope:** Cross-venture (each venture has its own config)

---

### 4.6 Tasks

**Components:**
- Task management system

**Models:**
- `Task` - Tasks (scoped by `ventureId`, `officeId`)
- `TaskOverdueExplanation` - Explanations for overdue tasks

**Features:**
- Task creation, assignment, tracking
- Overdue explanations
- Venture/office scoping
- Role-based permissions

**API Routes:** `/api/tasks/*`, `/api/admin/tasks`, `/api/freight/tasks/*`

**Scope:** Cross-venture (tasks belong to ventures/offices)

---

### 4.7 EOD Reports

**Components:**
- Daily accountability tracking

**Models:**
- `EodReport` - End-of-day reports (scoped by `ventureId`, `officeId`)
- `MissedEodExplanation` - Explanations for missed reports

**Features:**
- Daily report submission
- Streak tracking
- Team report viewing
- Review workflow

**API Routes:** `/api/eod-reports/*`

**Scope:** Cross-venture (reports belong to ventures/offices)

---

### 4.8 Attendance

**Components:**
- Attendance tracking

**Models:**
- `Attendance` - Attendance records (scoped by `ventureId`, `officeId`)

**Features:**
- Individual attendance tracking
- Team attendance views
- KPI calculations

**API Routes:** `/api/attendance/*`

**Scope:** Cross-venture (attendance belongs to ventures/offices)

---

### 4.9 Daily Briefing

**Components:**
- `lib/briefing.ts` - Briefing generation

**Features:**
- "War Room" style daily briefings
- Categorized issues (Firefront, Stormfront, Watch, Wins)
- Aggregated across ventures (scoped by user access)

**API Routes:** `/api/briefing`

**Scope:** Cross-venture (aggregates data from all accessible ventures)

---

### 4.10 Audit System

**Components:**
- `lib/audit/` - Audit execution
- `lib/audit/runAudit.ts` - Audit runner

**Models:**
- `AuditLog` - Audit trail (scoped by `ventureId`, `officeId`)
- `AuditRun` - Audit execution records

**Features:**
- Automated compliance checks
- Data quality audits
- Audit trail logging

**API Routes:** `/api/admin/audit/*`, `/api/admin/audit-logs`

**Scope:** Cross-venture (audits can target specific ventures)

---

### 4.11 Import System

**Components:**
- `lib/import/` - Import engine
- `lib/import/mappingEngine.ts` - Column mapping
- `lib/import/parser.ts` - File parsing

**Models:**
- `ImportJob` - Import jobs (scoped by `ventureId`)
- `ImportMapping` - Column mappings

**Features:**
- CSV/XLSX/TSV import
- Column mapping UI
- Data normalization
- Import job tracking

**API Routes:** `/api/import/*`

**Scope:** Cross-venture (imports belong to ventures)

---

### 4.12 Files

**Components:**
- File upload/storage system

**Models:**
- `File` - Files (scoped by `ventureId`)

**Features:**
- File upload
- File storage
- Document management

**API Routes:** `/api/files/*`

**Scope:** Cross-venture (files belong to ventures)

---

### 4.13 Notifications

**Models:**
- `Notification` - User notifications

**Features:**
- In-app notifications
- User notification preferences

**API Routes:** `/api/notifications/*`

**Scope:** Global (user-level)

---

### 4.14 System Jobs

**Components:**
- `lib/jobs/` - Background job system

**Jobs:**
- `churnRecalcJob` - Shipper churn recalculation
- `fmcsaAutosyncJob` - FMCSA data sync
- `incentiveDailyJob` - Daily incentive calculations
- `quoteTimeoutJob` - Quote expiration handling

**Models:**
- `Job` - Job execution records

**API Routes:** `/api/jobs/*`, `/api/admin/jobs/*`

**Scope:** Global (system-wide jobs)

---

## 5. Module Classification

### 5.1 Venture-Specific Modules

These modules contain data and features specific to a venture type:

| Module | Venture Types | Data Isolation |
|--------|---------------|----------------|
| `freight` | LOGISTICS, TRANSPORT | `ventureId` on all entities |
| `dispatch` | TRANSPORT | `ventureId`, `officeId` on entities |
| `hospitality` | HOSPITALITY | `ventureId` on all entities |
| `bpo` | BPO | `ventureId` on all entities |
| `saas` | SAAS | `ventureId` on all entities |
| `holdings` | HOLDINGS | `ventureId` on all entities |

**Characteristics:**
- All data models include `ventureId`
- Users can only access data from their assigned ventures
- Each venture operates independently

---

### 5.2 Cross-Venture Modules

These modules are shared across ventures but maintain venture-level data isolation:

| Module | Description | Scoping |
|--------|-------------|---------|
| `operations` | Tasks, EOD reports, attendance, insurance | `ventureId`, `officeId` |
| `incentives` | Incentive plans and calculations | `ventureId` (per-venture plans) |
| `gamification` | Points and leaderboards | `ventureId` (per-venture config) |
| `it` | IT assets and incidents | `ventureId`, `officeId` |

**Characteristics:**
- Data belongs to a venture but module is available to all ventures
- Each venture has its own configuration/data
- Users see only their assigned ventures' data

---

### 5.3 Global/Platform Modules

These modules operate at the platform level without venture scoping:

| Module | Description | Scoping |
|--------|-------------|---------|
| `command_center` | Overview, ventures list, daily briefing | User role-based (CEO sees all) |
| `admin` | User management, venture management, system config | Role-based (CEO/ADMIN only) |
| `public` | Login, carrier portal | No scoping |

**Characteristics:**
- No `ventureId` on core entities
- Access controlled by user role
- Platform-wide functionality

---

## 6. Data Scoping Patterns

### 6.1 Venture Scoping

**Pattern:** Most business entities include `ventureId: Int`

**Examples:**
- `Load.ventureId`
- `Customer.ventureId`
- `HotelProperty.ventureId`
- `BpoCampaign.ventureId`
- `SaasCustomer.ventureId`
- `HoldingAsset.ventureId`

**Access Control:**
- Users assigned to ventures via `VentureUser` table
- `getUserScope(user)` returns `ventureIds: number[]` or `allVentures: true`
- API routes filter by `ventureId` based on user scope

---

### 6.2 Office Scoping

**Pattern:** Some entities include both `ventureId` and `officeId: Int?`

**Examples:**
- `Task.ventureId`, `Task.officeId`
- `EodReport.ventureId`, `EodReport.officeId`
- `Attendance.ventureId`, `Attendance.officeId`
- `DispatchLoad.ventureId`, `DispatchLoad.officeId`

**Access Control:**
- Users assigned to offices via `OfficeUser` table
- `getUserScope(user)` returns `officeIds: number[]` or `allOffices: true`
- Office access is nested within venture access

---

### 6.3 Assignment-Based Scoping

**Pattern:** Some entities use user assignments instead of venture/office IDs

**Examples:**
- `Customer.assignedSalesId`, `Customer.assignedCsrId`, `Customer.assignedDispatcherId`
- `Task.assignedTo`
- `Load` visibility based on `Customer` assignments

**Access Control:**
- Users can see entities where they are assigned
- Managers can see entities in their venture/office scope
- Global admins (CEO/ADMIN) see all

---

### 6.4 Global Entities

**Pattern:** Platform-level entities without venture scoping

**Examples:**
- `User` - System users
- `Venture` - Venture definitions
- `Office` - Office definitions
- `Job` - System jobs
- `Notification` - User notifications

**Access Control:**
- Role-based (CEO/ADMIN for management entities)
- User-level for personal entities (notifications)

---

## 7. Feature Flags & Module Enablement

**Components:**
- `lib/access-control/feature-flags.ts` - Feature flag system

**Modules:**
- `command_center`, `operations`, `it`, `freight`, `dispatch`, `hospitality`, `bpo`, `saas`, `holdings`, `admin`, `public`

**Current State:**
- All modules enabled by default
- Module enablement checked in middleware (`middleware.ts`)
- Routes can be gated by module enablement

**API Routes:** Module enablement checked via `isModuleEnabled(moduleId)`

---

## 8. API Route Distribution

Based on `docs/api-route-inventory.md`:

| Category | Route Count | Module |
|----------|-------------|--------|
| Freight/Logistics | ~80+ | `freight` |
| Dispatch | ~15 | `dispatch` |
| Hospitality | ~15 | `hospitality` |
| BPO | ~10 | `bpo` |
| SaaS | ~8 | `saas` |
| Holdings | ~5 | `holdings` |
| Admin | ~40+ | `admin` |
| AI | ~10 | Cross-venture |
| Incentives | ~15 | Cross-venture |
| Tasks | ~6 | `operations` |
| EOD Reports | ~7 | `operations` |
| Attendance | ~4 | `operations` |
| IT | ~7 | `it` |
| Import | ~9 | Cross-venture |
| Files | ~4 | Cross-venture |
| Notifications | ~2 | Global |
| **Total** | **~400+** | |

---

## 9. Database Schema Summary

**Total Models:** 70+ Prisma models

**Scoping Breakdown:**
- **Venture-scoped:** ~50+ models (include `ventureId`)
- **Office-scoped:** ~15+ models (include `ventureId` + `officeId`)
- **Global:** ~10+ models (no scoping)

**Key Junction Tables:**
- `VentureUser` - User-venture assignments
- `OfficeUser` - User-office assignments

---

## 10. Platform Architecture Summary

### Strengths

1. **Clear Separation:** Venture-specific modules are well-isolated
2. **Shared Services:** Common functionality (auth, RBAC, AI) is centralized
3. **Flexible Scoping:** Supports venture-level and office-level data isolation
4. **Role-Based Access:** Granular permissions across 14 roles
5. **Multi-Tenancy:** Supports multiple ventures of different types

### Architecture Patterns

1. **Venture-First:** Most business data is venture-scoped
2. **Office-Optional:** Office scoping is additive (not required)
3. **Assignment-Based:** Some entities use user assignments for visibility
4. **Module-Based:** Features organized into modules with feature flags
5. **Shared Services:** AI, incentives, gamification are cross-venture

### Data Flow

```
User Request
    ↓
Authentication (NextAuth)
    ↓
RBAC Check (lib/access-control)
    ↓
Scope Resolution (lib/scope)
    ↓
Module Enablement Check (feature-flags)
    ↓
API Handler (with venture/office filtering)
    ↓
Database Query (Prisma with where clauses)
    ↓
Response (scoped to user's access)
```

---

## 11. Key Takeaways

1. **Multi-Venture Platform:** Supports 7 venture types (LOGISTICS, TRANSPORT, HOSPITALITY, BPO, SAAS, HOLDINGS, TESTING)

2. **6 Business Verticals:** Freight, Dispatch, Hospitality, BPO, SaaS, Holdings

3. **14 Shared Services:** Auth, RBAC, AI, Incentives, Gamification, Tasks, EOD, Attendance, Briefing, Audit, Import, Files, Notifications, Jobs

4. **3 Scoping Levels:**
   - Global (platform-wide)
   - Cross-venture (shared but isolated)
   - Venture-specific (vertical-specific)

5. **Data Isolation:** Achieved via `ventureId` and `officeId` fields, enforced by RBAC and scope checks

6. **Module System:** 11 modules with feature flag enablement

---

## Appendix: File Locations

### Core Platform Files
- `prisma/schema.prisma` - Database schema
- `lib/scope.ts` - Scoping logic
- `lib/permissions.ts` - Role definitions
- `lib/access-control/` - Access control system
- `middleware.ts` - Request middleware with RBAC

### Module Definitions
- `lib/access-control/routes.ts` - Route registry with module assignments
- `lib/access-control/feature-flags.ts` - Module enablement

### Vertical-Specific
- `pages/api/freight/*` - Freight routes
- `pages/api/hospitality/*` - Hospitality routes
- `pages/api/bpo/*` - BPO routes
- `pages/api/saas/*` - SaaS routes
- `pages/api/holdings/*` - Holdings routes
- `pages/api/dispatch/*` - Dispatch routes

### Shared Services
- `pages/api/ai/*` - AI services
- `pages/api/incentives/*` - Incentives
- `pages/api/gamification/*` - Gamification
- `pages/api/tasks/*` - Tasks
- `pages/api/eod-reports/*` - EOD reports
- `pages/api/attendance/*` - Attendance
- `pages/api/import/*` - Import system
- `pages/api/files/*` - File management

---

**End of Platform Map**


