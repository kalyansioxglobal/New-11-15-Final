import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./[...nextauth]";
import { hasPermission } from "@/lib/hasPermission";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!hasPermission(session.user, "start", "impersonate")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const token = {
    odinalUserId: session.user.id,
    originalRole: session.user.role,
    impersonating: true,
    impersonatedUserId: userId,
  };

  res.setHeader(
    "Set-Cookie",
    `impersonation=${JSON.stringify(token)}; Path=/; HttpOnly; SameSite=Strict`
  );

  return res.json({ success: true });
}
