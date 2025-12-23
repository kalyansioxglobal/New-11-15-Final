# API Route Inventory

**Last Updated:** Generated from filesystem scan  
**Total Routes:** See below  
**Source:** `pages/api/**/*.ts` files only

This document is the **single source of truth** for all API routes in the system. Only routes backed by real filesystem files are included.

---

## Legend

- **Method**: HTTP method(s) supported (GET, POST, PUT, PATCH, DELETE)
- **Route**: Exact route path (with dynamic segments like `[id]`)
- **File Path**: Relative path from repository root
- **Auth Required**: `yes` = requires authentication, `no` = public endpoint

---

## Public Routes (No Auth Required)

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, POST | `/api/auth/[...nextauth]` | `pages/api/auth/[...nextauth].ts` | no |
| POST | `/api/auth/send-otp` | `pages/api/auth/send-otp.ts` | no |
| POST | `/api/auth/verify-otp` | `pages/api/auth/verify-otp.ts` | no |
| POST | `/api/auth/logout` | `pages/api/auth/logout.ts` | no |
| GET | `/api/health` | `pages/api/health.ts` | no |
| GET | `/api/status` | `pages/api/status.ts` | no |
| GET | `/api/hello` | `pages/api/hello.ts` | no |
| POST | `/api/webhooks/twilio/inbound` | `pages/api/webhooks/twilio/inbound.ts` | no |
| POST | `/api/webhooks/sendgrid/inbound` | `pages/api/webhooks/sendgrid/inbound.ts` | no |
| POST | `/api/webhooks/dispatch/twilio-sms` | `pages/api/webhooks/dispatch/twilio-sms.ts` | no |
| POST | `/api/webhooks/dispatch/sendgrid-email` | `pages/api/webhooks/dispatch/sendgrid-email.ts` | no |

---

## Admin Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/admin/activity-log` | `pages/api/admin/activity-log.ts` | yes |
| GET, POST | `/api/admin/ai-templates` | `pages/api/admin/ai-templates/index.ts` | yes |
| GET, PUT, DELETE | `/api/admin/ai-templates/[id]` | `pages/api/admin/ai-templates/[id].ts` | yes |
| GET | `/api/admin/ai-usage` | `pages/api/admin/ai-usage.ts` | yes |
| GET | `/api/admin/audit/latest` | `pages/api/admin/audit/latest.ts` | yes |
| GET | `/api/admin/audit/run` | `pages/api/admin/audit/run.ts` | yes |
| GET | `/api/admin/audit-logs` | `pages/api/admin/audit-logs.ts` | yes |
| POST | `/api/admin/auto-seed-test-data` | `pages/api/admin/auto-seed-test-data.ts` | yes |
| GET | `/api/admin/cleanup-test-data` | `pages/api/admin/cleanup-test-data.ts` | yes |
| GET, POST | `/api/admin/clear-test-data` | `pages/api/admin/clear-test-data.ts` | yes |
| GET | `/api/admin/freight/fmcsa-status` | `pages/api/admin/freight/fmcsa-status.ts` | yes |
| GET | `/api/admin/freight/fmcsa-sync` | `pages/api/admin/freight/fmcsa-sync.ts` | yes |
| POST | `/api/admin/integrations/ringcentral/kpi-sync` | `pages/api/admin/integrations/ringcentral/kpi-sync.ts` | yes |
| GET | `/api/admin/job-roles` | `pages/api/admin/job-roles.ts` | yes |
| GET | `/api/admin/jobs/logs` | `pages/api/admin/jobs/logs.ts` | yes |
| GET, POST | `/api/admin/offices` | `pages/api/admin/offices/index.ts` | yes |
| GET, PUT, DELETE | `/api/admin/offices/[id]` | `pages/api/admin/offices/[id].ts` | yes |
| GET | `/api/admin/permissions/get` | `pages/api/admin/permissions/get.ts` | yes |
| PUT | `/api/admin/permissions/update` | `pages/api/admin/permissions/update.ts` | yes |
| GET | `/api/admin/permissions/ventures/[ventureId]` | `pages/api/admin/permissions/ventures/[ventureId].ts` | yes |
| GET, POST | `/api/admin/policies` | `pages/api/admin/policies.ts` | yes |
| GET | `/api/admin/quarantine` | `pages/api/admin/quarantine/index.ts` | yes |
| GET | `/api/admin/quarantine/[id]` | `pages/api/admin/quarantine/[id]/index.ts` | yes |
| POST | `/api/admin/quarantine/[id]/resolve` | `pages/api/admin/quarantine/[id]/resolve.ts` | yes |
| POST | `/api/admin/seed-test-users` | `pages/api/admin/seed-test-users.ts` | yes |
| GET | `/api/admin/system-check/data-integrity` | `pages/api/admin/system-check/data-integrity.ts` | yes |
| GET | `/api/admin/system-check/integrations` | `pages/api/admin/system-check/integrations.ts` | yes |
| GET | `/api/admin/system-check/overview` | `pages/api/admin/system-check/overview.ts` | yes |
| GET | `/api/admin/system-check/security` | `pages/api/admin/system-check/security.ts` | yes |
| GET, POST | `/api/admin/tasks` | `pages/api/admin/tasks.ts` | yes |
| GET, POST | `/api/admin/users` | `pages/api/admin/users/index.ts` | yes |
| GET, PUT, DELETE | `/api/admin/users/[id]` | `pages/api/admin/users/[id].ts` | yes |
| PUT | `/api/admin/users/[id]/update` | `pages/api/admin/users/[id]/update.ts` | yes |
| POST | `/api/admin/users/create` | `pages/api/admin/users/create.ts` | yes |
| PUT | `/api/admin/users/setOffices` | `pages/api/admin/users/setOffices.ts` | yes |
| PUT | `/api/admin/users/setRole` | `pages/api/admin/users/setRole.ts` | yes |
| PUT | `/api/admin/users/setVentures` | `pages/api/admin/users/setVentures.ts` | yes |
| PUT | `/api/admin/users/update` | `pages/api/admin/users/update.ts` | yes |
| GET, POST | `/api/admin/ventures` | `pages/api/admin/ventures.ts` | yes |

