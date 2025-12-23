# SIOX Command Center - System Map
## A Non-Technical Guide to How Everything Works

---

## What Is This System?

Think of SIOX Command Center as a **digital headquarters** for managing multiple businesses from one place. Instead of jumping between different spreadsheets, emails, and software for each business, executives can see everything in one unified dashboard.

It's designed like a military "War Room" - a central command post where leaders can:
- See the health of all business units at a glance
- Spot problems before they become crises
- Track team accountability and performance
- Make data-driven decisions quickly

---

## System at a Glance

| What | How Many |
|------|----------|
| Business Types Managed | 5 verticals |
| User Roles Available | 14 different levels |
| Pages in the System | 101 screens |
| Background Functions | 200+ API endpoints |
| Database Tables | 60+ models |
| Total Code Lines | ~65,000 |

---

## The Five Business Verticals

The system manages **five different types of businesses** (called "ventures"):

```
                    ┌─────────────────────────────────────┐
                    │         SIOX COMMAND CENTER         │
                    │      "One View, All Businesses"     │
                    └─────────────────────────────────────┘
                                      │
         ┌────────────┬───────────────┼───────────────┬────────────┐
         │            │               │               │            │
         ▼            ▼               ▼               ▼            ▼
    ┌─────────┐  ┌─────────┐    ┌─────────┐    ┌─────────┐   ┌──────────┐
    │LOGISTICS│  │HOSPITAL-│    │   BPO   │    │  SaaS   │   │ HOLDINGS │
    │(Freight)│  │   ITY   │    │(Call    │    │(Software│   │(Assets & │
    │         │  │(Hotels) │    │ Centers)│    │  Sales) │   │  Banking)│
    └─────────┘  └─────────┘    └─────────┘    └─────────┘   └──────────┘
```

### What Each Vertical Handles:

| Vertical | What It Tracks | Key Metrics |
|----------|---------------|-------------|
| **Logistics/Freight** | Shipping loads, carriers, shippers, sales reps | Load count, revenue, margins, shipper churn, carrier safety |
| **Hospitality** | Hotel properties, rooms, guests, disputes | Occupancy rate, ADR, RevPAR, chargeback tracking |
| **BPO** | Call center campaigns, agents | Agent productivity, call handling, campaign performance |
| **SaaS** | Software customers, subscriptions, sales | MRR, customer churn, demos booked, client onboarding |
| **Holdings** | Assets, bank accounts, investments | Asset values, cash balances, portfolio health |

---

## How Users Navigate the System

```
┌────────────────────────────────────────────────────────────────────────┐
│                           COLLAPSIBLE SIDEBAR                           │
├────────────────────────────────────────────────────────────────────────┤
│  [+/-] MAIN                                                             │
│     └── My Day, Overview                                                │
│  [+/-] OPERATIONS                                                       │
│     └── Tasks, EOD Reports                                              │
│  [+/-] FREIGHT                                                          │
│     └── Loads, Carriers, Shippers, KPIs, Lost/At-Risk, Churn           │
│  [+/-] HOSPITALITY                                                      │
│     └── Hotels, Disputes, Snapshot, Loss Nights                         │
│  [+/-] BPO                                                              │
│     └── Campaigns, Real-Time, Incentives                                │
│  [+/-] SAAS                                                             │
│     └── Customers, Sales KPI                                            │
│  [+/-] HOLDINGS                                                         │
│     └── Bank, Assets, Documents                                         │
│  [+/-] ADMIN                                                            │
│     └── Users, Org Chart, Audit, Activity Log                           │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Pages Explained:

| Page | Who Uses It | What It Shows |
|------|-------------|---------------|
| **My Day** | Everyone | Your personal tasks, EOD report status, streak counter |
| **Overview** | Executives | All ventures health scores, daily briefing, alerts |
| **Ventures** | Managers | List of all business units with drill-down |
| **Tasks** | Everyone | To-do items, assignments, deadlines |
| **Shipper Churn** | Logistics Team | Customer retention analytics with risk scoring |
| **Carriers** | Logistics Team | Carrier network with FMCSA data and safety metrics |
| **Disputes** | Hotel Team | Chargeback tracking and resolution |
| **Sales KPI** | Sales Managers | Team performance, demos, conversions |
| **Admin** | HR/Admins | User management, org chart, system settings |

---

## The Daily Briefing System

Every day, the system creates a "War Room" briefing that categorizes issues:

```
┌─────────────────────────────────────────────────────────────────┐
│                     DAILY BRIEFING                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔥 FIREFRONT (Urgent - Act Now)                                │
│     └── Critical issues needing immediate attention              │
│         Example: Load pickup in 2 hours, no carrier assigned     │
│                                                                  │
│  ⛈️  STORMFRONT (Building Problems)                              │
│     └── Issues that could become critical if ignored             │
│         Example: Hotel occupancy dropped 20% this week           │
│                                                                  │
│  👁️  WATCH (Monitor Closely)                                     │
│     └── Situations to keep an eye on                             │
│         Example: Customer hasn't shipped in 30 days              │
│                                                                  │
│  🏆 WINS (Celebrate)                                             │
│     └── Recent achievements and positive trends                  │
│         Example: Best margin week in Q4                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## How Data Flows Through the System

