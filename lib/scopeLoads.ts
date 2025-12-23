import type { SessionUser } from "./scope";
import { isGlobalAdmin, isManagerLike } from "./scope";

type LoadWhereInput = {
  [key: string]: any;
};

export function applyLoadScope(user: SessionUser, baseWhere: LoadWhereInput = {}): LoadWhereInput {
  if (isGlobalAdmin(user)) {
    return baseWhere;
  }

  const scopeCondition = buildScopeCondition(user);
  if (!scopeCondition) {
    return baseWhere;
  }

  const existingAnd = baseWhere.AND;
  const restOfWhere = { ...baseWhere };
  delete restOfWhere.AND;

  const andConditions: any[] = [];

  if (Object.keys(restOfWhere).length > 0) {
    andConditions.push(restOfWhere);
  }

  if (existingAnd) {
    if (Array.isArray(existingAnd)) {
      andConditions.push(...existingAnd);
    } else {
      andConditions.push(existingAnd);
    }
  }

  andConditions.push(scopeCondition);

  return { AND: andConditions };
}

function buildScopeCondition(user: SessionUser): LoadWhereInput | null {
  if (isManagerLike(user)) {
    if (user.ventureIds.length > 0) {
      return {
        OR: [
          { ventureId: { in: user.ventureIds } },
          { ventureId: null },
          {
            customer: {
              OR: [
                { assignedSalesId: user.id },
                { assignedCsrId: user.id },
                { assignedDispatcherId: user.id },
              ],
            },
          },
        ],
      };
    }
    return null;
  }

  if (user.ventureIds.length > 0) {
    return {
      AND: [
        { ventureId: { in: user.ventureIds } },
        {
          customer: {
            OR: [
              { assignedSalesId: user.id },
              { assignedCsrId: user.id },
              { assignedDispatcherId: user.id },
            ],
          },
        },
      ],
    };
  }

  return {
    customer: {
      OR: [
        { assignedSalesId: user.id },
        { assignedCsrId: user.id },
        { assignedDispatcherId: user.id },
      ],
    },
  };
}
