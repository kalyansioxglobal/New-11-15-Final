import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { getMatchesForLoad } from "@/lib/logistics/matching";

function isAllowedRole(role: string): boolean {
  return ["CEO", "ADMIN", "COO", "DISPATCHER", "CSR", "VENTURE_HEAD", "TEAM_LEAD"].includes(role);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!isAllowedRole(user.role)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Load ID is required" });
  }

  const loadId = parseInt(id, 10);
  if (isNaN(loadId)) {
    return res.status(400).json({ error: "Invalid load ID" });
  }

  if (req.method === "POST") {
    const { carrierIds, channel, subject, body, templateType } = req.body as {
      carrierIds?: number[];
      channel?: string;
      subject?: string;
      body?: string;
      templateType?: "coverage_request" | "inquiry" | "relationship";
    };

    if (!carrierIds || !Array.isArray(carrierIds) || carrierIds.length === 0) {
      return res.status(400).json({ error: "carrierIds array is required" });
    }

    if (!channel) {
      return res.status(400).json({ error: "channel is required (email, sms, phone)" });
    }

    const load = await prisma.load.findUnique({
      where: { id: loadId },
      select: {
        id: true,
        reference: true,
        pickupCity: true,
        pickupState: true,
        dropCity: true,
        dropState: true,
        pickupDate: true,
        equipmentType: true,
        weightLbs: true,
      },
    });

    if (!load) {
      return res.status(404).json({ error: "Load not found" });
    }

    const carriers = await prisma.carrier.findMany({
      where: { id: { in: carrierIds } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    const messageBody = body || generateDefaultMessage(load, templateType);
    const messageSubject = subject || `Load Available: ${load.pickupCity}, ${load.pickupState} to ${load.dropCity}, ${load.dropState}`;

    const contactLogs = [];
    const sentTo = [];
    const failed = [];

    for (const carrier of carriers) {
      try {
        const contactLog = await prisma.carrierContact.create({
          data: {
            carrierId: carrier.id,
            loadId: load.id,
            madeById: user.id,
            channel,
            subject: messageSubject,
            body: messageBody,
            outcome: "SENT",
            notes: `Bulk outreach - ${templateType || "coverage_request"}`,
          },
        });

        contactLogs.push(contactLog);
        sentTo.push({
          carrierId: carrier.id,
          carrierName: carrier.name,
          email: carrier.email,
          phone: carrier.phone,
          contactLogId: contactLog.id,
        });
      } catch (err) {
        failed.push({
          carrierId: carrier.id,
          carrierName: carrier.name,
          error: "Failed to log contact",
        });
      }
    }

    return res.status(200).json({
      success: true,
      loadId,
      channel,
      sentCount: sentTo.length,
      failedCount: failed.length,
      sentTo,
      failed,
      message: messageBody,
      subject: messageSubject,
    });
  }

  if (req.method === "GET") {
    const { limit, requireEquipmentMatch } = req.query;
    
    const maxResults = limit ? parseInt(limit as string, 10) : 20;
    
    try {
      const matchResults = await getMatchesForLoad(loadId, {
        maxResults,
        requireEquipmentMatch: requireEquipmentMatch === "true",
      });

      const load = await prisma.load.findUnique({
        where: { id: loadId },
        select: {
          id: true,
          reference: true,
          pickupCity: true,
          pickupState: true,
          dropCity: true,
          dropState: true,
          pickupDate: true,
          equipmentType: true,
          loadStatus: true,
        },
      });

      return res.status(200).json({
        load,
        matches: matchResults.matches,
        totalCandidates: matchResults.totalCandidates,
      });
    } catch (err: any) {
      console.error("/api/freight/loads/[id]/outreach GET error", err);
      return res.status(500).json({ error: "Failed to get matches" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function generateDefaultMessage(
  load: {
    reference: string | null;
    pickupCity: string | null;
    pickupState: string | null;
    dropCity: string | null;
    dropState: string | null;
    pickupDate: Date | null;
    equipmentType: string | null;
    weightLbs: number | null;
  },
  templateType?: string
): string {
  const lane = `${load.pickupCity || "?"}, ${load.pickupState || "?"} to ${load.dropCity || "?"}, ${load.dropState || "?"}`;
  const pickupDateStr = load.pickupDate
    ? new Date(load.pickupDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "TBD";

  if (templateType === "inquiry") {
    return `Hi, do you have any trucks available for ${lane}? Looking for ${load.equipmentType || "dry van"} capacity. Please let us know your availability. Thanks!`;
  }

  if (templateType === "relationship") {
    return `Hi, hope all is well! We have upcoming loads on the ${lane} lane and wanted to check if you'd be interested in running with us again. Let us know your availability!`;
  }

  return `Hi, we have a load available:

Lane: ${lane}
Pickup: ${pickupDateStr}
Equipment: ${load.equipmentType || "Dry Van"}
${load.weightLbs ? `Weight: ${load.weightLbs.toLocaleString()} lbs` : ""}

Please call or reply if interested. Thanks!`;
}