---

## AI Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/ai/bpo-client-draft` | `pages/api/ai/bpo-client-draft.ts` | yes |
| POST | `/api/ai/freight-carrier-draft` | `pages/api/ai/freight-carrier-draft.ts` | yes |
| POST | `/api/ai/freight-eod-draft` | `pages/api/ai/freight-eod-draft.ts` | yes |
| POST | `/api/ai/freight-ops-diagnostics` | `pages/api/ai/freight-ops-diagnostics.ts` | yes |
| POST | `/api/ai/freight-summary` | `pages/api/ai/freight-summary.ts` | yes |
| POST | `/api/ai/hotel-outreach-draft` | `pages/api/ai/hotel-outreach-draft.ts` | yes |
| POST | `/api/ai/templates/create` | `pages/api/ai/templates/create.ts` | yes |
| DELETE | `/api/ai/templates/delete` | `pages/api/ai/templates/delete.ts` | yes |
| GET | `/api/ai/templates/list` | `pages/api/ai/templates/list.ts` | yes |
| PUT | `/api/ai/templates/update` | `pages/api/ai/templates/update.ts` | yes |

---

## Analytics Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/analytics/series` | `pages/api/analytics/series.ts` | yes |

---

## Attendance Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, POST | `/api/attendance` | `pages/api/attendance/index.ts` | yes |
| GET | `/api/attendance/my` | `pages/api/attendance/my.ts` | yes |
| GET | `/api/attendance/stats` | `pages/api/attendance/stats.ts` | yes |
| GET | `/api/attendance/team` | `pages/api/attendance/team.ts` | yes |

---

## Auth Routes (Additional)

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/auth/impersonate` | `pages/api/auth/impersonate.ts` | yes |
| POST | `/api/auth/stop-impersonate` | `pages/api/auth/stop-impersonate.ts` | yes |

---

## Bank Account Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT, DELETE | `/api/bank-accounts/[id]` | `pages/api/bank-accounts/[id].ts` | yes |
| GET, POST | `/api/bank-accounts` | `pages/api/bank-accounts/index.ts` | yes |

---

## Bank Snapshot Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/bank-snapshots` | `pages/api/bank-snapshots/index.ts` | yes |

---

## BPO Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/bpo/agent-kpi` | `pages/api/bpo/agent-kpi.ts` | yes |
| GET | `/api/bpo/agents` | `pages/api/bpo/agents/index.ts` | yes |
| GET, PUT, DELETE | `/api/bpo/campaigns/[id]` | `pages/api/bpo/campaigns/[id].ts` | yes |
| GET | `/api/bpo/campaigns/[id]/metrics` | `pages/api/bpo/campaigns/[id]/metrics.ts` | yes |
| GET, POST | `/api/bpo/campaigns` | `pages/api/bpo/campaigns/index.ts` | yes |
| GET | `/api/bpo/dashboard` | `pages/api/bpo/dashboard.ts` | yes |
| GET, POST | `/api/bpo/kpi` | `pages/api/bpo/kpi/index.ts` | yes |
| POST | `/api/bpo/kpi/upsert` | `pages/api/bpo/kpi/upsert.ts` | yes |
| GET | `/api/bpo/realtime-stats` | `pages/api/bpo/realtime-stats.ts` | yes |

---

## Briefing Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/briefing` | `pages/api/briefing.ts` | yes |

---

## Carrier Portal Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/carrier-portal/available-loads` | `pages/api/carrier-portal/available-loads.ts` | yes |

---

