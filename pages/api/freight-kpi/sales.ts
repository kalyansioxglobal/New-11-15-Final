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
    const fromDate = from ? new Date(String(from)) : null;
    const toDate = to ? new Date(String(to)) : null;

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

    const submittedApprovalsQuery: any = {
      businessUnit: "LOGISTICS",
      OR: [
        { ventureId: parsedVentureId },
        { ventureId: null },
      ],
    };
    
    if (fromDate || toDate) {
      submittedApprovalsQuery.createdAt = {};
      if (fromDate) submittedApprovalsQuery.createdAt.gte = fromDate;
      if (toDate) submittedApprovalsQuery.createdAt.lte = toDate;
    }

    const submittedApprovals = await prisma.customerApprovalRequest.findMany({
      where: submittedApprovalsQuery,
      include: {
        requestedByUser: { select: { id: true, fullName: true, email: true } },
        venture: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const approvedApprovalsQuery: any = {
      businessUnit: "LOGISTICS",
      status: "APPROVED",
      OR: [
        { ventureId: parsedVentureId },
        { ventureId: null },
      ],
    };
    
    if (fromDate || toDate) {
      approvedApprovalsQuery.decidedAt = {};
      if (fromDate) approvedApprovalsQuery.decidedAt.gte = fromDate;
      if (toDate) approvedApprovalsQuery.decidedAt.lte = toDate;
    }

    const approvedApprovals = await prisma.customerApprovalRequest.findMany({
      where: approvedApprovalsQuery,
      include: {
        requestedByUser: { select: { id: true, fullName: true, email: true } },
        venture: { select: { id: true, name: true } },
      },
    });

    const approvalsByUser = new Map<number, { submitted: number; approved: number; pending: number; rejected: number }>();
    
    for (const approval of submittedApprovals) {
      if (!approval.requestedByUserId) continue;
      
      const userId = approval.requestedByUserId;
      let stats = approvalsByUser.get(userId);
      if (!stats) {
        stats = { submitted: 0, approved: 0, pending: 0, rejected: 0 };
        approvalsByUser.set(userId, stats);
      }
      
      stats.submitted += 1;
      
      if (approval.status === "PENDING") {
        stats.pending += 1;
      } else if (approval.status === "REJECTED") {
        stats.rejected += 1;
      }
    }

    for (const approval of approvedApprovals) {
      if (!approval.requestedByUserId) continue;
      
      const userId = approval.requestedByUserId;
      let stats = approvalsByUser.get(userId);
      if (!stats) {
        stats = { submitted: 0, approved: 0, pending: 0, rejected: 0 };
        approvalsByUser.set(userId, stats);
      }
      
      stats.approved += 1;
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
      revenueGenerated: number;
      quotesGiven: number;
      quotesWon: number;
      customerApprovalsSubmitted: number;
      customerApprovalsApproved: number;
      customerApprovalsPending: number;
    };

    const byUser = new Map<number, Agg>();

    for (const r of rows) {
      const key = r.userId;
      let agg = byUser.get(key);
      if (!agg) {
        const approvalStats = approvalsByUser.get(key);
        agg = {
          userId: r.userId,
          name: r.user?.fullName ?? null,
          email: r.user?.email ?? null,
          officeName: r.office?.name ?? null,
          totalCalls: 0,
          totalHours: 0,
          totalMinutes: 0,
          days: 0,
          revenueGenerated: 0,
          quotesGiven: 0,
          quotesWon: 0,
          customerApprovalsSubmitted: approvalStats?.submitted ?? 0,
          customerApprovalsApproved: approvalStats?.approved ?? 0,
          customerApprovalsPending: approvalStats?.pending ?? 0,
        };
        byUser.set(key, agg);
      }

      const calls = r.callsMade ?? 0;
      const hours = r.hoursWorked ?? 0;
      const minutes = hours * 60;
      const quotesGiven = r.quotesGiven ?? 0;
      const quotesWon = r.quotesWon ?? 0;
      const revenue = r.revenueGenerated ?? 0;

      agg.totalCalls += calls;
      agg.totalHours += hours;
      agg.totalMinutes += minutes;
      agg.revenueGenerated += revenue;
      agg.days += 1;

      agg.quotesGiven += quotesGiven;
      agg.quotesWon += quotesWon;
    }

    for (const [userId, stats] of approvalsByUser) {
      if (!byUser.has(userId)) {
        const userInfo =
          submittedApprovals.find(
            (a: (typeof submittedApprovals)[number]) => a.requestedByUserId === userId,
          )?.requestedByUser ||
          approvedApprovals.find(
            (a: (typeof approvedApprovals)[number]) => a.requestedByUserId === userId,
          )?.requestedByUser;
        byUser.set(userId, {
          userId,
          name: userInfo?.fullName ?? null,
          email: userInfo?.email ?? null,
          officeName: null,
          totalCalls: 0,
          totalHours: 0,
          totalMinutes: 0,
          days: 0,
          revenueGenerated: 0,
          quotesGiven: 0,
          quotesWon: 0,
          customerApprovalsSubmitted: stats.submitted,
          customerApprovalsApproved: stats.approved,
          customerApprovalsPending: stats.pending,
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
      const revenue = u.revenueGenerated;
      const roi =
        monthlyCost > 0
          ? ((revenue - monthlyCost) / monthlyCost) * 100
          : null;

      const totalQuotesGiven = u.quotesGiven + u.customerApprovalsSubmitted;
      const totalQuotesWon = u.quotesWon + u.customerApprovalsApproved;
      const quoteWinRate =
        totalQuotesGiven > 0 ? (totalQuotesWon / totalQuotesGiven) * 100 : null;

      return {
        ...u,
        avgCallMinutes,
        callsPerDay,
        monthlyCost,
        roiPercent: roi,
        totalQuotesGiven,
        totalQuotesWon,
        quoteWinRate,
      };
    });

    users.sort((a, b) => b.totalCalls - a.totalCalls);

    const totalCalls = users.reduce((sum, u) => sum + u.totalCalls, 0);
    const totalHours = users.reduce((sum, u) => sum + u.totalHours, 0);
    const totalRevenue = users.reduce((sum, u) => sum + u.revenueGenerated, 0);
    const totalQuotesGiven = users.reduce((sum, u) => sum + u.totalQuotesGiven, 0);
    const totalQuotesWon = users.reduce((sum, u) => sum + u.totalQuotesWon, 0);
    const totalCustomerApprovalsSubmitted = users.reduce((sum, u) => sum + u.customerApprovalsSubmitted, 0);
    const totalCustomerApprovalsApproved = users.reduce((sum, u) => sum + u.customerApprovalsApproved, 0);
    const totalCustomerApprovalsPending = users.reduce(
      (sum, u) => sum + u.customerApprovalsPending,
      0,
    );

    const recentApprovals = submittedApprovals.slice(0, 10).map(
      (a: (typeof submittedApprovals)[number]) => ({
        id: a.id,
        customerName: a.customerLegalName,
        status: a.status,
        createdAt: a.createdAt,
        decidedAt: a.decidedAt,
        requestedBy: a.requestedByUser?.fullName || a.requestedByUser?.email || "Unknown",
        ventureName: a.venture?.name || null,
      }),
    );

    const summary = {
      totalCalls,
      totalHours,
      totalRevenue,
      totalQuotesGiven,
      totalQuotesWon,
      userCount: users.length,
      customerApprovals: {
        submitted: totalCustomerApprovalsSubmitted,
        approved: totalCustomerApprovalsApproved,
        pending: totalCustomerApprovalsPending,
      },
    };

    return res.status(200).json({ summary, users, recentApprovals });
  } catch (err) {
    console.error("Freight sales KPI error:", err);
    return res.status(500).json({ error: "Failed to fetch sales KPIs" });
  }
}
