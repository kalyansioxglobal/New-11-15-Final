import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { applyLoadScope } from "@/lib/scopeLoads";

type DailyTrend = {
  date: string;
  totalLoads: number;
  coveredLoads: number;
  coverageRatePct: number;
};

type LoadNeedingAttention = {
  id: number;
  reference: string | null;
  shipperName: string | null;
  pickupAt: string;
  originCityState: string;
  destCityState: string;
  status: string;
  hoursToPickup: number;
  assignedCsrName: string | null;
  carriersContactedCount: number;
};

type DispatcherLeaderboardEntry = {
  userId: number;
  userName: string;
  loadsCovered: number;
  contactsMade: number;
  avgTimeToFirstContactMinutes: number | null;
};

type CoverageWarRoomResponse = {
  summary: {
    totalLoads: number;
    coveredLoads: number;
    openLoads: number;
    atRiskLoads: number;
    lostLoads: number;
    coverageRatePct: number;
  };
  loadsNeedingAttention: LoadNeedingAttention[];
  dispatcherLeaderboard: DispatcherLeaderboardEntry[];
  trends: {
    daily: DailyTrend[];
  };
};

const COVERED_STATUSES = ["COVERED", "DELIVERED"];
const OPEN_STATUSES = ["OPEN", "WORKING", "MAYBE"];
const AT_RISK_STATUSES = ["AT_RISK"];
const LOST_STATUSES = ["FELL_OFF", "LOST"];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CoverageWarRoomResponse | { error: string }>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const officeId = req.query.officeId ? Number(req.query.officeId) : undefined;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();

    const baseWhere: any = {
      isTest: false,
      OR: [
        { pickupDate: { gte: dateFrom, lte: dateTo } },
        { pickupDate: null, createdAt: { gte: dateFrom, lte: dateTo } },
      ],
    };

    if (ventureId) baseWhere.ventureId = ventureId;
    if (officeId) baseWhere.officeId = officeId;

    const where = applyLoadScope(user, baseWhere);

    const allLoads = await prisma.load.findMany({
      where,
      include: {
        shipper: { select: { name: true } },
        createdBy: { select: { id: true, fullName: true } },
        contacts: {
          include: {
            madeBy: { select: { id: true, fullName: true } },
          },
        },
        carrier: { select: { id: true } },
      },
      orderBy: { pickupDate: "asc" },
    });

    const totalLoads = allLoads.length;
    const coveredLoads = allLoads.filter((l) => COVERED_STATUSES.includes(l.loadStatus)).length;
    const openLoads = allLoads.filter((l) => OPEN_STATUSES.includes(l.loadStatus)).length;
    const atRiskLoads = allLoads.filter((l) => AT_RISK_STATUSES.includes(l.loadStatus) || l.atRiskFlag).length;
    const lostLoads = allLoads.filter((l) => LOST_STATUSES.includes(l.loadStatus)).length;
    const coverageRatePct = totalLoads > 0 ? Math.round((coveredLoads / totalLoads) * 1000) / 10 : 0;

    const loadsNeedingAttention: LoadNeedingAttention[] = allLoads
      .filter((l) => [...OPEN_STATUSES, ...AT_RISK_STATUSES].includes(l.loadStatus) || l.atRiskFlag)
      .map((l) => {
        const effectiveDate = l.pickupDate || l.createdAt;
        const hoursToPickup = effectiveDate
          ? Math.round((new Date(effectiveDate).getTime() - Date.now()) / (1000 * 60 * 60))
          : 999;

        return {
          id: l.id,
          reference: l.reference,
          shipperName: l.shipper?.name || l.shipperName,
          pickupAt: l.pickupDate?.toISOString() || l.createdAt?.toISOString() || "",
          originCityState: [l.pickupCity, l.pickupState].filter(Boolean).join(", "),
          destCityState: [l.dropCity, l.dropState].filter(Boolean).join(", "),
          status: l.atRiskFlag ? "AT_RISK" : l.loadStatus,
          hoursToPickup,
          assignedCsrName: l.createdBy?.fullName || null,
          carriersContactedCount: l.contacts?.length || 0,
        };
      })
      .sort((a, b) => a.hoursToPickup - b.hoursToPickup)
      .slice(0, 50);

    const dispatcherMap = new Map<number, {
      userId: number;
      userName: string;
      loadsCovered: Set<number>;
      contactsMade: number;
      firstContactTimes: number[];
    }>();

    for (const load of allLoads) {
      if (!load.contacts || load.contacts.length === 0) continue;

      for (const contact of load.contacts) {
        const userId = contact.madeById;
        const userName = contact.madeBy?.fullName || `User ${userId}`;

        if (!dispatcherMap.has(userId)) {
          dispatcherMap.set(userId, {
            userId,
            userName,
            loadsCovered: new Set(),
            contactsMade: 0,
            firstContactTimes: [],
          });
        }

        const entry = dispatcherMap.get(userId)!;
        entry.contactsMade++;

        if (COVERED_STATUSES.includes(load.loadStatus) || load.carrierId) {
          entry.loadsCovered.add(load.id);
        }
      }

      const firstContactByUser = new Map<number, Date>();
      for (const contact of load.contacts) {
        const userId = contact.madeById;
        const contactTime = new Date(contact.createdAt);
        if (!firstContactByUser.has(userId) || contactTime < firstContactByUser.get(userId)!) {
          firstContactByUser.set(userId, contactTime);
        }
      }

      for (const [userId, firstContactTime] of firstContactByUser) {
        const entry = dispatcherMap.get(userId);
        if (entry && load.createdAt) {
          const minutesToFirst = Math.round(
            (firstContactTime.getTime() - new Date(load.createdAt).getTime()) / (1000 * 60)
          );
          if (minutesToFirst >= 0) {
            entry.firstContactTimes.push(minutesToFirst);
          }
        }
      }
    }

    const dispatcherLeaderboard: DispatcherLeaderboardEntry[] = Array.from(dispatcherMap.values())
      .map((d) => ({
        userId: d.userId,
        userName: d.userName,
        loadsCovered: d.loadsCovered.size,
        contactsMade: d.contactsMade,
        avgTimeToFirstContactMinutes:
          d.firstContactTimes.length > 0
            ? Math.round(d.firstContactTimes.reduce((a, b) => a + b, 0) / d.firstContactTimes.length)
            : null,
      }))
      .sort((a, b) => b.loadsCovered - a.loadsCovered || b.contactsMade - a.contactsMade)
      .slice(0, 10);

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const dailyMap = new Map<string, { total: number; covered: number }>();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailyMap.set(d.toISOString().split("T")[0], { total: 0, covered: 0 });
    }

    for (const load of allLoads) {
      const effectiveDate = load.pickupDate || load.createdAt;
      if (!effectiveDate) continue;
      const dateKey = new Date(effectiveDate).toISOString().split("T")[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { total: 0, covered: 0 });
      }
      const day = dailyMap.get(dateKey)!;
      day.total++;
      if (COVERED_STATUSES.includes(load.loadStatus) || load.carrierId) {
        day.covered++;
      }
    }

    const daily: DailyTrend[] = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, stats]) => ({
        date,
        totalLoads: stats.total,
        coveredLoads: stats.covered,
        coverageRatePct: stats.total > 0 ? Math.round((stats.covered / stats.total) * 1000) / 10 : 0,
      }));

    return res.status(200).json({
      summary: {
        totalLoads,
        coveredLoads,
        openLoads,
        atRiskLoads,
        lostLoads,
        coverageRatePct,
      },
      loadsNeedingAttention,
      dispatcherLeaderboard,
      trends: { daily },
    });
  } catch (error) {
    console.error("Coverage War Room error:", error);
    return res.status(500).json({ error: "Failed to fetch coverage data" });
  }
}
