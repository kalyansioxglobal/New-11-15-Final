import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

const MAX_RANGE_DAYS = 90;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) return;

  // CEO / ADMIN only for now
  if (user.role !== "CEO" && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden", detail: "Insufficient permissions for audit logs" });
  }

  try {
    const {
      from,
      to,
      domain,
      action,
      userId,
      ventureId,
      officeId,
      q,
      page = "1",
      pageSize = "50",
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const take = Math.min(200, Math.max(1, parseInt(String(pageSize), 10) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (from || to) {
      if (from) {
        const parsed = new Date(String(from));
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ error: "Invalid from date", detail: "from must be a valid date string" });
        }
        fromDate = parsed;
      }
      if (to) {
        const parsed = new Date(String(to));
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ error: "Invalid to date", detail: "to must be a valid date string" });
        }
        toDate = parsed;
      }
    } else {
      // Default: last 7 days
      toDate = new Date();
      fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 6);
    }

    if (fromDate && toDate) {
      const diffMs = toDate.getTime() - fromDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
      if (diffDays > MAX_RANGE_DAYS) {
        return res.status(400).json({
          error: "Date range too large",
          detail: `Maximum allowed range is ${MAX_RANGE_DAYS} days`,
        });
      }
      where.createdAt = { gte: fromDate, lte: toDate };
    }

    if (domain && typeof domain === "string") {
      where.domain = domain;
    }
    if (action && typeof action === "string") {
      where.action = action;
    }
    if (userId && typeof userId === "string") {
      const parsed = parseInt(userId, 10);
      if (!Number.isNaN(parsed)) where.userId = parsed;
    }
    if (ventureId && typeof ventureId === "string") {
      const parsed = parseInt(ventureId, 10);
      if (!Number.isNaN(parsed)) where.ventureId = parsed;
    }
    if (officeId && typeof officeId === "string") {
      const parsed = parseInt(officeId, 10);
      if (!Number.isNaN(parsed)) where.officeId = parsed;
    }

    if (q && typeof q === "string" && q.trim().length > 0) {
      const term = q.trim();
      where.OR = [
        { requestId: { contains: term, mode: "insensitive" } },
        { action: { contains: term, mode: "insensitive" } },
        { entityType: { contains: term, mode: "insensitive" } },
        { entityId: { contains: term, mode: "insensitive" } },
        { userRole: { contains: term, mode: "insensitive" } },
        {
          metadata: {
            path: [],
            string_contains: term,
            mode: "insensitive",
          } as any,
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.status(200).json({
      items,
      page: pageNum,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
    });
  } catch (error: any) {
    console.error("audit-logs error", error);
    return res.status(500).json({ error: "Failed to fetch audit logs", detail: error.message });
  }
}
