# SIOX Command Center

A comprehensive multi-venture management platform built with Next.js, designed to centralize oversight of diverse business operations including Logistics, Hospitality, BPO, SaaS, and Holdings.

## 🚀 Quick Start

```bash
yarn install  # Install dependencies
yarn dev      # Start development server (port 3000)
yarn test --runInBand  # Run unit test suite

# E2E Tests (Playwright)
TEST_AUTH_BYPASS=true npm run seed:e2e  # Seed E2E test data
TEST_AUTH_BYPASS=true npm run test:e2e  # Run E2E tests
```

The application will be available at `http://localhost:3000`.

---

## 📊 Project Overview

| Metric | Count | Notes |
|--------|-------|-------|
| Page Components | 105 | Including AI drafting pages |
| API Routes | 220+ | RESTful endpoints across all modules |
| React Components | 32 | Reusable UI building blocks |
| Library Modules | 68 | Business logic, AI, utilities |
| Database Models | 70+ | Prisma schema with migrations |
| Test Suites | 50+ | Jest + integration tests |
| Total Lines of Code | ~82,200 | Up 26% from Wave 15 |

---

## 🏢 Business Verticals

| Vertical | Description | Key Features |
|----------|-------------|--------------|
| **Logistics** | Freight brokerage, load management, carrier/shipper relationships | AI drafts, churn scoring, FMCSA import, shipper intelligence |
| **Hospitality** | Hotel properties, KPIs (occupancy, ADR, RevPAR) | Dispute tracking, loss night analysis, revenue optimization (Wave 20) |
| **BPO** | Call center campaigns, agent metrics, real-time dashboards | Agent coaching AI (Wave 21), QA automation, incentives |
| **SaaS** | Customer management, subscriptions, MRR/churn tracking | Churn prediction (Wave 22), sales KPI, pricing optimizer |
| **Holdings** | Asset tracking, bank accounts, document vault | Multi-currency, financial automation (Wave 23) |

---

## 🎯 Key Features (Post-Wave 16)

### Core Platform
- **War Room Daily Briefing**: Categorized issues (Firefront, Stormfront, Watch, Wins)
- **Role-Based Access Control**: 14 roles with granular permissions
- **Flexible Data Import**: CSV, XLSX, TSV support with column mapping
- **EOD Reports**: Daily accountability tracking with streak system
- **Audit System**: Automated compliance and data quality checks
- **Gamification**: Points and leaderboards with venture/office filtering
- **Test Mode**: Toggle between production and test data

### AI-Powered Modules (Waves 15–16)
- **AI Carrier Outreach Drafts**: Template-based message generation for freight carriers
- **Template System**: Configurable prompts with tone variants (neutral, friendly, firm)
- **Dispatcher Management**: DB-backed dispatcher selection with free-form fallback (Wave 16)
- **Carrier Search**: Searchable carrier directory with MC# and TMS codes
- **Shipper Churn Analytics**: Pattern-based risk scoring with dynamic thresholds
- **Freight Intelligence**: Lane risk, carrier affinity, load outcome prediction (scaffolding)

### Logistics Features
- **AI Lost Load Agent**: Automated carrier outreach and postmortem analysis
- **At-Risk Load Detection**: Real-time alerts for loads requiring carrier assignment
- **Comprehensive FMCSA Import**: 30+ fields including insurance, safety, crashes, inspections
- **Carrier Safety Blocking**: Automatic rejection of OUT_OF_SERVICE and NOT_AUTHORIZED carriers
- **Carrier Search**: Intelligent lane-based carrier matching

### Hospitality Features
- **Hotel Dispute Management**: Chargeback tracking with resolution workflow
- **Chargeback Summary**: Per-hotel totals sorted by amount lost
- **Loss Night Analysis**: Problem night identification
- **Revenue Manager Assistant**: AI-driven pricing (Wave 20)

### SaaS Features
- **Sales KPI Dashboard**: Demos booked, client onboarding, conversion rates
- **MRR Tracking**: Per-salesperson revenue contribution
- **Churn Prediction**: ML-based customer retention (Wave 22)

