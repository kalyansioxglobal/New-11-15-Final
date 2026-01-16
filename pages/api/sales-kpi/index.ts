import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { enforceScope } from "@/lib/permissions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
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
    const { ventureId, from, to } = req.query;

    if (!ventureId || typeof ventureId !== "string") {
      return res.status(400).json({ error: "ventureId is required" });
    }

    const parsedVentureId = parseInt(ventureId, 10);
    if (isNaN(parsedVentureId) || parsedVentureId <= 0) {
      return res
        .status(400)
        .json({ error: "ventureId must be a valid positive integer" });
    }

    if (
      !enforceScope(session.user as any, { ventureId: parsedVentureId })
    ) {
      return res.status(403).json({ error: "Forbidden: no access to venture" });
    }

    const where: any = { ventureId: parsedVentureId };
    
    // Parse date strings (YYYY-MM-DD) and convert to UTC dates for database comparison
    // The database stores dates in UTC, so we need to convert the date strings to UTC
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    
    if (from && typeof from === 'string') {
      // Parse YYYY-MM-DD as UTC midnight (start of day)
      const [year, month, day] = from.split('-').map(Number);
      fromDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
    
    if (to && typeof to === 'string') {
      // Parse YYYY-MM-DD as UTC end of day (23:59:59.999)
      const [year, month, day] = to.split('-').map(Number);
      toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    }

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = fromDate;
      if (toDate) where.date.lte = toDate;
    }
    
    const rows = await prisma.employeeKpiDaily.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        office: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });

    const onboardingsQuery: any = {
      ventureId: parsedVentureId,
    };
    
    if (fromDate || toDate) {
      onboardingsQuery.onboardedAt = {};
      if (fromDate) onboardingsQuery.onboardedAt.gte = fromDate;
      if (toDate) onboardingsQuery.onboardedAt.lte = toDate;
    }

    const onboardings = await prisma.salesClientOnboarding.findMany({
      where: onboardingsQuery,
      include: {
        salesUser: { select: { id: true, fullName: true, email: true } },
        subscription: { select: { id: true, planName: true, mrr: true, isActive: true } },
      },
      orderBy: { onboardedAt: "desc" },
    });

    const onboardingsByUser = new Map<number, { 
      total: number; 
      pending: number; 
      active: number;
      mrr: number;
    }>();
    
    for (const onboarding of onboardings) {
      const userId = onboarding.salesUserId;
      let stats = onboardingsByUser.get(userId);
      if (!stats) {
        stats = { total: 0, pending: 0, active: 0, mrr: 0 };
        onboardingsByUser.set(userId, stats);
      }
      
      stats.total += 1;
      
      if (onboarding.subscriptionStatus === "PENDING") {
        stats.pending += 1;
      } else if (onboarding.subscriptionStatus === "ACTIVE" || onboarding.subscription?.isActive) {
        stats.active += 1;
        if (onboarding.subscription?.mrr) {
          stats.mrr += onboarding.subscription.mrr;
        }
      }
    }

    type Agg = {
      userId: number;
      name: string | null;
      email: string | null;
      officeName: string | null;
      totalCalls: number;
      totalHours: number;
      totalMinutes: number;
      days: number;
      demosBooked: number;
      clientsOnboarded: number;
      onboardingsPending: number;
      onboardingsActive: number;
      onboardingMrr: number;
    };

    const byUser = new Map<number, Agg>();

    for (const r of rows) {
      const key = r.userId;
      let agg = byUser.get(key);
      if (!agg) {
        const onboardStats = onboardingsByUser.get(key);
        agg = {
          userId: r.userId,
          name: r.user?.fullName ?? null,
          email: r.user?.email ?? null,
          officeName: r.office?.name ?? null,
          totalCalls: 0,
          totalHours: 0,
          totalMinutes: 0,
          days: 0,
          demosBooked: 0,
          clientsOnboarded: 0,
          onboardingsPending: onboardStats?.pending ?? 0,
          onboardingsActive: onboardStats?.active ?? 0,
          onboardingMrr: onboardStats?.mrr ?? 0,
        };
        byUser.set(key, agg);
      }

      const calls = r.callsMade ?? 0;
      const hours = r.hoursWorked ?? 0;
      const minutes = hours * 60;
      const demos = (r as any).demosBooked ?? 0;
      const clients = (r as any).clientsOnboarded ?? 0;

      agg.totalCalls += calls;
      agg.totalHours += hours;
      agg.totalMinutes += minutes;
      agg.demosBooked += demos;
      agg.clientsOnboarded += clients;
      agg.days += 1;
    }

    for (const [userId, stats] of onboardingsByUser) {
      if (!byUser.has(userId)) {
        const userInfo = onboardings.find(o => o.salesUserId === userId)?.salesUser;
        byUser.set(userId, {
          userId,
          name: userInfo?.fullName ?? null,
          email: userInfo?.email ?? null,
          officeName: null,
          totalCalls: 0,
          totalHours: 0,
          totalMinutes: 0,
          days: 0,
          demosBooked: 0,
          clientsOnboarded: stats.total,
          onboardingsPending: stats.pending,
          onboardingsActive: stats.active,
          onboardingMrr: stats.mrr,
        });
      }
    }

    const userIds = Array.from(byUser.keys());
    const costs = await prisma.salesPersonCost.findMany({
      where: { userId: { in: userIds } },
      orderBy: { effectiveFrom: "desc" },
    });

    const latestCostByUser = new Map<number, number>();
    for (const c of costs) {
      if (!latestCostByUser.has(c.userId)) {
        latestCostByUser.set(c.userId, c.monthlyCost);
      }
    }

    const users = Array.from(byUser.values()).map((u) => {
      const avgCallMinutes =
        u.totalCalls > 0 ? u.totalMinutes / u.totalCalls : 0;
      const callsPerDay = u.days > 0 ? u.totalCalls / u.days : 0;

      const monthlyCost = latestCostByUser.get(u.userId) ?? 0;
      const revenue = u.onboardingMrr;
      const roi =
        monthlyCost > 0
          ? ((revenue - monthlyCost) / monthlyCost) * 100
          : null;

      const demoToClientRate = 
        u.demosBooked > 0 ? (u.clientsOnboarded / u.demosBooked) * 100 : null;

      return {
        ...u,
        avgCallMinutes,
        callsPerDay,
        monthlyCost,
        roiPercent: roi,
        demoToClientRate,
      };
    });

    users.sort((a, b) => b.totalCalls - a.totalCalls);

    const totalCalls = users.reduce((sum, u) => sum + u.totalCalls, 0);
    const totalHours = users.reduce((sum, u) => sum + u.totalHours, 0);
    const totalDemos = users.reduce((sum, u) => sum + u.demosBooked, 0);
    const totalClientsOnboarded = users.reduce((sum, u) => sum + u.clientsOnboarded, 0);
    const totalOnboardingsPending = users.reduce((sum, u) => sum + u.onboardingsPending, 0);
    const totalOnboardingsActive = users.reduce((sum, u) => sum + u.onboardingsActive, 0);
    const totalMrr = users.reduce((sum, u) => sum + u.onboardingMrr, 0);

    const recentOnboardings = onboardings.slice(0, 10).map(o => ({
      id: o.id,
      clientName: o.clientName,
      clientCompany: o.clientCompany,
      status: o.subscriptionStatus,
      onboardedAt: o.onboardedAt,
      salesPerson: o.salesUser?.fullName || o.salesUser?.email || "Unknown",
      subscriptionPlan: o.subscription?.planName || null,
      mrr: o.subscription?.mrr || null,
    }));

    const summary = {
      totalCalls,
      totalHours,
      totalDemos,
      totalClientsOnboarded,
      userCount: users.length,
      onboardings: {
        pending: totalOnboardingsPending,
        active: totalOnboardingsActive,
        totalMrr,
      },
    };

    return res.status(200).json({ summary, users, recentOnboardings });
  } catch (err) {
    console.error("Sales KPI error:", err);
    return res.status(500).json({ error: "Failed to fetch sales KPIs" });
  }
}
