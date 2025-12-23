import type { SessionUser } from "./scope";
import { isGlobalAdmin } from "./scope";

type WhereInput = {
  [key: string]: unknown;
};

export function applyBpoScope(user: SessionUser, baseWhere: WhereInput = {}): WhereInput {
  const where: WhereInput = { ...baseWhere };

  if (isGlobalAdmin(user)) {
    return where;
  }

  if (user.ventureIds && user.ventureIds.length > 0) {
    where.ventureId = { in: user.ventureIds };
  }

  if (user.role === "EMPLOYEE") {
    where.userId = user.id;
  }

  return where;
}
