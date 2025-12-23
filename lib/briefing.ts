import prisma from './prisma';
import { SessionUser, getUserScope } from './scope';
import { canViewKpis } from './permissions';

export type BriefingSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export interface BriefingItem {
  severity: BriefingSeverity;
  label: string;
  detail: string;
  ventureId?: number;
  ventureName?: string;
  ventureType?: string;
  tags?: string[];
}

export interface BriefingSection {
  title: string;
  items: BriefingItem[];
}

export interface DailyBriefing {
  generatedAt: string;
  summaryLines: string[];
  logistics: BriefingSection;
  hospitality: BriefingSection;
  bpo: BriefingSection;
  generic: BriefingSection;
  wins: BriefingSection;
}

const dayMs = 24 * 60 * 60 * 1000;

export async function buildDailyBriefing(user: SessionUser): Promise<DailyBriefing> {
  const scope = getUserScope(user);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart.getTime() - 1 * dayMs);
  const yesterdayEnd = new Date(todayStart.getTime() - 1);

  const weekStart = new Date(todayStart.getTime() - 7 * dayMs);
  const threeDaysAgo = new Date(todayStart.getTime() - 3 * dayMs);

  const ventureWhere: any = { isActive: true };
  if (!scope.allVentures) {
    ventureWhere.id = { in: scope.ventureIds };
  }

  const ventures = await prisma.venture.findMany({
    where: ventureWhere,
    orderBy: { name: 'asc' },
  });

  const logisticsVentures = ventures.filter((v: any) => v.type === 'LOGISTICS');
  const hospitalityVentures = ventures.filter((v: any) => v.type === 'HOSPITALITY');
  const bpoVentures = ventures.filter((v: any) => v.type === 'BPO');

  const logisticsItems: BriefingItem[] = [];
  const hospitalityItems: BriefingItem[] = [];
  const bpoItems: BriefingItem[] = [];
  const genericItems: BriefingItem[] = [];
  const winsItems: BriefingItem[] = [];

  const canViewMetrics = canViewKpis(user.role);

  if (logisticsVentures.length && canViewMetrics) {
    const vIds = logisticsVentures.map((v: any) => v.id);

    const yLoads = await prisma.load.findMany({
      where: {
        ventureId: { in: vIds },
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
        isTest: user.isTestUser,
      },
    });

    const wLoads = await prisma.load.findMany({
      where: {
        ventureId: { in: vIds },
        createdAt: { gte: weekStart, lt: yesterdayStart },
        isTest: user.isTestUser,
      },
    });

    const byVentureYesterday = new Map<
      number,
      { total: number; covered: number; lost: number; rateLost: number; internalLost: number }
    >();

    for (const l of yLoads) {
      const load = l as any;
      if (!byVentureYesterday.has(load.ventureId)) {
        byVentureYesterday.set(load.ventureId, {
          total: 0,
          covered: 0,
          lost: 0,
          rateLost: 0,
          internalLost: 0,
        });
      }
      const agg = byVentureYesterday.get(load.ventureId)!;
      agg.total += 1;
      if (load.status === 'COVERED') agg.covered += 1;
      if (load.status === 'LOST') {
        agg.lost += 1;
        if (load.lostReasonCategory === 'RATE') agg.rateLost += 1;
        if (load.lostReasonCategory === 'INTERNAL_ERROR') agg.internalLost += 1;
      }
    }

    const byVentureWeek = new Map<
      number,
      { total: number; covered: number; lost: number; rateLost: number; internalLost: number }
    >();

    for (const l of wLoads) {
      const load = l as any;
      if (!byVentureWeek.has(load.ventureId)) {
        byVentureWeek.set(load.ventureId, {
          total: 0,
          covered: 0,
          lost: 0,
          rateLost: 0,
          internalLost: 0,
        });
      }
      const agg = byVentureWeek.get(load.ventureId)!;
      agg.total += 1;
      if (load.status === 'COVERED') agg.covered += 1;
      if (load.status === 'LOST') {
        agg.lost += 1;
        if (load.lostReasonCategory === 'RATE') agg.rateLost += 1;
        if (load.lostReasonCategory === 'INTERNAL_ERROR') agg.internalLost += 1;
      }
    }

    for (const v of logisticsVentures) {
      const y = byVentureYesterday.get(v.id);
      const w = byVentureWeek.get(v.id);

      if (!y && !w) continue;

      if (y && y.total >= 5) {
        const covY = y.covered / y.total;
        const covW = w && w.total > 0 ? w.covered / w.total : covY;
        const delta = covY - covW;

        if (delta <= -0.15) {
          logisticsItems.push({
            severity: 'CRITICAL',
            ventureId: v.id,
            ventureName: v.name,
            ventureType: v.type,
            label: `${v.name}: coverage fire`,
            detail: `${v.name}: coverage ${Math.round(covY * 100)}% vs ${Math.round(
              covW * 100,
            )}% baseline (yesterday vs last 7 days).`,
            tags: ['LOGISTICS', 'COVERAGE'],
          });
        } else if (delta <= -0.10) {
          logisticsItems.push({
            severity: 'WARN',
            ventureId: v.id,
            ventureName: v.name,
            ventureType: v.type,
            label: `${v.name}: coverage storm`,
            detail: `${v.name}: coverage ${Math.round(covY * 100)}% vs ${Math.round(
              covW * 100,
            )}% baseline (yesterday vs last 7 days).`,
            tags: ['LOGISTICS', 'COVERAGE'],
          });
        }
      }

      if (y && y.lost >= 3) {
        const rateShareY = y.rateLost / y.lost;
        const baseRateShare = w && w.lost > 0 ? w.rateLost / w.lost : 0;

        if (rateShareY >= 0.7) {
          logisticsItems.push({
            severity: 'CRITICAL',
            ventureId: v.id,
            ventureName: v.name,
            ventureType: v.type,
            label: `${v.name}: rate-loss fire`,
            detail: `${v.name}: ${y.rateLost}/${y.lost} lost loads (yesterday) due to RATE (~${Math.round(
              rateShareY * 100,
            )}%, critical).`,
            tags: ['LOGISTICS', 'RATE'],
          });
        } else if (rateShareY >= 0.5 && rateShareY - baseRateShare >= 0.15) {
          logisticsItems.push({
            severity: 'WARN',
            ventureId: v.id,
            ventureName: v.name,
            ventureType: v.type,
            label: `${v.name}: rate-loss storm`,
            detail: `${v.name}: ${y.rateLost}/${y.lost} lost loads (yesterday) due to RATE (~${Math.round(
              rateShareY * 100,
            )}%, above normal).`,
            tags: ['LOGISTICS', 'RATE'],
          });
        }
      }

      if (y && y.internalLost >= 1) {
        const internalShare = y.internalLost / (y.lost || 1);
        const isCritical = internalShare >= 0.3 || y.internalLost >= 3;

        logisticsItems.push({
          severity: isCritical ? 'CRITICAL' : 'WARN',
          ventureId: v.id,
          ventureName: v.name,
          ventureType: v.type,
          label: isCritical
            ? `${v.name}: internal error fire`
            : `${v.name}: internal error storm`,
          detail: `${v.name}: ${y.internalLost} lost loads tagged INTERNAL_ERROR yesterday – fix the process.`,
          tags: ['LOGISTICS', 'INTERNAL_ERROR'],
        });
      }
    }
  }

  if (hospitalityVentures.length && canViewMetrics) {
    const vIds = hospitalityVentures.map((v: any) => v.id);

    const hotels = await prisma.hotelProperty.findMany({
      where: { ventureId: { in: vIds }, status: 'ACTIVE' },
      select: { id: true, name: true, ventureId: true },
    });
    const hotelIds = hotels.map((h: any) => h.id);
    const hotelMap = new Map(hotels.map((h: any) => [h.id, h]));

    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * dayMs);
    const metrics = await prisma.hotelKpiDaily.findMany({
      where: {
        hotelId: { in: hotelIds },
        date: { gte: sevenDaysAgo, lt: todayStart },
      },
    });

    const byHotelRecent = new Map<number, { occ: number[]; revpar: number[] }>();
    const byHotelPrior = new Map<number, { occ: number[]; revpar: number[] }>();

    for (const m of metrics) {
      const bucket = m.date >= threeDaysAgo ? byHotelRecent : byHotelPrior;
      if (!bucket.has(m.hotelId)) {
        bucket.set(m.hotelId, { occ: [], revpar: [] });
      }
      const agg = bucket.get(m.hotelId)!;
      if (m.occupancyPct != null) agg.occ.push(m.occupancyPct / 100);
      if (m.revpar != null) agg.revpar.push(m.revpar);
    }

    for (const [hotelId, recent] of byHotelRecent.entries()) {
      const prior = byHotelPrior.get(hotelId);
      if (!prior) continue;
      const hotel = hotelMap.get(hotelId) as any;
      if (!hotel) continue;

      const v = hospitalityVentures.find((v: any) => v.id === hotel.ventureId);
      if (!v) continue;

      const avgOccRecent =
        recent.occ.length > 0
          ? recent.occ.reduce((s, x) => s + x, 0) / recent.occ.length
          : 0;
      const avgOccPrior =
        prior.occ.length > 0
          ? prior.occ.reduce((s, x) => s + x, 0) / prior.occ.length
          : avgOccRecent;

      const avgRevRecent =
        recent.revpar.length > 0
          ? recent.revpar.reduce((s, x) => s + x, 0) / recent.revpar.length
          : 0;
      const avgRevPrior =
        prior.revpar.length > 0
          ? prior.revpar.reduce((s, x) => s + x, 0) / prior.revpar.length
          : avgRevRecent;

      const occDelta = avgOccRecent - avgOccPrior;
      const revDelta = avgRevRecent - avgRevPrior;

      if (occDelta <= -0.1 || (avgRevPrior > 0 && revDelta <= -0.15 * avgRevPrior)) {
        const isCritical =
          occDelta <= -0.15 || (avgRevPrior > 0 && revDelta <= -0.25 * avgRevPrior);
        hospitalityItems.push({
          severity: isCritical ? 'CRITICAL' : 'WARN',
          ventureId: v.id,
          ventureName: v.name,
          ventureType: v.type,
          label: isCritical
            ? `${hotel.name}: performance fire`
            : `${hotel.name}: performance storm`,
          detail: `${hotel.name}: occ ${(avgOccRecent * 100).toFixed(
            1,
          )}% vs ${(avgOccPrior * 100).toFixed(
            1,
          )}%; RevPAR ${avgRevRecent.toFixed(2)} vs ${avgRevPrior.toFixed(
            2,
          )} (last 3 days vs previous 4).`,
          tags: ['HOSPITALITY', 'PERFORMANCE'],
        });
      }
    }

    const recentReviews = await prisma.hotelReview.findMany({
      where: {
        hotelId: { in: hotelIds },
        reviewDate: { gte: threeDaysAgo, lt: todayStart },
        isTest: user.isTestUser,
      },
      select: {
        id: true,
        hotelId: true,
        rating: true,
        responseText: true,
        reviewDate: true,
      },
    });

    for (const r of recentReviews) {
      const hotel = hotelMap.get(r.hotelId) as any;
      if (!hotel) continue;
      const v = hospitalityVentures.find((v: any) => v.id === hotel.ventureId);
      if (!v) continue;

      if ((r.rating || 0) <= 3 && !r.responseText) {
        hospitalityItems.push({
          severity: 'WARN',
          ventureId: v.id,
          ventureName: v.name,
          ventureType: v.type,
          label: `${hotel.name}: review storm`,
          detail: `${hotel.name}: ${r.rating}★ review in last 3 days without response – get RM / GM on it today.`,
          tags: ['HOSPITALITY', 'REVIEWS'],
        });
      } else if ((r.rating || 0) >= 4.5) {
        winsItems.push({
          severity: 'INFO',
          ventureId: v.id,
          ventureName: v.name,
          ventureType: v.type,
          label: `${hotel.name}: great review`,
          detail: `${hotel.name} received a ${r.rating}-star review in last 3 days.`,
          tags: ['HOSPITALITY', 'WIN'],
        });
      }
    }
  }

  if (bpoVentures.length && canViewMetrics) {
    const vIds = bpoVentures.map((v: any) => v.id);

    const campaigns = await prisma.bpoCampaign.findMany({
      where: { ventureId: { in: vIds }, isActive: true },
      select: { id: true, name: true, ventureId: true },
    });
    const campIds = campaigns.map((c: any) => c.id);
    const campMap = new Map(campaigns.map((c: any) => [c.id, c]));

    const weekMetrics = await prisma.bpoDailyMetric.findMany({
      where: {
        campaignId: { in: campIds },
        date: { gte: weekStart, lt: todayStart },
        isTest: user.isTestUser,
      },
    });

    const recentMetrics = weekMetrics.filter((m: any) => m.date >= threeDaysAgo);
    const priorMetrics = weekMetrics.filter((m: any) => m.date < threeDaysAgo);

    type Agg = {
      outbound: number;
      leads: number;
      demos: number;
      sales: number;
      revenue: number;
      cost: number;
      qaSum: number;
      qaCount: number;
    };

    const aggByCamp = (rows: typeof weekMetrics) => {
      const map = new Map<number, Agg>();
      for (const m of rows) {
        if (!map.has(m.campaignId)) {
          map.set(m.campaignId, {
            outbound: 0,
            leads: 0,
            demos: 0,
            sales: 0,
            revenue: 0,
            cost: 0,
            qaSum: 0,
            qaCount: 0,
          });
        }
        const a = map.get(m.campaignId)!;
        a.outbound += m.outboundCalls || 0;
        a.leads += m.leadsCreated || 0;
        a.demos += m.demosBooked || 0;
        a.sales += m.salesClosed || 0;
        a.revenue += m.revenue || 0;
        a.cost += m.cost || 0;
        if (m.avgQaScore != null) {
          a.qaSum += m.avgQaScore;
          a.qaCount += 1;
        }
      }
      return map;
    };

    const recentByCamp = aggByCamp(recentMetrics);
    const priorByCamp = aggByCamp(priorMetrics);

    for (const [campId, recent] of recentByCamp.entries()) {
      const prior = priorByCamp.get(campId);
      if (!prior) continue;

      const camp = campMap.get(campId) as any;
      if (!camp) continue;
      const v = bpoVentures.find((v: any) => v.id === camp.ventureId);
      if (!v) continue;

      const convRecent =
        recent.outbound > 0 ? recent.leads / recent.outbound : 0;
      const convPrior =
        prior.outbound > 0 ? prior.leads / prior.outbound : convRecent;

      const demosRecent = recent.demos;
      const demosPrior = prior.demos;

      const convDelta = convRecent - convPrior;
      if (convDelta <= -0.03) {
        const isCritical = convDelta <= -0.07;
        bpoItems.push({
          severity: isCritical ? 'CRITICAL' : 'WARN',
          ventureId: v.id,
          ventureName: v.name,
          ventureType: v.type,
          label: isCritical
            ? `${camp.name}: conversion fire`
            : `${camp.name}: conversion storm`,
          detail: `${camp.name}: lead conversion ${(convRecent * 100).toFixed(
            1,
          )}% vs ${(convPrior * 100).toFixed(
            1,
          )}% (last 3 days vs previous 4).`,
          tags: ['BPO', 'CONVERSION'],
        });
      }

      if (demosPrior >= 5 && demosRecent < demosPrior * 0.6) {
        bpoItems.push({
          severity: 'WARN',
          ventureId: v.id,
          ventureName: v.name,
          ventureType: v.type,
          label: `${camp.name}: demos storm`,
          detail: `${camp.name}: demos ${demosRecent} vs ${demosPrior} (last 3 vs previous 4 days).`,
          tags: ['BPO', 'DEMOS'],
        });
      }

      const qaRecent =
        recent.qaCount > 0 ? recent.qaSum / recent.qaCount : 0;
      if (recent.qaCount > 0 && qaRecent < 75) {
        const isCritical = qaRecent < 65;
        bpoItems.push({
          severity: isCritical ? 'CRITICAL' : 'WARN',
          ventureId: v.id,
          ventureName: v.name,
          ventureType: v.type,
          label: isCritical
            ? `${camp.name}: QA fire`
            : `${camp.name}: QA storm`,
          detail: `${camp.name}: avg QA ${qaRecent.toFixed(
            1,
          )} in last 3 days (target ~80).`,
          tags: ['BPO', 'QA'],
        });
      }

      if (convRecent >= 0.12 && demosRecent >= 5) {
        winsItems.push({
          severity: 'INFO',
          ventureId: v.id,
          ventureName: v.name,
          ventureType: v.type,
          label: `${camp.name}: strong campaign`,
          detail: `${camp.name}: ${(convRecent * 100).toFixed(
            1,
          )}% conversion, ${demosRecent} demos (last 3 days).`,
          tags: ['BPO', 'WIN'],
        });
      }
    }
  }

  try {
    const taskWhere: any = {
      ventureId: { in: ventures.map((v: any) => v.id) },
      status: 'OPEN',
      isTest: user.isTestUser,
    };

    const overdueTasks = await prisma.task.count({
      where: {
        ...taskWhere,
        dueDate: { lt: todayStart },
      },
    });

    if (overdueTasks > 0) {
      const isCritical = overdueTasks >= 15;
      genericItems.push({
        severity: isCritical ? 'CRITICAL' : 'WARN',
        label: isCritical ? 'Overdue task fire' : 'Overdue task storm',
        detail: `${overdueTasks} tasks past due across all ventures – clear the board.`,
        tags: ['TASKS'],
      });
    }

    const todayTasks = await prisma.task.count({
      where: {
        ...taskWhere,
        dueDate: { gte: todayStart, lte: new Date(todayStart.getTime() + dayMs - 1) },
      },
    });

    if (todayTasks > 0) {
      genericItems.push({
        severity: 'INFO',
        label: "Today's tasks",
        detail: `${todayTasks} tasks are scheduled for today.`,
        tags: ['TASKS'],
      });
    }
  } catch {
    // ignore if task query fails
  }

  const criticalCount =
    logisticsItems.filter(i => i.severity === 'CRITICAL').length +
    hospitalityItems.filter(i => i.severity === 'CRITICAL').length +
    bpoItems.filter(i => i.severity === 'CRITICAL').length +
    genericItems.filter(i => i.severity === 'CRITICAL').length;

  const warnCount =
    logisticsItems.filter(i => i.severity === 'WARN').length +
    hospitalityItems.filter(i => i.severity === 'WARN').length +
    bpoItems.filter(i => i.severity === 'WARN').length +
    genericItems.filter(i => i.severity === 'WARN').length;

  const winsCount = winsItems.length;

  const summaryLines: string[] = [];
  summaryLines.push(
    `🔥 Fires: ${criticalCount} · 🌩 Stormfronts: ${warnCount} · ✅ Wins: ${winsCount}`,
  );
  if (criticalCount > 0) {
    summaryLines.push(
      'Deal with 🔥 Fires first – these are non-negotiable today (coverage, QA, big dips).',
    );
  } else if (warnCount > 0) {
    summaryLines.push(
      'No open fires. Move through 🌩 Stormfronts and assign clear owners before noon.',
    );
  } else {
    summaryLines.push(
      'No major storms detected in the last 3–7 days. Use this window to push offense (sales, new properties, new shippers).',
    );
  }

  return {
    generatedAt: now.toISOString(),
    summaryLines,
    logistics: {
      title: 'Logistics',
      items: logisticsItems,
    },
    hospitality: {
      title: 'Hospitality',
      items: hospitalityItems,
    },
    bpo: {
      title: 'BPO',
      items: bpoItems,
    },
    generic: {
      title: 'Cross-venture & Tasks',
      items: genericItems,
    },
    wins: {
      title: 'Wins to Celebrate',
      items: winsItems,
    },
  };
}
