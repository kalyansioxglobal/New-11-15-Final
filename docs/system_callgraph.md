# System Call Graph - Complete Wiring Documentation

**Generated**: December 15, 2025  
**Scope**: All modules (Freight, Hotels, BPO, SaaS, Holdings, Dispatch, Incentives, Gamification, Admin)

---

## 1. FREIGHT MODULE

### UI Pages → API → Service → DB

```
pages/freight/loads/index.tsx
  └── SWR: /api/freight/loads → lib/freight/*.ts
      └── DB: Load, Carrier, Shipper, FreightCustomer

pages/freight/loads/[id].tsx
  └── GET /api/freight/loads/[id] → prisma.load.findUnique
  └── PUT /api/freight/loads/[id] → prisma.load.update
      └── DB: Load ← links → Carrier, Shipper, Office, Venture

pages/freight/loads/[id]/find-carriers.tsx
  └── /api/freight/carrier-search → lib/freight/carrierSearch.ts
      └── DB: Carrier, CarrierVentureStats, Load (history)
      └── External: FMCSA API (if MC# lookup)

pages/freight/quotes/[id].tsx
  └── GET /api/freight/quotes/[id] → prisma.freightQuote.findUnique
  └── POST /api/freight/quotes/[id]/convert-to-load → lib/freight/quoteConversion.ts
      └── Creates: Load record
      └── Updates: FreightQuote.status = 'CONVERTED'

pages/freight/kpi.tsx
  └── /api/freight-kpi → lib/kpiFreight.ts → DB: FreightKpiDaily

pages/freight/pnl.tsx
  └── /api/freight/pnl → lib/freight/pnl.ts → DB: Load (aggregates)

pages/freight/coverage-war-room.tsx
  └── /api/freight/coverage-war-room → DB: Load, Carrier, CarrierLane

pages/freight/outreach-war-room.tsx
  └── /api/freight/outreach-war-room → DB: CarrierOutreach, Carrier

pages/freight/lost.tsx
  └── /api/freight/lost-loads → lib/freight/lostLoads.ts
      └── DB: Load (where loadStatus = 'LOST')

pages/freight/at-risk.tsx
  └── /api/freight/at-risk-loads → lib/freight/atRiskLoads.ts
      └── DB: Load (risk scoring)

pages/freight/tasks.tsx
  └── /api/freight/tasks → DB: Task (where domain = 'freight')

pages/freight/shipper-churn.tsx
  └── /api/freight/shipper-churn → DB: Shipper (churnScore, churnRisk)

pages/freight/carriers/index.tsx
  └── /api/freight/carriers → DB: Carrier
  └── /api/carriers/dispatchers/add → logAuditEvent() → DB: AuditLog

pages/freight/carriers/[id].tsx
  └── /api/freight/carriers/[id] → DB: Carrier, CarrierVentureStats
```

### Freight Outreach Flow
```
pages/freight/outreach-war-room.tsx
  └── POST /api/freight/outreach/send
      ├── lib/communications/email.ts → External: SendGrid
      ├── lib/communications/sms.ts → External: Twilio
      └── lib/audit.ts → logAuditEvent() → DB: AuditLog
      └── DB: CarrierOutreach.create

  └── POST /api/freight/outreach/award
      └── lib/audit.ts → logAuditEvent() → DB: AuditLog
      └── DB: CarrierOutreach.update (awarded = true)
```

---

## 2. LOGISTICS MODULE

```
pages/logistics/dashboard.tsx
  └── /api/logistics/dashboard → DB: Load, Shipper, FreightCustomer

pages/logistics/customers/index.tsx
  └── /api/logistics/customers → DB: FreightCustomer

pages/logistics/customers/[id].tsx
  └── /api/logistics/customers/[id] → DB: FreightCustomer
  └── /api/logistics/customers/[id]/touches/create → DB: CustomerTouch

pages/logistics/shippers/index.tsx
  └── /api/logistics/shippers → DB: Shipper

pages/logistics/shippers/[id].tsx
  └── /api/logistics/shippers/[id] → DB: Shipper, Load (history)
  └── /api/freight/shippers/[id]/preferred-lanes → DB: ShipperPreferredLane
```