## Carrier Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/carriers/[id]/fmcsa-refresh` | `pages/api/carriers/[id]/fmcsa-refresh.ts` | yes |
| POST | `/api/carriers/dispatchers/add` | `pages/api/carriers/dispatchers/add.ts` | yes |
| GET | `/api/carriers/dispatchers/list` | `pages/api/carriers/dispatchers/list.ts` | yes |
| POST | `/api/carriers/dispatchers/remove` | `pages/api/carriers/dispatchers/remove.ts` | yes |

---

## Dashboard Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/dashboard/parent` | `pages/api/dashboard/parent.ts` | yes |
| GET | `/api/dashboard/stats` | `pages/api/dashboard/stats.ts` | yes |

---

## Dispatch Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, POST | `/api/dispatch/conversations` | `pages/api/dispatch/conversations.ts` | yes |
| GET, PUT, DELETE | `/api/dispatch/conversations/[id]` | `pages/api/dispatch/conversations/[id].ts` | yes |
| POST | `/api/dispatch/conversations/[id]/claim` | `pages/api/dispatch/conversations/[id]/claim.ts` | yes |
| POST | `/api/dispatch/conversations/[id]/release` | `pages/api/dispatch/conversations/[id]/release.ts` | yes |
| GET, POST | `/api/dispatch/drivers` | `pages/api/dispatch/drivers.ts` | yes |
| GET, PUT, DELETE | `/api/dispatch/drivers/[id]` | `pages/api/dispatch/drivers/[id].ts` | yes |
| GET | `/api/dispatch/email-connections` | `pages/api/dispatch/email-connections/index.ts` | yes |
| GET | `/api/dispatch/email-connections/gmail/auth` | `pages/api/dispatch/email-connections/gmail/auth.ts` | yes |
| GET | `/api/dispatch/email-connections/gmail/callback` | `pages/api/dispatch/email-connections/gmail/callback.ts` | yes |
| POST | `/api/dispatch/email-connections/gmail/sync` | `pages/api/dispatch/email-connections/gmail/sync.ts` | yes |
| GET | `/api/dispatch/loads` | `pages/api/dispatch/loads.ts` | yes |
| POST | `/api/dispatch/messages/send` | `pages/api/dispatch/messages/send.ts` | yes |
| GET | `/api/dispatch/notifications/stream` | `pages/api/dispatch/notifications/stream.ts` | yes |
| GET, POST | `/api/dispatch/settlements` | `pages/api/dispatch/settlements.ts` | yes |
| GET, PUT, DELETE | `/api/dispatch/settlements/[id]` | `pages/api/dispatch/settlements/[id].ts` | yes |

---

## Employee KPI Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/employee-kpi/daily` | `pages/api/employee-kpi/daily.ts` | yes |

---

## EOD Reports Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT | `/api/eod-reports/[id]` | `pages/api/eod-reports/[id].ts` | yes |
| GET, POST | `/api/eod-reports` | `pages/api/eod-reports/index.ts` | yes |
| GET | `/api/eod-reports/missed-check` | `pages/api/eod-reports/missed-check.ts` | yes |
| POST | `/api/eod-reports/missed-explanation` | `pages/api/eod-reports/missed-explanation.ts` | yes |
| GET | `/api/eod-reports/my-status` | `pages/api/eod-reports/my-status.ts` | yes |
| POST | `/api/eod-reports/notify-manager` | `pages/api/eod-reports/notify-manager.ts` | yes |
| GET | `/api/eod-reports/team` | `pages/api/eod-reports/team.ts` | yes |

---

## Feedback Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/feedback/submit` | `pages/api/feedback/submit.ts` | yes |

---

## File Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, DELETE | `/api/files/[id]` | `pages/api/files/[id].ts` | yes |
| GET | `/api/files/[id]/url` | `pages/api/files/[id]/url.ts` | yes |
| GET | `/api/files` | `pages/api/files/index.ts` | yes |
| POST | `/api/files/upload` | `pages/api/files/upload.ts` | yes |

---

