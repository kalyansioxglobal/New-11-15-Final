import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { logAuditEvent } from "@/lib/audit";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user
) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    assetId,
    title,
    description,
    severity,
    category,
    assignedToUserId,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: "VALIDATION_ERROR", detail: "title is required" });
  }

  let asset = null as any;
  let ventureId: number | null = null;
  let officeId: number | null = null;

  if (assetId) {
    const aId = Number(assetId);
    if (!Number.isNaN(aId)) {
      asset = await prisma.iTAsset.findUnique({ where: { id: aId } });
      if (!asset) {
        return res.status(400).json({ error: "INVALID_ASSET", detail: "Asset not found" });
      }
      ventureId = asset.ventureId;
      officeId = asset.officeId;
    }
  }

  const incidentAssignedToUserId = assignedToUserId ? Number(assignedToUserId) : null;

  const incident = await prisma.iTIncident.create({
    data: {
      ventureId: ventureId ?? user.ventureIds[0] ?? 0,
      officeId: officeId ?? user.officeIds[0] ?? null,
      assetId: asset ? asset.id : null,
      title,
      description: description || null,
      status: "OPEN",
      severity: (severity || "LOW").toUpperCase(),
      category: category || null,
      reporterUserId: user.id,
      assignedToUserId: incidentAssignedToUserId,
    },
    include: {
      asset: { select: { id: true, tag: true, type: true } },
      reporterUser: { select: { id: true, fullName: true } },
      assignedToUser: { select: { id: true, fullName: true } },
    },
  });

  // If incident has an asset, update asset status to MAINTENANCE and assign to incident's assigned user
  if (asset && incident.assetId) {
    const oldAssigneeId = asset.assignedToUserId;
    
    await prisma.iTAsset.update({
      where: { id: asset.id },
      data: {
        status: "MAINTENANCE",
        assignedToUserId: incidentAssignedToUserId,
        assignedSince: incidentAssignedToUserId ? new Date() : asset.assignedSince,
        history: {
          create: {
            action: "INCIDENT_CREATED",
            fromUserId: oldAssigneeId,
            toUserId: incidentAssignedToUserId,
            notes: `Asset status changed to MAINTENANCE due to incident: ${incident.title}`,
          },
        },
      },
    });

    // Create notification if asset is assigned to a user
    if (incidentAssignedToUserId && incidentAssignedToUserId !== oldAssigneeId) {
      try {
        const assetInfo = `${asset.tag} (${asset.type})${asset.make && asset.model ? ` - ${asset.make} ${asset.model}` : ''}`;
        const notification = await prisma.notification.create({
          data: {
            userId: incidentAssignedToUserId,
            title: "IT Asset Assigned via Incident",
            body: `You have been assigned the IT asset: ${assetInfo} due to incident #${incident.id}: "${incident.title}"`,
            type: "info",
            entityType: "IT_ASSET",
            entityId: asset.id,
            isTest: user.isTestUser || false,
          },
        });

        // Push notification via SSE
        const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
        await pushNotificationViaSSE(incidentAssignedToUserId, notification);
        const unreadCount = await prisma.notification.count({
          where: { userId: incidentAssignedToUserId, isRead: false },
        });
        await pushUnreadCountViaSSE(incidentAssignedToUserId, unreadCount);
      } catch (notifErr) {
        // Don't fail the incident creation if notification creation fails
        console.error("Failed to create notification for asset assignment:", notifErr);
      }
    }

    // Create notification for incident assignment if assigned to a user
    if (incidentAssignedToUserId && incidentAssignedToUserId !== user.id) {
      try {
        const reporterName = user.fullName || user.email || "Someone";
        const assetInfo = asset.tag ? ` (${asset.tag})` : "";
        const notification = await prisma.notification.create({
          data: {
            userId: incidentAssignedToUserId,
            title: "New IT Incident Assigned",
            body: `${reporterName} assigned you incident #${incident.id}: "${incident.title}"${assetInfo}`,
            type: "info",
            entityType: "IT_INCIDENT",
            entityId: incident.id,
            isTest: user.isTestUser || false,
          },
        });

        // Push notification via SSE
        const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
        await pushNotificationViaSSE(incidentAssignedToUserId, notification);
        const unreadCount = await prisma.notification.count({
          where: { userId: incidentAssignedToUserId, isRead: false },
        });
        await pushUnreadCountViaSSE(incidentAssignedToUserId, unreadCount);
      } catch (notifErr) {
        // Don't fail the incident creation if notification creation fails
        console.error("Failed to create notification for incident assignment:", notifErr);
      }
    }
  } else if (incidentAssignedToUserId && incidentAssignedToUserId !== user.id) {
    // Create notification for incident assignment even if no asset
    try {
      const reporterName = user.fullName || user.email || "Someone";
      const notification = await prisma.notification.create({
        data: {
          userId: incidentAssignedToUserId,
          title: "New IT Incident Assigned",
          body: `${reporterName} assigned you incident #${incident.id}: "${incident.title}"`,
          type: "info",
          entityType: "IT_INCIDENT",
          entityId: incident.id,
          isTest: user.isTestUser || false,
        },
      });

      // Push notification via SSE
      const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
      await pushNotificationViaSSE(incidentAssignedToUserId, notification);
      const unreadCount = await prisma.notification.count({
        where: { userId: incidentAssignedToUserId, isRead: false },
      });
      await pushUnreadCountViaSSE(incidentAssignedToUserId, unreadCount);
    } catch (notifErr) {
      // Don't fail the incident creation if notification creation fails
      console.error("Failed to create notification for incident assignment:", notifErr);
    }
  }

  await logAuditEvent(req, user, {
    domain: "admin",
    action: "IT_INCIDENT_CREATE",
    entityType: "IT_INCIDENT",
    entityId: incident.id,
    metadata: { incident },
  });

  res.json(incident);
});
