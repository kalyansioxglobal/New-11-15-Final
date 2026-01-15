import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { getUserScope } from "@/lib/scope";
import { logAuditEvent } from "@/lib/audit";
import { enrichHistoryWithUsers } from "@/lib/it-assets/historyUtils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: "UNAUTHENTICATED" });

  const id = Number(req.query.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const scope = getUserScope(user);

  if (req.method === "GET") {
    try {
      const asset = await prisma.iTAsset.findUnique({
        where: { id },
        include: {
          assignedToUser: { select: { id: true, fullName: true } },
          venture: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
          files: true,
          history: {
            orderBy: { createdAt: "desc" },
            take: 50, // Limit to most recent 50 entries for performance
          },
          incidents: {
            include: {
              reporterUser: { select: { id: true, fullName: true } },
              assignedToUser: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!asset) return res.status(404).json({ error: "Not found" });

      // Don't return deleted assets
      // if (asset.isDeleted) {
      //   return res.status(404).json({ error: "Not found" });
      // }

      // Enforce scope: user must have access to this venture/office unless global
      if (
        (!scope.allVentures && asset.ventureId && !scope.ventureIds.includes(asset.ventureId)) ||
        (!scope.allOffices && asset.officeId && !scope.officeIds.includes(asset.officeId))
      ) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }

      // Get total history count for display
      const totalHistoryCount = await prisma.iTAssetHistory.count({
        where: { assetId: id },
      });

      // Enrich history entries with user data
      const historyEntries: any = ((asset as any).history || []) as any;
      // @ts-ignore - enrichHistoryWithUsers returns enriched entries with fromUser/toUser properties
      const enrichedHistory: any = historyEntries.length > 0
        ? (await enrichHistoryWithUsers(historyEntries) as any)
        : (historyEntries as any);

      // Add metadata about history pagination
      return res.json({
        ...(asset as any),
        history: enrichedHistory,
        _historyMeta: {
          totalCount: totalHistoryCount,
          displayedCount: enrichedHistory?.length || 0,
          hasMore: totalHistoryCount > (enrichedHistory?.length || 0),
        },
      });
    } catch (err: any) {
      console.error("IT asset detail error", err);
      return res.status(500).json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  if (req.method === "PATCH") {
    try {
      const existing = await prisma.iTAsset.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Not found" });

      if (
        (!scope.allVentures && existing.ventureId && !scope.ventureIds.includes(existing.ventureId)) ||
        (!scope.allOffices && existing.officeId && !scope.officeIds.includes(existing.officeId))
      ) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }

      const {
        tag,
        type,
        make,
        model,
        serialNumber,
        status,
        purchaseDate,
        warrantyExpiry,
        assignedToUserId,
        assignedSince,
        notes,
        isDeleted,
      } = req.body;

      // Validation: If assigned to a user, status cannot be AVAILABLE
      const finalStatus = status !== undefined ? status.toUpperCase() : existing.status;
      const finalAssignedToUserId = assignedToUserId !== undefined
        ? (assignedToUserId ? Number(assignedToUserId) : null)
        : existing.assignedToUserId;

      if (finalAssignedToUserId && finalStatus === 'AVAILABLE') {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          detail: "Status cannot be AVAILABLE when asset is assigned to a user. Please change the status to ASSIGNED or another appropriate status.",
        });
      }

      // Validation: If asset has open incidents, prevent direct status changes (status must be MAINTENANCE)
      if (status !== undefined && status.toUpperCase() !== existing.status) {
        const openIncidents = await prisma.iTIncident.findMany({
          where: {
            assetId: id,
            status: { notIn: ["RESOLVED", "CANCELLED"] },
          },
        });

        if (openIncidents.length > 0 && status.toUpperCase() !== "MAINTENANCE") {
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            detail: `Status must remain MAINTENANCE until all incidents are resolved or cancelled.`,
          });
        }
      }

      const data: any = {};
      if (tag !== undefined) data.tag = tag;
      if (type !== undefined) data.type = type;
      if (make !== undefined) data.make = make || null;
      if (model !== undefined) data.model = model || null;
      if (serialNumber !== undefined) data.serialNumber = serialNumber || null;
      if (status !== undefined) data.status = status.toUpperCase();
      if (purchaseDate !== undefined) {
        data.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
      }
      if (warrantyExpiry !== undefined) {
        data.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
      }
      if (notes !== undefined) data.notes = notes || null;
      if (isDeleted !== undefined) data.isDeleted = Boolean(isDeleted);

      // Track assignment changes for history and notifications
      const assignmentChanged = assignedToUserId !== undefined &&
        existing.assignedToUserId !== (assignedToUserId ? Number(assignedToUserId) : null);
      const oldAssigneeId = existing.assignedToUserId;

      if (assignedToUserId !== undefined) {
        const newAssigneeId = assignedToUserId ? Number(assignedToUserId) : null;
        data.assignedToUserId = newAssigneeId;

        if (newAssigneeId) {
          // Asset is being assigned or reassigned
          data.assignedSince = assignedSince ? new Date(assignedSince) : new Date();
          // Ensure status is not AVAILABLE when assigned
          if (!data.status || data.status === 'AVAILABLE') {
            data.status = 'ASSIGNED';
          }

          // Create history entry
          data.history = {
            create: {
              action: oldAssigneeId ? "REASSIGNED" : "ASSIGNED",
              fromUserId: oldAssigneeId,
              toUserId: newAssigneeId,
            },
          };
        } else {
          // Asset is being unassigned
          data.assignedSince = null;

          // Create history entry
          data.history = {
            create: {
              action: "RETURNED",
              fromUserId: oldAssigneeId,
              toUserId: null,
            },
          };
        }
      }

      const updated = await prisma.iTAsset.update({
        where: { id },
        data,
        include: {
          assignedToUser: { select: { id: true, fullName: true } },
        },
      });

      // Create notification if assignment changed
      if (assignmentChanged && updated.assignedToUserId) {
        try {
          const notification = await prisma.notification.create({
            data: {
              userId: updated.assignedToUserId,
              title: "IT Asset Assigned",
              body: `You have been assigned the IT asset: ${updated.tag} (${updated.type})${updated.make && updated.model ? ` - ${updated.make} ${updated.model}` : ''}`,
              type: "info",
              entityType: "IT_ASSET",
              entityId: updated.id,
            },
          });

          // Push via SSE
          const { pushNotificationViaSSE, pushUnreadCountViaSSE } = await import("@/lib/notifications/push");
          await pushNotificationViaSSE(updated.assignedToUserId, notification);
          const unreadCount = await prisma.notification.count({
            where: { userId: updated.assignedToUserId, isRead: false },
          });
          await pushUnreadCountViaSSE(updated.assignedToUserId, unreadCount);
        } catch (notifErr) {
          // Don't fail the update if notification creation fails
          console.error("Failed to create notification for asset assignment:", notifErr);
        }
      }

      await logAuditEvent(req, user, {
        domain: "admin",
        action: isDeleted ? "IT_ASSET_DELETE" : "IT_ASSET_UPDATE",
        entityType: "IT_ASSET",
        entityId: updated.id,
        metadata: { before: existing, after: updated },
      });

      return res.json(updated);
    } catch (err: any) {
      console.error("IT asset update error", err);
      return res
        .status(500)
        .json({ error: "Internal server error", detail: err.message || String(err) });
    }
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).json({ error: "Method not allowed" });
}
