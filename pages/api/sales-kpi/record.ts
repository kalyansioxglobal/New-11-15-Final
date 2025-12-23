import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { enforceScope } from "@/lib/permissions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let session = await getServerSession(req, res, authOptions);

  if (!session && process.env.NODE_ENV === "development") {
    session = {
      user: { id: 1, role: "CEO", email: "ceo@siox.com" },
    } as any;
  }

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const {
      targetUserId,
      ventureId,
      officeId,
      date,
      callsMade,
      hoursWorked,
      demosBooked,
      clientsOnboarded,
    } = req.body;

    if (!ventureId) {
      return res.status(400).json({ error: "ventureId is required" });
    }

    const parsedVentureId = Number(ventureId);
    if (isNaN(parsedVentureId) || parsedVentureId <= 0) {
      return res.status(400).json({ error: "ventureId must be a valid positive integer" });
    }

    if (!enforceScope(session.user as any, { ventureId: parsedVentureId })) {
      return res.status(403).json({ error: "Forbidden: no access to venture" });
    }

    const userId = targetUserId || session.user.id;
    const parsedDate = date ? new Date(date) : new Date();
    parsedDate.setHours(0, 0, 0, 0);

    const existing = await prisma.employeeKpiDaily.findFirst({
      where: {
        userId,
        ventureId: parsedVentureId,
        officeId: officeId || null,
        date: parsedDate,
      },
    });

    const data: any = {};
    if (callsMade !== undefined && callsMade !== null) data.callsMade = Number(callsMade);
    if (hoursWorked !== undefined && hoursWorked !== null) data.hoursWorked = Number(hoursWorked);
    if (demosBooked !== undefined && demosBooked !== null) data.demosBooked = Number(demosBooked);
    if (clientsOnboarded !== undefined && clientsOnboarded !== null) data.clientsOnboarded = Number(clientsOnboarded);

    let record;
    if (existing) {
      record = await prisma.employeeKpiDaily.update({
        where: { id: existing.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } else {
      record = await prisma.employeeKpiDaily.create({
        data: {
          userId,
          ventureId: parsedVentureId,
          officeId: officeId || null,
          date: parsedDate,
          ...data,
        },
      });
    }

    return res.status(200).json(record);
  } catch (err) {
    console.error("Sales KPI record error:", err);
    return res.status(500).json({ error: "Failed to record sales KPI" });
  }
}