## Freight Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/freight/at-risk-loads` | `pages/api/freight/at-risk-loads.ts` | yes |
| GET, PUT, DELETE | `/api/freight/carriers/[carrierId]` | `pages/api/freight/carriers/[carrierId].ts` | yes |
| POST | `/api/freight/carriers/[carrierId]/contact` | `pages/api/freight/carriers/[carrierId]/contact.ts` | yes |
| GET | `/api/freight/carriers/[carrierId]/dispatchers` | `pages/api/freight/carriers/[carrierId]/dispatchers.ts` | yes |
| GET | `/api/freight/carriers/[carrierId]/lanes` | `pages/api/freight/carriers/[carrierId]/lanes.ts` | yes |
| GET, POST | `/api/freight/carriers/[carrierId]/preferred-lanes` | `pages/api/freight/carriers/[carrierId]/preferred-lanes/index.ts` | yes |
| GET, PUT, DELETE | `/api/freight/carriers/[carrierId]/preferred-lanes/[laneId]` | `pages/api/freight/carriers/[carrierId]/preferred-lanes/[laneId].ts` | yes |
| GET | `/api/freight/carriers/dispatchers` | `pages/api/freight/carriers/dispatchers.ts` | yes |
| GET | `/api/freight/carriers` | `pages/api/freight/carriers/index.ts` | yes |
| POST | `/api/freight/carriers/match` | `pages/api/freight/carriers/match.ts` | yes |
| POST | `/api/freight/carriers/search` | `pages/api/freight/carriers/search.ts` | yes |
| POST | `/api/freight/carrier-search` | `pages/api/freight/carrier-search.ts` | yes |
| GET | `/api/freight/city-suggestions` | `pages/api/freight/city-suggestions.ts` | yes |
| GET | `/api/freight/coverage-stats` | `pages/api/freight/coverage-stats.ts` | yes |
| GET | `/api/freight/coverage-war-room` | `pages/api/freight/coverage-war-room.ts` | yes |
| GET | `/api/freight/dormant-customers` | `pages/api/freight/dormant-customers.ts` | yes |
| GET | `/api/freight/intelligence` | `pages/api/freight/intelligence.ts` | yes |
| GET | `/api/freight/kpi/csr` | `pages/api/freight/kpi/csr.ts` | yes |
| GET | `/api/freight/kpi/dispatch` | `pages/api/freight/kpi/dispatch.ts` | yes |
| GET, PUT | `/api/freight/loads/[id]` | `pages/api/freight/loads/[id].ts` | yes |
| GET | `/api/freight/loads/[id]/carrier-suggestions` | `pages/api/freight/loads/[id]/carrier-suggestions.ts` | yes |
| GET | `/api/freight/loads/[id]/matches` | `pages/api/freight/loads/[id]/matches.ts` | yes |
| POST | `/api/freight/loads/[id]/notify-carriers` | `pages/api/freight/loads/[id]/notify-carriers.ts` | yes |
| GET | `/api/freight/loads/[id]/outreach` | `pages/api/freight/loads/[id]/outreach.ts` | yes |
| POST | `/api/freight/loads/[id]/run-lost-load-agent` | `pages/api/freight/loads/[id]/run-lost-load-agent.ts` | yes |
| POST | `/api/freight/loads/create` | `pages/api/freight/loads/create.ts` | yes |
| GET | `/api/freight/loads/events` | `pages/api/freight/loads/events.ts` | yes |
| GET, POST | `/api/freight/loads` | `pages/api/freight/loads/index.ts` | yes |
| GET | `/api/freight/loads/list` | `pages/api/freight/loads/list.ts` | yes |
| POST | `/api/freight/loads/mark-at-risk` | `pages/api/freight/loads/mark-at-risk.ts` | yes |
| POST | `/api/freight/loads/mark-felloff` | `pages/api/freight/loads/mark-felloff.ts` | yes |
| POST | `/api/freight/loads/mark-lost` | `pages/api/freight/loads/mark-lost.ts` | yes |
| GET | `/api/freight/loads/reasons` | `pages/api/freight/loads/reasons.ts` | yes |
| PUT | `/api/freight/loads/update` | `pages/api/freight/loads/update.ts` | yes |
| GET | `/api/freight/lost-loads` | `pages/api/freight/lost-loads.ts` | yes |
| GET | `/api/freight/lost-postmortem` | `pages/api/freight/lost-postmortem.ts` | yes |
| GET | `/api/freight/low-margin-radar` | `pages/api/freight/low-margin-radar.ts` | yes |
| GET | `/api/freight/meta` | `pages/api/freight/meta.ts` | yes |
| POST | `/api/freight/outreach/award` | `pages/api/freight/outreach/award.ts` | yes |
| POST | `/api/freight/outreach/preview` | `pages/api/freight/outreach/preview.ts` | yes |
| POST | `/api/freight/outreach/reply` | `pages/api/freight/outreach/reply.ts` | yes |
| POST | `/api/freight/outreach/send` | `pages/api/freight/outreach/send.ts` | yes |
| GET | `/api/freight/outreach-war-room` | `pages/api/freight/outreach-war-room.ts` | yes |
| GET | `/api/freight/pnl` | `pages/api/freight/pnl.ts` | yes |
| GET | `/api/freight/pnl/summary` | `pages/api/freight/pnl/summary.ts` | yes |
| GET, PATCH | `/api/freight/quotes/[id]` | `pages/api/freight/quotes/[id]/index.ts` | yes |
| POST | `/api/freight/quotes/[id]/convert-to-load` | `pages/api/freight/quotes/[id]/convert-to-load.ts` | yes |
| PATCH | `/api/freight/quotes/[id]/status` | `pages/api/freight/quotes/[id]/status.ts` | yes |
| POST | `/api/freight/quotes/create` | `pages/api/freight/quotes/create.ts` | yes |
| POST | `/api/freight/shipper-churn/backfill` | `pages/api/freight/shipper-churn/backfill.ts` | yes |
| GET | `/api/freight/shipper-churn` | `pages/api/freight/shipper-churn/index.ts` | yes |
| GET | `/api/freight/shipper-icp` | `pages/api/freight/shipper-icp/index.ts` | yes |
| GET, POST | `/api/freight/shippers/[shipperId]/preferred-lanes` | `pages/api/freight/shippers/[shipperId]/preferred-lanes/index.ts` | yes |
| GET, PUT, DELETE | `/api/freight/shippers/[shipperId]/preferred-lanes/[laneId]` | `pages/api/freight/shippers/[shipperId]/preferred-lanes/[laneId].ts` | yes |
| GET, PUT, DELETE | `/api/freight/tasks/[id]` | `pages/api/freight/tasks/[id].ts` | yes |
| GET, POST | `/api/freight/tasks` | `pages/api/freight/tasks/index.ts` | yes |
| GET | `/api/freight/zip-lookup` | `pages/api/freight/zip-lookup.ts` | yes |

