import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser, parseDateRange } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { summarizeFreightKpis } from "@/lib/kpiFreight";
import { computeFreightStats } from "@/lib/freight/stats";
import { getTeamAttendanceContext } from "@/lib/attendanceKpi";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ventureId } = req.query;

  if (!ventureId || typeof ventureId !== "string") {
    return res.status(400).json({ error: "ventureId is required" });
  }

  const parsedVentureId = parseInt(ventureId, 10);
  if (isNaN(parsedVentureId) || parsedVentureId <= 0) {
    return res.status(400).json({
      error: "ventureId must be a valid positive integer",
    });
  }

  // Use your existing scope logic
  const scope = getUserScope(user);
  if (!scope.allVentures && !scope.ventureIds.includes(parsedVentureId)) {
    return res
      .status(403)
      .json({ error: "Forbidden: no access to this venture" });
  }

  const { from, to } = parseDateRange(req.query as any);

  const where: any = { ventureId: parsedVentureId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }

  try {
    const rows = await prisma.freightKpiDaily.findMany({
      where,
      orderBy: { date: "desc" },
      take: 90,
    });

    const summary = summarizeFreightKpis(rows);

    const stats = await computeFreightStats({
      ventureId: parsedVentureId,
      range: { from, to },
    });

    let attendance = null;
    const includeAttendance = req.query.includeAttendance === "true";
    if (includeAttendance && from && to) {
      const teamMembers = await prisma.user.findMany({
        where: {
          isActive: true,
          isTestUser: user.isTestUser,
          ventures: { some: { ventureId: parsedVentureId } },
        },
        select: { id: true },
      });
      
      if (teamMembers.length > 0) {
        attendance = await getTeamAttendanceContext(
          teamMembers.map((m: { id: number }) => m.id),
          from,
          to,
          { ventureId: parsedVentureId, isTest: user.isTestUser }
        );
      }
    }

    return res.status(200).json({ summary, rows, stats, attendance });
  } catch (error) {
    console.error("Freight KPI fetch error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch freight KPIs" });
  }
});
