# Access Control Audit Report

**Date:** December 13, 2025  
**Auditor:** System Audit  
**Scope:** Multi-venture command center RBAC implementation

---

## Executive Summary

This audit evaluates the role-based access control (RBAC) implementation across the application to ensure users have appropriate access to their own dashboards/data while managers and team leads see aggregated team information. **Eight critical access control violations** were identified and remediated across freight, gamification, attendance, file uploads, and data import modules.

---

## RBAC Architecture Overview

### Role Hierarchy (16 Roles)

| Role | Venture Scope | Office Scope | Admin Panel | Impersonate | View KPIs |
|------|---------------|--------------|-------------|-------------|-----------|
| CEO | all | all | Yes | Yes | Yes |
| ADMIN | all | all | Yes | Yes | Yes |
| COO | all | all | No | No | Yes |
| VENTURE_HEAD | assigned | all | No | No | Yes |
| OFFICE_MANAGER | assigned | assigned | No | No | Yes |
| TEAM_LEAD | assigned | assigned | No | No | Yes |
| EMPLOYEE | assigned | assigned | No | No | Yes |
| CONTRACTOR | assigned | assigned | No | No | Yes |
| AUDITOR | all | all | No | No | Yes |
| FINANCE | assigned | assigned | No | No | Yes |
| HR_ADMIN | all | all | Yes | No | Yes |
| TEST_USER | all | all | No | Yes | Yes |
| CSR | assigned | assigned | No | No | Yes |
| DISPATCHER | assigned | assigned | No | No | Yes |
| CARRIER_TEAM | assigned | assigned | No | No | Yes |
| ACCOUNTING | assigned | assigned | No | No | Yes |

### Scope Helpers (lib/scope.ts)

- `getUserScope()` - Returns venture/office access scope
- `isGlobalAdmin()` - CEO or ADMIN only
- `isManagerLike()` - Leadership + OFFICE_MANAGER + TEAM_LEAD
- `canViewCustomer()` - Based on assignment or manager status
- `loadWhereForUser()` - Prisma filter for load visibility
- `customerWhereForUser()` - Prisma filter for customer visibility

---

## Critical Findings

### 1. CRITICAL: Freight Intelligence API - Missing Role Check

**File:** `pages/api/freight/intelligence.ts`  
**Severity:** HIGH  
**Status:** RESOLVED (December 13, 2025)

**Issue:** The endpoint only uses `requireUser()` without any role-based restrictions. This allows ANY authenticated user (including DISPATCHER, CARRIER_TEAM, CONTRACTOR) to access:
- Lane risk scores with margin data
- CSR performance scores and rankings
- Shipper health scores and contributing factors

**Current Code:**
```typescript
const user = await requireUser(req, res);
if (!user) return;
// No role check - data returned to all users
```

**Recommendation:** Add role check using the new `canAccessFreightIntelligence` helper (now implemented in lib/permissions.ts):
```typescript
import { canAccessFreightIntelligence } from '@/lib/permissions';

if (!canAccessFreightIntelligence(user)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

**Allowed Roles:** CEO, ADMIN, COO, VENTURE_HEAD, OFFICE_MANAGER, TEAM_LEAD, CSR, FINANCE  
**Blocked Roles:** DISPATCHER, CARRIER_TEAM, CONTRACTOR, ACCOUNTING, EMPLOYEE, AUDITOR, HR_ADMIN

---

### 2. CRITICAL: Shipper Churn API - Insufficient Role Check

**File:** `pages/api/freight/shipper-churn/index.ts`  
**Severity:** HIGH  
**Status:** RESOLVED (December 13, 2025)

**Issue:** Only checks venture scope, not user role. Any user with venture access can view:
- At-risk shipper lists with churn predictions
- Churned shipper details
- High-risk shipper analytics with risk scores

**Current Code:**
```typescript
const scope = getUserScope(user);
if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
  return res.status(403).json({ error: "Forbidden" });
}
// No role check - sensitive churn data exposed
```

**Recommendation:** Add role check using the new `canAccessShipperChurn` helper (now implemented in lib/permissions.ts):
```typescript
import { canAccessShipperChurn } from '@/lib/permissions';

