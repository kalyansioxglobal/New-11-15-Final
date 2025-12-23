import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from '@/lib/scope';
import { canViewPortfolioResource } from "@/lib/permissions";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!canViewPortfolioResource(user, "SAAS_PORTFOLIO_VIEW")) {
    return res.status(403).json({ error: 'Forbidden', detail: 'Insufficient permissions for SaaS metrics' });
  }

  if (!user) return;

  try {
    const scope = getUserScope(user);
    const ventureId = req.query.ventureId ? Number(req.query.ventureId) : undefined;

    const ventureWhere = ventureId
      ? { ventureId }
      : scope.allVentures
      ? {}
      : { ventureId: { in: scope.ventureIds } };

    const customers = await prisma.saasCustomer.findMany({
      where: ventureWhere,
      include: {
        subscriptions: true,
        venture: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let currentMrr = 0;
    let currentArr = 0;
    let activeSubscriptions = 0;
    let churnedThisMonth = 0;
    let churnedMrrThisMonth = 0;
    let newMrrThisMonth = 0;
    let lastMonthMrr = 0;

    const cancelReasons: Record<string, { count: number; mrr: number }> = {};

    for (const customer of customers) {
      for (const sub of customer.subscriptions) {
        if (sub.isActive) {
          currentMrr += sub.mrr;
          activeSubscriptions++;
        }

        if (sub.startedAt >= thisMonthStart && sub.isActive) {
          newMrrThisMonth += sub.mrr;
        }

        if (sub.cancelledAt && sub.cancelledAt >= thisMonthStart) {
          churnedThisMonth++;
          churnedMrrThisMonth += sub.mrr;

          const reason = sub.cancelReason || 'Not specified';
          if (!cancelReasons[reason]) {
            cancelReasons[reason] = { count: 0, mrr: 0 };
          }
          cancelReasons[reason].count++;
          cancelReasons[reason].mrr += sub.mrr;
        }

        const wasActiveLastMonth =
          sub.startedAt <= lastMonthEnd &&
          (!sub.cancelledAt || sub.cancelledAt > lastMonthEnd);
        if (wasActiveLastMonth) {
          lastMonthMrr += sub.mrr;
        }
      }
    }

    currentArr = currentMrr * 12;
    const mrrGrowth = lastMonthMrr > 0 ? ((currentMrr - lastMonthMrr) / lastMonthMrr) * 100 : 0;
    const netNewMrr = newMrrThisMonth - churnedMrrThisMonth;
    const revenueChurnRate = lastMonthMrr > 0 ? (churnedMrrThisMonth / lastMonthMrr) * 100 : 0;

    const activeCustomers = customers.filter(c =>
      c.subscriptions.some(s => s.isActive)
    ).length;

    const arpu = activeCustomers > 0 ? currentMrr / activeCustomers : 0;

    const monthlyTrend: { month: string; mrr: number; arr: number; customers: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      let monthMrr = 0;
      let monthCustomers = 0;
      const seenCustomers = new Set<number>();

      for (const customer of customers) {
        for (const sub of customer.subscriptions) {
          const wasActive =
            sub.startedAt <= monthEnd &&
            (!sub.cancelledAt || sub.cancelledAt > monthEnd);
          if (wasActive) {
            monthMrr += sub.mrr;
            if (!seenCustomers.has(customer.id)) {
              seenCustomers.add(customer.id);
              monthCustomers++;
            }
          }
        }
      }

      monthlyTrend.push({
        month: monthLabel,
        mrr: Math.round(monthMrr),
        arr: Math.round(monthMrr * 12),
        customers: monthCustomers,
      });
    }

    const planBreakdown: Record<string, { count: number; mrr: number }> = {};
    for (const customer of customers) {
      for (const sub of customer.subscriptions) {
        if (sub.isActive) {
          if (!planBreakdown[sub.planName]) {
            planBreakdown[sub.planName] = { count: 0, mrr: 0 };
          }
          planBreakdown[sub.planName].count++;
          planBreakdown[sub.planName].mrr += sub.mrr;
        }
      }
    }

    return res.json({
      summary: {
        currentMrr: Math.round(currentMrr),
        currentArr: Math.round(currentArr),
        lastMonthMrr: Math.round(lastMonthMrr),
        mrrGrowth: Math.round(mrrGrowth * 10) / 10,
        netNewMrr: Math.round(netNewMrr),
        newMrrThisMonth: Math.round(newMrrThisMonth),
        churnedMrrThisMonth: Math.round(churnedMrrThisMonth),
        revenueChurnRate: Math.round(revenueChurnRate * 10) / 10,
        activeSubscriptions,
        activeCustomers,
        churnedThisMonth,
        arpu: Math.round(arpu),
        totalCustomers: customers.length,
      },
      monthlyTrend,
      planBreakdown: Object.entries(planBreakdown).map(([plan, data]) => ({
        plan,
        count: data.count,
        mrr: Math.round(data.mrr),
      })),
      cancelReasons: Object.entries(cancelReasons)
        .map(([reason, data]) => ({
          reason,
          count: data.count,
          mrr: Math.round(data.mrr),
        }))
        .sort((a, b) => b.count - a.count),
    });
  } catch (err) {
    console.error('SaaS metrics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
