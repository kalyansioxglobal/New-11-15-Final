# Scheduled Jobs API Reference

This document provides curl command examples for triggering scheduled jobs and managing tasks.

## Job Endpoints (Admin Only)

All job endpoints require admin authentication.

### Quote Timeout Job

Transitions expired quotes from `SENT` to `NO_RESPONSE` status.

```bash
# Dry run - see how many quotes would be updated without making changes
curl -X POST http://localhost:5000/api/jobs/quote-timeout \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"ventureId": 1, "dryRun": true}'

# Apply changes with default limit (5000)
curl -X POST http://localhost:5000/api/jobs/quote-timeout \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"ventureId": 1, "dryRun": false}'

# Apply changes with custom limit
curl -X POST http://localhost:5000/api/jobs/quote-timeout \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"ventureId": 1, "dryRun": false, "limit": 1000}'
```

### Churn Recalculation Job

Recalculates churn risk scores for shippers and customers.

```bash
# Dry run - count records that would be updated
curl -X POST http://localhost:5000/api/jobs/churn-recalc \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"ventureId": 1, "dryRun": true}'

# Apply churn recalculation
curl -X POST http://localhost:5000/api/jobs/churn-recalc \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"ventureId": 1, "dryRun": false}'
```

### Task Generation Job

Generates follow-up tasks based on configurable rules.

```bash
# Dry run with all rules
curl -X POST http://localhost:5000/api/jobs/task-generation \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{
    "ventureId": 1,
    "dryRun": true,
    "rules": {
      "dormant": {
        "daysNoLoad": 21,
        "daysNoTouch": 7
      },
      "quoteExpiringHours": 24,
      "quoteNoResponseFollowup": true
    }
  }'

# Generate tasks
curl -X POST http://localhost:5000/api/jobs/task-generation \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{
    "ventureId": 1,
    "dryRun": false,
    "rules": {
      "dormant": {
        "daysNoLoad": 21,
        "daysNoTouch": 7
      },
      "quoteExpiringHours": 24,
      "quoteNoResponseFollowup": true
    }
  }'
```

#### Rule Options

| Rule | Description |
|------|-------------|
| `dormant.daysNoLoad` | Days without a load to consider customer dormant |
| `dormant.daysNoTouch` | Days without contact to trigger follow-up |
| `quoteExpiringHours` | Hours before quote expiry to create task |
| `quoteNoResponseFollowup` | Create tasks for NO_RESPONSE quotes |

## Task Management Endpoints

### List Tasks

```bash
# Get my open tasks
curl "http://localhost:5000/api/freight/tasks?ventureId=1&mineOnly=true&status=OPEN" \
  -H "Cookie: <session_cookie>"

# Get all tasks (admin)
curl "http://localhost:5000/api/freight/tasks?ventureId=1&mineOnly=false" \
  -H "Cookie: <session_cookie>"

# Filter by type
curl "http://localhost:5000/api/freight/tasks?ventureId=1&type=DORMANT_CUSTOMER_FOLLOWUP" \
  -H "Cookie: <session_cookie>"

# Pagination
curl "http://localhost:5000/api/freight/tasks?ventureId=1&limit=50&offset=0" \
  -H "Cookie: <session_cookie>"
```

### Update Task Status

```bash
# Mark task as in progress
curl -X PATCH http://localhost:5000/api/freight/tasks/123 \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"status": "IN_PROGRESS"}'

# Mark task as done
curl -X PATCH http://localhost:5000/api/freight/tasks/123 \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"status": "DONE"}'

# Cancel task
curl -X PATCH http://localhost:5000/api/freight/tasks/123 \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"status": "CANCELED"}'
```

## Task Types

| Type | Description |
|------|-------------|
| `QUOTE_FOLLOWUP` | Follow up on quotes with no response |
| `QUOTE_EXPIRING` | Quote expiring soon |
| `DORMANT_CUSTOMER_FOLLOWUP` | Customer has not been contacted recently |
| `CHURN_AT_RISK_FOLLOWUP` | Customer at risk of churning |
| `OTHER` | General tasks |

## Task Statuses

| Status | Description |
|--------|-------------|
| `OPEN` | Task is pending |
| `IN_PROGRESS` | Task is being worked on |
| `DONE` | Task completed |
| `CANCELED` | Task was canceled |

## Response Examples

### Job Response

```json
{
  "stats": {
    "scanned": 150,
    "updated": 45,
    "skippedNoExpiresAt": 0,
    "skippedAlreadyResolved": 0
  },
  "jobRunLogId": 123,
  "dryRun": false
}
```

### Task List Response

```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Follow up: Acme Corp (dormant)",
      "description": "Customer has not been contacted recently",
      "type": "DORMANT_CUSTOMER_FOLLOWUP",
      "status": "OPEN",
      "priority": "HIGH",
      "dueDate": "2025-12-14T00:00:00.000Z",
      "customer": { "id": 42, "name": "Acme Corp" }
    }
  ],
  "total": 25
}
```
