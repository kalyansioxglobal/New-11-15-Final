# SIOX Command Center - Platform Acceptance Checklist

**Version:** 1.0  
**Last Updated:** December 12, 2025  
**Status:** Draft

---

## 1. Authentication & Sessions

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| AUTH-01 | OTP email is sent within 30 seconds of login request | | |
| AUTH-02 | OTP expires after configured timeout (default 10 min) | | |
| AUTH-03 | Invalid OTP rejects authentication | | |
| AUTH-04 | Session persists across page refresh | | |
| AUTH-05 | Session expires after configured max age (30 days default) | | |
| AUTH-06 | Logout clears session completely | | |
| AUTH-07 | Multiple concurrent sessions work correctly | | |
| AUTH-08 | Session cookie is HttpOnly and Secure in production | | |

---

## 2. Multi-Tenant / Venture Scoping

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| MT-01 | Users with ventureScope="assigned" only see their assigned ventures | | |
| MT-02 | Users with ventureScope="all" see all ventures | | |
| MT-03 | API queries include venture filtering for scoped roles | | |
| MT-04 | Loads are venture-scoped (users cannot access other venture loads) | | |
| MT-05 | Carriers are venture-scoped where applicable | | |
| MT-06 | Hotels are venture-scoped | | |
| MT-07 | BPO campaigns are venture-scoped | | |
| MT-08 | Cross-venture data access returns 403 | | |
| MT-09 | Venture assignment changes take effect immediately | | |
| MT-10 | Office scoping works correctly for OFFICE_MANAGER role | | |

---

## 3. RBAC by Role

### CEO / ADMIN (Super Admin)

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| RBAC-CEO-01 | Can access admin panel | | |
| RBAC-CEO-02 | Can impersonate any user (except CEO for ADMIN) | | |
| RBAC-CEO-03 | Can manage users (create, edit, delete) | | |
| RBAC-CEO-04 | Can view all ventures and offices | | |
| RBAC-CEO-05 | Can upload KPIs | | |
| RBAC-CEO-06 | Can manage tasks (create, edit, delete, assign) | | |
| RBAC-CEO-07 | Can manage policies (create, edit, delete, verify) | | |

### COO / Director

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| RBAC-COO-01 | Cannot access admin panel | | |
| RBAC-COO-02 | Cannot impersonate users | | |
| RBAC-COO-03 | Can view all ventures | | |
| RBAC-COO-04 | Can upload KPIs | | |
| RBAC-COO-05 | Can manage tasks (except delete) | | |
| RBAC-COO-06 | Can verify policies | | |

### VENTURE_HEAD

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| RBAC-VH-01 | Only sees assigned ventures | | |
| RBAC-VH-02 | Can manage tasks within venture | | |
| RBAC-VH-03 | Can view KPIs for assigned ventures | | |
| RBAC-VH-04 | Cannot access other venture data | | |

### OFFICE_MANAGER

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| RBAC-OM-01 | Only sees assigned ventures and offices | | |
| RBAC-OM-02 | Can manage tasks within office scope | | |
| RBAC-OM-03 | Cannot access data outside office scope | | |

### EMPLOYEE / CONTRACTOR

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| RBAC-EMP-01 | Cannot access admin panel | | |
| RBAC-EMP-02 | View-only for tasks | | |
| RBAC-EMP-03 | Cannot create/edit/delete tasks | | |
| RBAC-EMP-04 | Can view KPIs | | |

### CSR / DISPATCHER

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| RBAC-CSR-01 | Can manage loads within venture | | |
| RBAC-CSR-02 | Can edit tasks | | |
| RBAC-CSR-03 | Cannot manage users | | |
| RBAC-CSR-04 | Logistics module access is "manage" level | | |

### AUDITOR

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| RBAC-AUD-01 | View-only access to all ventures | | |
| RBAC-AUD-02 | Can verify policies | | |
| RBAC-AUD-03 | Cannot modify data | | |

