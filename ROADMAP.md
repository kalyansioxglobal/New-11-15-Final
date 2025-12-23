# SIOX Roadmap: Waves 16–25 (18-Month Plan)

This document outlines the planned Waves for the next 18 months, with sequencing and dependencies. Each Wave builds incrementally on prior work.

---

## Completed Waves (Snapshot)

| Wave | Title | Status | Duration | Delivered |
|------|-------|--------|----------|-----------|
| 1–9 | Core platform, multi-tenancy, RBAC | ✅ | 2024 Q1–Q4 | Dashboard, freight, hotels, BPO, SaaS, holdings |
| 10 | Shipper Churn & Freight Intelligence | ✅ | 2025 Q1 | Churn scoring, seasonality detection, lane risk |
| 11 | EOD Reports & Daily Briefing | ✅ | 2025 Q2 | Accountability, War Room, task streaks |
| 12 | Hotel Disputes + Gamification | ✅ | 2025 Q2 | Chargeback workflow, points system |
| 13 | Advanced Imports & Mappings | ✅ | 2025 Q2 | CSV/XLSX import with column mapping |
| 14 | FMCSA Carrier Import & Blocking | ✅ | 2025 Q3 | 30+ fields, insurance, safety blocking |
| 15 | AI Drafting Templates System | ✅ | 2025 Q3 | Template selection, tone, AI generation |
| 15b | AI Summary & Recommendations | ✅ | 2025 Q4 | CEO EOD summaries, digest emails |
| 15c | AI Freight Drafting (lite) | ✅ | 2025 Q4 | Free-form carrier outreach |
| 16 | DB-backed Carriers & Dispatchers | ✅ | 2025 Q4 | Carrier search, dispatcher mgmt, Wave 17 prep |

---

## Wave 17: AI Playbook Engine (Q1 2026)

**Goal:** Automate operational workflows with AI-driven playbooks.

**Features:**
- [ ] Playbook definition UI (if-then-else builder)
- [ ] Load loss playbook: Auto-search carriers → AI draft → Send email → Log outcome
- [ ] At-risk load playbook: Predict in 2 hrs → Alert CSR → AI suggestions
- [ ] Shipper churn playbook: Detect inactive shipper → Auto-reach-out via AI
- [ ] Playbook execution log & analytics
- [ ] Workflow versioning and A/B testing

**Data Model Changes:**
```prisma
model Playbook {
  id String @id @default(cuid())
  ventureId Int
  name String
  trigger String // "load_lost" | "load_at_risk" | "shipper_inactive"
  actions Json // step array
  enabled Boolean
  createdAt DateTime
}

model PlaybookExecution {
  id String @id @default(cuid())
  playbookId String
  entityId String // loadId, shipperId, etc.
  status String // "pending" | "in_progress" | "completed" | "failed"
  result Json
  createdAt DateTime
}
```

**Dependencies:** Wave 16 (dispatchers), Wave 15 (AI drafting)

**Effort:** 3 weeks

---

## Wave 18: Real-Time Freight Ops Dashboard (Q1–Q2 2026)

**Goal:** Live visibility into every load with real-time AI alerts.

**Features:**
- [ ] WebSocket-based live load updates
- [ ] Real-time at-risk detection (pickup in < 4 hrs without carrier)
- [ ] Interactive load map with carrier locations
- [ ] Live alert feed (Firefront/Stormfront)
- [ ] AI suggested action panel per load
- [ ] Bulk actions (send to multiple carriers)

**Infrastructure:**
- WebSocket server for event streaming
- Redis for real-time state
- Kafka for event sourcing

**Dependencies:** Wave 17 (playbooks), Wave 16 (dispatchers)

**Effort:** 4 weeks

---

## Wave 19: Pipeline AI & Load Prediction (Q2 2026)

**Goal:** Predict load coverage probability and recommend carriers before posting.

