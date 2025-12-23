import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { ROLE_CONFIG } from '@/lib/permissions';

// Missed EOD explanation handler
// - GET: HR/leadership view of missedEodExplanation records across ventures.
//   * Restricted to HR_ADMIN / ADMIN / CEO roles (HR_ADMIN_ONLY for others).
//   * Scoped by getUserScope when ventureId is provided/omitted.
//   * Supports filtering by userId and resolved status.
// - POST: allows an employee to submit or update their explanation when they
//   have missed enough consecutive working days.
//   * Requires ventureId + explanation string (>= 10 chars).
//   * Uses the same CONSECUTIVE_DAYS_THRESHOLD as missed-check to confirm an
//     explanation is actually required before accepting it.
//   * Either updates an unresolved existing record or creates a new one.
// - This endpoint does not on its own notify managers; notification happens via
//   /eod-reports/notify-manager.

const CONSECUTIVE_DAYS_THRESHOLD = 2;

function getWorkingDays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireUser(req, res);
    if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

    const scope = getUserScope(user);
    const isHrAdmin = user.role === 'HR_ADMIN' || user.role === 'ADMIN' || user.role === 'CEO';

    if (req.method === 'GET') {
    if (!isHrAdmin) {
      return res.status(403).json({ error: 'HR_ADMIN_ONLY' });
    }

    const { ventureId, userId, resolved } = req.query;

    const where: any = {};
    
    if (ventureId) {
      const requestedVentureId = Number(ventureId);
      if (!scope.allVentures && !scope.ventureIds.includes(requestedVentureId)) {
        return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
      }
      where.ventureId = requestedVentureId;
    } else if (!scope.allVentures) {
      if (scope.ventureIds.length === 0) {
        return res.status(200).json({ explanations: [] });
      }
      where.ventureId = { in: scope.ventureIds };
    }

    if (userId) {
      where.userId = Number(userId);
    }

    if (resolved === 'true') {
      where.resolvedAt = { not: null };
    } else if (resolved === 'false') {
      where.resolvedAt = null;
    }

    const explanations = await (prisma as any).missedEodExplanation.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        venture: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.status(200).json({
      explanations: explanations.map((e: any) => ({
        id: e.id,
        userId: e.userId,
        userName: e.user.fullName ?? e.user.email,
        userEmail: e.user.email,
        ventureId: e.ventureId,
        ventureName: e.venture.name,
        consecutiveDays: e.consecutiveDays,
        missedDates: e.missedDates.map((d: Date) => d.toISOString().split('T')[0]),
        explanation: e.explanation,
        managerNotified: e.managerNotified,
        notifiedAt: e.notifiedAt,
        resolvedAt: e.resolvedAt,
        createdAt: e.createdAt,
      })),
    });
  }

  if (req.method === 'POST') {
    const { ventureId, explanation } = req.body;

    if (!ventureId || !explanation) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    if (typeof explanation !== 'string' || explanation.trim().length < 10) {
      return res.status(400).json({ error: 'EXPLANATION_TOO_SHORT', message: 'Explanation must be at least 10 characters' });
    }

    const targetVentureId = Number(ventureId);
    if (!scope.allVentures && !scope.ventureIds.includes(targetVentureId)) {
      return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkStart = new Date(today);
    checkStart.setDate(checkStart.getDate() - 14);

    const workingDays = getWorkingDays(checkStart, new Date(today.getTime() - 24 * 60 * 60 * 1000));

    const reports = await (prisma as any).eodReport.findMany({
      where: {
        userId: user.id,
        ventureId: targetVentureId,
        date: { gte: checkStart, lt: today },
      },
      select: { date: true },
    });

    const reportDates = new Set(reports.map((r: any) => r.date.toISOString().split('T')[0]));

    const consecutiveMissedDates: Date[] = [];
    for (let i = workingDays.length - 1; i >= 0; i--) {
      const day = workingDays[i];
      const dateStr = day.toISOString().split('T')[0];
      if (!reportDates.has(dateStr)) {
        consecutiveMissedDates.unshift(day);
      } else {
        break;
      }
    }

    if (consecutiveMissedDates.length < CONSECUTIVE_DAYS_THRESHOLD) {
      return res.status(400).json({ error: 'NO_EXPLANATION_NEEDED' });
    }

    const existingUnresolved = await (prisma as any).missedEodExplanation.findFirst({
      where: {
        userId: user.id,
        ventureId: targetVentureId,
        resolvedAt: null,
      },
    });

    if (existingUnresolved) {
      const updated = await (prisma as any).missedEodExplanation.update({
        where: { id: existingUnresolved.id },
        data: {
          explanation: explanation.trim(),
          missedDates: consecutiveMissedDates,
          consecutiveDays: consecutiveMissedDates.length,
          updatedAt: new Date(),
        },
      });
      return res.status(200).json({ success: true, explanation: updated });
    }

    const created = await (prisma as any).missedEodExplanation.create({
      data: {
        userId: user.id,
        ventureId: targetVentureId,
        missedDates: consecutiveMissedDates,
        consecutiveDays: consecutiveMissedDates.length,
        explanation: explanation.trim(),
      },
    });

    return res.status(201).json({ success: true, explanation: created });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (err: any) {
    console.error('Missed explanation API error:', err);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: err?.message || 'An unexpected error occurred' 
    });
  }
}
