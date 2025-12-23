import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

// StaffRole is a simple string union here, decoupled from Prisma's generated enum.
type StaffRole =
  | "SALES_AGENT"
  | "CSR"
  | "DISPATCHER"
  | "HOTEL_MANAGER"
  | "REVENUE_MANAGER"
  | "HOUSEKEEPER"
  | "BPO_AGENT"
  | "TEAM_LEAD";

function normalize(str: string) {
  return str.trim().toUpperCase();
}

const VALID_STAFF_ROLES: StaffRole[] = [
  "SALES_AGENT",
  "CSR",
  "DISPATCHER",
  "HOTEL_MANAGER",
  "REVENUE_MANAGER",
  "HOUSEKEEPER",
  "BPO_AGENT",
  "TEAM_LEAD",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getEffectiveUser(req, res);
  if (!user || user.role !== "ADMIN") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const { email, fullName, alias, extension, phoneUs, phoneIn, staffRole } = req.body;

  const updateData: Record<string, string | undefined> = {};
  if (email !== undefined) updateData.email = email;
  if (fullName !== undefined) updateData.fullName = fullName;
  if (alias !== undefined) updateData.alias = alias;
  if (extension !== undefined) updateData.extension = extension;
  if (phoneUs !== undefined) updateData.phoneUs = phoneUs;
  if (phoneIn !== undefined) updateData.phoneIn = phoneIn;

  const updatedUser = await prisma.user.update({
    where: { id: Number(id) },
    data: updateData,
  });

  if (alias && alias.trim()) {
    const normalizedName = normalize(alias);
    const role: StaffRole = VALID_STAFF_ROLES.includes(staffRole) ? staffRole : "DISPATCHER";

    await prisma.staffAlias.upsert({
      where: { normalizedName },
      update: {
        name: alias.trim(),
        userId: updatedUser.id,
        isPrimaryForUser: true,
        role,
      },
      create: {
        name: alias.trim(),
        normalizedName,
        role,
        userId: updatedUser.id,
        isPrimaryForUser: true,
      },
    });
  }

  return res.json({ user: updatedUser });
}