```
    USER ACTIONS                    PROCESSING                     STORAGE
    ────────────                    ──────────                     ───────

┌──────────────┐              ┌──────────────────┐           ┌─────────────┐
│ Manual Entry │──────┐       │                  │           │             │
│ (Forms/Pages)│      │       │   Security &     │           │  PostgreSQL │
└──────────────┘      │       │   Permission     │           │  Database   │
                      ├──────▶│   Checks         │──────────▶│             │
┌──────────────┐      │       │                  │           │ (60+ tables │
│ File Uploads │──────┤       │   Business       │           │  of data)   │
│ (CSV, Excel) │      │       │   Logic          │           │             │
└──────────────┘      │       │                  │           └─────────────┘
                      │       └──────────────────┘                  │
┌──────────────┐      │                                             ▼
│ FMCSA API    │──────┘                                      ┌─────────────┐
│ (Carrier     │             ┌──────────────────┐            │             │
│  Lookup)     │             │                  │            │ Raw Data    │
└──────────────┘             │  KPI Calculation │◀───────────│             │
                             │  & Analytics     │            └─────────────┘
                             │                  │
                             └──────────────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │                  │
                             │  Dashboards &    │──────────▶ What You See
                             │  Reports         │
                             │                  │
                             └──────────────────┘
```

### Data Entry Methods:

1. **Manual Entry**: Type information into forms (new customer, new task, etc.)
2. **Bulk Import**: Upload spreadsheets (CSV, Excel) with many records at once
3. **API Lookup**: Pull carrier data directly from FMCSA government database
4. **Automatic**: System calculates KPIs and health scores from raw data

---

## User Roles & What They Can Access

The system uses **role-based access** - what you see depends on your job:

```
                          ┌─────────┐
                          │   CEO   │ ◄── Sees everything, can impersonate others
                          └────┬────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ┌────┴────┐     ┌────┴────┐      ┌────┴────┐
         │  ADMIN  │     │   COO   │      │HR_ADMIN │
         │         │     │         │      │         │
         └────┬────┘     └────┬────┘      └────┬────┘
              │               │                │
              │         ┌─────┴─────┐          │
              │         │           │          │
         ┌────┴────┐ ┌──┴───┐  ┌───┴──┐  ┌────┴────┐
         │VENTURE  │ │HOTEL │  │ BPO  │  │ STAFF   │
         │  HEAD   │ │MANAGER│ │MANAGER│ │         │
         └────┬────┘ └───────┘ └──────┘  └─────────┘
              │
         ┌────┴────┐
         │ OFFICE  │
         │ MANAGER │
         └─────────┘
```

### All 14 Roles:

| Role | Can See | Special Powers |
|------|---------|----------------|
| **CEO** | All ventures, all data | Impersonate any user |
| **ADMIN** | All ventures, all data | Manage users, system settings |
| **COO** | All ventures | Strategic oversight |
| **HR_ADMIN** | All ventures | User management, compliance |
| **VENTURE_HEAD** | Their assigned ventures only | Manage their business unit |
| **OFFICE_MANAGER** | Their assigned office only | Local operations |
| **TEAM_LEAD** | Their team only | Team coordination |
| **EMPLOYEE** | Their assigned scope | Day-to-day work |
| **FINANCE** | Financial data | Accounting access |
| **CSR** | Customer data | Customer service |
| **DISPATCHER** | Logistics operations | Load management |
| **CARRIER_TEAM** | Carrier data | Carrier relationship management |
| **ACCOUNTING** | Financial data | Accounting access |
| **AUDITOR** | Read-only access | Compliance review |

---

## The Accountability System

