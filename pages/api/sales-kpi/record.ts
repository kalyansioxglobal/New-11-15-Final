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
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: "Date is required." });
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD." });
    }
    
    const [year, month, day] = dateMatch.slice(1).map(Number);
    
    // Create date in UTC midnight to store in database
    // The date string from client represents "today" in their local timezone
    // We store it as UTC midnight of that date to ensure consistent querying
    const parsedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    
    // Get today's date string in common timezones to account for timezone differences
    const now = new Date();
    
    // Get today in UTC
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
    const todayUTCStr = todayUTC.toISOString().slice(0, 10);
    
    // Get today in US Eastern Time
    const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const todayETStr = `${todayET.getFullYear()}-${String(todayET.getMonth() + 1).padStart(2, '0')}-${String(todayET.getDate()).padStart(2, '0')}`;
    
    // Get today in India Standard Time
    const todayIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayISTStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;
    
    // Validate that the submitted date matches "today" in at least one common timezone
    // This allows users in different timezones to record for their "today"
    const isValidToday = date === todayUTCStr || date === todayETStr || date === todayISTStr;
    
    if (!isValidToday) {
      return res.status(400).json({ 
        error: "You can only record KPIs for today's date in your local timezone."
      });
    }

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
