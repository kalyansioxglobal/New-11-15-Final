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
  const { date, startDate, endDate, ventureId } = req.query;

  // Support both single date (backward compatibility) and date range
  let dateStart: Date;
  let dateEnd: Date;
  
  if (startDate && endDate) {
    // Date range mode - parse date strings and set to start/end of day in UTC
    const startStr = startDate as string;
    const endStr = endDate as string;
    dateStart = new Date(startStr + 'T00:00:00.000Z');
    dateEnd = new Date(endStr + 'T23:59:59.999Z');
  } else if (date) {
    // Single date mode (backward compatibility)
    const dateStr = date as string;
    dateStart = new Date(dateStr + 'T00:00:00.000Z');
    dateEnd = new Date(dateStr + 'T23:59:59.999Z');
  } else {
    // Default to today - use UTC to avoid timezone issues
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    dateStart = new Date(todayStr + 'T00:00:00.000Z');
    dateEnd = new Date(todayStr + 'T23:59:59.999Z');
  }

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
        date: dateStart.toISOString().split('T')[0],
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
      date: {
        gte: dateStart,
        lte: dateEnd,
      },
      userId: { in: teamUsers.map((u: (typeof teamUsers)[number]) => u.id) },
      ...(includeTest ? {} : { isTest: false }),
    },
    select: {
      id: true,
      userId: true,
      date: true,
      status: true,
      summary: true,
      hoursWorked: true,
      tasksCompleted: true,
      blockers: true,
      createdAt: true,
    },
    orderBy: [
      { userId: 'asc' },
      { date: 'desc' },
    ],
  });

  type ReportType = typeof reports[number];
  
  // For date ranges, we aggregate data per user (use latest report or aggregate)
  // Group reports by userId
  const reportsByUser = new Map<number, ReportType[]>();
  reports.forEach((r: ReportType) => {
    const existing = reportsByUser.get(r.userId) || [];
    existing.push(r);
    reportsByUser.set(r.userId, existing);
  });

  // For each user, get the most recent report or aggregate
  const userReportData = new Map<number, {
    report: ReportType | null;
    hasAnyBlockers: boolean;
    totalHours: number;
    totalTasks: number;
    latestStatus: string | null;
    latestReportId: number | null;
    latestSubmittedAt: Date | null;
  }>();

  teamUsers.forEach((u: (typeof teamUsers)[number]) => {
    const userReports = reportsByUser.get(u.id) || [];
    if (userReports.length === 0) {
      userReportData.set(u.id, {
        report: null,
        hasAnyBlockers: false,
        totalHours: 0,
        totalTasks: 0,
        latestStatus: null,
        latestReportId: null,
        latestSubmittedAt: null,
      });
    } else {
      // Use the most recent report for status/ID, but aggregate hours/tasks
      const latestReport = userReports[0]; // Already sorted by date desc
      const hasAnyBlockers = userReports.some((r: ReportType) => r.blockers && r.blockers.trim().length > 0);
      const totalHours = userReports.reduce((sum: number, r: ReportType) => sum + (r.hoursWorked || 0), 0);
      const totalTasks = userReports.reduce((sum: number, r: ReportType) => sum + (r.tasksCompleted || 0), 0);
      
      userReportData.set(u.id, {
        report: latestReport,
        hasAnyBlockers,
        totalHours,
        totalTasks,
        latestStatus: latestReport.status,
        latestReportId: latestReport.id,
        latestSubmittedAt: latestReport.createdAt,
      });
    }
  });

  const submittedCount = Array.from(userReportData.values()).filter((d) => d.report !== null).length;
  const needsAttentionCount = Array.from(userReportData.values()).filter((d) => d.latestStatus === 'NEEDS_ATTENTION').length;
  const withBlockersCount = Array.from(userReportData.values()).filter((d) => d.hasAnyBlockers).length;

  const summary = {
    total: teamUsers.length,
    submitted: submittedCount,
    pending: teamUsers.length - submittedCount,
    needsAttention: needsAttentionCount,
    withBlockers: withBlockersCount,
  };

  const teamStatus = teamUsers.map((u: (typeof teamUsers)[number]) => {
    const data = userReportData.get(u.id)!;
    return {
      userId: u.id,
      userName: u.fullName ?? u.email,
      userEmail: u.email,
      role: u.role,
      ventures: u.ventures.map((v: { venture: { name: string } }) => v.venture.name),
      offices: u.offices.map((o: { office: { name: string } }) => o.office.name),
      submitted: data.report !== null,
      reportId: data.latestReportId,
      status: data.latestStatus,
      hoursWorked: data.totalHours > 0 ? data.totalHours : null,
      tasksCompleted: data.totalTasks > 0 ? data.totalTasks : null,
      hasBlockers: data.hasAnyBlockers,
      submittedAt: data.latestSubmittedAt,
    };
  });

  return res.status(200).json({
    date: dateStart.toISOString().split('T')[0],
    summary,
    team: teamStatus,
  });
}
