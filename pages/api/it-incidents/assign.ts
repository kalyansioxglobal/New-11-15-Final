import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user,
) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, assignedToId } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Incident ID is required" });
  }

  // Delegate to canonical PUT /api/it-incidents/[id]
  const incidentId = Number(id);
  const updates: any = {
    assignedToUserId: assignedToId ? Number(assignedToId) : null,
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/it-incidents/${incidentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return res.status(response.status).json(error);
  }

  const incident = await response.json();
  return res.json(incident);
});
