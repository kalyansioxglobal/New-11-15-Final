import { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth";
import { runLostLoadRescueAgent } from "@/lib/ai/freightLostLoadAgent";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await getSessionUser(req, res);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const loadId = Number(req.query.id);
  if (!loadId || Number.isNaN(loadId)) {
    return res.status(400).json({ error: "Invalid load id" });
  }

  const { autoSend, maxEmails } = req.body ?? {};

  try {
    const result = await runLostLoadRescueAgent(loadId, {
      autoSend: !!autoSend,
      maxEmails: maxEmails ? Number(maxEmails) : 10,
      venture: "SIOX_LOGISTICS",
      userId: Number(user.id),
    });

    res.json(result);
  } catch (err: any) {
    console.error("LostLoadAgent error:", err);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