The system tracks whether people are doing their jobs:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ACCOUNTABILITY TRACKING                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📋 TASK TRACKING                      📝 EOD REPORTS                    │
│  ────────────────                      ───────────────                   │
│                                                                          │
│  • Overdue tasks flagged               • Daily report required           │
│  • Priority-based thresholds:          • Miss 2+ days = explanation      │
│    - High/Critical: 3 days             • Streak tracking (motivation)    │
│    - Medium: 7 days                    • Manager review system           │
│  • Explanation required if late        • Status: Submitted/Reviewed      │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🎮 GAMIFICATION                       📊 AUDIT SYSTEM                   │
│  ──────────────                        ──────────────                    │
│                                                                          │
│  • Earn points for actions             • Automated compliance checks     │
│  • Leaderboards by team/office         • Data quality monitoring         │
│  • Achievement badges                  • Issue tracking with severity    │
│  • Filter by venture/office            • Dashboard for admins            │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ESCALATION FLOW:                                                        │
│                                                                          │
│  Task/Report Overdue ──▶ User Must Explain ──▶ Manager Notified         │
│                                 │                      │                 │
│                                 ▼                      ▼                 │
│                          Explanation Logged      HR Dashboard Shows      │
│                                                   All Explanations       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features by Business Vertical

### Logistics (Freight)

```
┌────────────────────────────────────────────────────────────────┐
│                    LOGISTICS MODULE                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CARRIERS ◄────────────────┐                                   │
│  (Trucking companies)      │   FMCSA IMPORT:                   │
│  • FMCSA data lookup       │   • Insurance coverage            │
│  • Safety ratings          │   • Crash history                 │
│  • Insurance verification  │   • Inspection rates              │
│                            │   • Compliance status             │
│  SHIPPERS ◄───────────┐    │    ┌──────────▶ SALES KPIs       │
│  (Customers)          │    │    │            (Performance)     │
│  • Churn tracking     ▼    ▼    │                              │
│  • Risk scoring    ┌────────────┴───┐                          │
│                    │     LOADS      │                          │
│                    │  (Shipments)   │                          │
│                    └────────────────┘                          │
│                            │                                   │
│              ┌─────────────┼─────────────┐                     │
│              ▼             ▼             ▼                     │
│        Lost Loads    At-Risk Loads   Shipper Churn            │
│        (AI Analysis)  (Warnings)     (Pattern Analysis)       │
│                                      • Risk scores 0-100       │
│  SPECIAL FEATURES:                   • Dynamic thresholds      │
│  • AI Lost Load Agent                • Load frequency tracking │
│  • Carrier Search                                              │
│  • P&L Reports                                                 │
│  • Comprehensive FMCSA import with 30+ fields                  │
│                                                                 │
│  AI DRAFTING GATEWAY (Wave 15-16):                              │
│  ──────────────────────────────────                             │
│  • AI-powered carrier outreach message generation              │
│  • Tone/draft-type templates (inquiry, coverage, relationship) │
│  • Contact role resolution:                                     │
│    - DB-backed dispatcher lookup with FMCSA integration        │
│    - Free-form fallback for new/temporary contacts             │
│    - Owner/default mode when dispatcher not applicable         │
│  • Safety-first: drafts only, no automation, human copy/paste  │
│  • Feature-flag controlled (AI_ENABLED, _FREIGHT_ENABLED)      │
│  • Usage limited to CSR/Dispatcher/Leadership roles            │
│                                                                 │
│  NEW ENDPOINTS (Wave 16):                                       │
│  • GET /api/freight/carriers/search?q=... (typeahead)          │
│  • GET /api/freight/carriers/[id]/dispatchers (DB list)        │
│  • POST /api/ai/freight-carrier-draft (enhanced drafting)      │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Hospitality (Hotels)

```
┌────────────────────────────────────────────────────────────────┐
│                    HOSPITALITY MODULE                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PROPERTIES ──────▶ ROOMS ──────▶ DAILY KPIs                   │
│  (Hotels)           (Inventory)    │                           │
│  • Test mode flag                  ├── Occupancy Rate          │
│  • Active/Closed                   ├── ADR (Avg Daily Rate)    │
│                                    ├── RevPAR (Revenue/Room)   │
│                                    └── Loss Nights Tracking    │
│                                                                 │
│  DISPUTES MODULE:                                               │
│  ─────────────────                                              │
│  • Chargeback tracking per hotel                                │
│  • Open/WON/LOST status                                         │
│  • Total chargeback amounts                                     │
│  • Resolution workflow with reason capture                      │
│  • Summary sorted by highest losses                             │
│                                                                 │
│  SPECIAL FEATURES:                                             │
│  • Disputes - Track chargebacks and OTA issues                 │
│  • Reviews - Monitor guest feedback                            │
│  • Night Audit - Daily reconciliation                          │
│  • Test mode filtering                                         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### BPO (Call Centers)

