export type ScopeLevel = "all" | "assigned" | "none";

export type RoleConfig = {
  label: string;
  ventureScope: ScopeLevel;
  officeScope: ScopeLevel;
  canAccessAdminPanel: boolean;
  canImpersonate: boolean;
  task: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    assign: boolean;
    view: boolean;
  };
  policy: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    view: boolean;
    verify?: boolean;
  };
  canManageUsers: boolean;
  canUploadKpis: boolean;
  canViewKpis: boolean;
};

export const ROLE_CONFIG: Record<string, RoleConfig> = {
  CEO: {
    label: "CEO",
    ventureScope: "all",
    officeScope: "all",
    canAccessAdminPanel: true,
    canImpersonate: true,
    task: { create: true, edit: true, delete: true, assign: true, view: true },
    policy: { create: true, edit: true, delete: true, view: true, verify: true },
    canManageUsers: true,
    canUploadKpis: true,
    canViewKpis: true,
  },
  ADMIN: {
    label: "Admin",
    ventureScope: "all",
    officeScope: "all",
    canAccessAdminPanel: true,
    canImpersonate: true,
    task: { create: true, edit: true, delete: true, assign: true, view: true },
    policy: { create: true, edit: true, delete: true, view: true, verify: true },
    canManageUsers: true,
    canUploadKpis: true,
    canViewKpis: true,
  },
  COO: {
    label: "COO / Director",
    ventureScope: "all",
    officeScope: "all",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: true, edit: true, delete: false, assign: true, view: true },
    policy: { create: true, edit: true, delete: false, view: true, verify: true },
    canManageUsers: false,
    canUploadKpis: true,
    canViewKpis: true,
  },
  VENTURE_HEAD: {
    label: "Venture Head",
    ventureScope: "assigned",
    officeScope: "all",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: true, edit: true, delete: false, assign: true, view: true },
    policy: { create: true, edit: true, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  OFFICE_MANAGER: {
    label: "Office Manager",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: true, edit: true, delete: false, assign: true, view: true },
    policy: { create: true, edit: true, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  TEAM_LEAD: {
    label: "Team Lead",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: true, edit: true, delete: false, assign: true, view: true },
    policy: { create: false, edit: false, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  EMPLOYEE: {
    label: "Employee",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: false, edit: false, delete: false, assign: false, view: true },
    policy: { create: false, edit: false, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  CONTRACTOR: {
    label: "Contractor",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: false, edit: false, delete: false, assign: false, view: true },
    policy: { create: false, edit: false, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  AUDITOR: {
    label: "Auditor / Compliance",
    ventureScope: "all",
    officeScope: "all",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: false, edit: false, delete: false, assign: false, view: true },
    policy: { create: false, edit: true, delete: false, view: true, verify: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  FINANCE: {
    label: "Finance",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: true, edit: true, delete: false, assign: false, view: true },
    policy: { create: false, edit: true, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: true,
    canViewKpis: true,
  },
  HR_ADMIN: {
    label: "HR Admin",
    ventureScope: "all",
    officeScope: "all",
    canAccessAdminPanel: true,
    canImpersonate: false,
    task: { create: true, edit: true, delete: false, assign: true, view: true },
    policy: { create: true, edit: true, delete: false, view: true },
    canManageUsers: true,
    canUploadKpis: false,
    canViewKpis: true,
  },
  TEST_USER: {
    label: "Test User",
    ventureScope: "all",
    officeScope: "all",
    canAccessAdminPanel: false,
    canImpersonate: true,
    task: { create: true, edit: true, delete: true, assign: true, view: true },
    policy: { create: true, edit: true, delete: true, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  CSR: {
    label: "CSR (Customer Service)",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: true, edit: true, delete: false, assign: false, view: true },
    policy: { create: false, edit: false, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  DISPATCHER: {
    label: "Dispatcher",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: true, edit: true, delete: false, assign: false, view: true },
    policy: { create: false, edit: false, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  CARRIER_TEAM: {
    label: "Carrier Team",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: false, edit: false, delete: false, assign: false, view: true },
    policy: { create: false, edit: false, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
  ACCOUNTING: {
    label: "Accounting",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: false, edit: false, delete: false, assign: false, view: true },
    policy: { create: false, edit: true, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: true,
    canViewKpis: true,
  },
  SALESPERSON: {
    label: "Salesperson",
    ventureScope: "assigned",
    officeScope: "assigned",
    canAccessAdminPanel: false,
    canImpersonate: false,
    task: { create: true, edit: true, delete: false, assign: false, view: true },
    policy: { create: false, edit: false, delete: false, view: true },
    canManageUsers: false,
    canUploadKpis: false,
    canViewKpis: true,
  },
};

export type UserRole = keyof typeof ROLE_CONFIG;


export type PortfolioResource =
  | "LOGISTICS_PNL_VIEW"
  | "LOGISTICS_LOSS_INSIGHTS_VIEW"
  | "LOGISTICS_DASHBOARD_VIEW"
  | "HOTEL_PORTFOLIO_VIEW"
  | "HOTEL_LOSS_NIGHTS_VIEW"
  | "BPO_DASHBOARD_VIEW"
  | "SAAS_PORTFOLIO_VIEW";

const PORTFOLIO_RESOURCE_ROLES: Record<PortfolioResource, UserRole[]> = {
  LOGISTICS_PNL_VIEW: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"],
  LOGISTICS_LOSS_INSIGHTS_VIEW: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"],
  LOGISTICS_DASHBOARD_VIEW: [
    "CEO",
    "ADMIN",
    "COO",
    "VENTURE_HEAD",
    "OFFICE_MANAGER",
    "TEAM_LEAD",
  ],
  HOTEL_PORTFOLIO_VIEW: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"],
  HOTEL_LOSS_NIGHTS_VIEW: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"],
  BPO_DASHBOARD_VIEW: ["CEO", "ADMIN", "COO", "VENTURE_HEAD"],
  SAAS_PORTFOLIO_VIEW: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"],
};

export function canViewPortfolioResource(
  user: { role: UserRole },
  resource: PortfolioResource
): boolean {
  if (isSuperAdmin(user.role)) return true;
  const allowedRoles = PORTFOLIO_RESOURCE_ROLES[resource];
  return allowedRoles.includes(user.role);
}


// Permission Matrix types for dynamic permissions
export type PermissionAction = "none" | "view" | "edit" | "manage";

export type PermissionMatrixJson = {
  [role in UserRole]: {
    tasks?: PermissionAction;
    ventures?: PermissionAction;
    users?: PermissionAction;
    impersonate?: boolean;
    logistics?: PermissionAction;
    hotels?: PermissionAction;
    approvals?: PermissionAction;
    accounting?: PermissionAction;
  };
};

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrixJson = {
  CEO: { tasks: "manage", ventures: "manage", users: "manage", impersonate: true, logistics: "manage", hotels: "manage", approvals: "manage", accounting: "manage" },
  ADMIN: { tasks: "manage", ventures: "manage", users: "manage", impersonate: true, logistics: "manage", hotels: "manage", approvals: "manage", accounting: "manage" },
  COO: { tasks: "manage", ventures: "view", users: "view", impersonate: false, logistics: "manage", hotels: "manage", approvals: "manage", accounting: "view" },
  VENTURE_HEAD: { tasks: "manage", ventures: "view", users: "view", impersonate: false, logistics: "manage", hotels: "manage", approvals: "manage", accounting: "view" },
  OFFICE_MANAGER: { tasks: "manage", ventures: "view", users: "view", impersonate: false, logistics: "manage", hotels: "view", approvals: "view", accounting: "none" },
  TEAM_LEAD: { tasks: "edit", ventures: "view", users: "none", impersonate: false, logistics: "edit", hotels: "view", approvals: "view", accounting: "none" },
  EMPLOYEE: { tasks: "view", ventures: "view", users: "none", impersonate: false, logistics: "view", hotels: "view", approvals: "none", accounting: "none" },
  CONTRACTOR: { tasks: "view", ventures: "view", users: "none", impersonate: false, logistics: "view", hotels: "view", approvals: "none", accounting: "none" },
  AUDITOR: { tasks: "view", ventures: "view", users: "none", impersonate: false, logistics: "view", hotels: "view", approvals: "view", accounting: "view" },
  FINANCE: { tasks: "view", ventures: "view", users: "none", impersonate: false, logistics: "view", hotels: "view", approvals: "view", accounting: "manage" },
  HR_ADMIN: { tasks: "edit", ventures: "view", users: "manage", impersonate: false, logistics: "view", hotels: "view", approvals: "view", accounting: "none" },
  TEST_USER: { tasks: "manage", ventures: "view", users: "none", impersonate: true, logistics: "manage", hotels: "manage", approvals: "manage", accounting: "none" },
  CSR: { tasks: "edit", ventures: "view", users: "none", impersonate: false, logistics: "manage", hotels: "none", approvals: "view", accounting: "none" },
  DISPATCHER: { tasks: "edit", ventures: "view", users: "none", impersonate: false, logistics: "manage", hotels: "none", approvals: "view", accounting: "none" },
  CARRIER_TEAM: { tasks: "view", ventures: "view", users: "none", impersonate: false, logistics: "manage", hotels: "none", approvals: "manage", accounting: "none" },
  ACCOUNTING: { tasks: "view", ventures: "view", users: "none", impersonate: false, logistics: "view", hotels: "view", approvals: "view", accounting: "manage" },
};

export function canManageUsersMatrix(role: UserRole, matrix: PermissionMatrixJson = DEFAULT_PERMISSION_MATRIX): boolean {
  return (matrix[role]?.users ?? "none") === "manage";
}

export function canImpersonateMatrix(role: UserRole, matrix: PermissionMatrixJson = DEFAULT_PERMISSION_MATRIX): boolean {
  return !!matrix[role]?.impersonate;
}

export function getRoleConfig(role: UserRole): RoleConfig {
  return ROLE_CONFIG[role];
}

export function canAccessAdminPanel(role: UserRole): boolean {
  return ROLE_CONFIG[role].canAccessAdminPanel;
}

export function canImpersonate(role: UserRole): boolean {
  return ROLE_CONFIG[role].canImpersonate;
}

export function canManageUsers(role: UserRole): boolean {
  return ROLE_CONFIG[role].canManageUsers;
}

export function canUploadKpis(role: UserRole): boolean {
  return ROLE_CONFIG[role].canUploadKpis;
}

export function canViewKpis(role: UserRole): boolean {
  return ROLE_CONFIG[role].canViewKpis;
}

export function canManageTasks(role: UserRole): boolean {
  const cfg = ROLE_CONFIG[role].task;
  return cfg.create || cfg.edit || cfg.delete || cfg.assign;
}

export function canViewTasks(role: UserRole): boolean {
  return ROLE_CONFIG[role].task.view;
}

export function canCreateTasks(role: UserRole): boolean {
  return ROLE_CONFIG[role].task.create;
}

export function canEditTasks(role: UserRole): boolean {
  return ROLE_CONFIG[role].task.edit;
}

export function canDeleteTasks(role: UserRole): boolean {
  return ROLE_CONFIG[role].task.delete;
}

export function canAssignTasks(role: UserRole): boolean {
  return ROLE_CONFIG[role].task.assign;
}

export function canEditPolicies(role: UserRole): boolean {
  const cfg = ROLE_CONFIG[role].policy;
  return cfg.create || cfg.edit || cfg.delete;
}

export function canVerifyPolicies(role: UserRole): boolean {
  return !!ROLE_CONFIG[role].policy.verify;
}

type VentureAssignment = { ventureId: number };
type OfficeAssignment = { officeId: number };

type User = {
  role?: UserRole | null;
  ventures?: VentureAssignment[];
  offices?: OfficeAssignment[];
};

type Entity = {
  ventureId?: number | null;
  officeId?: number | null;
};

export function hasPermission(
  user: User | null | undefined,
  action: string,
  type: "task" | "policy" | "admin" | "impersonate"
): boolean {
  if (!user || !user.role) return false;

  const config = ROLE_CONFIG[user.role];
  if (!config) return false;

  if (type === "task") {
    return config.task[action as keyof typeof config.task] ?? false;
  }

  if (type === "policy") {
    return config.policy[action as keyof typeof config.policy] ?? false;
  }

  if (type === "admin") {
    return config.canAccessAdminPanel;
  }

  if (type === "impersonate") {
    return config.canImpersonate;
  }

  return false;
}

export function canAccessVentures(user: User | null | undefined): ScopeLevel | false {
  if (!user || !user.role) return false;
  return ROLE_CONFIG[user.role]?.ventureScope || false;
}

export function canAccessOffices(user: User | null | undefined): ScopeLevel | false {
  if (!user || !user.role) return false;
  return ROLE_CONFIG[user.role]?.officeScope || false;
}

export function enforceScope(
  user: User | null | undefined,
  entity: Entity
): boolean {
  if (!user || !user.role) return false;

  const config = ROLE_CONFIG[user.role];
  if (!config) return false;

  if (config.ventureScope === "all" && config.officeScope === "all") {
    return true;
  }

  if (entity.ventureId && config.ventureScope === "assigned" && user.ventures) {
    const hasVenture = user.ventures.some((v) => v.ventureId === entity.ventureId);
    if (!hasVenture) return false;
  }

  if (entity.officeId && config.officeScope === "assigned" && user.offices) {
    const hasOffice = user.offices.some((o) => o.officeId === entity.officeId);
    if (!hasOffice) return false;
  }

  return true;
}

export type Action =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "assign"
  | "impersonate"
  | "updateStatus";

export type Resource =
  | "VENTURE"
  | "TASK"
  | "POLICY"
  | "USER"
  | "KPI"
  | "AUDIT_LOG";

export type PermissionContext = {
  ventureId?: number | null;
  officeId?: number | null;
  targetUserRole?: UserRole;
  assigneeId?: number;
};

export function isSuperAdmin(role: UserRole): boolean {
  return role === "CEO" || role === "ADMIN";
}

export function can(
  user: {
    id: number;
    role: UserRole;
    ventureIds?: number[];
    officeIds?: number[];
  },
  action: Action,
  resource: Resource,
  ctx: PermissionContext = {}
): boolean {
  const { role } = user;

  if (isSuperAdmin(role)) {
    if (resource === "USER" && action === "impersonate") {
      if (role === "ADMIN" && ctx.targetUserRole === "CEO") return false;
      return true;
    }
    return true;
  }

  const config = ROLE_CONFIG[role];
  if (!config) return false;

  switch (resource) {
    case "VENTURE":
      return canVentureAction(user, action, ctx, config);
    case "TASK":
      return canTaskAction(user, action, ctx, config);
    case "POLICY":
      return canPolicyAction(user, action, ctx, config);
    case "USER":
      return config.canManageUsers;
    case "KPI":
      return canKpiAction(user, action, ctx, config);
    case "AUDIT_LOG":
      return false;
    default:
      return false;
  }
}

function inScope(ids: number[] | undefined, id?: number | null): boolean {
  if (id == null) return false;
  if (!ids) return false;
  return ids.includes(id);
}

function canVentureAction(
  user: { ventureIds?: number[] },
  action: Action,
  ctx: PermissionContext,
  config: RoleConfig
): boolean {
  if (action === "view") {
    if (config.ventureScope === "all") return true;
    return ctx.ventureId ? inScope(user.ventureIds, ctx.ventureId) : true;
  }
  return false;
}

function canTaskAction(
  user: { id: number; ventureIds?: number[]; officeIds?: number[] },
  action: Action,
  ctx: PermissionContext,
  config: RoleConfig
): boolean {
  if (action === "view") {
    if (config.task.view) {
      if (config.ventureScope === "all") return true;
      if (ctx.ventureId && inScope(user.ventureIds, ctx.ventureId)) return true;
      if (ctx.officeId && inScope(user.officeIds, ctx.officeId)) return true;
    }
    return false;
  }

  if (action === "create" || action === "assign") {
    if (!config.task.create && !config.task.assign) return false;
    if (config.ventureScope === "all") return true;
    if (ctx.ventureId && inScope(user.ventureIds, ctx.ventureId)) return true;
    if (ctx.officeId && inScope(user.officeIds, ctx.officeId)) return true;
    return false;
  }

  if (action === "edit") {
    if (!config.task.edit) return false;
    if (config.ventureScope === "all") return true;
    if (ctx.ventureId && inScope(user.ventureIds, ctx.ventureId)) return true;
    if (ctx.officeId && inScope(user.officeIds, ctx.officeId)) return true;
    return false;
  }

  if (action === "delete") {
    if (!config.task.delete) return false;
    if (config.ventureScope === "all") return true;
    if (ctx.ventureId && inScope(user.ventureIds, ctx.ventureId)) return true;
    return false;
  }

  if (action === "updateStatus") {
    if (ctx.assigneeId && ctx.assigneeId === user.id) return true;
    if (config.task.edit) {
      if (config.ventureScope === "all") return true;
      if (ctx.ventureId && inScope(user.ventureIds, ctx.ventureId)) return true;
      if (ctx.officeId && inScope(user.officeIds, ctx.officeId)) return true;
    }
    return false;
  }

  return false;
}

function canPolicyAction(
  user: { ventureIds?: number[] },
  action: Action,
  ctx: PermissionContext,
  config: RoleConfig
): boolean {
  if (action === "view") {
    if (config.policy.view) {
      if (config.ventureScope === "all") return true;
      return ctx.ventureId ? inScope(user.ventureIds, ctx.ventureId) : true;
    }
    return false;
  }

  if (action === "create" || action === "edit") {
    if (!config.policy.create && !config.policy.edit) return false;
    if (config.ventureScope === "all") return true;
    return ctx.ventureId ? inScope(user.ventureIds, ctx.ventureId) : false;
  }

  if (action === "delete") {
    if (!config.policy.delete) return false;
    if (config.ventureScope === "all") return true;
    return ctx.ventureId ? inScope(user.ventureIds, ctx.ventureId) : false;
  }

  return false;
}

function canKpiAction(
  user: { ventureIds?: number[] },
  action: Action,
  ctx: PermissionContext,
  config: RoleConfig
): boolean {
  if (action === "view") {
    if (!config.canViewKpis) return false;
    if (config.ventureScope === "all") return true;
    return ctx.ventureId ? inScope(user.ventureIds, ctx.ventureId) : true;
  }

  if (action === "create" || action === "edit") {
    if (!config.canUploadKpis) return false;
    if (config.ventureScope === "all") return true;
    return ctx.ventureId ? inScope(user.ventureIds, ctx.ventureId) : false;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════
// JOB ROLE-BASED PERMISSION HELPERS
// Two-Level Role System: SystemRole (UserRole) for permissions + JobRole for real-world titles
// ═══════════════════════════════════════════════════════════════

type UserWithJobRole = {
  role: UserRole;
  jobRole?: { name: string; isManager: boolean } | null;
};

export function isCEO(user: { role: UserRole }): boolean {
  return user.role === "CEO";
}

export function isAdmin(user: { role: UserRole }): boolean {
  return user.role === "ADMIN";
}

export function isExecutive(user: { role: UserRole }): boolean {
  return user.role === "CEO" || user.role === "COO" || user.role === "ADMIN";
}

export function isLeadership(user: { role: UserRole }): boolean {
  const LEADERSHIP_ROLES: UserRole[] = ["CEO", "ADMIN", "COO", "VENTURE_HEAD"];
  return LEADERSHIP_ROLES.includes(user.role);
}

export function isVentureHead(user: { role: UserRole }): boolean {
  return user.role === "VENTURE_HEAD";
}

export function isOfficeManager(user: { role: UserRole }): boolean {
  return user.role === "OFFICE_MANAGER";
}

export function isJobRoleManager(user: UserWithJobRole): boolean {
  return user.jobRole?.isManager === true;
}

export function hasJobRole(user: UserWithJobRole, roleNames: string[]): boolean {
  if (!user.jobRole?.name) return false;
  return roleNames.includes(user.jobRole.name);
}

// ─────────────────────────────────────────────────────────────
// LOGISTICS: Sales Dashboard Access
// ─────────────────────────────────────────────────────────────
const SALES_ROLES = [
  "Sales Executive",
  "Sales Team Lead",
  "Sales Manager",
  "Head of Sales",
];

export function canViewSalesDashboard(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, SALES_ROLES)
  );
}

export function canViewSalesRankings(user: UserWithJobRole): boolean {
  return canViewSalesDashboard(user);
}

// ─────────────────────────────────────────────────────────────
// LOGISTICS: CSR Dashboard Access
// ─────────────────────────────────────────────────────────────
const CSR_ROLES = ["CSR", "CSR Team Lead"];

export function canViewCsrDashboard(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, [...CSR_ROLES, ...SALES_ROLES])
  );
}

export function canViewCsrMarginBoard(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, ["CSR Team Lead", "Venture Manager"])
  );
}

// ─────────────────────────────────────────────────────────────
// LOGISTICS: Dispatch Dashboard Access
// ─────────────────────────────────────────────────────────────
const DISPATCH_ROLES = [
  "Dispatcher",
  "Dispatch Team Lead",
  "Transport Dispatcher",
];

export function canAccessDispatchBoard(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, DISPATCH_ROLES)
  );
}

// ─────────────────────────────────────────────────────────────
// LOGISTICS: Carrier Team Access
// ─────────────────────────────────────────────────────────────
const CARRIER_ROLES = [
  "Carrier Compliance Specialist",
  "Carrier Onboarding",
  "Carrier Sales Person",
  "Carrier Sales Onboarder",
];

export function canManageCarriers(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, [...CARRIER_ROLES, ...DISPATCH_ROLES])
  );
}

// ─────────────────────────────────────────────────────────────
// LOGISTICS: Accounting Access
// ─────────────────────────────────────────────────────────────
const ACCOUNTING_ROLES = [
  "AR",
  "AP",
  "Accounting Manager",
  "Transport Accountant",
];

export function canAccessAccounting(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, ACCOUNTING_ROLES)
  );
}

