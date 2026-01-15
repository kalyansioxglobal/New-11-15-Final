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
  const { id } = req.query;
  const incidentId = Number(id);
  const scope = getUserScope(user);

  if (isNaN(incidentId)) {
    return res.status(400).json({ error: "Invalid incident ID" });
  }

  if (req.method === "GET") {
    const incident = await prisma.iTIncident.findUnique({
      where: { id: incidentId },
      include: {
        asset: { select: { id: true, tag: true, type: true, make: true, model: true } },
        reporterUser: { select: { id: true, fullName: true, email: true } },
        assignedToUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const employeeRoles = ["EMPLOYEE", "CONTRACTOR", "CSR", "DISPATCHER", "CARRIER_TEAM"] as const;
    const isEmployeeLike = employeeRoles.includes(user.role as (typeof employeeRoles)[number]);

    if (
      (!scope.allVentures && incident.ventureId && !scope.ventureIds.includes(incident.ventureId)) ||
      (!scope.allOffices && incident.officeId && !scope.officeIds.includes(incident.officeId))
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    if (
      isEmployeeLike &&
      incident.reporterUserId !== user.id &&
      incident.assignedToUserId !== user.id
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const now = new Date();
    const createdAt = new Date(incident.createdAt as any);
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const ageDays = Math.max(
      0,
      Math.floor((now.getTime() - createdAt.getTime()) / MS_PER_DAY),
    );
    const openish = ["OPEN", "IN_PROGRESS", "WAITING_FOR_INFO"].includes(incident.status);
    const isStale = openish && ageDays >= 7;
    const staleReason = isStale ? `Open for ${ageDays}+ days` : null;

    return res.json({ ...incident, ageDays, isStale, staleReason });

  }

  if (req.method === "PUT") {
    const { title, description, status, severity, category, assignedToUserId, resolution } = req.body;

    const existing = await prisma.iTIncident.findUnique({ where: { id: incidentId } });
    if (!existing) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const ALLOWED_STATUSES = [
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_INFO",
      "RESOLVED",
      "CANCELLED",
    ] as const;

    if (
      (!scope.allVentures && existing.ventureId && !scope.ventureIds.includes(existing.ventureId)) ||
      (!scope.allOffices && existing.officeId && !scope.officeIds.includes(existing.officeId))
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description || null;
    if (severity !== undefined) data.severity = severity.toUpperCase();
    if (category !== undefined) data.category = category || null;
    if (resolution !== undefined) data.resolution = resolution || null;

    if (status !== undefined) {
      const normalized = String(status).toUpperCase();
      if (!ALLOWED_STATUSES.includes(normalized as any)) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          detail: "Invalid status value",
        });
      }
      data.status = normalized;
      
      // Set resolvedAt when status changes to RESOLVED
      // JavaScript Date objects are stored internally as UTC milliseconds since epoch
      // Prisma/PostgreSQL will store this as UTC timestamp
      // The timezone issue you're seeing is likely due to server/DB timezone config
      // For now, we use new Date() which creates a UTC timestamp
      // To fix timezone issues globally, ensure:
      // 1. Server timezone is set to UTC (TZ=UTC environment variable)
      // 2. PostgreSQL timezone is set to UTC (timezone = 'UTC' in postgresql.conf)
      // 3. Frontend converts UTC timestamps to user's local timezone for display
      if (normalized === "RESOLVED") {
        data.resolvedAt = new Date();
      }
      // Clear resolvedAt when status changes from RESOLVED to something else
      else if (existing.status === "RESOLVED" && normalized !== "RESOLVED") {
        data.resolvedAt = null;
      }
    }

    if (assignedToUserId !== undefined) {
      data.assignedToUserId = assignedToUserId ? Number(assignedToUserId) : null;
    }

    // If incident has an asset and assignedToUserId is being changed, update asset assignment
    if (existing.assetId && assignedToUserId !== undefined) {
      const newAssignedToId = assignedToUserId ? Number(assignedToUserId) : null;
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
                notes: `Asset assignment updated due to incident ${incidentId} assignment change`,
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
            // Don't fail the update if notification creation fails
            console.error("Failed to create notification for asset assignment:", notifErr);
          }
        }
      }
    }

    const incident = await prisma.iTIncident.update({
      where: { id: incidentId },
      data,
      include: {
        asset: { select: { id: true, tag: true } },
        reporterUser: { select: { id: true, fullName: true } },
        assignedToUser: { select: { id: true, fullName: true } },
      },
    });

    // If incident status changed to RESOLVED or CANCELLED and has an asset, check if asset should be made available
    if (existing.assetId && data.status && (data.status === "RESOLVED" || data.status === "CANCELLED")) {
      // Check if there are any other open incidents for this asset
      const openIncidents = await prisma.iTIncident.findMany({
        where: {
          assetId: existing.assetId,
          id: { not: incidentId },
          status: { notIn: ["RESOLVED", "CANCELLED"] },
        },
      });

      // Only update asset if there are no other open incidents
      if (openIncidents.length === 0) {
        const asset = await prisma.iTAsset.findUnique({
          where: { id: existing.assetId },
        });

        if (asset) {
          await prisma.iTAsset.update({
            where: { id: existing.assetId },
            data: {
              status: "AVAILABLE",
              assignedToUserId: null,
              assignedSince: null,
              history: {
                create: {
                  action: "INCIDENT_RESOLVED",
                  fromUserId: asset.assignedToUserId,
                  toUserId: null,
                  notes: `Asset status changed to AVAILABLE after incident ${incidentId} was ${data.status}`,
                },
              },
            },
          });
        }
      }
    }

    await logAuditEvent(req, user, {
      domain: "admin",
      action: "IT_INCIDENT_UPDATE",
      entityType: "IT_INCIDENT",
      entityId: incident.id,
      metadata: { before: existing, after: incident },
    });

    return res.json(incident);
  }

  if (req.method === "DELETE") {
    const existing = await prisma.iTIncident.findUnique({ where: { id: incidentId } });
    if (!existing) {
      return res.status(404).json({ error: "Incident not found" });
    }

    if (
      (!scope.allVentures && existing.ventureId && !scope.ventureIds.includes(existing.ventureId)) ||
      (!scope.allOffices && existing.officeId && !scope.officeIds.includes(existing.officeId))
    ) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    await prisma.iTIncident.delete({
      where: { id: incidentId },
    });

    await logAuditEvent(req, user, {
      domain: "admin",
      action: "IT_INCIDENT_DELETE",
      entityType: "IT_INCIDENT",
      entityId: incidentId,
      metadata: { before: existing },
    });

    return res.json({ success: true });
  }

  return res.status(405).end();
});
