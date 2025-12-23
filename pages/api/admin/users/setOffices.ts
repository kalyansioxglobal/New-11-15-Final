import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireAdminUser } from "../../../../lib/authGuard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireAdminUser(req, res);
  if (!context) return;

  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    res.status(405).end();
    return;
  }

  const { userId, officeIds } = req.body as { userId: number; officeIds: number[] };

  if (!userId || !Array.isArray(officeIds)) {
    res.status(400).json({ error: "userId and officeIds[] are required." });
    return;
  }

  try {
    await prisma.officeUser.deleteMany({ where: { userId } });

    await prisma.officeUser.createMany({
      data: officeIds.map((officeId) => ({ userId, officeId })),
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ventures: { include: { venture: true } },
        offices: { include: { office: true } },
      },
    });

    res.json({ user });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to set offices", detail: err.message });
  }
}
