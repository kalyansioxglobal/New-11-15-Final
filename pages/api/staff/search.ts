import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getEffectiveUser(req, res);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { q, role, limit = 10 } = req.query;
  const query = (q as string | undefined)?.trim() ?? "";

  if (!query) {
    return res.json({ results: [] });
  }

  const normalized = query.toUpperCase();

  const aliases = await prisma.staffAlias.findMany({
    where: {
      AND: [
        role ? { role: role as any } : {},
        {
          OR: [
            { normalizedName: { contains: normalized } },
            { name: { contains: query, mode: "insensitive" } },
            {
              user: {
                OR: [
                  { fullName: { contains: query, mode: "insensitive" } },
                  { email: { contains: query, mode: "insensitive" } },
                ],
              },
            },
          ],
        },
      ],
    },
    include: {
      user: true,
    },
    take: Number(limit) || 10,
  });

  const results = aliases.map((a) => ({
    id: a.id,
    alias: a.name,
    role: a.role,
    userId: a.user?.id ?? null,
    fullName: a.user?.fullName ?? null,
    email: a.user?.email ?? null,
    extension: a.user?.extension ?? null,
    phoneUs: a.user?.phoneUs ?? null,
    phoneIn: a.user?.phoneIn ?? null,
  }));

  res.json({ results });
}
