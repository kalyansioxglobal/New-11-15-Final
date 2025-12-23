import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

const isTestBypassEnabled = () => {
  return (
    process.env.TEST_AUTH_BYPASS === "true" &&
    process.env.NODE_ENV !== "production"
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isTestBypassEnabled()) {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const loadId = req.query.loadId ? Number(req.query.loadId) : null;

  if (!loadId) {
    return res.status(400).json({ error: "loadId is required" });
  }

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: { id: true, ventureId: true },
  });

  if (!load) {
    return res.status(404).json({ error: "Load not found" });
  }

  if (load.ventureId && !user.ventureIds.includes(load.ventureId)) {
    return res.status(403).json({ error: "Access denied to this load" });
  }

  const lastMessage = await prisma.outreachMessage.findFirst({
    where: { loadId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      loadId: true,
      ventureId: true,
      channel: true,
      provider: true,
      subject: true,
      status: true,
      createdAt: true,
      _count: { select: { recipients: true } },
    },
  });

  if (!lastMessage) {
    return res.status(200).json({ message: null, loadVentureId: load.ventureId });
  }

  return res.status(200).json({
    message: {
      id: lastMessage.id,
      loadId: lastMessage.loadId,
      ventureId: lastMessage.ventureId,
      channel: lastMessage.channel,
      provider: lastMessage.provider,
      subject: lastMessage.subject,
      status: lastMessage.status,
      createdAt: lastMessage.createdAt,
      recipientCount: lastMessage._count.recipients,
    },
    loadVentureId: load.ventureId,
  });
}
