import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = Number(session.user.id);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const items = await prisma.incentiveDaily.findMany({
    where: {
      userId,
      date: {
        gte: new Date(thirtyDaysAgo.toISOString().slice(0, 10) + "T00:00:00.000Z"),
        lte: new Date(now.toISOString().slice(0, 10) + "T23:59:59.999Z"),
      },
    },
    orderBy: { date: "desc" },
  });

  const totalLast30 = items.reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyItems = items.filter(
    (i) => new Date(i.date) >= startOfMonth
  );
  const totalThisMonth = monthlyItems.reduce((sum, i) => sum + (i.amount ?? 0), 0);

  return res.status(200).json({
    items: items.map((i) => {
      const breakdown = i.breakdown as any;
      return {
        id: i.id,
        date: i.date,
        scope: breakdown?.scope ?? "",
        metricKey: breakdown?.metricKey ?? "",
        metricValue: breakdown?.metricValue ?? 0,
        payoutAmount: i.amount ?? 0,
      };
    }),
    totalThisMonth,
    totalLast30,
  });
}
