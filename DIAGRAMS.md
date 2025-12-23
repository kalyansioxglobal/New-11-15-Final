# SIOX System Diagrams

This document contains visual representations of SIOX architecture, data flows, and AI workflows.

---

## 1. High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          SIOX Command Center                             │
│                      (Next.js + Prisma + PostgreSQL)                     │
└──────────────────────────────────────────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
   ┌──────────┐              ┌──────────────┐            ┌───────────────┐
   │  Frontend │              │  API Routes  │            │  Prisma ORM   │
   │ (React 19)│              │  (220+ /api) │            │  PostgreSQL   │
   └──────────┘              └──────────────┘            └───────────────┘
        │                            │                            │
        │ (TypeScript)               │ (Authentication)           │
        │ (Tailwind CSS)             │ (Authorization)            │ (70+ models)
        │                            │ (Logging)                  │ (Event sourcing prep)
        │                            │                            │
        └────────────────────────────┴────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
   ┌───────────┐            ┌──────────────┐            ┌─────────────┐
   │  External │            │ AI Services  │            │ Integrations│
   │   APIs    │            │ (OpenAI,     │            │ (FMCSA,     │
   │ (FMCSA,   │            │  Anthropic)  │            │ Stripe,     │
   │  RingCent)│            │              │            │  RingCent)  │
   └───────────┘            └──────────────┘            └─────────────┘
```

---

## 2. AI Pipeline Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         AI DRAFTING PIPELINE                           │
│                      (Waves 15, 15b, 15c, 16)                          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │   User Input (Freight Draft)│
                    │  - Carrier Name             │
                    │  - Lane (Origin → Dest)     │
                    │  - Load Details             │
                    │  - Contact Role (Owner/Disp)│
                    └─────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  Entity Resolution Layer    │
                    │  (Wave 16 Dispatcher Logic) │
                    │  ┌─ Carrier Search (DB)     │
                    │  ├─ Dispatcher Lookup (DB)  │
                    │  └─ Fallback (Free-form)    │
                    └─────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  Template Selection         │
                    │  - Inquiry / Coverage /     │
                    │    Relationship             │
                    │  - Tone: Neutral / Friendly │
                    │  - Custom template (future) │
                    └─────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  Prompt Engineering Layer   │
                    │  - Insert resolved names    │
                    │  - Inject lane/load data    │
                    │  - Select tone variant      │
                    │  - Contact target logic     │
                    └─────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  OpenAI GPT-4 API           │
                    │  - Stream tokens            │
                    │  - Token estimation         │
                    │  - Error handling           │
                    └─────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  Draft Output               │
                    │  - Full message text        │
                    │  - Token count              │
                    │  - Copy-to-clipboard       │
                    │  - Log for audit trail      │
                    └─────────────────────────────┘
```

---

## 3. Freight Module Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FREIGHT MODULE DATA FLOW                           │
│                  (Carriers, Loads, Shippers, AI)                     │
└──────────────────────────────────────────────────────────────────────┘

USER JOURNEY: Load Creation → At-Risk Detection → AI Outreach

┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: Create Load                                                   │
├──────────────────────────────────────────────────────────────────────┤
│ Input: Shipper → Lane → Weight → Commodity → Equipment               │
│ Process:                                                              │
│   ├─ Validate shipper exists & is active                             │
│   ├─ Lookup seasonality factors (Wave 10)                            │
│   ├─ Calc margin estimate                                            │
│   └─ Insert Load + log event                                         │
│ Output: Load created with OPEN status                                │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: At-Risk Detection (Real-time)                                │
├──────────────────────────────────────────────────────────────────────┤
│ Trigger: Pickup in < 4 hours AND status = OPEN                       │
│ Process:                                                              │
│   ├─ Check carrier availability by lane/equipment                    │
│   ├─ ML model: Load coverage probability                             │
│   ├─ Lane risk scorer (Wave 10)                                      │
│   ├─ Shipper health score (Wave 10)                                  │
│   ├─ CSR performance score (Wave 10)                                 │
│   └─ Emit alert to CSR/Dispatcher                                    │
│ Output: Load marked AT_RISK, alert sent                              │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: AI Carrier Search & Outreach (Wave 16 + 15c)                 │
├──────────────────────────────────────────────────────────────────────┤
│ Input:                                                                │
│   ├─ Lane (origin, destination)                                      │
│   ├─ Load details (weight, equipment, commodity)                     │
│   ├─ Contact role: Carrier Owner or Dispatcher                       │
│   ├─ Dispatcher ID (from DB, Wave 16) or free-form name              │
│   └─ Selected tone                                                   │
│ Process:                                                              │
│   ├─ If dispatcherId: Lookup dispatcher name + email (DB)            │
│   ├─ Select template (inquiry, coverage_request, relationship)       │
│   ├─ Resolve tone variant                                            │
│   ├─ Inject data into prompt                                         │
│   ├─ Call OpenAI GPT-4                                               │
│   └─ Return draft + token count                                      │
│ Output: AI draft message ready for review                            │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 4: Manual Outreach & Logging                                    │
├──────────────────────────────────────────────────────────────────────┤
│ Action: CSR reviews draft, edits if needed, sends to carrier           │
│ Process:                                                              │
│   ├─ Log carrier contact (channel, subject, body)                    │
│   ├─ Set load status to WORKING                                      │
│   └─ Await carrier response                                          │
│ Output: Load status updated, contact logged                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Hotel Disputes Workflow

