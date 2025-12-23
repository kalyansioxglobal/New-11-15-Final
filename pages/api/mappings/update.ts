import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAdminUser } from "@/lib/apiAuth";

const prisma = new PrismaClient();

type UpdatePayload =
  | {
      type: "userMapping";
      id: string;
      rcExtension?: string | null;
      rcUserName?: string | null;
      rcEmail?: string | null;
      tmsEmployeeCode?: string | null;
      tmsEmail?: string | null;
      notes?: string | null;
    }
  | {
      type: "shipperInternal";
      id: string;
      internalCode: string | null;
    }
  | {
      type: "customerInternal";
      id: string;
      internalCode: string | null;
    }
  | {
      type: "carrierTmsCode";
      id: string;
      tmsCarrierCode: string | null;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireAdminUser(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as UpdatePayload;
    if (!body || !("type" in body)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    switch (body.type) {
      case "userMapping": {
        const { id, rcExtension, rcUserName, rcEmail, tmsEmployeeCode, tmsEmail, notes } =
          body;
        const updated = await prisma.userMapping.update({
          where: { id: parseInt(id, 10) },
          data: {
            rcExtension: rcExtension ?? undefined,
            rcUserName: rcUserName ?? undefined,
            rcEmail: rcEmail ?? undefined,
            tmsEmployeeCode: tmsEmployeeCode ?? undefined,
            tmsEmail: tmsEmail ?? undefined,
            notes: notes ?? undefined,
          },
          include: { user: true },
        });
        return res.status(200).json({ ok: true, updated });
      }

      case "shipperInternal": {
        const { id, internalCode } = body;
        const updated = await prisma.logisticsShipper.update({
          where: { id: parseInt(id, 10) },
          data: { internalCode: internalCode ?? null },
        });
        return res.status(200).json({ ok: true, updated });
      }

      case "customerInternal": {
        const { id, internalCode } = body;
        const updated = await prisma.customer.update({
          where: { id: parseInt(id, 10) },
          data: { internalCode: internalCode ?? null },
        });
        return res.status(200).json({ ok: true, updated });
      }

      case "carrierTmsCode": {
        const { id, tmsCarrierCode } = body;
        const updated = await prisma.carrier.update({
          where: { id: parseInt(id, 10) },
          data: { tmsCarrierCode: tmsCarrierCode ?? null },
        });
        return res.status(200).json({ ok: true, updated });
      }

      default:
        return res.status(400).json({ error: "Unknown update type" });
    }
  } catch (err: any) {
    console.error("Mappings update error:", err);
    return res.status(500).json({
      error: "Failed to update mapping",
      detail: err?.message ?? "Unknown error",
    });
  }
}