### FINANCE / ACCOUNTING

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| RBAC-FIN-01 | Can upload KPIs | | |
| RBAC-FIN-02 | Can view financial data | | |
| RBAC-FIN-03 | Accounting module access is "manage" level | | |

---

## 4. Navigation / UI Access Control

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| NAV-01 | Admin menu only visible to CEO/ADMIN/HR_ADMIN | | |
| NAV-02 | Freight Intelligence only visible to permitted roles | | |
| NAV-03 | Hotels section only visible to users with hotel venture access | | |
| NAV-04 | BPO section only visible to users with BPO venture access | | |
| NAV-05 | Holdings section only visible to CEO/ADMIN/FINANCE | | |
| NAV-06 | Sidebar collapses correctly on mobile | | |
| NAV-07 | Navigation state persists across page loads | | |

---

## 5. Freight Module

### Loads

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| FRT-LD-01 | Load list displays correctly with pagination | | |
| FRT-LD-02 | Load filters work (status, date range, shipper) | | |
| FRT-LD-03 | Load detail page displays all fields | | |
| FRT-LD-04 | Load status can be updated | | |
| FRT-LD-05 | Load creation works with required fields | | |
| FRT-LD-06 | Load is venture-scoped | | |

### Carrier Matching

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| FRT-MT-01 | Find Carriers returns ranked results | | |
| FRT-MT-02 | Matching considers equipment type | | |
| FRT-MT-03 | Matching considers lane history | | |
| FRT-MT-04 | Matching considers safety rating | | |
| FRT-MT-05 | Matching excludes blocked carriers | | |
| FRT-MT-06 | Matching excludes unauthorized carriers | | |
| FRT-MT-07 | Primary dispatcher contact is shown | | |

### FMCSA Integration

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| FRT-FM-01 | FMCSA lookup by MC number works | | |
| FRT-FM-02 | FMCSA lookup by DOT number works | | |
| FRT-FM-03 | FMCSA bulk import works (CSV) | | |
| FRT-FM-04 | FMCSA autosync updates carrier status | | |
| FRT-FM-05 | FMCSA autosync is idempotent | | |
| FRT-FM-06 | Unauthorized carriers are flagged | | |

### Coverage War Room

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| FRT-CW-01 | Summary cards display correctly | | |
| FRT-CW-02 | Loads needing attention sorted by urgency | | |
| FRT-CW-03 | Dispatcher leaderboard updates correctly | | |
| FRT-CW-04 | Daily coverage trend chart displays | | |
| FRT-CW-05 | Data is venture-scoped | | |

### Outreach War Room

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| FRT-OW-01 | Load selector shows open loads | | |
| FRT-OW-02 | Carrier preview shows eligible carriers | | |
| FRT-OW-03 | Email outreach sends via SendGrid | | |
| FRT-OW-04 | SMS outreach sends via Twilio | | |
| FRT-OW-05 | Dry run mode prevents actual sends | | |
| FRT-OW-06 | Outreach is logged to OutreachMessage | | |
| FRT-OW-07 | Carrier eligibility validation works | | |
| FRT-OW-08 | Replies tab shows conversations | | |
| FRT-OW-09 | Award carrier assigns load correctly | | |
| FRT-OW-10 | Reply count badges display correctly | | |

---

## 6. Hotels Module

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| HTL-01 | Hotel list displays correctly | | |
| HTL-02 | Hotel detail page shows KPIs | | |
| HTL-03 | KPI entry form works | | |
| HTL-04 | P&L Manager displays correctly | | |
| HTL-05 | Cash/Bank expenses are tracked | | |
| HTL-06 | YoY comparison metrics work | | |
| HTL-07 | Hotels are venture-scoped | | |

---

## 7. BPO Module

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| BPO-01 | Real-time dashboard displays agent status | | |
| BPO-02 | Campaign performance metrics work | | |
| BPO-03 | Agent metrics are tracked | | |
| BPO-04 | BPO data is venture-scoped | | |

