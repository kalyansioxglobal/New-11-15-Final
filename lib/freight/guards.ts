// Local alias for logistics load shape; kept loose to avoid Prisma codegen coupling.
// In practice this is compatible with the prisma.logisticsLoad type.
type Load = any;

type FreightUser = {
  id: number;
  ventureId?: number | null;
  ventureIds?: number[];
  isAdmin?: boolean;
  permissions?: string[];
  role?: string;
};

export function assertSameVentureOrAdmin(user: FreightUser, load: Pick<Load, "ventureId">) {
  const isAdmin = user.isAdmin || user.role === "CEO" || user.role === "ADMIN";
  if (!isAdmin && user.ventureId != null && user.ventureId !== load.ventureId) {
    const err: any = new Error("Forbidden: cross-venture access");
    err.statusCode = 403;
    throw err;
  }
}

export function assertPermission(user: FreightUser, permission: string) {
  const isAdmin = user.isAdmin || user.role === "CEO" || user.role === "ADMIN";
  if (isAdmin) return;
  if (!user.permissions?.includes(permission)) {
    const err: any = new Error(`Forbidden: missing permission ${permission}`);
    err.statusCode = 403;
    throw err;
  }
}
