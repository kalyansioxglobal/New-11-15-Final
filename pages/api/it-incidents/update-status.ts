import type { NextApiRequest, NextApiResponse } from "next";
import { withUser } from "@/lib/api";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ error: "id and status are required" });
  }

  const incidentId = Number(id);

  const response = await fetch(`/api/it-incidents/${incidentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return res.status(response.status).json(error);
  }

  const incident = await response.json();
  return res.json(incident);
});