---

## Freight KPI Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/freight-kpi/bulk-upsert` | `pages/api/freight-kpi/bulk-upsert.ts` | yes |
| GET | `/api/freight-kpi` | `pages/api/freight-kpi/index.ts` | yes |
| GET | `/api/freight-kpi/quotes` | `pages/api/freight-kpi/quotes.ts` | yes |
| GET | `/api/freight-kpi/sales` | `pages/api/freight-kpi/sales.ts` | yes |
| GET | `/api/freight-kpi/sales-cost` | `pages/api/freight-kpi/sales-cost.ts` | yes |
| POST | `/api/freight-kpi/upsert` | `pages/api/freight-kpi/upsert.ts` | yes |

---

## Gamification Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, POST, PUT | `/api/gamification/config` | `pages/api/gamification/config.ts` | yes |
| GET | `/api/gamification/leaderboard` | `pages/api/gamification/leaderboard.ts` | yes |
| GET, POST | `/api/gamification/points` | `pages/api/gamification/points.ts` | yes |

---

## Holdings Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT, DELETE | `/api/holdings/assets/[id]` | `pages/api/holdings/assets/[id].ts` | yes |
| GET | `/api/holdings/assets/[id]/documents` | `pages/api/holdings/assets/[id]/documents.ts` | yes |
| GET, POST | `/api/holdings/assets` | `pages/api/holdings/assets/index.ts` | yes |
| GET | `/api/holdings/bank` | `pages/api/holdings/bank/index.ts` | yes |
| GET | `/api/holdings/kpi` | `pages/api/holdings/kpi/index.ts` | yes |

---

## Hospitality Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/hospitality/dashboard` | `pages/api/hospitality/dashboard.ts` | yes |
| GET | `/api/hospitality/high-loss` | `pages/api/hospitality/high-loss.ts` | yes |
| GET, PUT | `/api/hospitality/hotels/[id]` | `pages/api/hospitality/hotels/[id].ts` | yes |
| GET | `/api/hospitality/hotels/[id]/daily-reports` | `pages/api/hospitality/hotels/[id]/daily-reports.ts` | yes |
| GET | `/api/hospitality/hotels/[id]/metrics` | `pages/api/hospitality/hotels/[id]/metrics.ts` | yes |
| GET | `/api/hospitality/hotels/[id]/reviews` | `pages/api/hospitality/hotels/[id]/reviews.ts` | yes |
| GET, POST | `/api/hospitality/hotels` | `pages/api/hospitality/hotels/index.ts` | yes |
| GET | `/api/hospitality/night-audit` | `pages/api/hospitality/night-audit.ts` | yes |
| GET, PUT | `/api/hospitality/reviews/[id]` | `pages/api/hospitality/reviews/[id].ts` | yes |
| GET, POST | `/api/hospitality/reviews` | `pages/api/hospitality/reviews/index.ts` | yes |
| GET | `/api/hospitality/snapshot` | `pages/api/hospitality/snapshot.ts` | yes |

---

## Hotel KPI Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/hotel-kpi/bulk-upsert` | `pages/api/hotel-kpi/bulk-upsert.ts` | yes |
| GET | `/api/hotel-kpi` | `pages/api/hotel-kpi/index.ts` | yes |
| POST | `/api/hotel-kpi/upsert` | `pages/api/hotel-kpi/upsert.ts` | yes |

---

## Hotel Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/hotels/[id]/daily-entry` | `pages/api/hotels/[id]/daily-entry.ts` | yes |
| POST | `/api/hotels/create` | `pages/api/hotels/create.ts` | yes |
| GET, PUT | `/api/hotels/disputes/[id]` | `pages/api/hotels/disputes/[id].ts` | yes |
| GET, POST | `/api/hotels/disputes/[id]/notes` | `pages/api/hotels/disputes/[id]/notes.ts` | yes |
| GET, POST | `/api/hotels/disputes` | `pages/api/hotels/disputes/index.ts` | yes |
| GET | `/api/hotels/disputes/summary` | `pages/api/hotels/disputes/summary.ts` | yes |
| GET | `/api/hotels/kpi-comparison` | `pages/api/hotels/kpi-comparison.ts` | yes |
| GET | `/api/hotels/loss-nights` | `pages/api/hotels/loss-nights.ts` | yes |
| POST | `/api/hotels/night-audit/upload` | `pages/api/hotels/night-audit/upload.ts` | yes |
| POST | `/api/hotels/nightly-loss-scan` | `pages/api/hotels/nightly-loss-scan.ts` | yes |
| GET | `/api/hotels/pnl/monthly` | `pages/api/hotels/pnl/monthly.ts` | yes |
| GET | `/api/hotels/snapshot` | `pages/api/hotels/snapshot.ts` | yes |
| POST | `/api/hotels/str/upload` | `pages/api/hotels/str/upload.ts` | yes |
| POST | `/api/hotels/upload` | `pages/api/hotels/upload.ts` | yes |

