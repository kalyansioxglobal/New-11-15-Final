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

  const { id, name, email, phone, role, isActive } = req.body as {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    isActive?: boolean;
  };

  if (!id) {
    res.status(400).json({ error: "User id is required." });
    return;
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        fullName: name,
        email,
        phone,
        role,
        isActive,
      },
      include: {
        ventures: { include: { venture: true } },
        offices: { include: { office: true } },
      },
    });

    res.json({ user: updated });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user", detail: err.message });
  }
}
