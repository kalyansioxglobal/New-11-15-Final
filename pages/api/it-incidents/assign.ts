import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withUser } from "@/lib/api";
import { getUserScope } from "@/lib/scope";
import { logAuditEvent } from "@/lib/audit";

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user,
) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { id, assignedToId } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Incident ID is required" });
    }

    const incidentId = Number(id);
    if (isNaN(incidentId)) {
      return res.status(400).json({ error: "Invalid incident ID" });
    }

    const scope = getUserScope(user);

    // Check if incident exists and user has permission
    const existing = await prisma.iTIncident.findUnique({
      where: { id: incidentId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Incident not found" });
    }

    // Check scope permissions
    if (
      (!scope.allVentures && existing.ventureId && !scope.ventureIds.includes(existing.ventureId)) ||
      (!scope.allOffices && existing.officeId && !scope.officeIds.includes(existing.officeId))
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // Update the incident
    const newAssignedToId = assignedToId ? Number(assignedToId) : null;
    const incident = await prisma.iTIncident.update({
      where: { id: incidentId },
      data: {
        assignedToUserId: newAssignedToId,
      },
      include: {
        asset: { select: { id: true, tag: true } },
        reporterUser: { select: { id: true, fullName: true, email: true } },
        assignedToUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    // If incident has an asset, update asset assignment to match incident assignment
    if (existing.assetId) {
      const asset = await prisma.iTAsset.findUnique({
        where: { id: existing.assetId },
      });

      if (asset) {
        const oldAssigneeId = asset.assignedToUserId;
        await prisma.iTAsset.update({
          where: { id: existing.assetId },
          data: {
            assignedToUserId: newAssignedToId,
            assignedSince: newAssignedToId ? new Date() : asset.assignedSince,
            status: "MAINTENANCE", // Ensure status is MAINTENANCE when incident is assigned
            history: {
              create: {
                action: oldAssigneeId ? "REASSIGNED" : "ASSIGNED",
                fromUserId: oldAssigneeId,
                toUserId: newAssignedToId,
                notes: `Asset assignment updated due to incident ${incidentId} assignment`,
              },
            },
          },
        });

        // Create notification if asset is assigned to a user
        if (newAssignedToId && newAssignedToId !== oldAssigneeId) {
          try {
            const assetInfo = `${asset.tag} (${asset.type})${asset.make && asset.model ? ` - ${asset.make} ${asset.model}` : ''}`;
            const notification = await prisma.notification.create({
              data: {
                userId: newAssignedToId,
                title: "IT Asset Assigned via Incident",
                body: `You have been assigned the IT asset: ${assetInfo} due to incident #${incidentId}: "${existing.title}"`,
                type: "info",
                entityType: "IT_ASSET",
                entityId: asset.id,
                isTest: user.isTestUser || false,
              },
            });

            // Push notification via SSE
            const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
            await pushNotificationViaSSE(newAssignedToId, notification);
            const unreadCount = await prisma.notification.count({
              where: { userId: newAssignedToId, isRead: false },
            });
            await pushUnreadCountViaSSE(newAssignedToId, unreadCount);
          } catch (notifErr) {
            // Don't fail the assignment if notification creation fails
            console.error("Failed to create notification for asset assignment:", notifErr);
          }
        }
      }
    }

    // Create notification if incident is assigned to a user
    if (assignedToId && Number(assignedToId) !== existing.assignedToUserId) {
      const assignedUserId = Number(assignedToId);
      const assignerName = user.fullName || user.email || "Someone";
      const assetInfo = incident.asset?.tag ? ` (${incident.asset.tag})` : "";
      
      const notification = await prisma.notification.create({
        data: {
          userId: assignedUserId,
          title: "New IT Incident Assigned",
          body: `${assignerName} assigned you incident #${incident.id}: "${existing.title}"${assetInfo}`,
          type: "info",
          entityType: "IT_INCIDENT",
          entityId: incident.id,
          isTest: user.isTestUser || false,
        },
      });
      
      // Push via SSE
      const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
      await pushNotificationViaSSE(assignedUserId, notification);
      const unreadCount = await prisma.notification.count({
        where: { userId: assignedUserId, isRead: false },
      });
      await pushUnreadCountViaSSE(assignedUserId, unreadCount);
    }

    await logAuditEvent(req, user, {
      domain: "admin",
      action: "IT_INCIDENT_UPDATE",
      entityType: "IT_INCIDENT",
      entityId: incident.id,
      metadata: { before: existing, after: incident, updateType: "assign" },
    });

    return res.json(incident);
  } catch (err: any) {
    console.error("IT incident assign error:", err);
    return res.status(500).json({
      error: "Internal server error",
      detail: err.message || String(err),
    });
  }
});
