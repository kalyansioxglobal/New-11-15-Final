# Freight/Logistics Module - Entrypoints and Call Graph

## Phase 0: Wiring Map

### UI Entrypoints (Pages)

#### Freight Pages (`pages/freight/`)
| Page | Path | Purpose |
|------|------|---------|
| loads/index.tsx | /freight/loads | Load list view |
| loads/[id].tsx | /freight/loads/:id | Load detail view |
| loads/new.tsx | /freight/loads/new | Create new load |
| loads/[id]/find-carriers.tsx | /freight/loads/:id/find-carriers | Find carriers for load |
| quotes/[id].tsx | /freight/quotes/:id | Quote detail view |
| carriers/index.tsx | /freight/carriers | Carrier list |
| carriers/[id].tsx | /freight/carriers/:id | Carrier detail |
| carriers/new.tsx | /freight/carriers/new | Create new carrier |
| kpi.tsx | /freight/kpi | KPI dashboard |
| pnl.tsx | /freight/pnl | P&L report |
| lost.tsx | /freight/lost | Lost loads view |
| at-risk.tsx | /freight/at-risk | At-risk loads |
| lost-and-at-risk.tsx | /freight/lost-and-at-risk | Combined view |
| shipper-churn.tsx | /freight/shipper-churn | Shipper churn analysis |
| shipper-health/index.tsx | /freight/shipper-health | Shipper health dashboard |
| shipper-icp.tsx | /freight/shipper-icp | Shipper ICP analysis |
| coverage-war-room.tsx | /freight/coverage-war-room | Coverage war room |
| outreach-war-room.tsx | /freight/outreach-war-room | Outreach war room |
| dormant-customers.tsx | /freight/dormant-customers | Dormant customers |
| sales-kpi.tsx | /freight/sales-kpi | Sales KPIs |
| intelligence.tsx | /freight/intelligence | Freight intelligence |
| tasks.tsx | /freight/tasks | Freight tasks |
| ai-tools/index.tsx | /freight/ai-tools | AI tools hub |

#### Logistics Pages (`pages/logistics/`)
| Page | Path | Purpose |
|------|------|---------|
| dashboard.tsx | /logistics/dashboard | Main logistics dashboard |
| customers/index.tsx | /logistics/customers | Customer list |
| customers/[id].tsx | /logistics/customers/:id | Customer detail |
| shippers/index.tsx | /logistics/shippers | Shipper list |
| shippers/[id].tsx | /logistics/shippers/:id | Shipper detail |
| shippers/new.tsx | /logistics/shippers/new | Create shipper |
| loads/[id].tsx | /logistics/loads/:id | Load detail |
| missing-mappings.tsx | /logistics/missing-mappings | Missing mappings |
| customer-approval-request.tsx | /logistics/customer-approval-request | Approval requests |

### API Entrypoints

#### Quote APIs (`pages/api/freight/quotes/`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/freight/quotes/create | POST | Create new quote |
| /api/freight/quotes/[id] | GET | Get quote details |
| /api/freight/quotes/[id]/status | PATCH | Update quote status |
| /api/freight/quotes/[id]/convert-to-load | POST | Convert quote to load |

#### Load APIs (`pages/api/freight/loads/`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/freight/loads | GET | List loads |
| /api/freight/loads/list | GET | List loads (alt) |
| /api/freight/loads/create | POST | Create load |
| /api/freight/loads/update | PUT | Update load |
| /api/freight/loads/[id] | GET/PUT | Load detail/update |
| /api/freight/loads/[id]/matches | GET | Get carrier matches |
| /api/freight/loads/[id]/carrier-suggestions | GET | Get carrier suggestions |
| /api/freight/loads/[id]/notify-carriers | POST | Notify carriers |
| /api/freight/loads/[id]/outreach | GET | Get outreach history |
| /api/freight/loads/[id]/events | GET | Get load events |
| /api/freight/loads/[id]/run-lost-load-agent | POST | Run AI lost load agent |
| /api/freight/loads/mark-lost | POST | Mark load as lost |
| /api/freight/loads/mark-at-risk | POST | Mark load at-risk |
| /api/freight/loads/mark-felloff | POST | Mark load fell off |
| /api/freight/loads/reasons | GET | Get loss reasons |
| /api/freight/loads/events | GET | Get all load events |

#### Carrier APIs (`pages/api/freight/carriers/`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/freight/carriers | GET | List carriers |
| /api/freight/carriers/search | GET | Search carriers |
| /api/freight/carriers/match | GET | Match carriers to criteria |
| /api/freight/carriers/[carrierId] | GET/PUT | Carrier detail |
| /api/freight/carriers/[carrierId]/lanes | GET | Carrier lanes |
| /api/freight/carriers/[carrierId]/dispatchers | GET | Carrier dispatchers |
| /api/freight/carriers/[carrierId]/contact | POST | Create carrier contact |
| /api/freight/carriers/[carrierId]/preferred-lanes | GET/POST | Preferred lanes |

#### Outreach APIs (`pages/api/freight/outreach/`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/freight/outreach/preview | POST | Preview outreach message |
| /api/freight/outreach/send | POST | Send outreach |
| /api/freight/outreach/reply | POST | Reply to carrier |
| /api/freight/outreach/award | POST | Award load to carrier |
| /api/freight/outreach-war-room | GET | Outreach war room data |

