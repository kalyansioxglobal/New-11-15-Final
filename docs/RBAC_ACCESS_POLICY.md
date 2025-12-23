# RBAC Access Policy

**Last Updated:** December 13, 2025  
**Version:** 1.0  
**Source of Truth:** `lib/permissions.ts`, `lib/scope.ts`

---

## 1. Role Definitions

### 1.1 Role Hierarchy (16 Roles)

| Role | Label | Venture Scope | Office Scope | Admin Panel | Impersonate | Manage Users |
|------|-------|---------------|--------------|-------------|-------------|--------------|
| CEO | CEO | GLOBAL | GLOBAL | Yes | Yes | Yes |
| ADMIN | Admin | GLOBAL | GLOBAL | Yes | Yes | Yes |
| COO | COO / Director | GLOBAL | GLOBAL | No | No | No |
| VENTURE_HEAD | Venture Head | ASSIGNED | GLOBAL | No | No | No |
| OFFICE_MANAGER | Office Manager | ASSIGNED | ASSIGNED | No | No | No |
| TEAM_LEAD | Team Lead | ASSIGNED | ASSIGNED | No | No | No |
| EMPLOYEE | Employee | ASSIGNED | ASSIGNED | No | No | No |
| CONTRACTOR | Contractor | ASSIGNED | ASSIGNED | No | No | No |
| AUDITOR | Auditor / Compliance | GLOBAL | GLOBAL | No | No | No |
| FINANCE | Finance | ASSIGNED | ASSIGNED | No | No | No |
| HR_ADMIN | HR Admin | GLOBAL | GLOBAL | Yes | No | Yes |
| TEST_USER | Test User | GLOBAL | GLOBAL | No | Yes | No |
| CSR | CSR (Customer Service) | ASSIGNED | ASSIGNED | No | No | No |
| DISPATCHER | Dispatcher | ASSIGNED | ASSIGNED | No | No | No |
| CARRIER_TEAM | Carrier Team | ASSIGNED | ASSIGNED | No | No | No |
| ACCOUNTING | Accounting | ASSIGNED | ASSIGNED | No | No | No |

**Source:** `lib/permissions.ts` lines 28-221

### 1.2 Scope Levels

| Scope | Description |
|-------|-------------|
| GLOBAL | Access to all ventures and offices system-wide |
| ASSIGNED | Access only to ventures/offices user is explicitly assigned to |
| SELF_ONLY | Access only to user's own data (applies contextually) |

---

## 2. Module Access Matrix

### 2.1 Task Management

| Action | CEO/ADMIN | COO | VH | OM | TL | EMPLOYEE | CONTRACTOR | AUDITOR | FINANCE | HR_ADMIN | CSR | DISPATCHER |
|--------|-----------|-----|----|----|-------|----------|------------|---------|---------|----------|-----|------------|
| VIEW | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| CREATE | Yes | Yes | Yes | Yes | Yes | No | No | No | Yes | Yes | Yes | Yes |
| EDIT | Yes | Yes | Yes | Yes | Yes | No | No | No | Yes | Yes | Yes | Yes |
| DELETE | Yes | No | No | No | No | No | No | No | No | No | No | No |
| ASSIGN | Yes | Yes | Yes | Yes | Yes | No | No | No | No | Yes | No | No |

**Source:** `lib/permissions.ts` lines 28-220 (task property in ROLE_CONFIG)

### 2.2 Policy Management

| Action | CEO/ADMIN | COO | VH | OM | TL | EMPLOYEE | AUDITOR | FINANCE |
|--------|-----------|-----|----|----|-------|----------|---------|---------|
| VIEW | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| CREATE | Yes | Yes | Yes | Yes | No | No | No | No |
| EDIT | Yes | Yes | Yes | Yes | No | No | Yes | Yes |
| DELETE | Yes | No | No | No | No | No | No | No |
| VERIFY | Yes | Yes | No | No | No | No | Yes | No |

**Source:** `lib/permissions.ts` lines 28-220 (policy property in ROLE_CONFIG)

