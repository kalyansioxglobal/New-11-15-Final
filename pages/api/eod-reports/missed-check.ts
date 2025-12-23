import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';

// Missed EOD check
// - GET only: evaluates whether the current user has missed enough consecutive
//   working days of EOD submissions to require an explanation.
// - Auth: requireUser (401 UNAUTHENTICATED if missing).
// - Scoping:
//   * Optional ventureId filter must be in the caller's scoped ventures;
//     otherwise 403 FORBIDDEN_VENTURE.
// - Policy:
//   * Looks back 14 calendar days and derives working days (Mon–Fri only).
//   * Counts missed working days where no eodReport exists for the user in
//     that venture (or across ventures when no ventureId is specified).
//   * If the most recent consecutive missed working days >= threshold
//     (CONSECUTIVE_DAYS_THRESHOLD, currently 2), requiresExplanation is true.
//   * If requiresExplanation is true, the endpoint looks for an unresolved
//     missedEodExplanation; this ties into /missed-explanation and
//     /notify-manager flows without mutating anything here.

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
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const scope = getUserScope(user);
  const { ventureId } = req.query;

  const targetVentureId = ventureId ? Number(ventureId) : null;
  if (targetVentureId && !scope.allVentures && !scope.ventureIds.includes(targetVentureId)) {
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
      date: { gte: checkStart, lt: today },
      ...(targetVentureId ? { ventureId: targetVentureId } : {}),
    },
    select: { date: true, ventureId: true },
  });

  const reportDates = new Set(reports.map((r: any) => r.date.toISOString().split('T')[0]));

  const missedDays: Date[] = [];
  for (const day of workingDays) {
    const dateStr = day.toISOString().split('T')[0];
    if (!reportDates.has(dateStr)) {
      missedDays.push(day);
    }
  }

  let consecutiveMissed = 0;
  const consecutiveMissedDates: Date[] = [];
  
  for (let i = workingDays.length - 1; i >= 0; i--) {
    const day = workingDays[i];
    const dateStr = day.toISOString().split('T')[0];
    if (!reportDates.has(dateStr)) {
      consecutiveMissed++;
      consecutiveMissedDates.unshift(day);
    } else {
      break;
    }
  }

  const requiresExplanation = consecutiveMissed >= CONSECUTIVE_DAYS_THRESHOLD;

  const existingExplanation = requiresExplanation ? await (prisma as any).missedEodExplanation.findFirst({
    where: {
      userId: user.id,
      ...(targetVentureId ? { ventureId: targetVentureId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  }) : null;

  return res.status(200).json({
    userId: user.id,
    checkPeriod: { start: checkStart, end: today },
    workingDaysChecked: workingDays.length,
    totalMissed: missedDays.length,
    consecutiveMissed,
    consecutiveMissedDates: consecutiveMissedDates.map(d => d.toISOString().split('T')[0]),
    threshold: CONSECUTIVE_DAYS_THRESHOLD,
    requiresExplanation,
    hasExplanation: !!existingExplanation,
    explanationId: existingExplanation?.id ?? null,
    explanation: existingExplanation?.explanation ?? null,
    explanationDate: existingExplanation?.createdAt ?? null,
  });
}