---

## 3. HOTELS / HOSPITALITY MODULE

### UI → API → Service → DB
```
pages/hotels/index.tsx
  └── /api/hospitality/hotels → DB: HotelProperty

pages/hotels/[id]/index.tsx
  └── /api/hospitality/hotels/[id] → DB: HotelProperty, HotelKpiDaily
  └── /api/hospitality/hotels/[id]/reviews → DB: HotelReview
  └── /api/hospitality/hotels/[id]/daily-reports → DB: HotelDailyReport

pages/hotels/kpi.tsx
  └── /api/hotel-kpi → lib/kpiHotel.ts → DB: HotelKpiDaily

pages/hotels/snapshot.tsx
  └── /api/hotels/snapshot → DB: HotelProperty, HotelKpiDaily

pages/hotels/disputes/index.tsx
  └── /api/hotels/disputes → DB: HotelDispute

pages/hotels/disputes/[id].tsx
  └── /api/hotels/disputes/[id] → DB: HotelDispute
      └── PUT → logAuditEvent() → DB: AuditLog
  └── /api/hotels/disputes/[id]/notes → DB: HotelDisputeNote

pages/hotels/loss-nights.tsx
  └── /api/hotels/loss-nights → DB: HotelKpiDaily (loss analysis)

pages/hotels/kpi-upload.tsx
  └── POST /api/hotels/upload → DB: HotelKpiDaily.createMany

pages/hospitality/reviews/index.tsx
  └── /api/hospitality/reviews → DB: HotelReview

pages/hospitality/dashboard.tsx
  └── /api/hospitality/dashboard → DB: HotelProperty, HotelKpiDaily, HotelReview
```

### Hotel File Uploads
```
/api/hotels/night-audit/upload
  └── File parsing → DB: HotelNightAudit
  └── logAuditEvent() → DB: AuditLog

/api/hotels/str/upload
  └── STR file parsing → DB: HotelKpiDaily (STR metrics)
  └── logAuditEvent() → DB: AuditLog
```

### Hotels P&L
```
pages/hotels/[id]/index.tsx (P&L tab)
  └── /api/hotels/pnl/monthly → lib/hotels/pnlPageServer.ts
      └── DB: HotelPnlMonthly
```

---

## 4. BPO MODULE

```
pages/bpo/kpi.tsx
  └── /api/bpo/kpi → lib/kpiBpo.ts → DB: BpoCallLog, BpoAgent

pages/bpo/dashboard.tsx
  └── /api/bpo/dashboard → DB: BpoAgent, BpoCallLog, BpoCampaign

pages/bpo/agents/index.tsx
  └── /api/bpo/agents → DB: BpoAgent

pages/bpo/campaigns/index.tsx
  └── /api/bpo/campaigns → DB: BpoCampaign

pages/bpo/campaigns/[id].tsx
  └── /api/bpo/campaigns/[id] → DB: BpoCampaign, BpoCallLog

pages/bpo/incentives.tsx
  └── /api/incentives/venture-summary → DB: IncentiveDaily (ventureType = 'bpo')
  └── Uses incentives engine with BPO metrics

pages/bpo/realtime.tsx
  └── /api/bpo/realtime → DB: BpoCallLog (real-time aggregates)
```

### BPO KPI Upsert
```
/api/bpo/kpi/upsert
  └── logAuditEvent() → DB: AuditLog
  └── DB: BpoKpiDaily.upsert
```

---

## 5. SAAS MODULE