### 2.3 KPI Management

| Action | CEO/ADMIN | COO | VH | OM | TL | EMPLOYEE | FINANCE | ACCOUNTING |
|--------|-----------|-----|----|----|-------|----------|---------|------------|
| VIEW | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| UPLOAD | Yes | Yes | No | No | No | No | Yes | Yes |

**Source:** `lib/permissions.ts` lines 28-220 (canUploadKpis, canViewKpis properties)

### 2.4 Freight Intelligence & Analytics

| Action | CEO/ADMIN | COO | VH | OM | TL | CSR | FINANCE | DISPATCHER | CARRIER_TEAM | EMPLOYEE |
|--------|-----------|-----|----|----|-------|-----|---------|------------|--------------|----------|
| Freight Intelligence | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No |
| Shipper Churn | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No |
| Shipper ICP | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No |
| P&L View | Yes | Yes | Yes | Yes | No | No | Yes | No | No | No |
| Loss Insights | Yes | Yes | Yes | Yes | No | No | Yes | No | No | No |

**Source:** `lib/permissions.ts` lines 679-750 (canAccessFreightIntelligence, canAccessShipperChurn, canAccessShipperIcp, PORTFOLIO_RESOURCE_ROLES)

### 2.5 Gamification

| Action | CEO/ADMIN | COO | VH | OM | TL | EMPLOYEE | Other Roles |
|--------|-----------|-----|----|----|-------|----------|-------------|
| VIEW Leaderboard | Yes | Yes | Yes | Yes | Yes | Yes | Yes (within venture scope) |
| CONFIGURE | Yes | Yes | No | No | No | No | No |

**Source:** `lib/permissions.ts` lines 751-760 (canManageGamificationConfig)

### 2.6 Import/Upload

| Action | CEO/ADMIN | COO | VH | OM | FINANCE | Other Roles |
|--------|-----------|-----|----|----|---------|-------------|
| Upload Imports | Yes | Yes | Yes | Yes | Yes | No |
| Upload KPIs | Yes | Yes | No | No | Yes | ACCOUNTING only |

**Source:** `lib/permissions.ts` lines 761-770 (canUploadImports)

### 2.7 IT Assets & Incidents

IT asset and incident permissions follow the standard role hierarchy defined in `ROLE_CONFIG`. There is no dedicated IT role - access is determined by the user's venture/office scope.

**Access Rules (derived from ROLE_CONFIG venture/office scope):**
- **Global scope roles** (CEO, ADMIN, COO, AUDITOR, HR_ADMIN): Can view/manage all IT assets
- **Assigned scope roles** (VENTURE_HEAD, OFFICE_MANAGER, TEAM_LEAD, etc.): Can view/manage IT assets within their assigned ventures/offices
- **EMPLOYEE/CONTRACTOR**: Can view and create incidents for their own scope

**Source:** Access control follows `getUserScope()` from `lib/scope.ts:47-56` combined with `ROLE_CONFIG` venture/office scope settings from `lib/permissions.ts:28-221`.

### 2.8 Attendance

| Action | CEO/ADMIN | COO | VH | OM | TL | EMPLOYEE |
|--------|-----------|-----|----|----|-------|----------|
| VIEW All | Yes | Yes | Yes | Yes | Yes | No |
| VIEW Team | Yes | Yes | Yes | Yes | Yes | No |
| VIEW Own | Yes | Yes | Yes | Yes | Yes | Yes |
| CREATE/UPDATE | Yes | Yes | Yes | Yes | Yes | Yes (own) |
| OVERRIDE | Yes | Yes | Yes | Yes | No | No |

### 2.9 User Management

| Action | CEO/ADMIN | HR_ADMIN | Other Roles |
|--------|-----------|----------|-------------|
| CREATE | Yes | Yes | No |
| UPDATE | Yes | Yes | No |
| DELETE | Yes | No | No |
| SET ROLE | Yes | Yes | No |
| SET VENTURES | Yes | Yes | No |
| SET OFFICES | Yes | Yes | No |
| IMPERSONATE | CEO/ADMIN/TEST_USER | No | No |