```
┌──────────────────────────────────────────────────────────────────────┐
│                  HOTEL DISPUTE MANAGEMENT FLOW                        │
│               (Wave 12, Chargebacks, Resolutions)                     │
└──────────────────────────────────────────────────────────────────────┘

Chargeback Received → Investigation → Resolution Outcome

┌─────────────────────────────────────────────────────────────────┐
│ Chargeback Source                                               │
│ - OTA (Booking, Expedia)                                        │
│ - Credit Card Processor (Visa, Mastercard)                      │
│ - Direct Guest Complaint                                        │
│ - Corporate / Bank                                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Create Dispute Record                                           │
│ - Hotel Property                                                │
│ - Type: Chargeback / OTA Dispute / Rate Discrepancy / etc.      │
│ - Channel: OTA / Card / Direct / Bank                           │
│ - Disputed Amount                                               │
│ - Stay Dates (from/to)                                          │
│ - Guest Info (name, email, phone)                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Investigation Phase                                             │
│ - Pull folio/reservation details                                │
│ - Review guest communication                                    │
│ - Check for refunds issued                                      │
│ - Assign to property manager / central ops                      │
│ - Set evidence due date                                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Decision & Outcome                                              │
│ - Submit evidence to processor                                  │
│ - Decision: WON / LOST / CLOSED_NO_ACTION                       │
│ - Decision date                                                 │
│ - Outcome notes                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Analytics & Prevention                                          │
│ - Chargeback summary per hotel                                  │
│ - Trend analysis (seasonal, guest segment)                      │
│ - Prevention playbook (future)                                  │
│ - AI loss night predictor (Wave 20 target)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Incentive Engine (Gamification + Payouts)

```
┌──────────────────────────────────────────────────────────────────┐
│              INCENTIVE & GAMIFICATION ENGINE                     │
│     (Incentive Plans, Rules, Daily Calculations, Payouts)       │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│ Incentive Plan Configuration     │
│ - Venture-level                  │
│ - Effective dates                │
│ - Rules (role, metric, calc type)│
│ - Qualifications (min targets)   │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Daily Metric Aggregation         │
│ - Freight: loads, margin, revenue│
│ - Hotel: rooms sold, ADR, REVPAR │
│ - BPO: calls, leads, conversions │
│ - SaaS: MRR, demos, onboardings  │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Rule Evaluation Engine           │
│ For each rule:                   │
│  ├─ Check qualification (met?)   │
│  ├─ Calculate incentive amount   │
│  │  (% of metric, flat, tiered)  │
│  ├─ Apply user overrides (if any)│
│  └─ Generate daily incentive     │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ IncentiveDaily Record Created    │
│ - userId, date, amount           │
│ - currency (INR / USD)           │
│ - breakdown (rule-by-rule)       │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Gamification Points Awarded      │
│ - Events: load won, hard target, │
│   bonus milestones               │
│ - Update GamificationPointsBal   │
│ - Display on leaderboard         │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Monthly Payout Aggregation       │
│ - Sum daily incentives by user   │
│ - Create IncentivePayout record  │
│ - Status: CALCULATED             │
│ - Await CFO approval             │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Payout Execution                 │
│ - APPROVED status                │
│ - Generate batch payment         │
│ - Mark as PAID                   │
│ - GL entry (expense + payout)    │
└─────────────────────────────────┘
```

---

## 6. RBAC Flow (Simplified)

```
┌────────────────────────────────────────────────────────────────┐
│                  RBAC AUTHORIZATION FLOW                        │
│         (requireUser → getEffectiveUser → canView...)          │
└────────────────────────────────────────────────────────────────┘

User Request (with token)
        │
        ▼
┌─────────────────────────────┐
│ Authentication (requireUser)│
│ - Decode JWT / Session      │
│ - Lookup user record        │
│ - Check if ACTIVE           │
└─────────────────────────────┘
        │
        ├─ FAIL → 401 UNAUTHENTICATED
        │
        ▼
