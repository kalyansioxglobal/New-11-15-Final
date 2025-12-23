import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;
    const monthsBack = Math.min(24, Math.max(6, Number(req.query.months) || 12));

    const ventureWhere = ventureId
      ? { ventureId }
      : scope.allVentures
      ? {}
      : { ventureId: { in: scope.ventureIds } };

    const customers = await prisma.saasCustomer.findMany({
      where: ventureWhere,
      include: {
        subscriptions: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    const now = new Date();
    type CohortRow = {
      cohort: string;
      cohortDate: Date;
      initialCustomers: number;
      initialMrr: number;
      retention: number[];
      mrrRetention: number[];
    };

    const cohorts: CohortRow[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const cohortLabel = cohortStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const cohortCustomers = customers.filter(c => {
        const firstSub = c.subscriptions[0];
        return firstSub && firstSub.startedAt >= cohortStart && firstSub.startedAt <= cohortEnd;
      });

      if (cohortCustomers.length === 0) continue;

      const initialMrr = cohortCustomers.reduce((sum, c) => {
        const firstSub = c.subscriptions[0];
        return sum + (firstSub?.mrr || 0);
      }, 0);

      const maxMonths = i + 1;
      const retention: number[] = [];
      const mrrRetention: number[] = [];

      for (let m = 0; m < maxMonths && m < 12; m++) {
        const checkDate = new Date(now.getFullYear(), now.getMonth() - i + m + 1, 0, 23, 59, 59);

        let retainedCustomers = 0;
        let retainedMrr = 0;

        for (const customer of cohortCustomers) {
          const hasActiveSub = customer.subscriptions.some(sub => {
            const wasActive =
              sub.startedAt <= checkDate &&
              (!sub.cancelledAt || sub.cancelledAt > checkDate);
            return wasActive;
          });

          if (hasActiveSub) {
            retainedCustomers++;
            const activeSubs = customer.subscriptions.filter(sub => {
              return (
                sub.startedAt <= checkDate &&
                (!sub.cancelledAt || sub.cancelledAt > checkDate)
              );
            });
            retainedMrr += activeSubs.reduce((s, sub) => s + sub.mrr, 0);
          }
        }

        retention.push(
          Math.round((retainedCustomers / cohortCustomers.length) * 100)
        );
        mrrRetention.push(
          initialMrr > 0 ? Math.round((retainedMrr / initialMrr) * 100) : 0
        );
      }

      cohorts.push({
        cohort: cohortLabel,
        cohortDate: cohortStart,
        initialCustomers: cohortCustomers.length,
        initialMrr: Math.round(initialMrr),
        retention,
        mrrRetention,
      });
    }

    const avgRetentionByMonth: number[] = [];
    for (let m = 0; m < 12; m++) {
      const values = cohorts
        .filter(c => c.retention[m] !== undefined)
        .map(c => c.retention[m]);
      if (values.length > 0) {
        avgRetentionByMonth.push(Math.round(values.reduce((a, b) => a + b, 0) / values.length));
      }
    }

    const ltv = avgRetentionByMonth.length > 0
      ? avgRetentionByMonth.reduce((a, b) => a + b, 0) / 100
      : 0;

    return res.json({
      cohorts,
      summary: {
        totalCohorts: cohorts.length,
        avgRetentionByMonth,
        estimatedLtvMonths: Math.round(ltv * 10) / 10,
      },
    });
  } catch (err) {
    console.error('SaaS cohorts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
