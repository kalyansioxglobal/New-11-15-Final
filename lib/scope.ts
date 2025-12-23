import type { UserRole } from './permissions';
import { ROLE_CONFIG } from './permissions';
import { isLeadership } from './permissions';

// Lightweight local shapes, to avoid tight coupling to Prisma client types.
type Load = {
  ventureId?: number | null;
  customer?: CustomerWithAssignments | null;
};

type InsurancePolicy = {
  ventureId: number | null;
};

export type Role = UserRole;

export type SessionUser = {
  id: number;
  email: string;
  fullName: string | null;
  name?: string | null; // Legacy alias for fullName
  role: Role;
  isTestUser: boolean;
  ventureIds: number[];
  officeIds: number[];
};

export type CustomerWithAssignments = {
  id: number;
  ventureId: number | null;
  assignedSalesId: number | null;
  assignedCsrId: number | null;
  assignedDispatcherId: number | null;
};

export type LoadWithCustomer = Load & {
  customer?: CustomerWithAssignments | null;
};

export type UserScope = {
  allVentures: boolean;
  allOffices: boolean;
  ventureIds: number[];
  officeIds: number[];
};

export function getUserScope(user: SessionUser): UserScope {
  const cfg = ROLE_CONFIG[user.role];

  return {
    allVentures: cfg.ventureScope === 'all',
    allOffices: cfg.officeScope === 'all',
    ventureIds: cfg.ventureScope === 'all' ? [] : user.ventureIds,
    officeIds: cfg.officeScope === 'all' ? [] : user.officeIds,
  };
}

export function assertCanAccessVenture(scope: UserScope, ventureId: number) {
  if (!scope.allVentures && !scope.ventureIds.includes(ventureId)) {
    throw new Error('FORBIDDEN_VENTURE');
  }
}

export function assertCanAccessOffice(scope: UserScope, officeId: number) {
  if (!scope.allOffices && !scope.officeIds.includes(officeId)) {
    throw new Error('FORBIDDEN_OFFICE');
  }
}

export function enforceScope(
  user: SessionUser,
  target: { ventureId?: number; officeId?: number }
): boolean {
  const scope = getUserScope(user);

  if (target.ventureId !== undefined) {
    if (!scope.allVentures && !scope.ventureIds.includes(target.ventureId)) {
      return false;
    }
  }

  if (target.officeId !== undefined) {
    if (!scope.allOffices && !scope.officeIds.includes(target.officeId)) {
      return false;
    }
  }

  return true;
}

// ─────────────────────────────────────────────────────────────
// CUSTOMER VISIBILITY
// ─────────────────────────────────────────────────────────────

export function isGlobalAdmin(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'CEO' || user.role === 'ADMIN';
}

export function isManagerLike(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  return isLeadership(user) || user.role === 'OFFICE_MANAGER' || user.role === 'TEAM_LEAD';
}

export function userHasAccessToVenture(user: SessionUser, ventureId: number | null): boolean {
  if (isGlobalAdmin(user)) return true;
  if (!ventureId) return false;
  return user.ventureIds.includes(ventureId);
}

export function canViewCustomer(
  user: SessionUser | null | undefined,
  customer: CustomerWithAssignments
): boolean {
  if (!user) return false;

  if (isGlobalAdmin(user)) return true;

  if (customer.assignedSalesId === user.id) return true;
  if (customer.assignedCsrId === user.id) return true;
  if (customer.assignedDispatcherId === user.id) return true;

  if (isManagerLike(user)) {
    if (!customer.ventureId) return true;
    if (userHasAccessToVenture(user, customer.ventureId)) return true;
  }

  return false;
}

export function customerWhereForUser(user: SessionUser) {
  if (isGlobalAdmin(user)) {
    return {};
  }

  const assignmentFilter = {
    OR: [
      { assignedSalesId: user.id },
      { assignedCsrId: user.id },
      { assignedDispatcherId: user.id },
    ],
  };

  if (isManagerLike(user)) {
    if (user.ventureIds.length > 0) {
      return {
        OR: [
          { ventureId: { in: user.ventureIds } },
          { ventureId: null },
          assignmentFilter,
        ],
      };
    }
    return {
      OR: [
        { ventureId: null },
        assignmentFilter,
      ],
    };
  }

  if (user.ventureIds.length > 0) {
    return {
      AND: [
        { ventureId: { in: user.ventureIds } },
        assignmentFilter,
      ],
    };
  }

  return assignmentFilter;
}

// ─────────────────────────────────────────────────────────────
// LOAD VISIBILITY (scoped by customer)
// ─────────────────────────────────────────────────────────────

export function canViewLoad(
  user: SessionUser | null | undefined,
  load: LoadWithCustomer
): boolean {
  if (!user) return false;

  if (isGlobalAdmin(user)) return true;

  if (load.customer) {
    return canViewCustomer(user, load.customer);
  }

  if (isManagerLike(user)) {
    if (!load.ventureId) return true;
    if (userHasAccessToVenture(user, load.ventureId)) return true;
  }

  return false;
}

export function loadWhereForUser(user: SessionUser) {
  if (isGlobalAdmin(user)) {
    return {};
  }

  const customerAssignmentFilter = {
    customer: {
      OR: [
        { assignedSalesId: user.id },
        { assignedCsrId: user.id },
        { assignedDispatcherId: user.id },
      ],
    },
  };

  if (isManagerLike(user)) {
    if (user.ventureIds.length > 0) {
      return {
        OR: [
          { ventureId: { in: user.ventureIds } },
          { ventureId: null },
          customerAssignmentFilter,
        ],
      };
    }
    return {
      OR: [
        { ventureId: null },
        customerAssignmentFilter,
      ],
    };
  }

  if (user.ventureIds.length > 0) {
    return {
      AND: [
        { ventureId: { in: user.ventureIds } },
        customerAssignmentFilter,
      ],
    };
  }

  return customerAssignmentFilter;
}

// ─────────────────────────────────────────────────────────────
// INSURANCE POLICY VISIBILITY
// ─────────────────────────────────────────────────────────────

export function canViewPolicy(
  user: SessionUser | null | undefined,
  policy: InsurancePolicy
): boolean {
  if (!user) return false;

  if (isGlobalAdmin(user)) return true;

  if (!userHasAccessToVenture(user, policy.ventureId)) return false;

  return true;
}

export function policyWhereForUser(user: SessionUser) {
  if (isGlobalAdmin(user)) {
    return {};
  }

  if (user.ventureIds.length > 0) {
    return { ventureId: { in: user.ventureIds } };
  }

  return { id: -1 };
}

export function canManagePolicy(
  user: SessionUser | null | undefined,
  ventureId: number
): boolean {
  if (!user) return false;

  if (isGlobalAdmin(user)) return true;

  if (isManagerLike(user) && userHasAccessToVenture(user, ventureId)) return true;

  return false;
}
