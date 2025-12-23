import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { UserRole } from "@prisma/client";
import { requireAdminUser } from "../../../../lib/authGuard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireAdminUser(req, res);
  if (!context) return;

  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    res.status(405).end();
    return;
  }

  const { userId, role } = req.body as { userId: number; role: UserRole };

  if (!userId || !role) {
    res.status(400).json({ error: "userId and role are required." });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      include: {
        ventures: { include: { venture: true } },
        offices: { include: { office: true } },
      },
    });
    res.json({ user });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to set role", detail: err.message });
  }
}