if (!canAccessShipperChurn(user)) {
  return res.status(403).json({ error: 'Forbidden - insufficient permissions' });
}
```

**Allowed Roles:** CEO, ADMIN, COO, VENTURE_HEAD, OFFICE_MANAGER, TEAM_LEAD, CSR, FINANCE  
**Affected Data:** Customer churn risk scores, retention metrics, win-back opportunities.

---

### 3. CRITICAL: Shipper ICP API - No Role or Venture Restriction

**File:** `pages/api/freight/shipper-icp/index.ts`  
**Severity:** HIGH  
**Status:** RESOLVED (December 13, 2025)

**Issue:** Only checks for session existence. No role check AND no venture scope check. Any authenticated user can access:
- Customer tier classifications (A/B/C/D)
- Revenue and margin data by shipper
- Growth potential assessments
- Risk level classifications
- Ideal Customer Profile analytics

**Current Code:**
```typescript
const session = await getServerSession(req, res, authOptions);
if (!session?.user) {
  return res.status(401).json({ error: "Unauthorized" });
}
// NO role check, NO venture scope check
```

**Recommendation:** Add both role and venture scope checks using the new `canAccessShipperIcp` helper (now implemented in lib/permissions.ts):
```typescript
import { withUser } from '@/lib/api';
import { getUserScope } from '@/lib/scope';
import { canAccessShipperIcp } from '@/lib/permissions';

// Convert to withUser pattern for consistent auth handling
export default withUser(async function handler(req, res, user) {
  // Role check - strategic analytics for leadership only
  if (!canAccessShipperIcp(user)) {
    return res.status(403).json({ error: 'Forbidden - insufficient permissions' });
  }

  // Apply venture scope
  const scope = getUserScope(user);
  const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
  if (!scope.allVentures && ventureId && !scope.ventureIds.includes(ventureId)) {
    return res.status(403).json({ error: 'Venture access denied' });
  }
  // ... rest of handler
});
```

**Allowed Roles:** CEO, ADMIN, COO, VENTURE_HEAD, OFFICE_MANAGER, TEAM_LEAD, CSR, FINANCE  
**Blocked Roles:** DISPATCHER, CARRIER_TEAM, EMPLOYEE, CONTRACTOR, ACCOUNTING, AUDITOR, HR_ADMIN  
**Rationale:** ICP is customer analytics needed by sales teams - includes Team Leads and CSRs who manage customer relationships.

---

### 4. CRITICAL: Gamification Config API - Missing Role Check for Modifications

**File:** `pages/api/gamification/config.ts`  
**Severity:** HIGH  
**Status:** RESOLVED (December 13, 2025)

**Issue:** POST/PUT operations had no role check. ANY authenticated user could modify gamification settings for ANY venture, including enabling/disabling gamification and changing point configurations.

**Fix Applied:** Added `canManageGamificationConfig` role check (CEO/ADMIN/COO only) and venture scope validation.

---

### 5. CRITICAL: Gamification Leaderboard - Missing Venture Scope

**File:** `pages/api/gamification/leaderboard.ts`  
**Severity:** HIGH  
**Status:** RESOLVED (December 13, 2025)

**Issue:** No venture scope check. ANY authenticated user could view leaderboard data for ANY venture, exposing employee performance data across organizations.

**Fix Applied:** Added `getUserScope` venture access validation.

---

### 6. CRITICAL: Attendance Index - Missing User/Venture Scope

**File:** `pages/api/attendance/index.ts`  
**Severity:** HIGH  
**Status:** RESOLVED (December 13, 2025)

**Issue:** GET endpoint had no user or venture scope checks. ANY authenticated user could query attendance records for ANY user in ANY venture.

**Fix Applied:** Non-leadership users now see only their own attendance data. Leadership required to view other users' data. Venture scope enforced.

---

### 7. CRITICAL: File Upload - User ID Spoofing Vulnerability

**File:** `pages/api/files/upload.ts`  
**Severity:** HIGH  
**Status:** RESOLVED (December 13, 2025)

**Issue:** Accepted `x-user-id` header to determine user ID, allowing attackers to spoof their identity and upload files as other users.

**Fix Applied:** Removed header-based user ID fallback. Now uses session authentication exclusively.

---

### 8. CRITICAL: Import Upload - Missing Role Check

**File:** `pages/api/import/upload.ts`  
**Severity:** HIGH  
**Status:** RESOLVED (December 13, 2025)

**Issue:** No role check. ANY authenticated user could upload data import files, potentially injecting malicious data into the system.

**Fix Applied:** Added `canUploadImports` role check (CEO/ADMIN/COO/VENTURE_HEAD/OFFICE_MANAGER/FINANCE only).

---

## Policy Violations Summary

| Violation | Endpoint | Current State | Required State | Status |
|-----------|----------|---------------|----------------|--------|
| Dispatcher Access to Shipper Health | /api/freight/intelligence | No role check | Sales/CSR/Management only | RESOLVED |
| Open Churn Analytics | /api/freight/shipper-churn | Venture scope only | + Sales/Management role | RESOLVED |
| Open ICP Dashboard | /api/freight/shipper-icp | Session only | + Role + Venture scope | RESOLVED |
| Open Gamification Config | /api/gamification/config | No role check | CEO/ADMIN/COO only | RESOLVED |
| Open Gamification Leaderboard | /api/gamification/leaderboard | No venture scope | + Venture scope | RESOLVED |
| Open Attendance Query | /api/attendance/index | No scope check | Self + Leadership scope | RESOLVED |
| File Upload Spoofing | /api/files/upload | Header auth | Session-only auth | RESOLVED |
| Open Import Upload | /api/import/upload | No role check | Leadership + Finance | RESOLVED |

---

## Industry Standard Gaps

### 1. Self-Only Data Scope for Employees

**Gap:** Employees can view all data within their venture scope.  
**Standard:** Employees should only see their own metrics and assigned customers.  
**Impact:** Potential data leakage between team members.

### 2. Team Lead Aggregate Restriction

**Gap:** Team Leads see individual employee data, not just aggregates.  
**Standard:** Team Leads should see team aggregates; individual data only for direct reports.  
**Impact:** Privacy concerns for non-direct-report employees.

### 3. Role-Based Field Filtering

**Gap:** No field-level access control - all fields returned to authorized users.  
**Standard:** Sensitive fields (margin %, revenue) should be filtered by role.  
**Impact:** Margin data exposed to roles that don't need it.

---

## Compliant Access Matrix

### Recommended Access by Feature

| Feature | CEO/ADMIN | COO | VH/OM | TL | CSR | DISP | CARRIER | EMP |
|---------|-----------|-----|-------|----|----|------|---------|-----|
| Freight Intelligence | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Shipper Churn | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Shipper ICP | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| CSR Performance | ✓ | ✓ | ✓ | ✓ | Own | ✗ | ✗ | ✗ |
| Customer List | ✓ | ✓ | ✓ | Team | Assigned | Assigned | ✗ | ✗ |
| Load Details | ✓ | ✓ | ✓ | Team | Assigned | Assigned | Assigned | ✗ |

Legend: ✓ = Full Access, ✗ = No Access, Own = Own Data Only, Team = Team Data, Assigned = Assigned Records

---

## Remediation Priority

### Immediate (P0) - Within 24 Hours
1. Add role check to `/api/freight/intelligence.ts`
2. Add role check to `/api/freight/shipper-churn/index.ts`
3. Add role + venture check to `/api/freight/shipper-icp/index.ts`

### Short-term (P1) - Within 1 Week
1. Implement self-only scope for EMPLOYEE role on KPI endpoints
2. Add team-scoped aggregation for TEAM_LEAD role
3. Create helper function for common sales/management role checks

### Medium-term (P2) - Within 1 Month
1. Implement field-level access control for sensitive metrics
2. Add audit logging for sensitive data access
3. Create role-based data transformation layer

---

## Helper Functions (IMPLEMENTED)

The following helper functions have been added to `lib/permissions.ts`:

```typescript
// ─────────────────────────────────────────────────────────────
// FREIGHT INTELLIGENCE: Analytics & Shipper Health Access
// ─────────────────────────────────────────────────────────────

