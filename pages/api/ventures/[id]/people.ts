import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { can } from "@/lib/permissions";

const STANDARD_DAILY_HOURS = 8;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const ventureId = parseInt(req.query.id as string, 10);
  if (isNaN(ventureId)) {
    return res.status(400).json({ error: "Invalid venture ID" });
  }

  const { days = "7", includeTest } = req.query;

  if (!can(user, "view", "VENTURE", { ventureId })) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const windowDays = parseInt(days as string, 10) || 7;
  const now = new Date();
  const from = new Date();
  from.setDate(now.getDate() - windowDays + 1);
  from.setHours(0, 0, 0, 0);

  const baseWhere: any = {
    ventureId,
    date: { gte: from, lte: now },
  };
  if (includeTest !== "true") {
    baseWhere.isTest = false;
  }

  const [venture, kpis, attendance] = await Promise.all([
    prisma.venture.findUnique({
      where: { id: ventureId },
      select: { id: true, name: true, type: true },
    }),
    prisma.employeeKpiDaily.findMany({
      where: baseWhere,
      include: {
        user: { select: { id: true, fullName: true, role: true } },
        office: { select: { id: true, name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: {
        ventureId,
        date: { gte: from, lte: now },
        ...(includeTest === "true" ? {} : { isTest: false }),
      },
      select: {
        id: true,
        userId: true,
        status: true,
        date: true,
      },
    }),
  ]);

  if (!venture) {
    return res.status(404).json({ error: "Venture not found" });
  }

  type Agg = {
    userId: number;
    name: string | null;
    role: string;
    officeName?: string;
    days: number;
    hoursPlanned: number;
    hoursWorked: number;
    tasksCompleted: number;
    loadsTouched: number;
    loadsCovered: number;
    contactsMade: number;
    callsMade: number;
    ticketsClosed: number;
    qaSum: number;
    qaCount: number;
    revenueGenerated: number;
    attendance: {
      present: number;
      absent: number;
      late: number;
      half_day: number;
    };
  };

  const map = new Map<number, Agg>();

  let totalHoursPlanned = 0;
  let totalHoursWorked = 0;
  let totalTasksCompleted = 0;
  let totalLoadsTouched = 0;
  let totalLoadsCovered = 0;
  let totalContactsMade = 0;
  let totalCallsMade = 0;
  let totalTicketsClosed = 0;
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalHalfDay = 0;

  for (const k of kpis) {
    const key = k.userId;
    if (!map.has(key)) {
      map.set(key, {
        userId: k.user.id,
        name: k.user.fullName,
        role: k.user.role,
        officeName: k.office?.name,
        days: 0,
        hoursPlanned: 0,
        hoursWorked: 0,
        tasksCompleted: 0,
        loadsTouched: 0,
        loadsCovered: 0,
        contactsMade: 0,
        callsMade: 0,
        ticketsClosed: 0,
        qaSum: 0,
        qaCount: 0,
        revenueGenerated: 0,
        attendance: {
          present: 0,
          absent: 0,
          late: 0,
          half_day: 0,
        },
      });
    }
    const agg = map.get(key)!;
    agg.days += 1;
    agg.hoursPlanned += k.hoursPlanned || 0;
    agg.hoursWorked += k.hoursWorked || 0;
    agg.tasksCompleted += k.tasksCompleted || 0;
    agg.loadsTouched += k.loadsTouched || 0;
    agg.loadsCovered += k.loadsCovered || 0;
    agg.contactsMade += k.contactsMade || 0;
    agg.callsMade += k.callsMade || 0;
    agg.ticketsClosed += k.ticketsClosed || 0;
    agg.revenueGenerated += k.revenueGenerated || 0;
    if (typeof k.qaScore === "number") {
      agg.qaSum += k.qaScore;
      agg.qaCount += 1;
    }

    totalHoursPlanned += k.hoursPlanned || 0;
    totalHoursWorked += k.hoursWorked || 0;
    totalTasksCompleted += k.tasksCompleted || 0;
    totalLoadsTouched += k.loadsTouched || 0;
    totalLoadsCovered += k.loadsCovered || 0;
    totalContactsMade += k.contactsMade || 0;
    totalCallsMade += k.callsMade || 0;
    totalTicketsClosed += k.ticketsClosed || 0;
  }

  for (const a of attendance) {
    const key = a.userId;
    if (!map.has(key)) {
      map.set(key, {
        userId: a.userId,
        name: "Unknown",
        role: "UNKNOWN",
        officeName: undefined,
        days: 0,
        hoursPlanned: 0,
        hoursWorked: 0,
        tasksCompleted: 0,
        loadsTouched: 0,
        loadsCovered: 0,
        contactsMade: 0,
        callsMade: 0,
        ticketsClosed: 0,
        qaSum: 0,
        qaCount: 0,
        revenueGenerated: 0,
        attendance: {
          present: 0,
          absent: 0,
          late: 0,
          half_day: 0,
        },
      });
    }
    const agg = map.get(key)!;
    const statusLower = (a.status || "").toLowerCase();
    if (statusLower === "present") {
      agg.attendance.present += 1;
      totalPresent++;
    } else if (statusLower === "absent") {
      agg.attendance.absent += 1;
      totalAbsent++;
    } else if (statusLower === "late") {
      agg.attendance.late += 1;
      totalLate++;
    } else if (statusLower === "half_day") {
      agg.attendance.half_day += 1;
      totalHalfDay++;
    }
  }

  const employees = Array.from(map.values()).map((e) => {
    const utilization =
      e.hoursPlanned > 0 ? Math.round((e.hoursWorked / e.hoursPlanned) * 100) : null;
    const loadsPerDay = e.days > 0 ? +(e.loadsTouched / e.days).toFixed(1) : null;
    const tasksPerDay = e.days > 0 ? +(e.tasksCompleted / e.days).toFixed(1) : null;
    const qaAvg = e.qaCount > 0 ? +(e.qaSum / e.qaCount).toFixed(1) : null;

    return {
      ...e,
      utilization,
      loadsPerDay,
      tasksPerDay,
      qaAvg,
    };
  });

  employees.sort((a, b) => {
    if (a.role === b.role) return (a.name || "").localeCompare(b.name || "");
    return a.role.localeCompare(b.role);
  });

  const denomPresence = totalPresent + totalAbsent + totalLate + totalHalfDay;
  const presencePct =
    denomPresence > 0 ? Math.round((totalPresent / denomPresence) * 100) : null;

  const fte =
    totalHoursPlanned > 0
      ? totalHoursPlanned / (STANDARD_DAILY_HOURS * windowDays)
      : 0;

  const utilizationPct =
    totalHoursPlanned > 0
      ? Math.round((totalHoursWorked / totalHoursPlanned) * 100)
      : null;

  const tasksPerFtePerDay = fte > 0 ? totalTasksCompleted / (fte * windowDays) : null;
  const loadsPerFtePerDay = fte > 0 ? totalLoadsTouched / (fte * windowDays) : null;
  const ticketsPerFtePerDay = fte > 0 ? totalTicketsClosed / (fte * windowDays) : null;
  const contactsPerFtePerDay = fte > 0 ? totalContactsMade / (fte * windowDays) : null;
  const callsPerFtePerDay = fte > 0 ? totalCallsMade / (fte * windowDays) : null;

  const summary = {
    ventureId: venture.id,
    ventureName: venture.name,
    ventureType: venture.type,
    windowDays,
    headcountApprox: employees.length,
    headcountFte: fte,
    utilizationPct,
    presencePct,
    tasksPerFtePerDay,
    loadsPerFtePerDay,
    ticketsPerFtePerDay,
    contactsPerFtePerDay,
    callsPerFtePerDay,
  };

  res.json({
    windowDays,
    summary,
    employees,
  });
}