```
┌────────────────────────────────────────────────────────────────┐
│                       BPO MODULE                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CAMPAIGNS ──────▶ AGENTS ──────▶ REAL-TIME DASHBOARD          │
│  (Projects)        (Workers)       │                           │
│                                    ├── Agent Status (Live)     │
│                                    ├── Calls Handled           │
│                                    ├── Productivity Metrics    │
│                                    └── Campaign Performance    │
│                                                                 │
│  SPECIAL FEATURES:                                             │
│  • Incentives - Performance-based pay (venture + office filter)│
│  • QA Scores - Quality monitoring                              │
│  • Live Dashboard - Real-time agent status                     │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### SaaS (Software Sales)

```
┌────────────────────────────────────────────────────────────────┐
│                       SAAS MODULE                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CUSTOMERS ──────▶ SUBSCRIPTIONS ──────▶ METRICS               │
│  (Companies)       (Plans/Billing)        │                    │
│                                           ├── MRR/ARR          │
│                                           ├── Churn Rate       │
│                                           └── ARPU             │
│                                                                 │
│  SALES KPI MODULE:                                              │
│  ─────────────────                                              │
│  • Demos booked tracking                                        │
│  • Client onboarding pipeline                                   │
│  • Pending vs Active status                                     │
│  • Demo-to-client conversion rates                              │
│  • MRR per salesperson                                          │
│  • ROI calculation                                              │
│                                                                 │
│  SPECIAL FEATURES:                                             │
│  • Cohort analysis - Retention curves                          │
│  • Churn prediction                                            │
│  • Revenue forecasting                                         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Holdings (Finance)

```
┌────────────────────────────────────────────────────────────────┐
│                      HOLDINGS MODULE                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BANK ACCOUNTS ──────▶ BALANCE SNAPSHOTS                       │
│  (Financial Accounts)   (Point-in-time records)                │
│  • Multi-currency                                               │
│  • Per-venture                                                  │
│                                                                 │
│  ASSETS ──────▶ DOCUMENT VAULT                                 │
│  (Properties/Investments)  (Contracts, Deeds, Insurance)       │
│                                                                 │
│  SPECIAL FEATURES:                                             │
│  • Currency totals (USD, INR, etc.)                            │
│  • Asset categorization                                        │
│  • Document versioning                                         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Test Mode System

The system has a **Test Mode** toggle for development and training:

```
┌────────────────────────────────────────────────────────────────┐
│                      TEST MODE SYSTEM                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Toggle Location: Bottom-left corner of sidebar                 │
│                                                                 │
│  TEST MODE: OFF (Default)                                       │
│  ─────────────────────────                                      │
│  • Shows only production data                                   │
│  • Test hotels, shippers hidden                                 │
│  • Recommended for daily operations                             │
│                                                                 │
│  TEST MODE: ON                                                  │
│  ──────────────                                                 │
│  • Includes test data for development                           │
│  • Useful for training new users                                │
│  • Records have isTest: true flag                               │
│                                                                 │
│  AFFECTED MODULES:                                              │
│  • Hotels and hospitality reports                               │
│  • Shippers and shipper churn                                   │
│  • Ventures                                                     │
│  • All related KPIs and metrics                                 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## AI Assistant System

The system includes AI assistants for draft generation and analytics across multiple domains:

