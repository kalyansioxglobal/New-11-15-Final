import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { isSuperAdmin } from "@/lib/permissions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSuperAdmin(user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const payload = req.body;
  const items = Array.isArray(payload) ? payload : [payload];

  const results = [];

  for (const item of items) {
    const {
      userId,
      ventureId,
      officeId,
      date,
      hoursPlanned,
      hoursWorked,
      tasksCompleted,
      loadsTouched,
      loadsCovered,
      contactsMade,
      callsMade,
      ticketsClosed,
      qaScore,
      revenueGenerated,
      notes,
      isTest,
    } = item;

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const record = await prisma.employeeKpiDaily.upsert({
      where: {
        userId_date_ventureId_officeId: {
          userId: parseInt(userId, 10),
          date: d,
          ventureId: parseInt(ventureId, 10),
          officeId: officeId ? parseInt(officeId, 10) : 0,
        },
      },
      update: {
        hoursPlanned: hoursPlanned ?? null,
        hoursWorked: hoursWorked ?? null,
        tasksCompleted: tasksCompleted ?? null,
        loadsTouched: loadsTouched ?? null,
        loadsCovered: loadsCovered ?? null,
        contactsMade: contactsMade ?? null,
        callsMade: callsMade ?? null,
        ticketsClosed: ticketsClosed ?? null,
        qaScore: qaScore ?? null,
        revenueGenerated: revenueGenerated ?? null,
        notes: notes ?? null,
        isTest: !!isTest,
      },
      create: {
        userId: parseInt(userId, 10),
        ventureId: parseInt(ventureId, 10),
        officeId: officeId ? parseInt(officeId, 10) : null,
        date: d,
        hoursPlanned: hoursPlanned ?? null,
        hoursWorked: hoursWorked ?? null,
        tasksCompleted: tasksCompleted ?? null,
        loadsTouched: loadsTouched ?? null,
        loadsCovered: loadsCovered ?? null,
        contactsMade: contactsMade ?? null,
        callsMade: callsMade ?? null,
        ticketsClosed: ticketsClosed ?? null,
        qaScore: qaScore ?? null,
        revenueGenerated: revenueGenerated ?? null,
        notes: notes ?? null,
        isTest: !!isTest,
      },
    });

    results.push(record);
  }

  return res.status(200).json({ count: results.length });
}