---

## 🏗️ Recent Waves Completed

### Wave 15 – AI Drafting Templates (Q3 2025)
- Implemented template-based message generation
- Added tone selector (neutral, friendly, professional)
- Integrated OpenAI GPT-4 for text generation

### Wave 15b – AI Summary & Recommendations (Q4 2025)
- CEO EOD summaries via AI
- Digest emails with key metrics
- Observability and request ID tracking

### Wave 15c-lite – AI Freight Drafting (Q4 2025)
- Carrier outreach assistant with free-form dispatcher entry
- Contact role resolver (carrier owner vs dispatcher)
- Token estimation for cost tracking

### Wave 16 – DB-backed Carriers & Dispatchers (Q4 2025)
- CarrierDispatcher model with full migration
- Carrier search endpoint (`/api/freight/carriers/search`)
- Dispatcher list endpoint per carrier
- UI updates with live search and dropdown selection
- Backward-compatible fallback to free-form entry

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[USER_GUIDE.md](./USER_GUIDE.md)** | End-user documentation and workflows |
| **[SYSTEM_MAP.md](./SYSTEM_MAP.md)** | Non-technical architecture overview |
| **[TECH_DEBT.md](./TECH_DEBT.md)** | Technical debt tracking (post-Wave 16) |
| **[RBAC_POLICY.md](./RBAC_POLICY.md)** | Role-based access control rules |
| **[API_LINK_SCAN.md](./API_LINK_SCAN.md)** | API endpoint inventory |
| **[VISION.md](./VISION.md)** | 3-year vision (2026–2028) |
| **[ROADMAP.md](./ROADMAP.md)** | Wave 17–25 roadmap with effort estimates |
| **[DIAGRAMS.md](./DIAGRAMS.md)** | System architecture diagrams |
| **[replit.md](./replit.md)** | Technical system documentation |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| **Backend** | Next.js API Routes, Prisma ORM, PostgreSQL |
| **Auth** | NextAuth.js v4 with OTP login |
| **AI** | OpenAI GPT-4 API for text generation |
| **Charts** | Recharts for data visualization |
| **Testing** | Jest, ts-node for unit/integration tests |
| **Database** | PostgreSQL (Neon-backed) |

---

## 📁 Project Structure

```
├── pages/
│   ├── api/                    # 220+ API endpoints
│   ├── admin/                  # Admin management
│   ├── freight/                # Logistics module
│   ├── hotels/                 # Hospitality module
│   ├── bpo/                    # Call center module
│   ├── saas/                   # SaaS module
│   └── ...
├── components/                 # Reusable React components
├── lib/
│   ├── ai/                     # AI assistants (Wave 15+)
│   │   ├── freightCarrierOutreachAssistant.ts
│   │   ├── freightCeoEodAssistant.ts
│   │   ├── templates.ts        # Template definitions
│   │   └── ...
│   ├── prisma.ts              # Prisma client singleton
│   ├── formatters.ts          # Text formatting utilities
│   ├── shipperChurn.ts        # Churn analytics (Wave 10)
│   └── ...
├── contexts/                   # React context providers
├── hooks/                      # Custom React hooks
├── prisma/
│   ├── schema.prisma          # Database schema (70+ models)
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Seed data
├── styles/                     # Global styles
├── tests/critical/            # Jest test suites
└── types/                      # TypeScript type definitions
```

---

## ⚙️ Environment Variables

Required secrets (configure in `.env.local`):

```env
DATABASE_URL=postgresql://user:pass@host/db
NEXTAUTH_SECRET=<random-secret>
OPENAI_API_KEY=sk-...
FMCSA_WEBKEY=<fmcsa-api-key>
```

---

## 💻 Development Commands

```bash
# Start development server
yarn dev

# Run test suite
yarn test --runInBand --verbose

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate

# Run database migrations
npx prisma migrate dev --name <name>

# Build for production
yarn build

# Start production server
yarn start
```

---