```
pages/saas/metrics.tsx
  └── /api/saas/metrics → DB: SaasSubscription, SaasCustomer
      └── Calculates: MRR, ARR, churn rate, LTV

pages/saas/customers/index.tsx
  └── /api/saas/customers → DB: SaasCustomer

pages/saas/customers/[id].tsx
  └── /api/saas/customers/[id] → DB: SaasCustomer, SaasSubscription

pages/saas/subscriptions.tsx
  └── /api/saas/subscriptions → DB: SaasSubscription

/api/saas/subscriptions/[id]/cancel
  └── DB: SaasSubscription.update (status = 'CANCELLED')

/api/saas/cohorts
  └── Cohort analysis → DB: SaasSubscription (grouped by signup month)

/api/saas/kpi
  └── lib/kpiSaas.ts → DB: SaasKpiDaily
```

---

## 6. HOLDINGS MODULE

```
pages/holdings/assets/index.tsx
  └── /api/holdings/assets → DB: HoldingsAsset

pages/holdings/assets/new.tsx
  └── POST /api/holdings/assets → DB: HoldingsAsset.create

pages/holdings/assets/[id]
  └── /api/holdings/assets/[id] → DB: HoldingsAsset
  └── /api/holdings/assets/[id]/documents → DB: Document (linked to asset)

pages/holdings/bank/index.tsx
  └── /api/holdings/bank → DB: BankAccount, BankSnapshot

pages/holdings/documents.tsx
  └── /api/files → DB: Document (ventureType = 'holdings')

/api/holdings/kpi
  └── DB: HoldingsAsset (valuation aggregates)
```

---

## 7. DISPATCH MODULE

```
pages/dispatch/inbox.tsx
  └── /api/dispatch/conversations → DB: DispatchConversation, DispatchMessage
  └── /api/dispatch/notifications/stream → SSE endpoint for real-time

pages/dispatch/loads.tsx
  └── /api/dispatch/loads → DB: Load (dispatch-relevant fields)

pages/dispatch/drivers.tsx
  └── /api/dispatch/drivers → DB: DispatchDriver

pages/dispatch/settlements.tsx
  └── /api/dispatch/settlements → DB: DispatchSettlement
```

### Email Integration
```
/api/dispatch/email-connections/gmail/auth
  └── OAuth flow → External: Google OAuth

/api/dispatch/email-connections/gmail/callback
  └── Stores tokens → DB: EmailConnection

/api/dispatch/email-connections/gmail/sync
  └── External: Gmail API → DB: DispatchMessage
```

### Messaging
```
/api/dispatch/messages/send
  ├── External: Twilio (SMS)
  └── DB: DispatchMessage.create
```

### Webhooks
```
/api/webhooks/dispatch/sendgrid-email
  └── Inbound email → DB: DispatchMessage

/api/webhooks/dispatch/twilio-sms
  └── Inbound SMS → DB: DispatchMessage

/api/webhooks/sendgrid/inbound
  └── General email webhook → DB processing

/api/webhooks/twilio/inbound
  └── General SMS webhook → DB processing
```

---

## 8. INCENTIVES MODULE

### UI → API → Engine → DB
```
pages/incentives/index.tsx
  └── /api/incentives/venture-summary → DB: IncentiveDaily (grouped by venture)

pages/incentives/[ventureId].tsx
  └── /api/incentives/user-daily → DB: IncentiveDaily (per user)

pages/incentives/my.tsx
  └── /api/incentives/my-daily → DB: IncentiveDaily (current user)
  └── /api/me/incentives → DB: IncentiveDaily

pages/me/incentives.tsx
  └── /api/incentives/my-daily → DB: IncentiveDaily
```

### Incentive Engine Flow
```
/api/incentives/run (POST)
  └── lib/incentives/engine.ts
      ├── computeIncentivesForDayWithRules()
      │   ├── loadFreightMetrics() → DB: Load (DELIVERED, billingDate in range)
      │   ├── loadBpoMetrics() → DB: BpoCallLog (callStartedAt in range)
      │   └── loadHotelMetrics() → DB: HotelReview, HotelKpiDaily
      └── Returns: EngineIncentiveDaily[]

/api/incentives/commit (POST)
  └── lib/incentives/engine.ts → saveIncentivesForDay()
      └── DB: IncentiveDaily.create/update
      └── logAuditEvent() → DB: AuditLog

/api/incentives/rules
  └── GET: DB: IncentiveRule (for plan)
  └── POST/PUT: DB: IncentiveRule.create/update
      └── logAuditEvent() → DB: AuditLog
```