```
┌────────────────────────────────────────────────────────────────┐
│                     AI ASSISTANT SYSTEM                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CENTRAL AI GATEWAY (`lib/ai/aiClient.ts`)                     │
│  ───────────────────                                            │
│  • Single control point for all AI feature flagging             │
│  • Rate limiting per feature                                   │
│  • Token estimation & quota enforcement                        │
│  • Error handling with fallback behaviors                      │
│  • Comprehensive logging with requestId correlation            │
│                                                                 │
│  FEATURE FLAGS:                                                │
│  • AI_ENABLED (global master switch)                           │
│  • AI_ASSISTANT_FREIGHT_ENABLED (freight drafts & summaries)  │
│  • AI_MAX_TOKENS_PER_REQUEST (safety limit)                    │
│  • AI_MAX_DAILY_CALLS (quota management)                       │
│                                                                 │
│  DOMAIN: FREIGHT                                               │
│  ────────────────                                              │
│  1. Freight Summary Assistant (`/api/ai/freight-summary`)      │
│     • Leadership-only read-only analytics                      │
│     • AI-generated health briefing from KPIs                   │
│     • Returns: { summary, metrics, intelligence }              │
│                                                                 │
│  2. Carrier Outreach Drafting (`/api/ai/freight-carrier-draft`)│
│     • Draft outreach messages (inquiry, coverage, relationship)│
│     • Contact role resolution with DB dispatcher lookup        │
│     • Returns: { draft, tokensEstimated }                      │
│                                                                 │
│  3. EOD Summary Drafting (`/api/ai/freight-eod-draft`)         │
│     • CEO/leadership draft briefings from metrics              │
│     • Supports: daily_summary, CSR performance, risk overview  │
│     • Returns: { draft }                                       │
│                                                                 │
│  DOMAIN: HOSPITALITY                                           │
│  ─────────────────────                                         │
│  1. Hotel Partner Outreach (`/api/ai/hotel-outreach-draft`)   │
│     • OTA parity, rate update, performance outreach            │
│     • Hotel-specific RBAC (HOTEL_LEAD, RMN_MANAGER)            │
│                                                                 │
│  DOMAIN: BPO                                                   │
│  ────────────────                                              │
│  1. Client Outreach Drafting (`/api/ai/bpo-client-draft`)     │
│     • Cold outreach, warm followup, KPI notes, SLA reviews     │
│     • BPO_MANAGER, ACCOUNT_MANAGER roles                       │
│                                                                 │
│  SPECIAL: OPERATIONS                                           │
│  ────────────────────                                          │
│  1. Freight Ops Diagnostics (`/api/ai/freight-ops-diagnostics`)│
│     • SRE-style log analysis for debugging                     │
│     • Admin/CEO/COO only                                       │
│                                                                 │
│  SAFETY & GUARANTEES:                                          │
│  • All drafts are **draft-only** (no sending, no automation)   │
│  • No pricing, contractual promises, or invented numbers       │
│  • No AI self-reference in output                              │
│  • Human copy/paste approval required for any use              │
│  • No DB writes, no external communications                    │
│  • Read-only operations (analytics) only                       │
│                                                                 │
│  FUTURE ROADMAP (Waves 17+):                                   │
│  • AI Template Database (move from hardcoded JSON)             │
│  • Admin panel for template CRUD & A/B testing                 │
│  • Generic entity resolution pattern for all models            │
│  • Write-capable AI with explicit guardrails & audit logging   │
│  • Multi-language support                                      │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Security & Access Control

```
┌────────────────────────────────────────────────────────────────┐
│                      SECURITY FEATURES                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AUTHENTICATION                                                 │
│  ──────────────                                                 │
│  • Email + OTP (one-time password)                              │
│  • No passwords stored                                          │
│  • Session management                                           │
│                                                                 │
│  AUTHORIZATION                                                  │
│  ─────────────                                                  │
│  • 14 role levels                                               │
│  • Venture/office scoping                                       │
│  • Permission matrix (None/View/Edit/Manage)                    │
│                                                                 │
│  API SECURITY                                                   │
│  ────────────                                                   │
│  • Rate limiting (30 requests/min/IP/route)                     │
│  • All endpoints require authentication                         │
│  • Input validation                                             │
│                                                                 │
│  CARRIER SAFETY                                                 │
│  ──────────────                                                 │
│  • Block OUT OF SERVICE carriers                                │
│  • Block NOT AUTHORIZED carriers                                │
│  • Automatic FMCSA status checking                              │
│                                                                 │
│  AUDIT TRAIL                                                    │
│  ───────────                                                    │
│  • All user actions logged                                      │
│  • Impersonation tracked                                        │
│  • Activity history per user                                    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Summary

SIOX Command Center brings together:

1. **Five business verticals** under one roof
2. **14 user roles** with granular permissions
3. **War Room briefings** for executive decision-making
4. **Advanced analytics** including AI-powered insights and churn prediction
5. **Comprehensive data capture** including full FMCSA carrier information
6. **Accountability systems** with gamification and EOD tracking
7. **Test mode** for safe development and training

The system is designed to give executives and managers a complete picture of their business operations while ensuring security and proper access controls.

---

*Last Updated: December 2025*
