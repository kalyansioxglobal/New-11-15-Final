import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { withRequestLogging } from "@/lib/requestLog";
import type { SessionUser } from "@/lib/scope";
import type { UserRole } from "@prisma/client";

function canUseDispatcherSearch(role: UserRole): boolean {
  // Leadership + operations + dispatch-focused roles
  return ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "DISPATCHER"].includes(role);
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  if (!canUseDispatcherSearch(user.role as UserRole)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const queryParam = Array.isArray(req.query.query)
    ? req.query.query[0]
    : req.query.query;

  const q = (queryParam ?? "").toString().trim();

  const where: any = {
    isActive: true,
    role: {
      in: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "DISPATCHER"],
    },
  };

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
    },
    orderBy: { fullName: "asc" },
    take: 20,
  });

  withRequestLogging(req, res, { user, ventureId: null, officeId: null }, {
    endpoint: "dispatcher_search",
    page: null,
    pageSize: users.length,
    dateFrom: null,
    dateTo: null,
  });

  return res.status(200).json(
    users.map((u) => ({ userId: u.id, name: u.fullName, email: u.email })),
  );
}

export default withUser(handler);