**Source:** `lib/permissions.ts` lines 28-220 (canManageUsers, canImpersonate)

### 2.10 Admin Panel

| Action | CEO/ADMIN | HR_ADMIN | Other Roles |
|--------|-----------|----------|-------------|
| ACCESS | Yes | Yes | No |

**Source:** `lib/permissions.ts` lines 28-220 (canAccessAdminPanel)

---

## 3. Scope Enforcement Rules

### 3.1 Global Scope Roles

These roles see all data across all ventures and offices:
- CEO, ADMIN, COO, AUDITOR, HR_ADMIN, TEST_USER

### 3.2 Assigned Scope Roles

These roles only see data for their assigned ventures/offices:
- VENTURE_HEAD (all offices within assigned ventures)
- OFFICE_MANAGER, TEAM_LEAD, EMPLOYEE, CONTRACTOR, FINANCE, CSR, DISPATCHER, CARRIER_TEAM, ACCOUNTING

### 3.3 Scope Helper Functions

| Function | Purpose | Source |
|----------|---------|--------|
| `getUserScope(user)` | Returns user's venture/office scope | `lib/scope.ts:47-56` |
| `isGlobalAdmin(user)` | Returns true for CEO/ADMIN | `lib/scope.ts:95-98` |
| `isManagerLike(user)` | Returns true for leadership + OM + TL | `lib/scope.ts:100-103` |
| `customerWhereForUser(user)` | Prisma filter for customer visibility | `lib/scope.ts:131-172` |
| `loadWhereForUser(user)` | Prisma filter for load visibility | `lib/scope.ts:198-241` |
| `enforceScope(user, target)` | Boolean check for entity access | `lib/scope.ts:70-89` |

---

## 4. Authentication Requirements

### 4.1 Authentication Methods

| Method | Function | Source |
|--------|----------|--------|
| Session Required | `requireUser(req, res)` | `lib/apiAuth.ts:6-13` |
| Admin Required | `requireAdminUser(req, res)` | `lib/apiAuth.ts:15-28` |
| Leadership Required | `requireLeadership(req, res)` | `lib/apiAuth.ts:48-62` |
| Upload Permission | `requireUploadPermission(req, res)` | `lib/apiAuth.ts:33-46` |
| User Wrapper | `withUser(handler)` | `lib/api.ts:20-37` |

### 4.2 Identity Source Rules

**CRITICAL:** User identity MUST come from authenticated session only.

- **ALLOWED:** `getEffectiveUser(req, res)` - Resolves user from NextAuth session with impersonation support
- **FORBIDDEN:** `x-user-id` header - This allows identity spoofing

---

## 5. Portfolio Resource Access

| Resource | Allowed Roles |
|----------|---------------|
| LOGISTICS_PNL_VIEW | CEO, ADMIN, COO, VENTURE_HEAD, FINANCE |
| LOGISTICS_LOSS_INSIGHTS_VIEW | CEO, ADMIN, COO, VENTURE_HEAD, FINANCE |
| LOGISTICS_DASHBOARD_VIEW | CEO, ADMIN, COO, VENTURE_HEAD, OFFICE_MANAGER, TEAM_LEAD |
| HOTEL_PORTFOLIO_VIEW | CEO, ADMIN, COO, VENTURE_HEAD, FINANCE |
| HOTEL_LOSS_NIGHTS_VIEW | CEO, ADMIN, COO, VENTURE_HEAD, FINANCE |
| BPO_DASHBOARD_VIEW | CEO, ADMIN, COO, VENTURE_HEAD |
| SAAS_PORTFOLIO_VIEW | CEO, ADMIN, COO, VENTURE_HEAD, FINANCE |

**Source:** `lib/permissions.ts` lines 235-250

---

## 6. Permission Matrix (Dynamic)

The system supports a dynamic permission matrix stored in database with fallback to defaults.

