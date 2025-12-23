// lib/kpiSaas.ts
import prisma from "./prisma";

export type SaasKpiFilters = {
  ventureId?: number;
  from?: Date;
  to?: Date;
};

export type SaasKpiSummary = {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  activeCustomers: number;
};

export async function getSaasKpis(
  filters: SaasKpiFilters
): Promise<SaasKpiSummary> {
  const { ventureId, from, to } = filters;

  const where: any = {
    isActive: true,
    customer: {},
  };

  if (ventureId) {
    where.customer.ventureId = ventureId;
  }

  if (from || to) {
    where.startedAt = {};
    if (to) {
      where.startedAt.lte = to;
    }

    if (from) {
      where.OR = [
        { cancelledAt: null },
        { cancelledAt: { gte: from } },
      ];
    }
  }

  const subs = await prisma.saasSubscription.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          ventureId: true,
        },
      },
    },
  });

  let mrr = 0;
  const customerIds = new Set<number>();

  for (const s of subs) {
    mrr += s.mrr;
    customerIds.add(s.customerId);
  }

  const arr = mrr * 12;

  return {
    mrr,
    arr,
    activeSubscriptions: subs.length,
    activeCustomers: customerIds.size,
  };
}