---

## Impersonation Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/impersonate` | `pages/api/impersonate.ts` | yes |
| GET | `/api/impersonation/log` | `pages/api/impersonation/log.ts` | yes |
| POST | `/api/impersonation/start` | `pages/api/impersonation/start.ts` | yes |
| POST | `/api/impersonation/stop` | `pages/api/impersonation/stop.ts` | yes |

---

## Import Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/import/job/[id]/commit` | `pages/api/import/job/[id]/commit.ts` | yes |
| GET, POST | `/api/import/job/[id]/mapping` | `pages/api/import/job/[id]/mapping.ts` | yes |
| POST | `/api/import/job/[id]/validate` | `pages/api/import/job/[id]/validate.ts` | yes |
| GET | `/api/import/mappings` | `pages/api/import/mappings.ts` | yes |
| POST | `/api/import/ringcentral` | `pages/api/import/ringcentral.ts` | yes |
| GET | `/api/import/template` | `pages/api/import/template.ts` | yes |
| POST | `/api/import/tms-3pl-financial` | `pages/api/import/tms-3pl-financial.ts` | yes |
| POST | `/api/import/tms-loads` | `pages/api/import/tms-loads.ts` | yes |
| POST | `/api/import/upload` | `pages/api/import/upload.ts` | yes |

---

## Incentive Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/incentives/audit-daily` | `pages/api/incentives/audit-daily.ts` | yes |
| POST | `/api/incentives/commit` | `pages/api/incentives/commit.ts` | yes |
| GET | `/api/incentives/gamification/my` | `pages/api/incentives/gamification/my.ts` | yes |
| GET | `/api/incentives/my-daily` | `pages/api/incentives/my-daily.ts` | yes |
| GET, POST | `/api/incentives/plan` | `pages/api/incentives/plan.ts` | yes |
| GET | `/api/incentives/rules` | `pages/api/incentives/rules.ts` | yes |
| POST | `/api/incentives/run` | `pages/api/incentives/run.ts` | yes |
| GET, PUT, DELETE | `/api/incentives/scenarios/[id]` | `pages/api/incentives/scenarios/[id].ts` | yes |
| POST | `/api/incentives/scenarios/compare` | `pages/api/incentives/scenarios/compare.ts` | yes |
| GET, POST | `/api/incentives/scenarios` | `pages/api/incentives/scenarios/index.ts` | yes |
| POST | `/api/incentives/simulate` | `pages/api/incentives/simulate.ts` | yes |
| GET | `/api/incentives/simulate/summary` | `pages/api/incentives/simulate/summary.ts` | yes |
| GET | `/api/incentives/user-daily` | `pages/api/incentives/user-daily.ts` | yes |
| GET | `/api/incentives/user-timeseries` | `pages/api/incentives/user-timeseries.ts` | yes |
| GET | `/api/incentives/venture-summary` | `pages/api/incentives/venture-summary.ts` | yes |
| GET | `/api/incentives/venture-timeseries` | `pages/api/incentives/venture-timeseries.ts` | yes |

---

## Insurance Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT, DELETE | `/api/insurance/policies/[id]` | `pages/api/insurance/policies/[id].ts` | yes |
| GET, POST | `/api/insurance/policies` | `pages/api/insurance/policies/index.ts` | yes |

---

## Integration Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/integrations/ringcentral/test` | `pages/api/integrations/ringcentral/test.ts` | yes |

---

## IT Asset Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT, DELETE | `/api/it/assets/[id]` | `pages/api/it/assets/[id].ts` | yes |
| GET, POST | `/api/it/assets` | `pages/api/it/assets/index.ts` | yes |
| GET, PUT, DELETE | `/api/it-assets/[id]` | `pages/api/it-assets/[id].ts` | yes |
| POST | `/api/it-assets/assign` | `pages/api/it-assets/assign.ts` | yes |
| POST | `/api/it-assets/create` | `pages/api/it-assets/create.ts` | yes |
| GET | `/api/it-assets/list` | `pages/api/it-assets/list.ts` | yes |
| POST | `/api/it-assets/return` | `pages/api/it-assets/return.ts` | yes |

---

