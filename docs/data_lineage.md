# Freight/Logistics Data Lineage Matrix

## Overview
This document maps the data flow and relationships between core entities in the freight/logistics module.

## Core Entity Relationships

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │────>│    Shipper   │────>│ FreightQuote │
│              │     │ (Location)   │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                                 │ convert-to-load
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Carrier    │<────│     Load     │<────│ LogisticsLoad│
│              │     │              │     │    Event     │
└──────────────┘     └──────┬───────┘     └──────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  Outreach    │     │  Outreach    │
│  Message     │────>│ Conversation │
└──────────────┘     └──────────────┘
```

## Entity Lineage Details

### 1. Customer → Load Journey

| Source | Transformation | Target | API Endpoint |
|--------|----------------|--------|--------------|
| Customer (input) | customerDedupe.findDuplicateCustomers() | Customer (created/matched) | POST /api/freight/quotes/create |
| Customer | getOrCreateDefaultLocation() | LogisticsShipper | POST /api/freight/quotes/create |
| Customer + Shipper | Create quote | FreightQuote | POST /api/freight/quotes/create |
| FreightQuote (ACCEPTED) | convert-to-load | Load | POST /api/freight/quotes/[id]/convert-to-load |
| FreightQuote | Update loadId | FreightQuote.loadId → Load | POST /api/freight/quotes/[id]/convert-to-load |

### 2. Load Status Transitions

| From Status | To Status | Trigger API | Side Effects |
|-------------|-----------|-------------|--------------|
| OPEN | WORKING | PUT /api/freight/loads/[id] | LogisticsLoadEvent(STATUS_CHANGED) |
| QUOTED | WORKING | PUT /api/freight/loads/[id] | LogisticsLoadEvent(STATUS_CHANGED) |
| WORKING | AT_RISK | POST /api/freight/loads/mark-at-risk | atRiskFlag=true, LogisticsLoadEvent |
| WORKING | COVERED | POST /api/freight/outreach/award | carrierId set, OutreachAttribution |
| AT_RISK | COVERED | POST /api/freight/outreach/award | carrierId set, OutreachAttribution |
| AT_RISK | LOST | POST /api/freight/loads/mark-lost | lostAt, lostReasonId, LogisticsLoadEvent(LOST_CONFIRMED) |
| WORKING | LOST | POST /api/freight/loads/mark-lost | lostAt, lostReasonId, LogisticsLoadEvent(LOST_CONFIRMED) |
| COVERED | FELL_OFF | POST /api/freight/loads/mark-felloff | fellOffAt, LogisticsLoadEvent |
| COVERED | DELIVERED | PUT /api/freight/loads/[id] | actualDeliveryAt |

### 3. Carrier Matching Data Flow

| Input Data | Processing | Output |
|------------|------------|--------|
| Load.pickupZip, dropZip | zip3() extraction | 3-digit ZIP prefix |
| Load history by carrierId | getCarrierLaneHistory() | laneRunCount, onTimeRate |
| Carrier.equipmentTypes | calculateEquipmentScore() | equipmentMatchPercent (0-100) |
| Carrier.serviceAreas | calculateServiceAreaScore() | serviceAreaMatchPercent (0-100) |
| Carrier.city, state, postalCode | calculateOriginProximityScore() | originProximityPercent (0-100) |
| Carrier profile fields | calculateProfileScore() | profileCompletenessPercent (0-100) |
| All scores | Weighted sum | totalScore |
| hasLaneHistory OR isNearOrigin | Filter | recommendedCarriers[] |
| !hasLaneHistory AND !isNearOrigin | Filter | newCarriers[] |

### 4. Outreach Data Flow

| Step | Input | Created/Updated | External |
|------|-------|-----------------|----------|
| Send | Load, Carriers, Message | OutreachMessage, OutreachRecipient[] | SendGrid/Twilio |
| Delivery | Provider callback | OutreachRecipient.status | - |
| Reply | Carrier response | OutreachConversation, OutreachReply | Webhook |
| Award | OutreachConversation | Load.carrierId, Load.loadStatus=COVERED, OutreachAttribution | - |

### 5. Lost/At-Risk Data Flow

| Trigger | Updates | Events Logged |
|---------|---------|---------------|
| mark-at-risk | Load.atRiskFlag=true, Load.loadStatus=AT_RISK | LogisticsLoadEvent(STATUS_CHANGED) |
| run-lost-load-agent | - (analysis only) | - |
| mark-lost | Load.loadStatus=LOST, Load.lostAt, Load.lostReasonId | LogisticsLoadEvent(LOST_CONFIRMED) |

## Key Foreign Key Relationships

### Load Model
```
Load
├── ventureId → Venture.id
├── officeId → Office.id
├── customerId → Customer.id
├── shipperId → LogisticsShipper.id
├── carrierId → Carrier.id
├── lostReasonId → LostLoadReason.id
├── createdById → User.id
├── salesAgentAliasId → StaffAlias.id
├── csrAliasId → StaffAlias.id
└── dispatcherAliasId → StaffAlias.id
```

### FreightQuote Model
```
FreightQuote
├── ventureId → Venture.id
├── customerId → Customer.id
├── shipperId → LogisticsShipper.id
├── salespersonUserId → User.id
└── loadId → Load.id (nullable, set on conversion)
```

### Outreach Models
```
OutreachMessage
├── ventureId → Venture.id
├── loadId → Load.id
└── createdById → User.id

OutreachRecipient
├── messageId → OutreachMessage.id
└── carrierId → Carrier.id

OutreachConversation
├── ventureId → Venture.id
├── loadId → Load.id
└── carrierId → Carrier.id

OutreachAttribution
├── ventureId → Venture.id
├── loadId → Load.id (unique)
└── carrierId → Carrier.id
```

## Data Validation Rules

### FreightQuote Conversion
- **Prerequisite**: quote.status must be ACCEPTED or BOOKED
- **Creates**: Load with status='QUOTED'
- **Updates**: FreightQuote.loadId, FreightQuote.status='BOOKED', FreightQuote.bookedAt

### Outreach Award
- **Prerequisite**: Load.loadStatus != 'COVERED', Load.carrierId == null
- **Updates**: Load.carrierId, Load.loadStatus='COVERED'
- **Creates/Updates**: OutreachAttribution with timeToCoverageMinutes

### Mark Lost
- **Optional**: lostReasonId (validated against LostLoadReason)
- **Updates**: Load.loadStatus='LOST', Load.lostAt, Load.lostReasonId
- **Creates**: LogisticsLoadEvent(LOST_CONFIRMED)

## Audit Trail

All major operations create audit logs via `logAuditEvent()`:
- Domain: `freight`
- Actions: `OUTREACH_SEND`, `OUTREACH_AWARD`, etc.
- EntityType: `outreachMessage`, `load`, etc.

Load events are tracked via `logLoadEvent()` → `LogisticsLoadEvent` table.