#### Other Freight APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/freight/kpi/csr | GET | CSR KPIs |
| /api/freight/kpi/dispatch | GET | Dispatch KPIs |
| /api/freight/pnl | GET | P&L data |
| /api/freight/pnl/summary | GET | P&L summary |
| /api/freight/coverage-war-room | GET | Coverage data |
| /api/freight/coverage-stats | GET | Coverage stats |
| /api/freight/shipper-churn | GET | Shipper churn data |
| /api/freight/shipper-icp | GET | Shipper ICP data |
| /api/freight/dormant-customers | GET | Dormant customers |
| /api/freight/at-risk-loads | GET | At-risk loads |
| /api/freight/lost-loads | GET | Lost loads |
| /api/freight/lost-postmortem | GET | Lost postmortem |
| /api/freight/intelligence | GET | Freight intelligence |
| /api/freight/meta | GET | Freight metadata |
| /api/freight/city-suggestions | GET | City suggestions |
| /api/freight/zip-lookup | GET | ZIP lookup |

#### Logistics APIs (`pages/api/logistics/`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/logistics/dashboard | GET | Dashboard data |
| /api/logistics/customers | GET | Customer list |
| /api/logistics/customers/[id] | GET/PUT | Customer detail |
| /api/logistics/customers/[id]/touches | GET/POST | Customer touches |
| /api/logistics/shippers | GET | Shipper list |
| /api/logistics/shippers/[id] | GET/PUT | Shipper detail |
| /api/logistics/loads/[id] | GET | Load detail |
| /api/logistics/loads/[id]/match-carriers | GET | Match carriers |
| /api/logistics/loads/[id]/events | GET | Load events |
| /api/logistics/carriers | GET | Carrier list |
| /api/logistics/loss-insights | GET | Loss insights |
| /api/logistics/missing-mappings | GET | Missing mappings |
| /api/logistics/customer-approvals | GET/POST | Customer approvals |
| /api/logistics/fmcsa-carrier-lookup | GET | FMCSA lookup |

### Core Library Modules (`lib/`)

| Module | Purpose |
|--------|---------|
| lib/freight/carrierSearch.ts | Carrier search and matching algorithm |
| lib/freight/loadReference.ts | Load reference utilities |
| lib/freight/customerDedupe.ts | Customer deduplication |
| lib/freight-intelligence/carrierLaneAffinity.ts | Lane affinity scoring |
| lib/freight-intelligence/carrierAvailabilityScore.ts | Availability scoring |
| lib/ai/freightLostLoadAgent.ts | AI lost load analysis |
| lib/ai/freightOpsAssistant.ts | AI ops assistant |
| lib/ai/freightCarrierOutreachAssistant.ts | AI carrier outreach |
| lib/ai/freightCeoEodAssistant.ts | AI CEO EOD draft |
| lib/ai/freightOpsDiagnosticsAssistant.ts | AI ops diagnostics |
| lib/ai/freightSummaryAssistant.ts | AI freight summary |
| lib/logisticsLostReasons.ts | Lost reason definitions |

### Key Prisma Models

| Model | Purpose |
|-------|---------|
| Load | Core freight load entity |
| FreightQuote | Quote before conversion to load |
| Carrier | Carrier company info |
| CarrierDispatcher | Dispatcher contacts |
| CarrierPreferredLane | Carrier lane preferences |
| CarrierVentureStats | Carrier performance stats |
| Customer | Customer/shipper company |
| Shipper | Shipper location |
| ShipperPreferredLane | Shipper lane preferences |
| CustomerTouch | Customer interaction log |
| CustomerApproval | Customer approval records |
| OutreachMessage | Carrier outreach messages |
| OutreachConversation | Outreach conversations |
| OutreachReply | Carrier replies |
| LogisticsLoadEvent | Load event log |

## Major Business Flows Identified

### 1. Quote → Load Creation Flow
1. UI: Create quote form → POST /api/freight/quotes/create
2. Quote status updates → PATCH /api/freight/quotes/[id]/status
3. Quote conversion → POST /api/freight/quotes/[id]/convert-to-load
4. Load created with event logged

### 2. Load Status Lifecycle Flow
- OPEN → WORKING → AT_RISK → COVERED/LOST/FELL_OFF/DORMANT/DELIVERED
- Status transitions via load update APIs
- Events logged to LogisticsLoadEvent

### 3. Carrier Matching Flow
1. UI: Load detail → Find carriers button
2. GET /api/freight/loads/[id]/carrier-suggestions
3. Calls lib/freight/carrierSearch.ts → searchCarriersForLoad()
4. Returns scored/categorized carriers

### 4. Carrier Notification/Outreach Flow
1. Select carriers from matches
2. POST /api/freight/loads/[id]/notify-carriers OR /api/freight/outreach/send
3. Messages sent via email/SMS (SendGrid/Twilio)
4. OutreachMessage + OutreachConversation created
5. Replies tracked in OutreachReply
6. Award via POST /api/freight/outreach/award

### 5. Lost/At-Risk Load Flow
1. Load marked at-risk via API
2. AI analysis via /api/freight/loads/[id]/run-lost-load-agent
3. Load marked lost with reason
4. Churn analysis updated
