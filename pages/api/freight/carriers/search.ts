import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "DISPATCHER", "CSR", "VENTURE_HEAD"].includes(
    role,
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  // RBAC: CSR / Dispatch / Leadership only
  if (!isAllowedRole(user.role)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { q } = req.query;

  if (!q || typeof q !== "string" || q.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "Search query 'q' is required and must be non-empty" });
  }

  try {
    const searchTerm = `%${q}%`;
    const carriers = await prisma.carrier.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { mcNumber: { contains: q, mode: "insensitive" } },
          { tmsCarrierCode: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        mcNumber: true,
        tmsCarrierCode: true,
      },
      take: 10,
    });

    return res.json({
      carriers: carriers.map((c: (typeof carriers)[number]) => ({
        id: c.id,
        name: c.name,
        mcNumber: c.mcNumber,
        code: c.tmsCarrierCode,
      })),
    });
  } catch (err: any) {
    console.error("/api/freight/carriers/search error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