export function canAccessFreightIntelligence(user: { role: UserRole }): boolean {
  const ALLOWED_ROLES: UserRole[] = [
    "CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER",
    "TEAM_LEAD", "CSR", "FINANCE"
  ];
  return ALLOWED_ROLES.includes(user.role);
}

export function canAccessShipperChurn(user: { role: UserRole }): boolean {
  const ALLOWED_ROLES: UserRole[] = [
    "CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER",
    "TEAM_LEAD", "CSR", "FINANCE"
  ];
  return ALLOWED_ROLES.includes(user.role);
}

export function canAccessShipperIcp(user: { role: UserRole }): boolean {
  const ALLOWED_ROLES: UserRole[] = [
    "CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER",
    "TEAM_LEAD", "CSR", "FINANCE"
  ];
  return ALLOWED_ROLES.includes(user.role);
}
```

---

## Self-Only Data Scope Implementation

For EMPLOYEE role to see only their own data, use existing `customerWhereForUser` from lib/scope.ts:

```typescript
// Example: Employee viewing their assigned customers only
import { customerWhereForUser } from '@/lib/scope';

// For EMPLOYEE role, customerWhereForUser already returns:
// { OR: [{ assignedSalesId: user.id }, { assignedCsrId: user.id }, { assignedDispatcherId: user.id }] }
const customers = await prisma.customer.findMany({
  where: customerWhereForUser(user),
});
```

For Team Leads to see team aggregates:
```typescript
// Get team member IDs first, then filter data
const teamMembers = await prisma.user.findMany({
  where: { managerId: user.id },
  select: { id: true },
});
const teamIds = teamMembers.map(m => m.id);

// Use teamIds in queries for aggregate data
```

---

## Conclusion

The RBAC system has a solid foundation with well-defined roles and scope helpers. However, three critical API endpoints lack proper role-based access control, allowing unauthorized access to sensitive business intelligence data. Immediate remediation is required to align with the principle of least privilege.

**Next Steps:**
1. Apply P0 fixes immediately
2. Schedule P1 and P2 work for sprint planning
3. Re-audit after fixes are deployed