┌─────────────────────────────┐
│ User Role Resolution        │
│ - Direct role (CEO, CSR)    │
│ - Impersonation (if any)    │
│ - Job title (future)        │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Venture/Office Scope        │
│ - allVentures flag?         │
│ - allowedVentureIds[]       │
│ - allowedOfficeIds[]        │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Resource Check              │
│ canViewPortfolioResource(   │
│   user,                     │
│   "RESOURCE_NAME"           │
│ )                           │
└─────────────────────────────┘
        │
        ├─ NO  → 403 FORBIDDEN
        │
        ▼
┌─────────────────────────────┐
│ Apply Scope to Query        │
│ applyLoadScope(user, where) │
│ - Add ventureId filter      │
│ - Add officeId filter       │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Execute Query               │
│ - Return only scoped data   │
└─────────────────────────────┘
```

---

## 7. Shipper Churn Detection (Wave 10)

```
┌──────────────────────────────────────────────────────────────┐
│         SHIPPER CHURN DETECTION PIPELINE                    │
│    (Pattern-based, Dynamic Thresholds, Risk Scoring)        │
└──────────────────────────────────────────────────────────────┘

Historical Load Data (past 12 months)
        │
        ├─ Total loads shipped
        ├─ Average loads per month
        ├─ Last load date
        ├─ Shipping frequency (days between loads)
        └─ Seasonal patterns (Q4 spike, Q1 dip, etc.)
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ Seasonality Detection (Wave 10)                          │
│ - Calc avg loads per quarter                            │
│ - Identify if Q4 is 40%+ above mean                      │
│ - Identify winter/summer patterns                        │
│ - Mark shipper as SEASONAL or STABLE                    │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ Dynamic Churn Threshold                                  │
│ IF seasonal:                                             │
│   threshold = expected_monthly * 0.5  (allow 50% dip)   │
│ ELSE (stable shipper):                                   │
│   threshold = expected_monthly * 0.7  (allow 30% dip)   │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ Recent Activity Check                                    │
│ - Last load > 60 days?  → AT_RISK                       │
│ - Recent volumes down?  → Check against threshold        │
│ - Days since last load? → Calculate churnRiskScore      │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ Risk Score Calculation (0–100)                           │
│ - Days inactive: 0–30 days = 10 points                   │
│ - Volume decline: -50% vs expected = 40 points           │
│ - Frequency drop: Less frequent pickups = 20 points      │
│ - Payment issues (future) = 30 points                    │
│ Total: 0–100 risk level                                 │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ Churn Status Update                                      │
│ - ACTIVE (risk < 30)                                    │
│ - AT_RISK (risk 30–70)                                  │
│ - CHURNED (risk > 70 or no loads in 90 days)            │
│ - REACTIVATED (shipper re-engages)                       │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ Playbook Trigger (Wave 17)                               │
│ IF AT_RISK:                                              │
│   ├─ Auto-reach-out to shipper                          │
│   ├─ Offer incentive (discount/rate match)              │
│   ├─ Log outreach attempt                                │
│   └─ Schedule follow-up                                  │
└──────────────────────────────────────────────────────────┘
```

---

## 8. System Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│         SIOX DEPLOYMENT ARCHITECTURE                     │
│          (Single Tenant → Cloud-Ready)                   │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Client (Browser)                                       │
│ ├─ Next.js 15 React Frontend                          │
│ ├─ Tailwind CSS 4                                     │
│ └─ Real-time updates via fetch + WebSocket (future)   │
└────────────────────────────────────────────────────────┘
        │ (HTTPS)
        ▼
┌────────────────────────────────────────────────────────┐
│ CDN / Edge Layer (Cloudflare, Vercel Edge)             │
│ ├─ Cache static assets                                │
│ ├─ Rate limiting                                      │
│ └─ DDoS protection                                    │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ Next.js API Routes (220+ endpoints)                    │
│ ├─ /api/logistics/*                                   │
│ ├─ /api/hotels/*                                      │
│ ├─ /api/bpo/*                                         │
│ ├─ /api/saas/*                                        │
│ ├─ /api/admin/*                                       │
│ ├─ /api/ai/*  (Wave 15+)                              │
│ └─ /api/freight/carriers/* (Wave 16)                  │
└────────────────────────────────────────────────────────┘
        │
        ├─────────────────────────┬─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Prisma ORM       │  │ External APIs    │  │ Background Jobs  │
│ PostgreSQL       │  │ (OpenAI, FMCSA,  │  │ (Cron, Workers)  │
│ (Neon)           │  │  Stripe, etc.)   │  │ (Future: Temporal)│
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

Last Updated: December 8, 2025

For architectural questions or to propose new diagrams, contact the team.