// ─────────────────────────────────────────────────────────────
// HOSPITALITY: Hotel Management Access
// ─────────────────────────────────────────────────────────────
const HOTEL_MANAGEMENT_ROLES = [
  "General Manager",
  "Operations Manager",
  "AGM",
  "Front Desk Manager",
];

export function canManageHotels(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, HOTEL_MANAGEMENT_ROLES)
  );
}

const HOTEL_STAFF_ROLES = [
  "Front Desk Associate",
  "Front Desk Supervisor",
  "Room Attendant",
  "Housekeeping Supervisor",
  "Housekeeping Manager",
  "Maintenance Tech",
  "Maintenance Supervisor",
];

export function canViewHotelOps(user: UserWithJobRole): boolean {
  return (
    canManageHotels(user) ||
    hasJobRole(user, HOTEL_STAFF_ROLES)
  );
}

// ─────────────────────────────────────────────────────────────
// SAAS (Rank Me Now): Revenue & Reputation Access
// ─────────────────────────────────────────────────────────────
const RMN_REVENUE_ROLES = [
  "Revenue Manager",
  "Head of Revenue Management",
  "Head of Revenue & Reputation",
];

const RMN_REPUTATION_ROLES = [
  "Review Response Agent",
  "Reputation Manager",
];

export function canManageRankMeNowAnalytics(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, RMN_REVENUE_ROLES)
  );
}

