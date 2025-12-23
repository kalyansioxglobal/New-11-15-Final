import type { UserRole } from "@/lib/permissions";

type Resource = "VENTURE" | "TASK" | "POLICY" | "USER" | "KPI" | "AUDIT_LOG";

interface RolePermissionSummary {
  canView: Resource[];
  canManage: Resource[];
  notes?: string;
  canImpersonate?: boolean;
  impersonateNotes?: string;
  scopeDescription: string;
}

export const ROLE_MATRIX: Record<UserRole, RolePermissionSummary> = {
  CEO: {
    canView: ["VENTURE", "TASK", "POLICY", "USER", "KPI", "AUDIT_LOG"],
    canManage: ["VENTURE", "TASK", "POLICY", "USER", "KPI"],
    canImpersonate: true,
    impersonateNotes: "Can impersonate any user including ADMIN.",
    scopeDescription: "All ventures and offices.",
    notes: "Ultimate owner; full visibility and control.",
  },
  ADMIN: {
    canView: ["VENTURE", "TASK", "POLICY", "USER", "KPI", "AUDIT_LOG"],
    canManage: ["VENTURE", "TASK", "POLICY", "USER", "KPI"],
    canImpersonate: true,
    impersonateNotes: "Can impersonate all roles except CEO.",
    scopeDescription: "All ventures and offices.",
    notes: "System administrator / backoffice overlord.",
  },
  COO: {
    canView: ["VENTURE", "TASK", "POLICY", "KPI"],
    canManage: ["TASK", "POLICY", "KPI"],
    canImpersonate: false,
    scopeDescription: "All ventures and offices.",
    notes: "Chief Operating Officer; operational oversight.",
  },
  VENTURE_HEAD: {
    canView: ["VENTURE", "TASK", "POLICY", "KPI"],
    canManage: ["TASK", "POLICY"],
    canImpersonate: false,
    scopeDescription: "Only their assigned ventures.",
    notes: "GM / head of a venture (e.g. Siox Logistics, Rank Me Now).",
  },
  OFFICE_MANAGER: {
    canView: ["VENTURE", "TASK", "POLICY", "KPI"],
    canManage: ["TASK"],
    canImpersonate: false,
    scopeDescription: "Only their assigned offices within ventures.",
    notes: "Office head; manages ops for that location.",
  },
  TEAM_LEAD: {
    canView: ["VENTURE", "TASK", "KPI"],
    canManage: ["TASK"],
    canImpersonate: false,
    scopeDescription: "Only their assigned offices within ventures.",
    notes: "Team leader; manages team tasks.",
  },
  EMPLOYEE: {
    canView: ["VENTURE", "TASK"],
    canManage: [],
    canImpersonate: false,
    scopeDescription: "Ventures/offices assigned to them.",
    notes: "Can update status only on tasks assigned to them.",
  },
  CONTRACTOR: {
    canView: ["VENTURE", "TASK"],
    canManage: [],
    canImpersonate: false,
    scopeDescription: "Ventures/offices assigned to them.",
    notes: "External contractor; limited view access.",
  },
  AUDITOR: {
    canView: ["VENTURE", "TASK", "POLICY", "KPI", "AUDIT_LOG"],
    canManage: [],
    canImpersonate: false,
    scopeDescription: "All ventures (read-only).",
    notes: "Compliance auditor; can verify policies.",
  },
  FINANCE: {
    canView: ["VENTURE", "TASK", "POLICY", "KPI"],
    canManage: ["TASK", "KPI"],
    canImpersonate: false,
    scopeDescription: "Ventures assigned to them.",
    notes: "Finance team; can upload KPIs and manage finance tasks.",
  },
  HR_ADMIN: {
    canView: ["VENTURE", "TASK", "POLICY", "USER"],
    canManage: ["TASK", "USER"],
    canImpersonate: false,
    scopeDescription: "All ventures and offices.",
    notes: "HR administrator; can manage users.",
  },
  TEST_USER: {
    canView: ["VENTURE", "TASK", "POLICY", "KPI"],
    canManage: ["TASK", "POLICY"],
    canImpersonate: true,
    impersonateNotes: "Test impersonation capability.",
    scopeDescription: "All ventures (test mode).",
    notes: "For testing purposes only.",
  },
  CSR: {
    canView: ["VENTURE", "TASK"],
    canManage: ["TASK"],
    canImpersonate: false,
    scopeDescription: "Assigned customers within their offices.",
    notes: "Customer Service Representative; manages customer interactions.",
  },
  DISPATCHER: {
    canView: ["VENTURE", "TASK", "KPI"],
    canManage: ["TASK"],
    canImpersonate: false,
    scopeDescription: "Assigned customers within their offices.",
    notes: "Dispatcher; coordinates logistics operations.",
  },
  CARRIER_TEAM: {
    canView: ["VENTURE", "TASK"],
    canManage: ["TASK"],
    canImpersonate: false,
    scopeDescription: "Carrier-related tasks and ventures.",
    notes: "Carrier team member; manages carrier relationships.",
  },
  ACCOUNTING: {
    canView: ["VENTURE", "TASK", "POLICY", "KPI"],
    canManage: ["TASK", "KPI"],
    canImpersonate: false,
    scopeDescription: "Financial data across ventures.",
    notes: "Accounting team; manages financial records and reporting.",
  },
};

export function getRolePermissions(role: UserRole): RolePermissionSummary {
  return ROLE_MATRIX[role];
}
