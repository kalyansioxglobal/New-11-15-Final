import type { SessionUser } from "@/lib/scope";

export type AnalyticsScopeInput = {
  user: SessionUser;
  ventureId?: string;
  officeId?: string;
  propertyId?: string;
  userId?: string;
};

export function buildFreightScopeWhere(scope: AnalyticsScopeInput) {
  const { ventureId, officeId, userId } = scope;

  const where: any = {};

  if (ventureId) {
    where.ventureId = parseInt(ventureId, 10);
  }
  if (officeId) {
    where.officeId = parseInt(officeId, 10);
  }
  if (userId) {
    where.OR = [
      { salesRepId: parseInt(userId, 10) },
      { csrId: parseInt(userId, 10) },
      { dispatcherId: parseInt(userId, 10) },
    ];
  }

  return where;
}

export function buildHotelScopeWhere(scope: AnalyticsScopeInput) {
  const { ventureId, propertyId } = scope;

  const where: any = {};

  if (ventureId) {
    where.ventureId = parseInt(ventureId, 10);
  }
  if (propertyId) {
    where.hotelId = parseInt(propertyId, 10);
  }

  return where;
}

export function buildBpoScopeWhere(scope: AnalyticsScopeInput) {
  const { ventureId, officeId, userId } = scope;

  const where: any = {};

  if (ventureId) {
    where.ventureId = parseInt(ventureId, 10);
  }
  if (officeId) {
    where.officeId = parseInt(officeId, 10);
  }
  if (userId) {
    where.userId = parseInt(userId, 10);
  }

  return where;
}