export function canManageReputationResponses(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, [...RMN_REVENUE_ROLES, ...RMN_REPUTATION_ROLES])
  );
}

// ─────────────────────────────────────────────────────────────
// BPO (RevenelX): Agent & Campaign Access
// ─────────────────────────────────────────────────────────────
const BPO_ROLES = [
  "BPO Agent",
  "Client Account Owner",
  "Sales Manager",
];

export function canViewBpoCampaigns(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, BPO_ROLES)
  );
}

export function canManageBpoAgents(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, ["Client Account Owner"])
  );
}

// ─────────────────────────────────────────────────────────────
// TRANSPORT: Fleet & Driver Management
// ─────────────────────────────────────────────────────────────
const TRANSPORT_MANAGEMENT_ROLES = [
  "Fleet Manager",
  "Driver Manager",
];

const TRANSPORT_SAFETY_ROLES = [
  "Safety Officer",
  "Compliance Coordinator",
];

export function canManageFleet(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    hasJobRole(user, TRANSPORT_MANAGEMENT_ROLES)
  );
}

export function canManageDriverSafety(user: UserWithJobRole): boolean {
  return (
    canManageFleet(user) ||
    hasJobRole(user, TRANSPORT_SAFETY_ROLES)
  );
}

// ─────────────────────────────────────────────────────────────
// GENERAL: Manager-level checks
// ─────────────────────────────────────────────────────────────
export function isAnyManager(user: UserWithJobRole): boolean {
  return (
    isExecutive(user) ||
    isVentureHead(user) ||
    isOfficeManager(user) ||
    user.role === "TEAM_LEAD" ||
    isJobRoleManager(user)
  );
}

export function canViewTeamKpis(user: UserWithJobRole): boolean {
  return isAnyManager(user);
}

export function canViewEmployeeRankings(user: UserWithJobRole): boolean {
  return (
    isLeadership(user) ||
    isOfficeManager(user) ||
    isJobRoleManager(user)
  );
}

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

// ─────────────────────────────────────────────────────────────
// GAMIFICATION: Config Management Access
// ─────────────────────────────────────────────────────────────

export function canManageGamificationConfig(user: { role: UserRole }): boolean {
  const ALLOWED_ROLES: UserRole[] = ["CEO", "ADMIN", "COO"];
  return ALLOWED_ROLES.includes(user.role);
}

// ─────────────────────────────────────────────────────────────
// IMPORT: Data Import Access
// ─────────────────────────────────────────────────────────────

export function canUploadImports(user: { role: UserRole }): boolean {
  const ALLOWED_ROLES: UserRole[] = [
    "CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "FINANCE"
  ];
  return ALLOWED_ROLES.includes(user.role);
}