### Incentive Scenarios
```
/api/incentives/scenarios → DB: IncentiveScenario
/api/incentives/scenarios/[id] → DB: IncentiveScenario
  └── logAuditEvent() → DB: AuditLog
/api/incentives/scenarios/compare → simulation comparison
```

### Key Trigger: Load → Incentive
```
Load.loadStatus = 'DELIVERED' + billingDate set
  │
  ├── Detected by: computeIncentivesForDayWithRules()
  │   └── Query: Load.findMany({ loadStatus: 'DELIVERED', billingDate: {gte, lte} })
  │
  └── Metrics derived:
      ├── loads_completed (count)
      ├── loads_revenue (sum billAmount)
      ├── loads_miles (sum miles)
      └── loads_margin (sum marginAmount)
```

---

## 9. GAMIFICATION MODULE

```
pages/gamification/index.tsx
  └── /api/gamification/leaderboard → DB: GamificationEvent (grouped by userId)
  └── /api/gamification/points → DB: GamificationEvent, GamificationPointsBalance

/api/gamification/config
  └── DB: GamificationConfig (per venture)
```

### Points Flow
```
POST /api/gamification/points
  └── DB: GamificationEvent.create
  └── DB: GamificationPointsBalance.upsert (increment points)
```

**⚠️ ORPHAN FINDING**: No automated triggers call POST /api/gamification/points.
The gamification system is currently MANUAL ONLY - requires explicit API calls.

---

## 10. SCHEDULED JOBS

### scripts/scheduled-jobs-runner.ts
```
Schedule (America/New_York timezone):

02:00 AM - Churn Recalculation
  └── lib/jobs/churnRecalcJob.ts → runChurnRecalcJob()
      └── DB: Shipper.update (churnScore, churnRisk)
      └── DB: FreightCustomer.update (churnScore)
      └── DB: JobRunLog.create

06:00 AM - Quote Timeout
  └── lib/jobs/quoteTimeoutJob.ts → runQuoteTimeoutJob()
      └── DB: FreightQuote.update (status = 'EXPIRED')
      └── DB: JobRunLog.create

06:30 AM - Task Generation
  └── lib/freight/taskRules.ts
      ├── runDormantCustomerRule() → DB: Task.create (dormant customer follow-up)
      ├── runQuoteExpiringRule() → DB: Task.create (expiring quote reminders)
      └── runQuoteNoResponseRule() → DB: Task.create (no response follow-up)
      └── DB: JobRunLog.create

07:00 AM - Incentive Daily Commit
  └── lib/jobs/incentiveDailyJob.ts → runIncentiveDailyJob()
      ├── For each active Venture with active IncentivePlan:
      │   └── lib/incentives/engine.ts → saveIncentivesForDayIdempotent()
      │       ├── DB: IncentiveDaily.deleteMany (for venture+date)
      │       └── DB: IncentiveDaily.create (fresh records)
      └── DB: JobRunLog.create
```

### Manual Job Triggers
```
pages/admin/jobs.tsx
  └── /api/jobs/churn-recalc → runChurnRecalcJob()
  └── /api/jobs/quote-timeout → runQuoteTimeoutJob()
  └── /api/jobs/task-generation → runDormantCustomerRule/ExpiringRule/NoResponseRule
  └── /api/jobs/incentive-daily → runIncentiveDailyJob() (idempotent)
```

---

## 11. TASKS MODULE

