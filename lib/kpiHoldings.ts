// lib/kpiHoldings.ts
import prisma from "./prisma";

export type HoldingsKpiFilters = {
  ventureId?: number;
  asOf?: Date;
};

export type HoldingsKpiSummary = {
  cashBalance: number;
  assetValue: number;
  totalNetWorth: number;
};

export async function getHoldingsKpis(
  filters: HoldingsKpiFilters
): Promise<HoldingsKpiSummary> {
  const { ventureId, asOf = new Date() } = filters;

  const bankWhere: any = {};
  if (ventureId) {
    bankWhere.bankAccount = { ventureId };
  }

  const snapshots = await prisma.bankSnapshot.findMany({
    where: {
      ...bankWhere,
      snapshotDate: { lte: asOf },
    },
    include: {
      bankAccount: {
        select: { id: true, ventureId: true },
      },
    },
    orderBy: { snapshotDate: "desc" },
  });

  const seenAccountIds = new Set<number>();
  let cashBalance = 0;

  for (const s of snapshots) {
    if (seenAccountIds.has(s.bankAccountId)) continue;
    seenAccountIds.add(s.bankAccountId);
    cashBalance += s.balance ?? 0;
  }

  const assetWhere: any = { isActive: true };
  if (ventureId) {
    assetWhere.ventureId = ventureId;
  }

  const assets = await prisma.holdingAsset.findMany({
    where: assetWhere,
    select: { valueEstimate: true },
  });

  let assetValue = 0;
  for (const a of assets) {
    assetValue += a.valueEstimate ?? 0;
  }

  const totalNetWorth = cashBalance + assetValue;

  return {
    cashBalance,
    assetValue,
    totalNetWorth,
  };
}
