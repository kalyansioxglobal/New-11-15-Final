import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { ROLE_CONFIG } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { awardPointsForEvent } from '@/lib/gamification/awardPoints';

// EOD reports index handler
// - GET: returns a capped list of EOD reports visible to the current user.
//   * Auth via requireUser (401 UNAUTHENTICATED if missing).
//   * Visibility rules:
//     - Regular employees see only their own reports unless ROLE_CONFIG[role].task.assign is true.
//     - Managers (canViewTeam === true) may request other users via userId
//       and default to team scope when no userId is passed.
//   * Venture scope is enforced via getUserScope; out-of-scope ventureId
//     returns FORBIDDEN_VENTURE or defaults to scoped ventures.
//   * Results are limited to the latest 100 reports, ordered by date and
//     createdAt.
// - POST: upserts the caller's own EOD report for a given venture and date.
//   * Prevents future-dated submissions via CANNOT_SUBMIT_FUTURE_REPORT.
//   * Uses a unique (userId, date, ventureId) key to update or create.
//   * Status transitions preserve manager-reviewed statuses: DRAFT -> SUBMITTED,
//     otherwise existing status is kept.
// - This endpoint is the canonical read/write path for per-day EOD entries;
//   other endpoints (team, my-status, missed-*) build summaries on top of it.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const scope = getUserScope(user);
  const includeTest = req.query.includeTest === 'true';
  const canViewTeam = ROLE_CONFIG[user.role]?.task?.assign === true;

  logger.info('api_request', {
    endpoint: '/api/eod-reports',
    userId: user.id,
    userRole: user.role,
    outcome: 'start',
  });

  // GET: employees see their own EODs; managers (ROLE_CONFIG.task.assign) may view team.

  if (req.method === 'GET') {
    const { date, userId, ventureId } = req.query;

    const where: any = {};
    if (!includeTest) where.isTest = false;

    if (date) {
      const dateStart = new Date(date as string);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date as string);
      dateEnd.setHours(23, 59, 59, 999);
      where.date = { gte: dateStart, lte: dateEnd };
    }

    if (userId) {
      const requestedUserId = Number(userId);
      if (requestedUserId !== user.id && !canViewTeam) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }
      where.userId = requestedUserId;
    } else if (!canViewTeam) {
      where.userId = user.id;
    }

    if (ventureId) {
      const requestedVentureId = Number(ventureId);
      if (!scope.allVentures && !scope.ventureIds.includes(requestedVentureId)) {
        return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
      }
      where.ventureId = requestedVentureId;
    } else if (!scope.allVentures) {
      if (scope.ventureIds.length === 0) {
        return res.status(200).json([]);
      }
      where.ventureId = { in: scope.ventureIds };
    }

    try {
      const reports = await prisma.eodReport.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          venture: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
        take: 100,
      });

      return res.status(200).json(
        reports.map((r: typeof reports[number]) => ({
          id: r.id,
          userId: r.userId,
          userName: r.user.fullName ?? r.user.email,
          userEmail: r.user.email,
          ventureId: r.ventureId,
          ventureName: r.venture.name,
          officeId: r.officeId,
          officeName: r.office?.name ?? null,
          date: r.date,
          summary: r.summary,
          accomplishments: r.accomplishments,
          blockers: r.blockers,
          tomorrowPlan: r.tomorrowPlan,
          hoursWorked: r.hoursWorked,
          tasksCompleted: r.tasksCompleted,
          status: r.status,
          managerNotes: r.managerNotes,
          reviewedAt: r.reviewedAt,
          reviewedByName: r.reviewedBy?.fullName ?? null,
          createdAt: r.createdAt,
        })),
      );
    } catch (error: any) {
      logger.error('api_request_error', {
        endpoint: '/api/eod-reports',
        userId: user.id,
        userRole: user.role,
        outcome: 'error',
        error: error?.message || String(error),
        stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { ventureId, officeId, date, summary, accomplishments, blockers, tomorrowPlan, hoursWorked, tasksCompleted } = req.body;

    if (!ventureId || !summary) {
      return res.status(400).json({ error: 'VENTURE_AND_SUMMARY_REQUIRED' });
    }

    const vId = Number(ventureId);
    const oId = officeId ? Number(officeId) : null;

    if (!scope.allVentures && !scope.ventureIds.includes(vId)) {
      return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
    }

    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reportDate > today) {
      return res.status(400).json({ error: 'CANNOT_SUBMIT_FUTURE_REPORT' });
    }

    try {
      const existingReport = await prisma.eodReport.findUnique({
        where: {
          userId_date_ventureId: {
            userId: user.id,
            date: reportDate,
            ventureId: vId,
          },
        },
      });

      if (existingReport) {
        const updated = await prisma.eodReport.update({
          where: { id: existingReport.id },
          data: {
            summary,
            accomplishments: accomplishments ?? null,
            blockers: blockers ?? null,
            tomorrowPlan: tomorrowPlan ?? null,
            hoursWorked: hoursWorked ? Number(hoursWorked) : null,
            tasksCompleted: tasksCompleted ? Number(tasksCompleted) : null,
            officeId: oId,
            // Preserve existing status
            status: existingReport.status,
            updatedAt: new Date(),
          },
        });
        return res.status(200).json({ id: updated.id, updated: true });
      }

      const report = await prisma.eodReport.create({
        data: {
          userId: user.id,
          ventureId: vId,
          officeId: oId,
          date: reportDate,
          summary,
          accomplishments: accomplishments ?? null,
          blockers: blockers ?? null,
          tomorrowPlan: tomorrowPlan ?? null,
          hoursWorked: hoursWorked ? Number(hoursWorked) : null,
          tasksCompleted: tasksCompleted ? Number(tasksCompleted) : null,
          status: 'SUBMITTED',
          isTest: user.isTestUser,
        },
      });

      // Award gamification points for EOD submission
      awardPointsForEvent(user.id, vId, 'EOD_REPORT_SUBMITTED', {
        officeId: oId,
        metadata: { eodReportId: report.id },
        idempotencyKey: `eod-${report.id}`,
      }).catch(err => console.error('[gamification] EOD award error:', err));

      // Check for perfect week (5 EODs in the same week)
      const weekStart = new Date(reportDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const eodCount = await prisma.eodReport.count({
        where: {
          userId: user.id,
          ventureId: vId,
          date: { gte: weekStart, lt: weekEnd },
        },
      });
      
      if (eodCount === 5) {
        // Perfect week! Award bonus points
        await awardPointsForEvent(
          user.id,
          vId,
          'PERFECT_WEEK_EOD',
          {
            officeId: oId,
            metadata: { weekStart: weekStart.toISOString(), eodCount },
            idempotencyKey: `perfect_week_${user.id}_${vId}_${weekStart.toISOString().split('T')[0]}`,
          }
        ).catch(err => {
          logger.error('gamification_perfect_week_award_failed', {
            event: 'PERFECT_WEEK_EOD',
            userId: user.id,
            ventureId: vId,
            key: `perfect_week_${user.id}_${vId}_${weekStart.toISOString().split('T')[0]}`,
            err: err instanceof Error ? err.message : String(err),
          });
        });
      }

      return res.status(201).json({ id: report.id });
    } catch (error: any) {
      logger.error('api_request_error', {
        endpoint: '/api/eod-reports',
        userId: user.id,
        userRole: user.role,
        outcome: 'error',
      });
      console.error('EOD POST error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
