import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { UserRole } from "@prisma/client";
import { requireAdminUser } from "../../../../lib/authGuard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await requireAdminUser(req, res);
  if (!context) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  const { name, email, phone, role, ventureIds, officeIds } = req.body as {
    name?: string;
    email: string;
    phone?: string;
    role: UserRole;
    ventureIds?: number[];
    officeIds?: number[];
  };

  if (!email || !role) {
    res.status(400).json({ error: "Email and role are required." });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: "EMAIL_EXISTS", detail: "A user with this email already exists." });
      return;
    }

    const newUser = await prisma.user.create({
      data: {
        fullName: name,
        email,
        phone,
        role,
        isActive: true,
        ventures: ventureIds
          ? {
              create: ventureIds.map((id) => ({ ventureId: id })),
            }
          : undefined,
        offices: officeIds
          ? {
              create: officeIds.map((id) => ({ officeId: id })),
            }
          : undefined,
      },
      include: {
        ventures: { include: { venture: true } },
        offices: { include: { office: true } },
      },
    });

    res.status(201).json({ user: newUser });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user", detail: err.message });
  }
}