**Features:**
- [ ] Load outcome predictor (will this load be delivered on time?)
- [ ] Margin risk scorer (estimate margin vs. market rate)
- [ ] Carrier matching engine (top 10 carriers for this lane/commodity)
- [ ] Coverage confidence score (probability of carrier acceptance)
- [ ] AI recommends bid strategy (match market, underbid, premium)

**Data Model:**
```prisma
model LoadPrediction {
  id String @id @default(cuid())
  loadId Int
  coverageProbability Float // 0-1
  marginRiskScore Int // 0-100
  recommendedCarriers String[] // carrierId[]
  predictionAts DateTime
}
```

**ML Stack:**
- Gradient boosting model (XGBoost) trained on historical loads
- Feature engineering: lane, commodity, weight, seasonal factors
- Model retraining weekly

**Dependencies:** Wave 18, existing freight data warehouse

**Effort:** 5 weeks

---

## Wave 20: Hotel Revenue Manager AI (Q2–Q3 2026)

**Goal:** AI assists hotel managers with pricing and occupancy optimization.

**Features:**
- [ ] Demand forecaster (next 30 days occupancy prediction)
- [ ] Price optimizer (AI recommends rates per segment/day)
- [ ] Seasonal index calculator (Q4 vs. Q1 vs. summer)
- [ ] A/B test runner (test 2 prices in parallel)
- [ ] Loss night predictor (flag nights likely to have disputes)
- [ ] Competitive rate monitor (track market rates)

**Data Model:**
```prisma
model HotelPriceStrategy {
  id String @id @default(cuid())
  hotelId Int
  strategyType String // "static" | "seasonal" | "dynamic"
  config Json // min/max prices, rules
  startDate DateTime
  endDate DateTime
  estimatedRevenue Float
  actual Revenue Float
}
```

**Effort:** 4 weeks

---

## Wave 21: BPO Agent Coaching & QA AI (Q3 2026)

**Goal:** Real-time coaching and automated quality assurance for call centers.

**Features:**
- [ ] Call transcription integration (Deepgram / Whisper API)
- [ ] Real-time agent suggestions (tone, compliance, upsell)
- [ ] Automated QA scoring (sales technique, compliance, tone)
- [ ] Call sentiment analysis (gauge customer satisfaction)
- [ ] Agent burnout predictor (identify at-risk agents)
- [ ] Coaching dashboard for supervisors

**Infrastructure:**
- Speech-to-text API integration
- Real-time transcription processing
- LLM-powered QA scoring

**Effort:** 6 weeks

---

## Wave 22: SaaS Churn Prediction & Pricing Optimizer (Q3–Q4 2026)

**Goal:** Predict SaaS customer churn and optimize pricing strategies.

**Features:**
- [ ] Churn predictor (predict cancellation within 90 days)
- [ ] Early warning signals (usage decline, support tickets)
- [ ] Pricing A/B tester (test prices with cohorts)
- [ ] Expansion revenue identifier (which customers can upsell?)
- [ ] Retention playbooks (auto-send discount offer to at-risk)
- [ ] LTV calculator (predict lifetime value per cohort)

**Effort:** 5 weeks

---

## Wave 23: Full Accounting Module (Q4 2026–Q1 2027)

**Goal:** Close the loop with automated billing, AP/AR, and GL posting.

**Features:**
- [ ] General Ledger (GL) with chart of accounts
- [ ] Accounts Payable (AP) automation
- [ ] Accounts Receivable (AR) with aging
- [ ] Automated invoice generation
- [ ] Bank reconciliation
- [ ] Multi-currency support
- [ ] Tax calculation (sales tax, GST)
- [ ] Integration with QuickBooks / Xero

**Data Model:**
```prisma
model GeneralLedgerAccount {
  id String @id @default(cuid())
  code String
  name String
  type String // asset, liability, equity, revenue, expense
  balance Float
}

model JournalEntry {
  id String @id @default(cuid())
  date DateTime
  description String
  lines JournalEntryLine[]
}
```

**Effort:** 8 weeks

---

