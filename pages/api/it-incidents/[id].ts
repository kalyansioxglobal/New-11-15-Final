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

    return res.json(incident);
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
      if (normalized === "RESOLVED" && !existing.resolvedAt) {
        data.resolvedAt = new Date();
      }
    }

    if (assignedToUserId !== undefined) {
      data.assignedToUserId = assignedToUserId ? Number(assignedToUserId) : null;
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