---

## 8. AI Gateway

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| AI-01 | Rate limiting enforced (10 req/min/user) | | |
| AI-02 | Daily limit enforced (100 calls/user/day) | | |
| AI-03 | Prompt injection patterns blocked | | |
| AI-04 | Input body sanitization works | | |
| AI-05 | Output filtering redacts sensitive data | | |
| AI-06 | Usage logged to AiUsageLog | | |
| AI-07 | AI usage dashboard works for admins | | |
| AI-08 | withAiGuardrails middleware applied to all AI endpoints | | |

---

## 9. Integrations & Webhooks

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| INT-01 | SendGrid inbound webhook receives emails | | |
| INT-02 | Twilio inbound webhook receives SMS | | |
| INT-03 | Webhook signature validation works | | |
| INT-04 | Duplicate webhook handling works | | |
| INT-05 | VentureOutboundConfig per-venture setup works | | |
| INT-06 | Webhook errors are logged | | |

---

## 10. Data Integrity

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| DI-01 | No orphan FK references in key tables | | |
| DI-02 | No duplicate MC numbers in carriers | | |
| DI-03 | No duplicate DOT numbers in carriers | | |
| DI-04 | No cross-venture data violations | | |
| DI-05 | All required indexes exist | | |
| DI-06 | Migrations are reversible | | |

---

## 11. Observability

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| OBS-01 | API errors logged with stack traces | | |
| OBS-02 | Rate limit violations logged | | |
| OBS-03 | ActivityLog captures key actions | | |
| OBS-04 | AI usage logged | | |
| OBS-05 | Outreach messages logged | | |
| OBS-06 | System check endpoints work | | |

---

## 12. Performance

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| PERF-01 | Page load < 3 seconds | | |
| PERF-02 | API responses < 500ms (typical) | | |
| PERF-03 | Load list query <= 6 queries | | |
| PERF-04 | War room detail query <= 10 queries | | |
| PERF-05 | No N+1 query patterns in key pages | | |
| PERF-06 | Pagination works for large datasets | | |

---

## 13. Security Baseline

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| SEC-01 | All API routes require authentication (except webhooks) | | |
| SEC-02 | Webhooks use signature validation | | |
| SEC-03 | Rate limiting enabled on all routes | | |
| SEC-04 | Sensitive env vars configured (DATABASE_URL, NEXTAUTH_SECRET) | | |
| SEC-05 | No hardcoded secrets in codebase | | |
| SEC-06 | CSRF protection via SameSite cookies | | |
| SEC-07 | SQL injection prevented (Prisma ORM) | | |
| SEC-08 | XSS prevented (React escaping) | | |

---

## 14. Release Readiness

| ID | Test Case | Pass/Fail | Notes |
|----|-----------|-----------|-------|
| REL-01 | Production build succeeds without errors | | |
| REL-02 | No console.log statements in production code | | |
| REL-03 | Environment variables documented | | |
| REL-04 | Database migrations up to date | | |
| REL-05 | No mock/placeholder data in production paths | | |
| REL-06 | Error boundaries in place | | |
| REL-07 | 404 and 500 error pages exist | | |

---

## Summary

| Section | Total Tests | Passed | Failed | Blocked |
|---------|-------------|--------|--------|---------|
| Authentication & Sessions | 8 | | | |
| Multi-Tenant / Venture Scoping | 10 | | | |
| RBAC by Role | ~25 | | | |
| Navigation / UI Access Control | 7 | | | |
| Freight Module | ~25 | | | |
| Hotels Module | 7 | | | |
| BPO Module | 4 | | | |
| AI Gateway | 8 | | | |
| Integrations & Webhooks | 6 | | | |
| Data Integrity | 6 | | | |
| Observability | 6 | | | |
| Performance | 6 | | | |
| Security Baseline | 8 | | | |
| Release Readiness | 7 | | | |
| **TOTAL** | **~133** | | | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Tech Lead | | | |
| Product Owner | | | |