## Wave 24: Workflow Orchestration & GraphQL (Q1–Q2 2027)

**Goal:** Transition to modern API architecture with workflow orchestration.

**Features:**
- [ ] GraphQL gateway (Apollo Server)
- [ ] Temporal workflow engine integration
- [ ] Long-running workflow support (multi-day processes)
- [ ] API versioning strategy
- [ ] Rate limiting & quotas per user
- [ ] Deprecation warnings for old REST endpoints

**Tech Stack:**
- Temporal.io for workflow orchestration
- Apollo GraphQL gateway
- OpenTelemetry for observability

**Effort:** 6 weeks

---

## Wave 25: Multi-Tenancy & Cloud Platform (Q2–Q3 2027)

**Goal:** Launch SIOX as a cloud SaaS product for external customers.

**Features:**
- [ ] Tenant isolation (database per tenant or row-level security)
- [ ] White-label tenant customization
- [ ] Usage-based billing (API calls, storage, AI features)
- [ ] Admin portal for tenant management
- [ ] API keys and OAuth for external integrations
- [ ] Data export/import workflows
- [ ] SLA monitoring and reporting

**Effort:** 10 weeks

---

## Wave 26+: Future Opportunities (2027–2028)

- **Marketplace**: Community-built playbooks, templates, integrations
- **Mobile Apps**: Native iOS/Android with offline sync
- **Real-time Collaboration**: Multi-user load editing, comments, @mentions
- **AI Marketplace Integration**: Llama.cpp, LLaMA, Mistral for on-prem inference
- **Compliance Automation**: GDPR/CCPA data handling, audit reports
- **Advanced Forecasting**: Prophet time-series models for demand/revenue
- **Customer Data Platform**: Unified customer view across ventures

---

## Sequencing & Dependencies

```
Wave 16 (Done)
  ↓
Wave 17 ← Playbooks (foundation for automation)
  ├→ Wave 18 ← Real-time Ops (depends on playbooks)
  │   ├→ Wave 19 ← Pipeline AI
  │   └→ Wave 20 ← Hotel Revenue AI
  │
  ├→ Wave 21 ← BPO Agent AI (parallel with 18)
  │
  └→ Wave 22 ← SaaS Churn AI (parallel with 21)
    
Wave 23 ← Accounting (independent, can start anytime)

Wave 24 ← Modern API (prerequisite for 25)
  ↓
Wave 25 ← Cloud Platform (requires 24)
  ↓
Wave 26+ ← Ecosystem (marketplace, mobile, etc.)
```

---

## Effort Estimate

| Phase | Waves | Total Weeks | Team Size | Start | End |
|-------|-------|-------------|-----------|-------|-----|
| AI Operations | 17–20 | 16 weeks | 8–10 eng | Q1 2026 | Q3 2026 |
| BPO + SaaS AI | 21–22 | 11 weeks | 10–12 eng | Q3 2026 | Q4 2026 |
| Accounting | 23 | 8 weeks | 6–8 eng | Q4 2026 | Q1 2027 |
| Modern API | 24 | 6 weeks | 8–10 eng | Q1 2027 | Q2 2027 |
| Cloud Platform | 25 | 10 weeks | 12–15 eng | Q2 2027 | Q3 2027 |

---

## Success Criteria

After each Wave, we measure:
1. **Feature Completion**: All acceptance criteria met
2. **Test Coverage**: ≥85% code coverage for new modules
3. **Performance**: API response time <200ms (p95), uptime 99.5%+
4. **User Adoption**: Feature used by ≥70% of eligible users within 2 weeks
5. **Quality**: <5% bug report rate post-launch

---

## How to Update This Roadmap

This roadmap is living. Every quarter:
1. Mark completed Waves with ✅
2. Adjust timelines based on actual velocity
3. Re-prioritize based on customer feedback
4. Add new Waves to the end as priorities shift
5. Share updated version with stakeholders

Last Updated: December 8, 2025
Next Review: March 31, 2026
