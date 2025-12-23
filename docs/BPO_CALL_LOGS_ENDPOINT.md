# BPO Call Logs API Endpoint

**Status:** ✅ **COMPLETED**

---

## Endpoint Created

**File:** `pages/api/bpo/call-logs/index.ts`

**Methods:**
- `POST /api/bpo/call-logs` - Create a new call log
- `GET /api/bpo/call-logs` - List call logs (with filters)

---

## POST /api/bpo/call-logs

### Request Body

```typescript
{
  agentId: number;           // Required
  ventureId: number;          // Required
  officeId?: number;          // Optional
  campaignId?: number;        // Optional
  callStartedAt: string;      // Required (ISO date string)
  callEndedAt?: string;       // Optional (ISO date string) - triggers gamification if present
  dialCount?: number;         // Optional (default: 1)
  isConnected?: boolean;      // Optional (default: false)
  appointmentSet?: boolean;   // Optional (default: false)
  dealWon?: boolean;         // Optional (default: false)
  revenue?: number;          // Optional (default: 0)
  notes?: string;            // Optional
  isTest?: boolean;          // Optional (default: false)
}
```

### Response

```typescript
{
  success: true;
  callLog: {
    id: number;
    agentId: number;
    ventureId: number;
    // ... other fields
    agent: {
      id: number;
      userId: number;
    };
    campaign: {
      id: number;
      name: string;
    } | null;
  };
}
```

### Gamification Trigger

When a call log is created with `callEndedAt` (completed call), the system automatically:
- Awards 3 gamification points to the agent
- Uses idempotency key: `bpo_call_{callLogId}_completed`
- Logs the event for audit purposes

### Validation

- `agentId`, `ventureId`, and `callStartedAt` are required
- User must have access to the venture
- Agent must exist and belong to the venture
- `callEndedAt` must be after `callStartedAt` (if provided)

### Access Control

- Requires authentication (`requireUser`)
- Enforces venture scoping via `getUserScope()`
- Verifies agent belongs to venture

---

## GET /api/bpo/call-logs

### Query Parameters

```typescript
{
  agentId?: number;          // Filter by agent
  ventureId?: number;         // Filter by venture
  officeId?: number;          // Filter by office
  campaignId?: number;        // Filter by campaign
  from?: string;             // Date range start (ISO date)
  to?: string;               // Date range end (ISO date)
  isConnected?: boolean;     // Filter by connection status
  dealWon?: boolean;         // Filter by deal status
  limit?: number;            // Page size (default: 50, max: 200)
  cursor?: number;           // Cursor for pagination
  page?: number;             // Page number (for offset pagination)
}
```

### Response (Cursor Pagination)

```typescript
{
  items: BpoCallLog[];
  hasMore: boolean;
  nextCursor: number | null;
  limit: number;
}
```

### Response (Offset Pagination)

```typescript
{
  items: BpoCallLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### Access Control

- Requires authentication
- Enforces venture scoping
- Returns only call logs from ventures user has access to

---

## Gamification Integration

**Event Type:** `BPO_CALL_COMPLETED`  
**Points:** 3 (default)  
**Trigger:** When `callEndedAt` is set during call log creation  
**Idempotency Key:** `bpo_call_{callLogId}_completed`

The trigger is automatically fired when:
1. Call log is created via POST endpoint
2. `callEndedAt` field is provided (indicating call completion)
3. Points are awarded to the agent's user account

---

## Audit Logging

All call log creations are logged to the audit system:
- **Action:** `BPO_CALL_LOG_CREATED`
- **Domain:** `bpo`
- **Entity Type:** `bpoCallLog`
- **Metadata:** Includes agentId, ventureId, campaignId, isConnected, dealWon

---

## Example Usage

### Create a completed call log

```bash
POST /api/bpo/call-logs
Content-Type: application/json

{
  "agentId": 123,
  "ventureId": 1,
  "campaignId": 456,
  "callStartedAt": "2025-12-15T10:00:00Z",
  "callEndedAt": "2025-12-15T10:15:00Z",
  "isConnected": true,
  "appointmentSet": true,
  "dealWon": false,
  "revenue": 0
}
```

**Result:**
- Call log created
- 3 gamification points awarded to agent
- Audit log entry created

---

## Status

✅ **COMPLETE** - Endpoint created and gamification trigger implemented


