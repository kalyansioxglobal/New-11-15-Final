import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { hasPermission } from "@/lib/hasPermission";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Disabled in production" });
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!hasPermission(session.user, "delete", "task")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [tasks, policies, offices, ventures] = await Promise.all([
    prisma.task.deleteMany({ where: { isTest: true } }),
    prisma.policy.deleteMany({ where: { isTest: true } }),
    prisma.office.deleteMany({ where: { isTest: true } }),
    prisma.venture.deleteMany({ where: { isTest: true } }),
  ]);

  return res.json({
    deleted: {
      tasks: tasks.count,
      policies: policies.count,
      offices: offices.count,
      ventures: ventures.count,
    },
  });
}