## IT Incident Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT, DELETE | `/api/it-incidents/[id]` | `pages/api/it-incidents/[id].ts` | yes |
| POST | `/api/it-incidents/assign` | `pages/api/it-incidents/assign.ts` | yes |
| POST | `/api/it-incidents/create` | `pages/api/it-incidents/create.ts` | yes |
| GET | `/api/it-incidents/list` | `pages/api/it-incidents/list.ts` | yes |
| PATCH | `/api/it-incidents/update-status` | `pages/api/it-incidents/update-status.ts` | yes |

---

## Job Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| POST | `/api/jobs/churn-recalc` | `pages/api/jobs/churn-recalc.ts` | yes |
| POST | `/api/jobs/fmcsa-sync` | `pages/api/jobs/fmcsa-sync.ts` | yes |
| GET | `/api/jobs/fmcsa-sync-stats` | `pages/api/jobs/fmcsa-sync-stats.ts` | yes |
| POST | `/api/jobs/incentive-daily` | `pages/api/jobs/incentive-daily.ts` | yes |
| POST | `/api/jobs/quote-timeout` | `pages/api/jobs/quote-timeout.ts` | yes |
| POST | `/api/jobs/task-generation` | `pages/api/jobs/task-generation.ts` | yes |

---

## KPI Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/kpi/my-performance` | `pages/api/kpi/my-performance.ts` | yes |

---

## Logistics Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/logistics/carriers` | `pages/api/logistics/carriers.ts` | yes |
| GET | `/api/logistics/carriers/[carrierId]/delivery-stats` | `pages/api/logistics/carriers/[carrierId]/delivery-stats.ts` | yes |
| GET, POST | `/api/logistics/customer-approval-requests` | `pages/api/logistics/customer-approval-requests.ts` | yes |
| GET | `/api/logistics/customer-approvals` | `pages/api/logistics/customer-approvals/index.ts` | yes |
| GET, PUT | `/api/logistics/customers/[id]` | `pages/api/logistics/customers/[id].ts` | yes |
| POST | `/api/logistics/customers/[id]/touches/create` | `pages/api/logistics/customers/[id]/touches/create.ts` | yes |
| GET | `/api/logistics/customers/[id]/touches` | `pages/api/logistics/customers/[id]/touches/index.ts` | yes |
| GET | `/api/logistics/customers` | `pages/api/logistics/customers/index.ts` | yes |
| GET | `/api/logistics/customers/touches/summary` | `pages/api/logistics/customers/touches/summary.ts` | yes |
| GET | `/api/logistics/dashboard` | `pages/api/logistics/dashboard.ts` | yes |
| GET | `/api/logistics/fmcsa-carrier-lookup` | `pages/api/logistics/fmcsa-carrier-lookup.ts` | yes |
| GET | `/api/logistics/freight-pnl` | `pages/api/logistics/freight-pnl.ts` | yes |
| GET, PUT | `/api/logistics/loads/[id]` | `pages/api/logistics/loads/[id].ts` | yes |
| GET | `/api/logistics/loads/[id]/events` | `pages/api/logistics/loads/[id]/events.ts` | yes |
| POST | `/api/logistics/loads/[id]/match-carriers` | `pages/api/logistics/loads/[id]/match-carriers.ts` | yes |
| GET | `/api/logistics/loss-insights` | `pages/api/logistics/loss-insights.ts` | yes |
| GET | `/api/logistics/missing-mappings` | `pages/api/logistics/missing-mappings.ts` | yes |
| GET, PUT | `/api/logistics/shippers/[id]` | `pages/api/logistics/shippers/[id].ts` | yes |
| GET, POST | `/api/logistics/shippers` | `pages/api/logistics/shippers/index.ts` | yes |

---

## Mapping Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/mappings/missing` | `pages/api/mappings/missing.ts` | yes |
| POST | `/api/mappings/update` | `pages/api/mappings/update.ts` | yes |

---

## Me Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/me` | `pages/api/me.ts` | yes |
| GET | `/api/me/incentives` | `pages/api/me/incentives.ts` | yes |

---

## Meta Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/meta/hotel-properties` | `pages/api/meta/hotel-properties.ts` | yes |

---

## My Day Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/my-day` | `pages/api/my-day.ts` | yes |

---

## Notification Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, POST | `/api/notifications` | `pages/api/notifications/index.ts` | yes |
| POST | `/api/notifications/mark-read` | `pages/api/notifications/mark-read.ts` | yes |

---

## Office Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT | `/api/offices/[id]` | `pages/api/offices/[id].ts` | yes |
| GET, POST | `/api/offices` | `pages/api/offices/index.ts` | yes |

---

## Overview Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/overview/summary` | `pages/api/overview/summary.ts` | yes |
| GET | `/api/overview/ventures` | `pages/api/overview/ventures.ts` | yes |

---

## Owner Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/owner/timeline` | `pages/api/owner/timeline.ts` | yes |

---

## Policy Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT, DELETE | `/api/policies/[id]` | `pages/api/policies/[id].ts` | yes |
| GET, POST | `/api/policies` | `pages/api/policies/index.ts` | yes |

