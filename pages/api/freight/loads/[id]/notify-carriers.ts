import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getMatchesForLoad } from "@/lib/logistics/matching";

type NotifyCarriersRequest = {
  maxCarriers?: number;
  channels?: ("email" | "sms")[];
};

type CarrierNotified = {
  carrierId: number;
  carrierName: string;
  dispatcherId?: string;
  dispatcherName?: string;
  email: string;
};

type NotifyCarriersResponse = {
  sent: number;
  attempted: number;
  carriersNotified: CarrierNotified[];
  error?: string;
};

const COOLDOWN_MINUTES = 30;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NotifyCarriersResponse | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const loadId = Number(req.query.id);
  if (isNaN(loadId)) {
    return res.status(400).json({ error: "Invalid load ID" });
  }

  try {
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: {
        shipper: { select: { name: true } },
      },
    });

    if (!load) {
      return res.status(404).json({ error: "Load not found" });
    }

    const nonNotifiableStatuses = ["COVERED", "DELIVERED", "LOST", "FELL_OFF", "DORMANT"];
    const currentStatus = String(load.loadStatus);
    if (nonNotifiableStatuses.includes(currentStatus)) {
      return res.status(400).json({
        error: `Cannot notify carriers for a load with status: ${currentStatus}`,
      });
    }

    if (load.lastCarrierDropNotificationAt) {
      const lastNotif = new Date(load.lastCarrierDropNotificationAt);
      const minutesSince = (Date.now() - lastNotif.getTime()) / (1000 * 60);
      if (minutesSince < COOLDOWN_MINUTES) {
        return res.status(429).json({
          error: `Notifications were sent ${Math.round(minutesSince)} minutes ago. Please wait ${Math.round(COOLDOWN_MINUTES - minutesSince)} more minutes.`,
        });
      }
    }

    const body: NotifyCarriersRequest = req.body || {};
    const maxCarriers = Math.min(body.maxCarriers || 5, 20);
    const channels = body.channels || ["email"];

    const matchResult = await getMatchesForLoad(loadId, {
      maxResults: maxCarriers * 2,
      requireEquipmentMatch: true,
    });
    const matches = matchResult.matches;

    const carriersToNotify: Array<{
      carrierId: number;
      carrierName: string;
      dispatcherId?: string;
      dispatcherName?: string;
      email: string;
    }> = [];

    for (const match of matches) {
      if (carriersToNotify.length >= maxCarriers) break;

      let email: string | null = null;
      let dispatcherId: string | undefined;
      let dispatcherName: string | undefined;

      if (match.primaryDispatcher?.email) {
        email = match.primaryDispatcher.email;
        dispatcherId = match.primaryDispatcher.id;
        dispatcherName = match.primaryDispatcher.name;
      } else if (match.contact?.email) {
        email = match.contact.email;
      }

      if (!email) continue;

      carriersToNotify.push({
        carrierId: match.carrierId,
        carrierName: match.carrierName,
        dispatcherId,
        dispatcherName,
        email,
      });
    }

    if (carriersToNotify.length === 0) {
      return res.status(200).json({
        sent: 0,
        attempted: 0,
        carriersNotified: [],
        error: "No matching carriers with valid contact emails found",
      });
    }

    const origin = [load.pickupCity, load.pickupState].filter(Boolean).join(", ") || "Origin";
    const destination = [load.dropCity, load.dropState].filter(Boolean).join(", ") || "Destination";
    const pickupDateStr = load.pickupDate
      ? new Date(load.pickupDate).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "TBD";
    const shipperName = load.shipper?.name || load.shipperName || "Shipper";
    const equipmentType = load.equipmentType || "Dry Van";
    const rateInfo = load.rate ? `$${load.rate.toLocaleString()}` : "Rate negotiable";

    let sentCount = 0;
    const notifiedCarriers: CarrierNotified[] = [];

    for (const carrier of carriersToNotify) {
      const subject = `Load available: ${origin} → ${destination} on ${pickupDateStr}`;
      const htmlBody = `
        <p>Hi${carrier.dispatcherName ? ` ${carrier.dispatcherName}` : ""},</p>
        <p>We have a load available that matches your lanes:</p>
        <ul>
          <li><strong>Origin:</strong> ${origin}</li>
          <li><strong>Destination:</strong> ${destination}</li>
          <li><strong>Pickup Date:</strong> ${pickupDateStr}</li>
          <li><strong>Equipment:</strong> ${equipmentType}</li>
          <li><strong>Rate:</strong> ${rateInfo}</li>
          <li><strong>Shipper:</strong> ${shipperName}</li>
        </ul>
        <p>Please reply to this email or call us if you're interested in taking this load.</p>
        <p>Thank you,<br/>SIOX Freight Team</p>
      `;

      if (channels.includes("email")) {
        // NOTE: External carrier emails are disabled - SendGrid is for internal use only.
        // Contact is logged for manual follow-up by dispatchers.
        await prisma.carrierContact.create({
          data: {
            carrierId: carrier.carrierId,
            loadId: loadId,
            madeById: user.id,
            channel: "Email - Drop Notification (Pending)",
            subject,
            body: htmlBody.slice(0, 2000),
            outcome: "PENDING",
          },
        });

        sentCount++;
        notifiedCarriers.push(carrier);
      }
    }

    await prisma.load.update({
      where: { id: loadId },
      data: { lastCarrierDropNotificationAt: new Date() },
    });

    return res.status(200).json({
      sent: sentCount,
      attempted: carriersToNotify.length,
      carriersNotified: notifiedCarriers,
    });
  } catch (error) {
    console.error("Notify carriers error:", error);
    return res.status(500).json({ error: "Failed to notify carriers" });
  }
}