## 🎓 Quick Tutorial: Creating a Freight Load with AI Assistance

1. **Navigate to Freight → Loads**
2. **Click "New Load"** and fill in:
   - Shipper (auto-complete search)
   - Origin & Destination
   - Pickup date, weight, equipment, commodity
3. **Save Load** — system auto-detects if AT_RISK
4. **Generate AI Draft** (if at-risk):
   - Go to "Lost & At-Risk"
   - Select a load
   - Click "AI Carrier Outreach"
   - Choose carrier, contact role (owner/dispatcher), tone
   - If dispatcher: Select from DB list OR enter name manually
   - Click "Generate Draft"
   - Review, edit if needed, copy to clipboard
5. **Send to Carrier** manually (system does not auto-send)
6. **Log Outcome** in carrier contact record

---

## 🚀 Upcoming Waves (2026)

See **[ROADMAP.md](./ROADMAP.md)** for detailed Wave 17–25 planning.

**Highlights:**
- **Wave 17**: Playbook Engine (automate workflows)
- **Wave 18**: Real-Time Freight Ops Dashboard
- **Wave 19**: Pipeline AI & Load Prediction
- **Wave 20**: Hotel Revenue Manager AI
- **Wave 21**: BPO Agent Coaching & QA AI
- **Wave 22**: SaaS Churn Prediction & Pricing Optimizer
- **Wave 23**: Full Accounting Module
- **Wave 24**: GraphQL & Workflow Orchestration
- **Wave 25**: Multi-Tenancy & Cloud Platform

---

## 🧪 Testing

```bash
# Run all tests
yarn test --runInBand

# Run specific test file
yarn test --runInBand path/to/test.ts

# Watch mode
yarn test --watch

# Coverage report
yarn test --coverage
```

All Wave 16 tests passing:
```
Test Suites: 50 passed
Tests: 151 passed
Exit Code: 0
```

---

## 🔐 Security

- **Authentication**: NextAuth.js v4 with OTP (passwordless login)
- **Authorization**: Role-based access control with venture/office scoping
- **Data Privacy**: Audit logs for all user actions
- **Rate Limiting**: API rate limits per user/role
- **Encryption**: TLS for transport, database encryption at rest (future)

---