```
pages/tasks/index.tsx
  └── /api/tasks → DB: Task

pages/tasks/[id].tsx
  └── /api/tasks/[id] → DB: Task
      └── PUT → DB: Task.update

pages/tasks/board.tsx
  └── /api/tasks/board → DB: Task (kanban view)

pages/tasks/new.tsx
  └── POST /api/tasks → DB: Task.create

/api/tasks/[id]/explanation
  └── External: OpenAI API (AI explanation)

/api/tasks/overdue-check
  └── DB: Task (overdue detection)

/api/tasks/notify-manager
  └── External: SendGrid (email notification)
```

---

## 12. EOD REPORTS

```
pages/eod-reports/submit.tsx
  └── POST /api/eod-reports → DB: EodReport.create

pages/eod-reports/index.tsx
  └── /api/eod-reports → DB: EodReport

pages/eod-reports/[id].tsx
  └── /api/eod-reports/[id] → DB: EodReport

pages/eod-reports/team.tsx
  └── /api/eod-reports?scope=team → DB: EodReport (filtered by office/venture)
```

---

## 13. ATTENDANCE

```
pages/attendance/team.tsx
  └── /api/attendance/team → DB: AttendanceRecord

/api/attendance → DB: AttendanceRecord.upsert (mark attendance)
/api/attendance/my → DB: AttendanceRecord (current user)
/api/attendance/stats → DB: AttendanceRecord (aggregates)
```

---

## 14. IT ASSETS & INCIDENTS

```
pages/it/index.tsx (tabs)
  └── /api/it-assets/list → DB: ItAsset
  └── /api/it-incidents/list → DB: ItIncident

/api/it-assets/create
  └── logAuditEvent() → DB: AuditLog
  └── DB: ItAsset.create

/api/it-assets/[id]
  └── logAuditEvent() → DB: AuditLog
  └── DB: ItAsset.update

/api/it-assets/assign
  └── logAuditEvent() → DB: AuditLog
  └── DB: ItAsset.update (assignedTo)

/api/it-assets/return
  └── logAuditEvent() → DB: AuditLog
  └── DB: ItAsset.update (assignedTo = null)

/api/it-incidents/create
  └── logAuditEvent() → DB: AuditLog
  └── DB: ItIncident.create

/api/it-incidents/[id]
  └── logAuditEvent() → DB: AuditLog
  └── DB: ItIncident.update
```

---

## 15. ADMIN MODULE

```
pages/admin/jobs.tsx
  └── Manual job triggers (see section 10)

pages/admin/quarantine.tsx
  └── /api/admin/quarantine → DB: QuarantinedRecord

/api/admin/cleanup-test-data
  └── logAuditEvent() → DB: AuditLog
  └── DB: multiple tables (test data cleanup)

/api/admin/ai-templates
  └── logAuditEvent() → DB: AuditLog
  └── DB: AiDraftTemplate

/api/admin/permissions
  └── DB: User, Role permissions
```

---

## 16. AI INTEGRATIONS

```
pages/ai/templates.tsx
  └── /api/admin/ai-templates → DB: AiDraftTemplate

pages/freight/ai-tools/index.tsx
  ├── CarrierDraftTab → /api/ai/carrier-draft → External: OpenAI
  ├── EodDraftTab → /api/ai/eod-draft → External: OpenAI
  ├── IntelligenceTab → /api/freight/intelligence → External: OpenAI
  └── OpsDiagnosticsTab → /api/ai/ops-diagnostics → External: OpenAI

pages/hotels/ai/outreach-draft.tsx
  └── /api/ai/hotel-outreach-draft → External: OpenAI

pages/bpo/ai/client-draft.tsx
  └── /api/ai/client-draft → External: OpenAI
```

### AI Guardrails System
```
lib/ai/guardrails.ts
  ├── Rate limiting (per user)
  ├── Daily usage limits
  ├── Input sanitization (prompt injection detection)
  └── Output filtering (sensitive data removal)
  └── DB: AiUsageLog
```

---

## 17. AUTHENTICATION & AUTHORIZATION

