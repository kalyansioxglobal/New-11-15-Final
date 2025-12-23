import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pickupState, dropState, equipmentType } = req.query;

  const where: any = {
    active: true,
  };

  if (equipmentType) {
    where.equipmentTypes = { contains: equipmentType as string, mode: "insensitive" };
  }

  const carriers = await prisma.carrier.findMany({
    where,
    select: {
      id: true,
      name: true,
      mcNumber: true,
      email: true,
      phone: true,
      city: true,
      state: true,
      equipmentTypes: true,
      lanesJson: true,
      rating: true,
      _count: {
        select: { loads: true },
      },
    },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
    take: 50,
  });

  const matched = carriers.map((c: (typeof carriers)[number]) => {
    let score = 0;
    let matchReason: string[] = [];

    if (c.rating) {
      score += c.rating * 10;
      matchReason.push(`Rating: ${c.rating}/5`);
    }

    if (c._count.loads > 0) {
      score += Math.min(c._count.loads * 2, 20);
      matchReason.push(`${c._count.loads} past loads`);
    }

    if (pickupState && c.state === pickupState) {
      score += 15;
      matchReason.push("Based in pickup state");
    }

    if (c.lanesJson && pickupState && dropState) {
      try {
        const lanes = JSON.parse(c.lanesJson);
        const hasLane = lanes.some(
          (lane: { fromState: string; toState: string }) =>
            lane.fromState === pickupState && lane.toState === dropState
        );
        if (hasLane) {
          score += 25;
          matchReason.push("Preferred lane match");
        }
      } catch (e) {}
    }

    return {
      ...c,
      loadCount: c._count.loads,
      score,
      matchReason,
    };
  });

  matched.sort((a: (typeof matched)[number], b: (typeof matched)[number]) => b.score - a.score);

  return res.json({ carriers: matched.slice(0, 20) });
}
