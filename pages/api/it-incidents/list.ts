import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { UserRole } from "@prisma/client";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { status, statusGroup, severity, assetId, me, page = "1", pageSize = "50" } =
    req.query;

  const pageNumRaw = parseInt(String(page), 10);
  const pageSizeParsed = parseInt(String(pageSize), 10);

  const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw > 0 ? pageNumRaw : 1;
  const take =
    Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 && pageSizeParsed <= 200
      ? pageSizeParsed
      : 50;
  const skip = (pageNum - 1) * take;

  const where: any = {};

  const scope = getUserScope(user);
  const employeeRoles: UserRole[] = ["EMPLOYEE", "CONTRACTOR", "CSR", "DISPATCHER", "CARRIER_TEAM"];
  const isEmployeeLike = employeeRoles.includes(user.role as UserRole);

  if (!scope.allVentures && scope.ventureIds.length > 0) {
    where.ventureId = { in: scope.ventureIds };
  }
  if (!scope.allOffices && scope.officeIds.length > 0) {
    where.officeId = { in: scope.officeIds };
  }

  if (statusGroup === "open") {
    where.status = { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_INFO"] };
  } else if (statusGroup === "closed") {
    where.status = { in: ["RESOLVED", "CANCELLED"] };
  } else if (status && typeof status === "string") {
    where.status = status.toUpperCase();
  }

  if (severity && typeof severity === "string") {
    where.severity = severity.toUpperCase();
  }

  if (assetId && typeof assetId === "string") {
    const aId = Number(assetId);
    if (!Number.isNaN(aId)) {
      where.assetId = aId;
    }
  }

  // me filter
  if (me === "reported") {
    where.reporterUserId = user.id;
  } else if (me === "assigned") {
    where.assignedToUserId = user.id;
  } else if (isEmployeeLike) {
    // default for employee-like roles: show incidents they reported OR assigned to them
    where.OR = [
      { reporterUserId: user.id },
      { assignedToUserId: user.id },
    ];
  }

  const [incidents, total] = await Promise.all([
    prisma.iTIncident.findMany({
      where,
      include: {
        asset: { select: { id: true, tag: true, type: true } },
        reporterUser: { select: { id: true, fullName: true } },
        assignedToUser: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.iTIncident.count({ where }),
  ]);

  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const enhanced = incidents.map((inc) => {
    const createdAt = new Date(inc.createdAt as any);
    const ageDays = Math.max(
      0,
      Math.floor((now.getTime() - createdAt.getTime()) / MS_PER_DAY),
    );
    const openish = ["OPEN", "IN_PROGRESS", "WAITING_FOR_INFO"].includes(inc.status);
    const isStale = openish && ageDays >= 7;
    const staleReason = isStale ? `Open for ${ageDays}+ days` : null;
    return { ...inc, ageDays, isStale, staleReason };
  });

  return res.status(200).json({
    items: enhanced,
    page: pageNum,
    pageSize: take,
    total,
    totalPages: Math.ceil(total / take) || 1,
  });
});