---

## SaaS Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/saas/cohorts` | `pages/api/saas/cohorts.ts` | yes |
| GET, PUT, DELETE | `/api/saas/customers/[id]` | `pages/api/saas/customers/[id].ts` | yes |
| GET, POST | `/api/saas/customers` | `pages/api/saas/customers/index.ts` | yes |
| GET | `/api/saas/kpi` | `pages/api/saas/kpi/index.ts` | yes |
| GET | `/api/saas/metrics` | `pages/api/saas/metrics.ts` | yes |
| GET, PUT, DELETE | `/api/saas/subscriptions/[id]` | `pages/api/saas/subscriptions/[id].ts` | yes |
| POST | `/api/saas/subscriptions/[id]/cancel` | `pages/api/saas/subscriptions/[id]/cancel.ts` | yes |
| GET, POST | `/api/saas/subscriptions` | `pages/api/saas/subscriptions/index.ts` | yes |

---

## Sales KPI Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/sales-kpi` | `pages/api/sales-kpi/index.ts` | yes |
| POST | `/api/sales-kpi/record` | `pages/api/sales-kpi/record.ts` | yes |

---

## Staff Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/staff/search` | `pages/api/staff/search.ts` | yes |

---

## Task Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT, DELETE | `/api/tasks/[id]` | `pages/api/tasks/[id].ts` | yes |
| POST | `/api/tasks/[id]/explanation` | `pages/api/tasks/[id]/explanation.ts` | yes |
| GET | `/api/tasks/board` | `pages/api/tasks/board.ts` | yes |
| GET, POST | `/api/tasks` | `pages/api/tasks/index.ts` | yes |
| POST | `/api/tasks/notify-manager` | `pages/api/tasks/notify-manager.ts` | yes |
| GET | `/api/tasks/overdue-check` | `pages/api/tasks/overdue-check.ts` | yes |

---

## Test Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/test/freight/outreach-last` | `pages/api/test/freight/outreach-last.ts` | yes |
| POST | `/api/test/login` | `pages/api/test/login.ts` | no |
| POST | `/api/test/logout` | `pages/api/test/logout.ts` | no |
| GET | `/api/test/whoami` | `pages/api/test/whoami.ts` | no |

---

## User Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET, PUT | `/api/user/preferences` | `pages/api/user/preferences.ts` | yes |
| GET, POST, PUT | `/api/user/quick-links` | `pages/api/user/quick-links.ts` | yes |
| GET | `/api/user/venture-types` | `pages/api/user/venture-types.ts` | yes |

---

## User Routes (Plural)

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/users/dispatcher-search` | `pages/api/users/dispatcher-search.ts` | yes |
| GET | `/api/users/lookup` | `pages/api/users/lookup.ts` | yes |

---

## Venture Routes

| Method | Route | File Path | Auth Required |
|-------|-------|-----------|---------------|
| GET | `/api/ventures/[id]/documents` | `pages/api/ventures/[id]/documents.ts` | yes |
| GET | `/api/ventures/[id]/people` | `pages/api/ventures/[id]/people.ts` | yes |
| GET, POST | `/api/ventures` | `pages/api/ventures/index.ts` | yes |

---

## Routes Referenced But Not Found

The following routes are referenced in tests or UI code but **DO NOT EXIST** as filesystem-backed routes:

### Test References
- None identified (all test references match existing routes)

### UI/Frontend References  
- None identified (all frontend references match existing routes)

**Note:** This inventory only includes routes that exist as actual files in `pages/api/**/*.ts`. If a route is referenced but not listed above, it does not exist and will return 404.

---

## Summary Statistics

- **Total Routes**: ~400+ (counting each HTTP method separately)
- **Public Routes**: 11
- **Authenticated Routes**: ~390+
- **Routes with Dynamic Segments**: ~80+

---

## Notes

1. **Dynamic Routes**: Routes with `[id]`, `[carrierId]`, etc. are parameterized. The actual route will be `/api/path/123` where `123` is the parameter value.

2. **Catch-All Routes**: `/api/auth/[...nextauth]` is a NextAuth catch-all route that handles multiple authentication endpoints.

3. **Method Detection**: Methods were detected by analyzing handler code for:
   - `req.method === 'METHOD'` checks
   - `createApiHandler` with method keys
   - `setHeader('Allow', [...])` declarations
   - Default assumptions (GET for simple handlers)

4. **Auth Detection**: Auth requirements were determined by:
   - Presence of `requireUser`, `requireAdminUser`, `withUser`, `getServerSession`, `getEffectiveUser`
   - `createApiHandler` with `requireAuth: true`
   - Public route patterns (auth, health, webhooks, test)
   - Default: all `/api/*` routes require auth except `/api/auth/*`

5. **File Path Format**: All file paths are relative to the repository root and use forward slashes.

---

**This inventory is generated from actual filesystem files. No routes are guessed or inferred from comments or dead code.**


