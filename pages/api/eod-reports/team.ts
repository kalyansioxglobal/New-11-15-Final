import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { ROLE_CONFIG } from '@/lib/permissions';

// Team EOD status handler
// - GET only: returns a summary view of EOD submission status for a manager's
//   team on a given date.
// - Auth: requireUser (401 UNAUTHENTICATED if missing).
// - RBAC:
//   * Only roles with ROLE_CONFIG[role].task.assign === true may call this
//     endpoint; others receive 403 FORBIDDEN.
// - Scoping:
//   * getUserScope(user) controls which ventures the manager may inspect.
//   * Optional ventureId filter is validated against scope; out-of-scope
//     ventureId results in FORBIDDEN_VENTURE.
//   * When no ventureId is provided for a scoped manager with no ventures,
//     the endpoint returns an empty team summary.
// - Behavior:
//   * Finds active users in scope (optionally test users via includeTest).
//   * For the target date (default today), loads any corresponding EOD reports
//     and returns per-user submission + status details plus aggregate counts.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const canViewTeam = ROLE_CONFIG[user.role]?.task?.assign === true;
  if (!canViewTeam) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const scope = getUserScope(user);
  const includeTest = req.query.includeTest === 'true';
  const { date, ventureId } = req.query;

  const targetDate = date ? new Date(date as string) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const userWhere: any = { isActive: true };
  if (!includeTest) userWhere.isTestUser = false;

  if (ventureId) {
    const requestedVentureId = Number(ventureId);
    if (!scope.allVentures && !scope.ventureIds.includes(requestedVentureId)) {
      return res.status(403).json({ error: 'FORBIDDEN_VENTURE' });
    }
    userWhere.ventures = { some: { venture: { id: requestedVentureId } } };
  } else if (!scope.allVentures) {
    if (scope.ventureIds.length === 0) {
      return res.status(200).json({
        date: targetDate.toISOString().split('T')[0],
        summary: { total: 0, submitted: 0, pending: 0, needsAttention: 0, withBlockers: 0 },
        team: [],
      });
    }
    userWhere.ventures = { some: { venture: { id: { in: scope.ventureIds } } } };
  }

  const teamUsers = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      ventures: {
        select: { venture: { select: { id: true, name: true } } },
      },
      offices: {
        select: { office: { select: { id: true, name: true } } },
      },
    },
    orderBy: { fullName: 'asc' },
  });

  const reports = await prisma.eodReport.findMany({
    where: {
      date: targetDate,
      userId: { in: teamUsers.map((u: (typeof teamUsers)[number]) => u.id) },
      ...(includeTest ? {} : { isTest: false }),
    },
    select: {
      id: true,
      userId: true,
      status: true,
      summary: true,
      hoursWorked: true,
      tasksCompleted: true,
      blockers: true,
      createdAt: true,
    },
  });

  type ReportType = typeof reports[number];
  const reportByUser = new Map<number, ReportType>(reports.map((r: ReportType) => [r.userId, r]));

  const summary = {
    total: teamUsers.length,
    submitted: reports.length,
    pending: teamUsers.length - reports.length,
    needsAttention: reports.filter((r: ReportType) => r.status === 'NEEDS_ATTENTION').length,
    withBlockers: reports.filter((r: ReportType) => r.blockers && r.blockers.trim().length > 0).length,
  };

  const teamStatus = teamUsers.map((u: (typeof teamUsers)[number]) => {
    const report = reportByUser.get(u.id);
    return {
      userId: u.id,
      userName: u.fullName ?? u.email,
      userEmail: u.email,
      role: u.role,
      ventures: u.ventures.map((v: { venture: { name: string } }) => v.venture.name),
      offices: u.offices.map((o: { office: { name: string } }) => o.office.name),
      submitted: !!report,
      reportId: report?.id ?? null,
      status: report?.status ?? null,
      hoursWorked: report?.hoursWorked ?? null,
      tasksCompleted: report?.tasksCompleted ?? null,
      hasBlockers: !!(report?.blockers && report.blockers.trim().length > 0),
      submittedAt: report?.createdAt ?? null,
    };
  });

  return res.status(200).json({
    date: targetDate.toISOString().split('T')[0],
    summary,
    team: teamStatus,
  });
}
