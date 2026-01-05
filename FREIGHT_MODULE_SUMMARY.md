# Freight Module - Comprehensive Summary

**Last Updated:** December 2024  
**Status:** Production-Ready ✅

---

## Table of Contents

1. [Overview](#overview)
2. [Core Entities](#core-entities)
3. [Business Flow](#business-flow)
4. [Key Features](#key-features)
5. [Module Structure](#module-structure)
6. [API Endpoints](#api-endpoints)
7. [Intelligence & Analytics](#intelligence--analytics)
8. [Integrations](#integrations)

---

## Overview

The Freight Module is a **comprehensive freight brokerage management system** that handles the complete lifecycle of freight operations from quote creation to delivery and payment. It manages loads, carriers, shippers, quotes, KPIs, and provides AI-powered analytics for carrier matching and shipper health.

### Key Capabilities

- **Load Management**: Complete lifecycle from quote to delivery
- **Carrier Management**: FMCSA compliance, dispatcher relationships, lane matching
- **Shipper/Customer Management**: Churn analysis, health scoring, touch tracking
- **Quote Management**: Sales quotes with conversion to loads
- **Carrier Matching**: AI-powered lane-based matching
- **Outreach Management**: Automated carrier outreach and response tracking
- **KPI Tracking**: Daily freight KPIs, sales KPIs, P&L reporting
- **Intelligence**: Lost load detection, at-risk monitoring, coverage analysis

---

## Core Entities

### Primary Models

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| **Load** | Core shipment record | `loadStatus`, `pickupDate`, `dropDate`, `rate`, `billAmount`, `costAmount`, `marginAmount`, `carrierId` |
| **FreightQuote** | Sales quotes before booking | `status`, `sellRate`, `buyRateEstimate`, `marginEstimate`, `loadId` |
| **Carrier** | Trucking companies | `mcNumber`, `equipmentTypes`, `serviceAreas`, FMCSA data |
| **Customer** | Broker customers (shippers) | `churnStatus`, `lastLoadDate`, `totalLoadsHistoric` |
| **LogisticsShipper** | Location-level shippers | `churnStatus`, `lastLoadDate`, `avgLoadsPerMonth` |
| **CarrierContact** | Outreach history | `channel`, `outcome`, `notes` |
| **LogisticsLoadEvent** | Immutable event log | `type`, `message`, `data` |
| **OutreachMessage** | Carrier outreach messages | `subject`, `body`, `status` |
| **OutreachRecipient** | Message recipients | `carrierId`, `status`, `respondedAt` |

### Supporting Models

- `CarrierPreferredLane` - Carrier lane preferences
- `ShipperPreferredLane` - Shipper lane preferences with bonuses
- `CarrierDispatcher` - Carrier-dispatcher relationships
- `LostLoadReason` - Categorized lost load reasons
- `FreightKpiDaily` - Daily aggregated KPIs
- `OutreachAttribution` - Links loads to outreach campaigns

---

## Business Flow

### 1. Quote-to-Load Lifecycle

```
Quote Creation → Quote Sent → Quote Accepted → Load Created → 
Carrier Matching → Load Covered → In Transit → Delivered → Invoiced → Paid
```

**Detailed Flow:**

1. **Quote Phase** (`FreightQuote`)
   - Salesperson creates quote with `sellRate`, `buyRateEstimate`, `marginEstimate`
   - Status: `DRAFT` → `SENT` → `ACCEPTED` / `REJECTED` / `COUNTERED` / `EXPIRED`
   - Customer can accept, reject, or counter-offer

2. **Load Creation**
   - Accepted quote converts to `Load` via `/api/freight/quotes/[id]/convert-to-load`
   - Load inherits quote data (origin, destination, equipment, rates)
   - Initial status: `QUOTED` or `OPEN`

3. **Carrier Matching** (`WORKING` status)
   - System finds matching carriers based on:
     - Lane history (pickup/drop ZIP codes)
     - Equipment type compatibility
     - Service area coverage
     - Origin proximity
     - Preferred lanes
   - Dispatchers can manually search or use AI matching

4. **Load Coverage** (`COVERED` status)
   - Carrier assigned via outreach award
   - `carrierId` set on load
   - `OutreachAttribution` created linking load to outreach campaign
   - Event logged: `STATUS_CHANGED` → `COVERED`

5. **Delivery** (`DELIVERED` status)
   - `actualDeliveryAt` timestamp set
   - `billAmount` and `costAmount` entered (manual or TMS import)
   - `marginAmount` and `marginPercentage` calculated automatically
   - Attribution margin tracked for outreach ROI

### 2. Load Status State Machine

```
OPEN → WORKING → COVERED → IN_TRANSIT → DELIVERED
  ↓       ↓         ↓
QUOTED  AT_RISK  FELL_OFF → (re-cover or LOST)
  ↓       ↓
WORKING  LOST (terminal)
  ↓
DORMANT → WORKING (reactivate)
```

**Status Transitions:**

- `OPEN` / `QUOTED` → `WORKING`: Begin actively working the load
- `WORKING` → `AT_RISK`: Flagged as potentially problematic
- `WORKING` / `AT_RISK` → `COVERED`: Carrier assigned
- `COVERED` → `FELL_OFF`: Carrier backs out
- `FELL_OFF` → `COVERED`: Re-covered with new carrier
- `COVERED` → `IN_TRANSIT`: Load picked up and moving
- `IN_TRANSIT` → `DELIVERED`: Successfully delivered
- `WORKING` / `AT_RISK` → `LOST`: Cannot be covered (terminal)
- `WORKING` → `DORMANT`: No activity, inactive
- `DORMANT` → `WORKING`: Reactivated

**Exception Paths:**

- `AT_RISK` → `LOST`: Load cannot be covered
- `FELL_OFF` → `LOST`: Cannot re-cover after carrier backs out
- `LOST`: Terminal state - requires `lostReasonId` and `lostAt` timestamp

### 3. Carrier Outreach Flow

```
Load Created → Find Carriers → Send Outreach → Carrier Responds → 
Award Load → Load Covered
```

1. **Carrier Search** (`/api/freight/carrier-search`)
   - Lane-based matching using ZIP3 codes
   - Equipment compatibility scoring
   - Service area matching
   - Origin proximity calculation
   - Preferred lane bonuses

2. **Outreach Creation** (`/api/freight/outreach/send`)
   - Create `OutreachMessage` with subject/body
   - Create `OutreachRecipient` records for each carrier
   - Track via `OutreachConversation`

3. **Carrier Response** (`/api/freight/outreach/reply`)
   - Update `OutreachRecipient.status`
   - Log response in `OutreachConversation`
   - Update `CarrierContact` history

4. **Award Load** (`/api/freight/outreach/award`)
   - Set `load.carrierId`
   - Change status to `COVERED`
   - Create `OutreachAttribution` for ROI tracking
   - Log event: `STATUS_CHANGED`

---

## Key Features

### 1. Load Management

**UI Pages:**
- `/freight/loads` - Load list with filtering, search, status filters
- `/freight/loads/[id]` - Load detail view with full history
- `/freight/loads/new` - Create new load
- `/freight/loads/[id]/find-carriers` - Carrier matching interface

**Key Operations:**
- Create, update, delete loads
- Status transitions with validation
- Mark as at-risk, lost, or fell-off
- Track events in `LogisticsLoadEvent`
- File attachments
- TMS integration via `tmsLoadId`

### 2. Carrier Management

**UI Pages:**
- `/freight/carriers` - Carrier directory with search
- `/freight/carriers/[id]` - Carrier detail with history
- `/freight/carriers/new` - Create new carrier

**Key Features:**
- FMCSA data sync (`lib/logistics/fmcsaSync.ts`)
- Dispatcher relationships (`CarrierDispatcher`)
- Preferred lanes (`CarrierPreferredLane`)
- Contact history (`CarrierContact`)
- Lane learning (`lib/logistics/learnCarrierLanes.ts`)
- Availability scoring (`lib/freight-intelligence/carrierAvailabilityScore.ts`)

### 3. Shipper/Customer Intelligence

**UI Pages:**
- `/freight/shipper-health` - Shipper health dashboard
- `/freight/shipper-churn` - Churn analysis
- `/freight/shipper-icp` - Ideal Customer Profile analysis
- `/freight/dormant-customers` - Dormant customer list

**Key Features:**
- **Churn Detection** (`lib/shipperChurn.ts`, `lib/freight/customerChurn.ts`)
  - Calculates churn status: `ACTIVE`, `AT_RISK`, `CHURNED`, `REACTIVATED`
  - Based on `lastLoadDate` and historical patterns
  - Automatic status updates via background jobs

- **Health Scoring** (`lib/freight-intelligence/shipperHealthScore.ts`)
  - Composite score based on:
    - Load frequency
    - Revenue trends
    - Payment history
    - Relationship duration

- **Seasonality Detection** (`lib/freight-intelligence/shipperSeasonality.ts`)
  - Identifies seasonal patterns in shipper behavior

### 4. Quote Management

**UI Pages:**
- `/freight/quotes/[id]` - Quote detail view

**Key Features:**
- Create quotes with rate estimates
- Track quote status lifecycle
- Convert accepted quotes to loads
- Link quotes to loads via `FreightQuote.loadId`
- Counter-offer handling
- Expiration tracking

### 5. Coverage & War Rooms

**UI Pages:**
- `/freight/coverage` - Coverage dashboard
- `/freight/coverage-war-room` - Real-time coverage monitoring
- `/freight/outreach-war-room` - Outreach campaign management

**Key Features:**
- Real-time coverage percentage tracking
- At-risk load identification
- Outreach campaign performance
- Carrier response rates
- Coverage gap analysis

### 6. Lost & At-Risk Loads

**UI Pages:**
- `/freight/lost` - Lost loads view
- `/freight/at-risk` - At-risk loads
- `/freight/lost-and-at-risk` - Combined view

**Key Features:**
- Categorized lost load reasons (`LostLoadReason`)
- At-risk flagging with timestamps
- Post-mortem analysis
- Pattern detection for prevention

### 7. KPI & Reporting

**UI Pages:**
- `/freight/kpi` - Freight KPI dashboard
- `/freight/sales-kpi` - Sales KPI dashboard
- `/freight/pnl` - P&L reporting

**Key Metrics:**
- Loads inbound, quoted, covered
- Coverage percentage
- Revenue, profit, margin
- Quote-to-load conversion
- Carrier performance
- CSR/dispatcher performance

**Data Sources:**
- `FreightKpiDaily` - Daily aggregated KPIs
- `EmployeeKpiDaily` - Employee-level KPIs
- Real-time calculations from `Load` and `FreightQuote` data

### 8. AI Tools

**UI Pages:**
- `/freight/ai-tools` - AI tools hub
  - Carrier Draft Tab
  - EOD Draft Tab
  - Intelligence Tab
  - Ops Diagnostics Tab

**Key Features:**
- AI-powered carrier outreach drafts
- EOD report generation
- Operational diagnostics
- Intelligence insights

---

## Module Structure

### Frontend Pages (`pages/freight/`)

```
freight/
├── loads/
│   ├── index.tsx          # Load list
│   ├── [id].tsx           # Load detail
│   ├── new.tsx            # Create load
│   └── [id]/
│       └── find-carriers.tsx  # Carrier matching
├── carriers/
│   ├── index.tsx          # Carrier list
│   ├── [id].tsx           # Carrier detail
│   └── new.tsx            # Create carrier
├── quotes/
│   └── [id].tsx           # Quote detail
├── shipper-health/
│   ├── index.tsx          # Health dashboard
│   └── tabs/              # Health tabs
├── ai-tools/
│   ├── index.tsx          # AI hub
│   └── tabs/              # AI tool tabs
├── kpi.tsx                # KPI dashboard
├── sales-kpi.tsx           # Sales KPIs
├── pnl.tsx                 # P&L report
├── coverage.tsx            # Coverage dashboard
├── coverage-war-room.tsx   # Coverage war room
├── outreach-war-room.tsx  # Outreach war room
├── lost.tsx                # Lost loads
├── at-risk.tsx             # At-risk loads
├── shipper-churn.tsx       # Churn analysis
├── shipper-icp.tsx         # ICP analysis
├── dormant-customers.tsx   # Dormant customers
├── intelligence.tsx        # Intelligence dashboard
└── tasks.tsx               # Freight tasks
```

### Backend API (`pages/api/freight/`)

```
api/freight/
├── loads/
│   ├── index.ts           # List loads
│   ├── list.ts            # Advanced list
│   ├── create.ts          # Create load
│   ├── [id].ts            # Load CRUD
│   ├── update.ts          # Update load
│   ├── events.ts          # Load events
│   ├── mark-at-risk.ts   # Mark at-risk
│   ├── mark-lost.ts      # Mark lost
│   ├── mark-felloff.ts   # Mark fell-off
│   └── [id]/
│       ├── carrier-suggestions.ts
│       ├── matches.ts
│       ├── notify-carriers.ts
│       └── outreach.ts
├── carriers/
│   ├── index.ts           # List carriers
│   ├── search.ts          # Search carriers
│   ├── match.ts           # Match carriers
│   ├── [carrierId].ts     # Carrier CRUD
│   └── [carrierId]/
│       ├── contact.ts
│       ├── dispatchers.ts
│       ├── lanes.ts
│       └── preferred-lanes/
├── quotes/
│   ├── create.ts          # Create quote
│   └── [id]/
│       ├── index.ts       # Quote CRUD
│       ├── convert-to-load.ts
│       └── status.ts
├── outreach/
│   ├── send.ts            # Send outreach
│   ├── reply.ts           # Handle reply
│   ├── award.ts           # Award load
│   └── preview.ts         # Preview message
├── kpi/
│   ├── csr.ts             # CSR KPIs
│   └── dispatch.ts        # Dispatch KPIs
├── pnl/
│   └── summary.ts         # P&L summary
├── shipper-churn/
│   └── index.ts           # Churn calculation
├── shipper-health/
│   └── index.ts           # Health scores
├── shipper-icp/
│   └── index.ts           # ICP analysis
├── coverage-stats.ts      # Coverage statistics
├── coverage-war-room.ts   # War room data
├── outreach-war-room.ts   # Outreach data
├── at-risk-loads.ts       # At-risk loads
├── lost-loads.ts          # Lost loads
├── dormant-customers.ts   # Dormant customers
├── intelligence.ts        # Intelligence data
├── carrier-search.ts      # Carrier search
├── city-suggestions.ts    # City autocomplete
└── zip-lookup.ts          # ZIP code lookup
```

### Business Logic Libraries (`lib/freight/`, `lib/logistics/`)

```
lib/
├── freight/
│   ├── carrierSearch.ts       # Carrier search logic
│   ├── customerChurn.ts       # Customer churn detection
│   ├── customerDedupe.ts      # Customer deduplication
│   ├── events.ts              # Load event tracking
│   ├── guards.ts              # Access guards
│   ├── loadReference.ts      # Reference management
│   ├── loadStatus.ts          # Status validation
│   ├── margins.ts             # Margin calculations
│   ├── stats.ts               # Statistics
│   └── taskRules.ts           # Automated task generation
├── freight-intelligence/
│   ├── carrierAvailabilityScore.ts
│   ├── carrierLaneAffinity.ts
│   ├── csrFreightPerformanceScore.ts
│   ├── laneRiskScore.ts
│   ├── shipperHealthScore.ts
│   └── shipperSeasonality.ts
├── logistics/
│   ├── customerLocation.ts
│   ├── deliveryStats.ts
│   ├── fmcsaSync.ts
│   ├── learnCarrierLanes.ts
│   └── matching.ts
├── logisticsLostReasons.ts
├── shipperChurn.ts
└── scopeLoads.ts
```

---

## API Endpoints

### Load Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/freight/loads` | GET | List loads with filters |
| `/api/freight/loads/list` | GET | Advanced load list |
| `/api/freight/loads/create` | POST | Create new load |
| `/api/freight/loads/[id]` | GET/PUT/DELETE | Load CRUD |
| `/api/freight/loads/update` | PUT | Update load |
| `/api/freight/loads/mark-at-risk` | POST | Mark load as at-risk |
| `/api/freight/loads/mark-lost` | POST | Mark load as lost |
| `/api/freight/loads/mark-felloff` | POST | Mark load as fell-off |
| `/api/freight/loads/events` | GET | Get load events |
| `/api/freight/loads/[id]/carrier-suggestions` | GET | Get carrier suggestions |
| `/api/freight/loads/[id]/matches` | GET | Get carrier matches |
| `/api/freight/loads/[id]/notify-carriers` | POST | Notify carriers |
| `/api/freight/loads/[id]/outreach` | GET | Get outreach data |

### Carrier Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/freight/carriers` | GET | List carriers |
| `/api/freight/carriers/search` | GET | Search carriers |
| `/api/freight/carriers/match` | POST | Match carriers to load |
| `/api/freight/carriers/[carrierId]` | GET/PUT | Carrier CRUD |
| `/api/freight/carriers/[carrierId]/contact` | POST | Log carrier contact |
| `/api/freight/carriers/[carrierId]/dispatchers` | GET/POST | Dispatcher management |
| `/api/freight/carriers/[carrierId]/lanes` | GET | Get carrier lanes |
| `/api/freight/carrier-search` | GET | Advanced carrier search |

### Quote Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/freight/quotes/create` | POST | Create quote |
| `/api/freight/quotes/[id]` | GET/PUT | Quote CRUD |
| `/api/freight/quotes/[id]/convert-to-load` | POST | Convert quote to load |
| `/api/freight/quotes/[id]/status` | PUT | Update quote status |

### Outreach

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/freight/outreach/send` | POST | Send outreach message |
| `/api/freight/outreach/reply` | POST | Handle carrier reply |
| `/api/freight/outreach/award` | POST | Award load to carrier |
| `/api/freight/outreach/preview` | POST | Preview message |

### Analytics & Intelligence

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/freight/kpi/csr` | GET | CSR KPIs |
| `/api/freight/kpi/dispatch` | GET | Dispatch KPIs |
| `/api/freight/pnl` | GET | P&L data |
| `/api/freight/pnl/summary` | GET | P&L summary |
| `/api/freight/coverage-stats` | GET | Coverage statistics |
| `/api/freight/coverage-war-room` | GET | War room data |
| `/api/freight/outreach-war-room` | GET | Outreach data |
| `/api/freight/intelligence` | GET | Intelligence insights |
| `/api/freight/shipper-churn` | GET | Churn data |
| `/api/freight/shipper-health` | GET | Health scores |
| `/api/freight/shipper-icp` | GET | ICP analysis |
| `/api/freight/at-risk-loads` | GET | At-risk loads |
| `/api/freight/lost-loads` | GET | Lost loads |
| `/api/freight/dormant-customers` | GET | Dormant customers |

---

## Intelligence & Analytics

### 1. Carrier Matching Intelligence

**Lane-Based Matching** (`lib/freight-intelligence/carrierLaneAffinity.ts`)
- Matches carriers based on historical lane performance
- Uses ZIP3 codes for lane identification
- Considers on-time delivery rates
- Factors in preferred lane bonuses

**Availability Scoring** (`lib/freight-intelligence/carrierAvailabilityScore.ts`)
- Calculates carrier availability based on:
  - Recent load assignments
  - Response rates
  - Capacity indicators

**Equipment & Service Area Matching**
- Equipment type compatibility scoring
- Service area coverage analysis
- Origin proximity calculation

### 2. Shipper Intelligence

**Health Scoring** (`lib/freight-intelligence/shipperHealthScore.ts`)
- Composite health score (0-100)
- Factors:
  - Load frequency trends
  - Revenue stability
  - Payment history
  - Relationship duration
  - Churn risk indicators

**Seasonality Detection** (`lib/freight-intelligence/shipperSeasonality.ts`)
- Identifies seasonal patterns
- Predicts future load volumes
- Helps with capacity planning

**Churn Prediction** (`lib/shipperChurn.ts`, `lib/freight/customerChurn.ts`)
- Automatic churn status calculation
- Statuses: `ACTIVE`, `AT_RISK`, `CHURNED`, `REACTIVATED`
- Based on `lastLoadDate` and historical patterns

### 3. Lane Intelligence

**Lane Risk Scoring** (`lib/freight-intelligence/laneRiskScore.ts`)
- Identifies high-risk lanes
- Factors in historical loss rates
- Helps prioritize coverage efforts

**CSR Performance** (`lib/freight-intelligence/csrFreightPerformanceScore.ts`)
- Tracks CSR performance metrics
- Quote-to-load conversion rates
- Coverage success rates

### 4. Lost Load Analysis

- Categorized lost load reasons
- Pattern detection
- Post-mortem analysis
- Prevention recommendations

---

## Integrations

### 1. TMS Integration

- **Load Import**: Via `tmsLoadId` field
- **3PL Mapping**: `ThreePlLoadMapping` model
- **Sync**: Bidirectional sync for load status, rates, dates

### 2. FMCSA Integration

- **Data Sync**: `lib/logistics/fmcsaSync.ts`
- **Compliance**: Carrier safety ratings, violations
- **Auto-Update**: Background sync jobs

### 3. Dispatch System

- **Conversations**: `DispatchConversation` linked to loads
- **Load Assignment**: `DispatchLoad` model
- **Real-time Updates**: WebSocket integration

### 4. AI Services

- **Carrier Drafts**: AI-generated outreach messages
- **EOD Reports**: Automated report generation
- **Diagnostics**: Operational issue detection

---

## Key Business Rules

### 1. Load Status Transitions

- Validated via `lib/freight/loadStatus.ts`
- Terminal states: `DELIVERED`, `LOST`
- `FELL_OFF` can be recovered to `COVERED`
- `DORMANT` can be reactivated to `WORKING`

### 2. Margin Calculation

- `marginAmount = billAmount - costAmount`
- `marginPercentage = (marginAmount / billAmount) * 100`
- Auto-calculated on `billAmount`/`costAmount` update

### 3. Outreach Attribution

- Links loads to outreach campaigns
- Tracks ROI per campaign
- Margin attribution for performance analysis

### 4. Churn Detection

- `ACTIVE`: Loads in last 90 days
- `AT_RISK`: No loads in 90-180 days
- `CHURNED`: No loads in 180+ days
- `REACTIVATED`: Load after churn period

### 5. Preferred Lanes

- Carriers can set preferred lanes
- Shippers can set preferred lanes with bonuses
- Matching algorithm prioritizes preferred lanes

---

## Data Flow Examples

### Example 1: Quote to Load to Delivery

1. Salesperson creates `FreightQuote` with rates
2. Quote sent to customer (`status: SENT`)
3. Customer accepts (`status: ACCEPTED`)
4. Quote converted to `Load` (`status: QUOTED`)
5. Load status changed to `WORKING`
6. Carrier matched and awarded (`status: COVERED`)
7. Load picked up (`status: IN_TRANSIT`)
8. Load delivered (`status: DELIVERED`)
9. `billAmount` and `costAmount` entered
10. Margin calculated automatically
11. Invoice created (`arInvoiceDate` set)
12. Payment received (`arPaymentStatus: PAID`)

### Example 2: Lost Load Flow

1. Load in `WORKING` status
2. Dispatcher marks as `AT_RISK`
3. Unable to cover, marked as `LOST`
4. `lostReasonId` selected from categories
5. `lostAt` timestamp set
6. Event logged: `LOST_CONFIRMED`
7. Post-mortem analysis triggered
8. Pattern detection for prevention

### Example 3: Carrier Outreach Flow

1. Load created in `WORKING` status
2. System finds matching carriers
3. Outreach message created
4. Recipients added (`OutreachRecipient`)
5. Message sent via email/SMS
6. Carrier responds (`OutreachRecipient.status: RESPONDED`)
7. Load awarded to carrier
8. `OutreachAttribution` created
9. Load status → `COVERED`
10. Margin tracked for ROI

---

## Performance Considerations

### Indexing

- Loads indexed on: `ventureId`, `loadStatus`, `pickupDate`, `dropDate`, `carrierId`
- Carriers indexed on: `mcNumber`, `ventureId`
- Quotes indexed on: `ventureId`, `customerId`, `status`
- Events indexed on: `loadId`, `createdAt`

### Caching

- Carrier search results cached
- KPI calculations cached daily
- Coverage stats cached with TTL

### Background Jobs

- Churn calculation jobs
- FMCSA sync jobs
- KPI aggregation jobs
- Lost load analysis jobs

---

## Security & Access Control

### Role-Based Access

- **CSR**: Can view and update loads in their scope
- **Dispatcher**: Can match carriers, award loads
- **Sales**: Can create quotes, view customer data
- **Manager**: Full access to all freight operations
- **Admin**: System-wide access

### Scope Control

- Loads scoped by `ventureId` and `officeId`
- Users can only access loads in their assigned ventures/offices
- Global admins can access all loads

---

## Future Enhancements

### Planned Features

- Automated quote expiration
- Real-time tracking integration
- Advanced carrier scoring
- Predictive churn models
- Automated task generation
- Enhanced AI matching

---

## Summary

The Freight Module is a **production-ready, comprehensive freight brokerage management system** that handles the complete lifecycle from quote to payment. It provides:

- ✅ Complete load lifecycle management
- ✅ Intelligent carrier matching
- ✅ Shipper health and churn analysis
- ✅ Outreach campaign management
- ✅ Comprehensive KPI tracking
- ✅ AI-powered insights
- ✅ TMS and FMCSA integrations

The system is designed for scalability, with proper indexing, caching, and background job processing to handle high-volume operations efficiently.

