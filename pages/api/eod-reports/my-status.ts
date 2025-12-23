import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';

// My EOD status handler
// - GET only: reports whether the current user has submitted today's EOD and
//   returns a 7-day rolling streak plus per-day submission status.
// - Auth: requireUser (401 UNAUTHENTICATED if missing).
// - Behavior:
//   * Looks for an EOD report for today (by normalized date) for the user.
//   * Loads reports for the last 7 days and computes a contiguous streak of
//     days with reports ending at today.
//   * Returns a lightweight summary suitable for a dashboard tile.
// - Timezone: uses server-local dates and zeroes out time components; this is
//   acceptable for now but may need revisiting for cross-timezone teams.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayReport = await prisma.eodReport.findFirst({
    where: {
      userId: user.id,
      date: today,
    },
    select: {
      id: true,
      ventureId: true,
      status: true,
      createdAt: true,
    },
  });

  const last7Days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(d);
  }

  const recentReports = await prisma.eodReport.findMany({
    where: {
      userId: user.id,
      date: { gte: last7Days[6], lte: today },
    },
    select: {
      date: true,
      status: true,
    },
    orderBy: { date: 'desc' },
  });

  const streak = calculateStreak(recentReports.map((r: { date: Date }) => r.date));

  return res.status(200).json({
    submittedToday: !!todayReport,
    todayReportId: todayReport?.id ?? null,
    streak,
    recentDays: last7Days.map(d => {
      const report = recentReports.find((r: { date: Date; status: string }) => 
        r.date.getFullYear() === d.getFullYear() &&
        r.date.getMonth() === d.getMonth() &&
        r.date.getDate() === d.getDate()
      );
      return {
        date: d.toISOString().split('T')[0],
        submitted: !!report,
        status: report?.status ?? null,
      };
    }),
  });
}

function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedDates = dates
    .map(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date;
    })
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let expectedDate = today;

  for (const date of sortedDates) {
    if (date.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate = new Date(expectedDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (date.getTime() < expectedDate.getTime()) {
      break;
    }
  }

  return streak;
}
