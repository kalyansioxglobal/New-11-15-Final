import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { can } from "@/lib/permissions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ventureId = Number(req.query.id);
  if (!ventureId) {
    return res.status(400).json({ error: "Missing venture ID" });
  }

  // Enforce venture access
  if (!can(user, "view", "VENTURE", { ventureId })) {
    return res.status(403).json({ error: "Forbidden: Access denied to this venture" });
  }

  try {
    const files = await prisma.file.findMany({
      where: {
        ventureId,
        deletedAt: null,
      },
      include: {
        task: {
          select: { id: true, title: true },
        },
        load: {
          select: { id: true, reference: true },
        },
        hotel: {
          select: { id: true, name: true },
        },
        policy: {
          select: { id: true, name: true },
        },
        shipper: {
          select: { id: true, name: true },
        },
        carrier: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const documents = files.map((f) => {
      let sourceType = "Venture";
      let sourceLabel = "Venture-level document";

      if (f.taskId && f.task) {
        sourceType = "Task";
        sourceLabel = f.task.title ?? `Task #${f.task.id}`;
      } else if (f.loadId && f.load) {
        sourceType = "Load";
        sourceLabel = f.load.reference ?? `Load #${f.load.id}`;
      } else if (f.hotelId && f.hotel) {
        sourceType = "Hotel";
        sourceLabel = f.hotel.name ?? `Hotel #${f.hotel.id}`;
      } else if (f.policyId && f.policy) {
        sourceType = "Policy";
        sourceLabel = f.policy.name ?? `Policy #${f.policy.id}`;
      } else if (f.shipperId && f.shipper) {
        sourceType = "Shipper";
        sourceLabel = f.shipper.name ?? `Shipper #${f.shipper.id}`;
      } else if (f.carrierId && f.carrier) {
        sourceType = "Carrier";
        sourceLabel = f.carrier.name ?? `Carrier #${f.carrier.id}`;
      }

      return {
        id: f.id,
        fileName: f.fileName,
        sizeBytes: f.sizeBytes,
        tag: f.tag ?? null,
        createdAt: f.createdAt.toISOString(),
        sourceType,
        sourceLabel,
      };
    });

    return res.status(200).json({ documents });
  } catch (error) {
    const { logger } = await import("@/lib/logger");
    logger.error("venture_documents_fetch_failed", {
      userId: user.id,
      ventureId: req.query.id,
      error: error?.message || String(error),
      stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
    });
    return res.status(500).json({ error: "Failed to fetch documents" });
  }
}