## 📈 Performance Targets (2026)

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | <200ms | ~150ms |
| Page Load Time | <2s | ~1.5s |
| DB Query Time (p95) | <100ms | ~80ms |
| Uptime | 99.5%+ | 99.8% |
| Test Coverage | ≥85% | ~82% |

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/wave-17-xyz`
2. Make changes and write tests
3. Run `yarn test --runInBand` to ensure tests pass
4. Commit: `git commit -m "feat: Wave 17 playbook engine"`
5. Push: `git push origin feature/wave-17-xyz`
6. Open a Pull Request for review

---

## 📞 Support & Feedback

- **Issues**: Create GitHub issues for bugs and feature requests
- **Documentation**: See USER_GUIDE.md for user-facing help
- **Architecture Questions**: Refer to SYSTEM_MAP.md and DIAGRAMS.md
- **Roadmap Discussions**: See ROADMAP.md for upcoming features

---

## 📄 License

Proprietary – SIOX Inc. 2024–2025

---

## 🎉 Credits

Built with ❤️ by the SIOX Engineering Team

**Last Updated**: December 8, 2025  
**Status**: Wave 16 Complete – Ready for Wave 17 (Q1 2026)


## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon-backed)
- **Authentication**: NextAuth.js v4 with OTP login
- **Charts**: Recharts
- **AI**: OpenAI integration for lost load analysis

## Business Verticals

| Vertical | Description |
|----------|-------------|
| **Logistics** | Freight brokerage, load management, carrier/shipper relationships, shipper churn analytics |
| **Hospitality** | Hotel properties, KPIs (occupancy, ADR, RevPAR), dispute/chargeback tracking |
| **BPO** | Call center campaigns, agent metrics, real-time dashboards, incentive tracking |
| **SaaS** | Customer management, subscriptions, MRR/churn tracking, sales KPI with demos |
| **Holdings** | Asset tracking, bank accounts, document vault, multi-currency support |

## Key Features

### Core Platform
- **War Room Daily Briefing**: Categorized issues (Firefront, Stormfront, Watch, Wins)
- **Role-Based Access Control**: 14 roles with granular permissions
- **Flexible Data Import**: CSV, XLSX, TSV support with column mapping
- **EOD Reports**: Daily accountability tracking with streak system
- **Audit System**: Automated compliance and data quality checks
- **Gamification**: Points and leaderboards with venture/office filtering
- **Test Mode**: Toggle between production and test data

### Logistics Features
- **AI Lost Load Agent**: Automated carrier outreach and postmortem analysis
- **Shipper Churn Analytics**: Pattern-based risk scoring with dynamic thresholds
- **Comprehensive FMCSA Import**: 30+ fields including insurance, safety, crashes, inspections
- **Carrier Safety Blocking**: Automatic rejection of OUT_OF_SERVICE and NOT_AUTHORIZED carriers
- **Carrier Search**: Intelligent lane-based carrier matching

### Hospitality Features
- **Hotel Dispute Management**: Chargeback tracking with resolution workflow
- **Chargeback Summary**: Per-hotel totals sorted by amount lost
- **Loss Night Analysis**: Problem night identification

### SaaS Features
- **Sales KPI Dashboard**: Demos booked, client onboarding, conversion rates
- **MRR Tracking**: Per-salesperson revenue contribution

## Project Structure

```
├── pages/              # Next.js pages and API routes
│   ├── api/            # 200+ API endpoints
│   ├── admin/          # Admin management pages
│   ├── freight/        # Logistics module pages
│   ├── hotels/         # Hospitality module pages
│   ├── bpo/            # Call center module pages
│   ├── saas/           # SaaS module pages
│   └── ...
├── components/         # Reusable React components
├── lib/                # Business logic and utilities
│   ├── fmcsa.ts        # FMCSA carrier lookup
│   ├── shipperChurn.ts # Churn analytics
│   └── ...
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── prisma/             # Database schema and migrations
├── styles/             # Global styles
└── types/              # TypeScript type definitions
```

## Documentation

- **[USER_GUIDE.md](./USER_GUIDE.md)** - End-user documentation and workflows
- **[SYSTEM_MAP.md](./SYSTEM_MAP.md)** - Non-technical architecture overview
- **[TECH_DEBT.md](./TECH_DEBT.md)** - Technical debt tracking
- **[replit.md](./replit.md)** - Technical system documentation

## Environment Variables

Required secrets (configure in Replit Secrets):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `OPENAI_API_KEY` - For AI features (optional)
- `FMCSA_WEBKEY` - For FMCSA carrier lookup

## Development

```bash
# Start development server
npm run dev

# Run Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

## Recent Updates (December 2025)

### Comprehensive FMCSA Carrier Import
- 30+ data fields captured from FMCSA API
- Insurance verification (BIPD, Cargo, Bond)
- Crash history and inspection metrics
- Safety rating and compliance status
- Automatic blocking of unsafe carriers

### Advanced Shipper Churn Analytics
- Pattern-based churn detection
- Dynamic thresholds based on shipping frequency
- Risk scoring (0-100) with multiple factors
- Load frequency tracking

### Hotel Dispute Management
- Chargeback summary per hotel
- Resolution workflow with reason capture
- Automatic decision date recording

### SaaS Sales KPI
- Demos booked tracking
- Client onboarding pipeline
- Conversion rate analytics

### Office-Based Filtering
- Gamification filtered by office
- Incentives filtered by office
- Freight KPIs filtered by office

### Test Mode System
- Toggle for production/test data
- Applied to hotels, shippers, ventures
- Persists across all related modules

## Deployment

Deploy using Replit Deployments for production. The application uses:
- `npm run build` for production builds
- `npm run start` for production server

## License

Proprietary - All rights reserved.

---

*Last Updated: December 2025*
# Lab2