| Role | Tasks | Ventures | Users | Impersonate | Logistics | Hotels | Approvals | Accounting |
|------|-------|----------|-------|-------------|-----------|--------|-----------|------------|
| CEO | manage | manage | manage | Yes | manage | manage | manage | manage |
| ADMIN | manage | manage | manage | Yes | manage | manage | manage | manage |
| COO | manage | view | view | No | manage | manage | manage | view |
| VENTURE_HEAD | manage | view | view | No | manage | manage | manage | view |
| OFFICE_MANAGER | manage | view | view | No | manage | view | view | none |
| TEAM_LEAD | edit | view | none | No | edit | view | view | none |
| EMPLOYEE | view | view | none | No | view | view | none | none |
| CONTRACTOR | view | view | none | No | view | view | none | none |
| AUDITOR | view | view | none | No | view | view | view | view |
| FINANCE | view | view | none | No | view | view | view | manage |
| HR_ADMIN | edit | view | manage | No | view | view | view | none |
| TEST_USER | manage | view | none | Yes | manage | manage | manage | none |
| CSR | edit | view | none | No | manage | none | view | none |
| DISPATCHER | edit | view | none | No | manage | none | view | none |
| CARRIER_TEAM | view | view | none | No | manage | none | manage | none |
| ACCOUNTING | view | view | none | No | view | view | view | manage |

**Source:** `lib/permissions.ts` lines 278-295 (DEFAULT_PERMISSION_MATRIX)

---

## 7. Sales Dashboard Access

Sales dashboard access is restricted to specific job roles:
- Sales Executive
- Sales Team Lead
- Sales Manager
- Head of Sales

Plus: CSR, DISPATCHER, OFFICE_MANAGER, TEAM_LEAD, and leadership roles

**Source:** `lib/permissions.ts` lines 679-750 (canAccessSalesDashboard)

---

## 8. Carrier Data Access Rules (Herry's Rule)

**Principle:** Carrier directory is GLOBAL, carrier intelligence is VENTURE-SCOPED.

### 8.1 Carrier Directory (Global Access)
All authenticated users can search and view carrier basic information:
- Carrier name, MC number, DOT number
- FMCSA safety ratings
- Equipment types
- General contact information
- Preferred lanes (public)

**Rationale:** Carriers work across ventures. Sales and dispatch need to search the full carrier pool.

### 8.2 Carrier Intelligence (Venture-Scoped)
Venture-specific data is filtered by user's venture scope:
- Performance metrics with specific ventures
- Rate history per venture
- Relationship notes
- Outreach history
- Preferred carrier status per venture

**Enforcement:**
- `/api/freight/carriers/*` - Directory endpoints: `requireUser` only (global access)
- `/api/freight/carriers/[id]/intelligence` - Intelligence endpoints: `requireUser` + `getUserScope()` venture filter
- `/api/freight/carriers/[id]/outreach` - Outreach endpoints: `requireUser` + venture scope

**Source:** Business rule per Herry - carriers are shared resources, but performance/relationship data is venture-specific.

---

## Appendix A: Role Configuration Reference

```typescript
type RoleConfig = {
  label: string;
  ventureScope: "all" | "assigned" | "none";
  officeScope: "all" | "assigned" | "none";
  canAccessAdminPanel: boolean;
  canImpersonate: boolean;
  task: { create, edit, delete, assign, view: boolean };
  policy: { create, edit, delete, view, verify?: boolean };
  canManageUsers: boolean;
  canUploadKpis: boolean;
  canViewKpis: boolean;
};
```

**Source:** `lib/permissions.ts` lines 1-26

---

## Appendix B: Enforcement Checklist

Every API endpoint MUST:

1. **Authenticate** - Use `requireUser`, `withUser`, or `getEffectiveUser`
2. **Authorize by Role** - Check role-based permissions using helpers
3. **Apply Scope** - Filter data by user's venture/office scope
4. **Use Session Identity** - Never trust request headers for user ID

**See:** `docs/RBAC_ENFORCEMENT_AUDIT.md` for route-by-route enforcement status