```
pages/login.tsx
  └── /api/auth/[...nextauth] → NextAuth.js
      └── Email/OTP authentication
      └── DB: User, Session, Account

lib/effectiveUser.ts
  └── getEffectiveUser() - handles impersonation

lib/permissions.ts
  └── can() - RBAC permission checks
  └── ROLE_CONFIG, PermissionMatrix

lib/access-control/routes.ts
  └── Route-level permission guards

lib/access-control/feature-flags.ts
  └── Feature flag checks
```

### Impersonation
```
/api/impersonation/start
  └── lib/audit.ts → logAuditEvent() → DB: AuditLog
  └── Session: sets impersonatedUserId

/api/impersonation/stop
  └── lib/audit.ts → logAuditEvent() → DB: AuditLog
  └── Session: clears impersonatedUserId

/api/impersonation/log
  └── DB: AuditLog (impersonation events)
```

---

## 18. EXTERNAL SERVICE INTEGRATIONS

### SendGrid (Email)
```
lib/communications/email.ts
  └── @sendgrid/mail
  └── Used by: outreach/send, tasks/notify-manager, notifications
```

### Twilio (SMS)
```
lib/communications/sms.ts
  └── twilio
  └── Used by: outreach/send, dispatch messaging
```

### OpenAI (AI)
```
lib/ai/*.ts
  └── openai
  └── Used by: AI tools, intelligence, drafts
```

### Google OAuth (Gmail)
```
lib/google/auth.ts
  └── google-auth-library
  └── Used by: dispatch email connection
```

### RingCentral
```
scripts/ringcentral-kpi-scheduler.ts
  └── @ringcentral/sdk
  └── /api/import/ringcentral
```

### FMCSA
```
lib/fmcsa/lookup.ts
  └── FMCSA public API
  └── /api/jobs/fmcsa-sync
```

---

## 19. DATA IMPORT

```
pages/import/index.tsx
  └── /api/import/upload → file processing
  └── /api/import/job/[id]/validate → validation
  └── /api/import/job/[id]/mapping → field mapping
  └── /api/import/job/[id]/commit → DB: multiple tables

/api/import/tms-loads → DB: Load (TMS import)
/api/import/tms-3pl-financial → DB: ThreePlLoadMapping, Load
/api/import/template → CSV template download
```

---

## Summary: Critical Data Flows

### Revenue Recognition
```
Load created → status changes → DELIVERED + billingDate
  └── Freight KPI calculations
  └── Incentive engine reads delivered loads
  └── P&L aggregations
```

### Churn Detection
```
Scheduled Job (2 AM) → runChurnRecalcJob()
  └── Shipper: churnScore, churnRisk calculated
  └── FreightCustomer: churnScore calculated
  └── UI: shipper-churn, at-risk pages
```

### Task Automation
```
Scheduled Job (6:30 AM) → Task Generation
  └── Dormant customers → Task created
  └── Expiring quotes → Task created
  └── No-response quotes → Task created
```

### Incentive Calculation
```
Scheduled (7:00 AM EST) or Manual: /api/jobs/incentive-daily
  └── lib/jobs/incentiveDailyJob.ts → runIncentiveDailyJob()
      └── For each active Venture + IncentivePlan:
          └── saveIncentivesForDayIdempotent()
              ├── DELETE existing IncentiveDaily for (venture, date)
              ├── Engine reads: Load, BpoCallLog, HotelReview, HotelKpiDaily
              ├── Calculates per rule (PERCENT_OF_METRIC, FLAT_PER_UNIT, BONUS_ON_TARGET)
              └── CREATE: Fresh IncentiveDaily records

Legacy Manual: /api/incentives/run + /api/incentives/commit
  └── Engine reads: Load, BpoCallLog, HotelReview, HotelKpiDaily
  └── Calculates per rule (PERCENT_OF_METRIC, FLAT_PER_UNIT, BONUS_ON_TARGET)
  └── Commit: IncentiveDaily records (non-idempotent, increments)
```
