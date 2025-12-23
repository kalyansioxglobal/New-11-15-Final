import { prisma } from "@/lib/prisma";

// Local aliases for audit enums. These are kept as string-based types
// to decouple build-time types from the Prisma client codegen.
type AuditModule = string;
type AuditSeverity = string;
type AuditIssueStatus = string;

type RunAuditArgs = {
  initiatedByUserId?: number;
  scopeVentureId?: number;
  scopeOfficeId?: number;
  scopePropertyId?: number;
};

type CheckResult = {
  checkKey: string;
  module: AuditModule;
  severity: AuditSeverity;
  issues: {
    targetType: string;
    targetId: string;
    message: string;
    details?: Record<string, unknown>;
  }[];
};

async function getCheckMeta(key: string) {
  const check = await prisma.auditCheck.findUnique({ where: { key } });
  if (!check) {
    throw new Error(`AuditCheck not found for key ${key}`);
  }
  return check;
}

async function checkFreightNegativeMarginLoads(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "freight.negative_margin_loads";
  const check = await getCheckMeta(checkKey);

  const where: Record<string, unknown> = {
    loadStatus: "DELIVERED",
  };
  if (args.scopeVentureId) where.ventureId = args.scopeVentureId;
  if (args.scopeOfficeId) where.officeId = args.scopeOfficeId;

  const loads = await prisma.load.findMany({
    where,
    select: {
      id: true,
      billAmount: true,
      costAmount: true,
      ventureId: true,
      officeId: true,
    },
  });

  const issues = loads
    .filter((l: any) => l.costAmount && l.billAmount && l.costAmount > l.billAmount)
    .map((l: any) => ({
      targetType: "LOAD",
      targetId: String(l.id),
      message: "Load has negative margin (costAmount > billAmount).",
      details: {
        ventureId: l.ventureId,
        officeId: l.officeId,
        billAmount: l.billAmount,
        costAmount: l.costAmount,
      },
    }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkFreightCompletedMissingDeliveredAt(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "freight.completed_missing_delivered_at";
  const check = await getCheckMeta(checkKey);

  const where: Record<string, unknown> = {
    loadStatus: "DELIVERED",
    actualDeliveryAt: null,
  };
  if (args.scopeVentureId) where.ventureId = args.scopeVentureId;
  if (args.scopeOfficeId) where.officeId = args.scopeOfficeId;

  const loads = await prisma.load.findMany({
    where,
    select: {
      id: true,
      ventureId: true,
      officeId: true,
      createdAt: true,
    },
  });

  const issues = loads.map((l: any) => ({
    targetType: "LOAD",
    targetId: String(l.id),
    message: "Delivered load missing actualDeliveryAt.",
    details: {
      ventureId: l.ventureId,
      officeId: l.officeId,
      createdAt: l.createdAt,
    },
  }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkFreightZeroMilesWithRevenue(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "freight.zero_miles_with_revenue";
  const check = await getCheckMeta(checkKey);

  const where: Record<string, unknown> = {
    billAmount: { gt: 0 },
  };
  if (args.scopeVentureId) where.ventureId = args.scopeVentureId;
  if (args.scopeOfficeId) where.officeId = args.scopeOfficeId;

  const loads = await prisma.load.findMany({
    where,
    select: {
      id: true,
      ventureId: true,
      officeId: true,
      billAmount: true,
      rate: true,
      loadStatus: true,
    },
  });

  const issues = loads
    .filter((l: any) => !l.rate || l.rate === 0)
    .map((l: any) => ({
      targetType: "LOAD",
      targetId: String(l.id),
      message: "Load has revenue but no rate/RPM set.",
      details: {
        ventureId: l.ventureId,
        officeId: l.officeId,
        billAmount: l.billAmount,
        rate: l.rate ?? 0,
        loadStatus: l.loadStatus,
      },
    }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkFreightCompletedMissingCarrier(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "freight.completed_missing_carrier";
  const check = await getCheckMeta(checkKey);

  const where: Record<string, unknown> = {
    loadStatus: "DELIVERED",
    carrierId: null,
  };
  if (args.scopeVentureId) where.ventureId = args.scopeVentureId;
  if (args.scopeOfficeId) where.officeId = args.scopeOfficeId;

  const loads = await prisma.load.findMany({
    where,
    select: {
      id: true,
      ventureId: true,
      officeId: true,
    },
  });

  const issues = loads.map((l: any) => ({
    targetType: "LOAD",
    targetId: String(l.id),
    message: "Delivered load missing carrierId.",
    details: {
      ventureId: l.ventureId,
      officeId: l.officeId,
    },
  }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkFreightOldDraftLoads(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "freight.old_draft_loads";
  const check = await getCheckMeta(checkKey);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  const where: Record<string, unknown> = {
    loadStatus: "OPEN",
    createdAt: { lt: cutoff },
  };
  if (args.scopeVentureId) where.ventureId = args.scopeVentureId;
  if (args.scopeOfficeId) where.officeId = args.scopeOfficeId;

  const loads = await prisma.load.findMany({
    where,
    select: {
      id: true,
      ventureId: true,
      officeId: true,
      createdAt: true,
    },
  });

  const issues = loads.map((l: any) => ({
    targetType: "LOAD",
    targetId: String(l.id),
    message: "Open load older than 14 days.",
    details: {
      ventureId: l.ventureId,
      officeId: l.officeId,
      createdAt: l.createdAt,
    },
  }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkHotelRoomsSoldGtAvailable(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "hotel.rooms_sold_gt_available";
  const check = await getCheckMeta(checkKey);

  const where: Record<string, unknown> = {
    roomSold: { gt: 0 },
  };
  if (args.scopePropertyId) where.hotelId = args.scopePropertyId;
  if (args.scopeVentureId) {
    where.hotel = { ventureId: args.scopeVentureId };
  }

  const rows = await prisma.hotelDailyReport.findMany({
    where,
    select: {
      id: true,
      hotelId: true,
      date: true,
      totalRoom: true,
      roomSold: true,
      hotel: { select: { ventureId: true } },
    },
  });

  const issues = rows
    .filter((r: any) => r.roomSold && r.totalRoom && r.roomSold > r.totalRoom)
    .map((r: any) => ({
      targetType: "HOTEL_DAILY_REPORT",
      targetId: String(r.id),
      message: "Rooms sold exceeds total rooms available.",
      details: {
        ventureId: r.hotel.ventureId,
        hotelId: r.hotelId,
        date: r.date,
        totalRoom: r.totalRoom,
        roomSold: r.roomSold,
      },
    }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkHotelRevenueZeroButOccupied(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "hotel.revenue_zero_but_occupied";
  const check = await getCheckMeta(checkKey);

  const where: Record<string, unknown> = {
    roomSold: { gt: 0 },
    total: 0,
  };
  if (args.scopePropertyId) where.hotelId = args.scopePropertyId;
  if (args.scopeVentureId) {
    where.hotel = { ventureId: args.scopeVentureId };
  }

  const rows = await prisma.hotelDailyReport.findMany({
    where,
    select: {
      id: true,
      hotelId: true,
      date: true,
      roomSold: true,
      total: true,
      hotel: { select: { ventureId: true } },
    },
  });

  const issues = rows.map((r: any) => ({
    targetType: "HOTEL_DAILY_REPORT",
    targetId: String(r.id),
    message: "Rooms sold > 0 but total revenue = 0.",
    details: {
      ventureId: r.hotel.ventureId,
      hotelId: r.hotelId,
      date: r.date,
      roomSold: r.roomSold,
      total: r.total,
    },
  }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkHotelMissingRecentReportsPerProperty(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "hotel.missing_recent_reports_per_property";
  const check = await getCheckMeta(checkKey);

  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() - 3);

  const propWhere: Record<string, unknown> = { status: "ACTIVE" };
  if (args.scopeVentureId) propWhere.ventureId = args.scopeVentureId;
  if (args.scopePropertyId) propWhere.id = args.scopePropertyId;

  const properties = await prisma.hotelProperty.findMany({
    where: propWhere,
    select: {
      id: true,
      name: true,
      ventureId: true,
      dailyReports: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
    },
  });

  const issues: CheckResult["issues"] = [];

  for (const p of properties) {
    const lastDate = p.dailyReports[0]?.date;
    if (!lastDate || lastDate < cutoff) {
      issues.push({
        targetType: "HOTEL_PROPERTY",
        targetId: String(p.id),
        message: `No daily report in the last 3 days for ${p.name}.`,
        details: {
          hotelId: p.id,
          hotelName: p.name,
          ventureId: p.ventureId,
          lastReportDate: lastDate ?? null,
        },
      });
    }
  }

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkHotelExcessiveLossNights(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "hotel.excessive_loss_nights";
  const check = await getCheckMeta(checkKey);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const where: Record<string, unknown> = {
    date: { gte: cutoff },
    highLossFlag: true,
  };
  if (args.scopePropertyId) where.hotelId = args.scopePropertyId;
  if (args.scopeVentureId) {
    where.hotel = { ventureId: args.scopeVentureId };
  }

  const rows = await prisma.hotelDailyReport.groupBy({
    by: ["hotelId"],
    where,
    _count: { _all: true },
  });

  const hotelIds = rows.filter((r: any) => r._count._all >= 3).map((r: any) => r.hotelId);
  const hotels = await prisma.hotelProperty.findMany({
    where: { id: { in: hotelIds } },
    select: { id: true, name: true, ventureId: true },
  });
  const hotelMap = new Map(hotels.map((h: any) => [h.id, h]));

  const issues = rows
    .filter((r: any) => r._count._all >= 3)
    .map((r: any) => {
      const hotel = hotelMap.get(r.hotelId) as any;
      return {
        targetType: "HOTEL_PROPERTY",
        targetId: String(r.hotelId),
        message: "3+ high loss nights in the last 7 days.",
        details: {
          hotelId: r.hotelId,
          hotelName: hotel?.name,
          ventureId: hotel?.ventureId,
          highLossCount: r._count._all,
        },
      };
    });

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkHotelNegativeRoomCounts(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "hotel.negative_room_counts";
  const check = await getCheckMeta(checkKey);

  const where: Record<string, unknown> = {
    OR: [{ totalRoom: { lt: 0 } }, { roomSold: { lt: 0 } }],
  };
  if (args.scopePropertyId) where.hotelId = args.scopePropertyId;
  if (args.scopeVentureId) {
    where.hotel = { ventureId: args.scopeVentureId };
  }

  const rows = await prisma.hotelDailyReport.findMany({
    where,
    select: {
      id: true,
      hotelId: true,
      date: true,
      totalRoom: true,
      roomSold: true,
      hotel: { select: { ventureId: true } },
    },
  });

  const issues = rows.map((r: any) => ({
    targetType: "HOTEL_DAILY_REPORT",
    targetId: String(r.id),
    message: "Negative room counts detected.",
    details: {
      ventureId: r.hotel.ventureId,
      hotelId: r.hotelId,
      date: r.date,
      totalRoom: r.totalRoom,
      roomSold: r.roomSold,
    },
  }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkRbacFreightLoadsMissingVentureOrOffice(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "rbac.freight_loads_missing_venture_or_office";
  const check = await getCheckMeta(checkKey);

  const where: Record<string, unknown> = {
    loadStatus: { not: "OPEN" },
  };
  if (args.scopeVentureId) where.ventureId = args.scopeVentureId;
  if (args.scopeOfficeId) where.officeId = args.scopeOfficeId;

  const loads = await prisma.load.findMany({
    where: {
      ...where,
      OR: [{ ventureId: null }, { officeId: null }],
    },
    select: {
      id: true,
      ventureId: true,
      officeId: true,
      loadStatus: true,
    },
  });

  const issues = loads.map((l: any) => ({
    targetType: "LOAD",
    targetId: String(l.id),
    message:
      "Non-draft load missing ventureId or officeId (breaks scoping / visibility).",
    details: {
      ventureId: l.ventureId,
      officeId: l.officeId,
      loadStatus: l.loadStatus,
    },
  }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkRbacHotelReportsMissingPropertyLink(
  args: RunAuditArgs
): Promise<CheckResult> {
  const checkKey = "rbac.hotel_reports_missing_property_link";
  const check = await getCheckMeta(checkKey);

  const where: Record<string, unknown> = {
    hotelId: null,
  };
  if (args.scopeVentureId) {
    where.hotel = { ventureId: args.scopeVentureId };
  }

  const rows = await prisma.hotelDailyReport.findMany({
    where,
    select: {
      id: true,
      hotelId: true,
      date: true,
    },
  });

  const issues = rows.map((r: any) => ({
    targetType: "HOTEL_DAILY_REPORT",
    targetId: String(r.id),
    message: "HotelDailyReport missing hotelId (propertyId).",
    details: {
      hotelId: r.hotelId,
      date: r.date,
    },
  }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkSecurityApiRoutesMissingConfig(): Promise<CheckResult> {
  const checkKey = "security.api_routes_missing_config";
  const check = await getCheckMeta(checkKey);

  const criticalPaths = [
    "/api/logistics/customer-approval-requests",
    "/api/logistics/fmcsa-carrier-lookup",
    "/api/hotels/daily-report/import",
    "/api/auth/send-otp",
  ];

  const configs = await prisma.apiRouteConfig.findMany({
    where: { path: { in: criticalPaths } },
  });

  const existingPaths = new Set(configs.map((c: any) => c.path));
  const issues = criticalPaths
    .filter((p: any) => !existingPaths.has(p))
    .map((p) => ({
      targetType: "API_ROUTE",
      targetId: p,
      message: "Critical API route missing ApiRouteConfig entry.",
      details: { path: p },
    }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkSecurityApiRoutesMissingAuth(): Promise<CheckResult> {
  const checkKey = "security.api_routes_missing_auth";
  const check = await getCheckMeta(checkKey);

  const routes = await prisma.apiRouteConfig.findMany({
    where: {
      requiresAuth: true,
      isAuthProtected: false,
    },
  });

  const issues = routes.map((r: any) => ({
    targetType: "API_ROUTE",
    targetId: r.path,
    message:
      "API route requires auth but is not marked as auth-protected (update code + flip isAuthProtected).",
    details: {
      path: r.path,
      description: r.description,
    },
  }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

async function checkSecurityApiRoutesMissingRateLimit(): Promise<CheckResult> {
  const checkKey = "security.api_routes_missing_rate_limit";
  const check = await getCheckMeta(checkKey);

  const routes = await prisma.apiRouteConfig.findMany({
    where: {
      usesExternalService: true,
      requiresRateLimit: true,
      isRateLimited: false,
    },
  });

  const issues = routes.map((r: any) => ({
    targetType: "API_ROUTE",
    targetId: r.path,
    message:
      "External/paid API route is not rate limited (implement rate limiting + flip isRateLimited).",
    details: {
      path: r.path,
      description: r.description,
    },
  }));

  return {
    checkKey,
    module: check.module,
    severity: check.severity,
    issues,
  };
}

export async function runAudit(args: RunAuditArgs) {
  const run = await prisma.auditRun.create({
    data: {
      initiatedByUserId: args.initiatedByUserId,
      scopeVentureId: args.scopeVentureId,
      scopeOfficeId: args.scopeOfficeId,
      scopePropertyId: args.scopePropertyId,
    },
  });

  const checks: (() => Promise<CheckResult>)[] = [
    () => checkFreightNegativeMarginLoads(args),
    () => checkFreightCompletedMissingDeliveredAt(args),
    () => checkFreightZeroMilesWithRevenue(args),
    () => checkFreightCompletedMissingCarrier(args),
    () => checkFreightOldDraftLoads(args),
    () => checkHotelRoomsSoldGtAvailable(args),
    () => checkHotelRevenueZeroButOccupied(args),
    () => checkHotelMissingRecentReportsPerProperty(args),
    () => checkHotelExcessiveLossNights(args),
    () => checkHotelNegativeRoomCounts(args),
    () => checkRbacFreightLoadsMissingVentureOrOffice(args),
    () => checkRbacHotelReportsMissingPropertyLink(args),
    () => checkSecurityApiRoutesMissingConfig(),
    () => checkSecurityApiRoutesMissingAuth(),
    () => checkSecurityApiRoutesMissingRateLimit(),
  ];

  const results: CheckResult[] = [];
  for (const checkFn of checks) {
    try {
      const result = await checkFn();
      results.push(result);
    } catch (err) {
      console.error(`Audit check failed`, err);
    }
  }

  let issueCount = 0;
  let maxScore = 0;
  let weightedScore = 0;

  for (const r of results) {
    const check = await prisma.auditCheck.findUnique({
      where: { key: r.checkKey },
    });
    if (!check) continue;

    const weight =
      check.severity === "CRITICAL"
        ? 30
        : check.severity === "HIGH"
        ? 20
        : check.severity === "MEDIUM"
        ? 10
        : 5;

    maxScore += weight;
    weightedScore += Math.max(0, weight - r.issues.length);

    for (const issue of r.issues) {
      await prisma.auditIssue.create({
        data: {
          auditRunId: run.id,
          auditCheckId: check.id,
          module: check.module,
          severity: check.severity,
          status: "OPEN",
          targetType: issue.targetType,
          targetId: issue.targetId,
          message: issue.message,
          details: (issue.details as object) ?? undefined,
        },
      });
      issueCount++;
    }
  }

  const overallScore =
    maxScore > 0 ? Math.round((weightedScore / maxScore) * 100) : 100;

  const finalRun = await prisma.auditRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      overallScore,
    },
    include: {
      issues: true,
    },
  });

  return finalRun;
}
