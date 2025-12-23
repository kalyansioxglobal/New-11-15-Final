import prisma from "@/lib/prisma";

type FreightKpiPayload = any;
type HotelKpiPayload = any;
type BpoDailyPayload = any;
type BpoAgentPayload = any;

type FreightKpiMetrics = {
  loadsInbound?: number;
  loadsQuoted?: number;
  loadsCovered?: number;
  loadsLost?: number;
  totalRevenue?: number;
  totalCost?: number;
  totalProfit?: number;
  avgMarginPct?: number;
  activeShippers?: number;
  newShippers?: number;
  activeCarriers?: number;
  newCarriers?: number;
};

type HotelKpiMetrics = {
  roomsSold?: number;
  roomsAvailable?: number;
  occupancyPct?: number;
  roomRevenue?: number;
  adr?: number;
  revpar?: number;
  otherRevenue?: number;
  totalRevenue?: number;
  grossOperatingProfit?: number;
  goppar?: number;
  cancellations?: number;
  noShows?: number;
  walkins?: number;
  complaints?: number;
  reviewScore?: number;
  roomsOutOfOrder?: number;
};

type BpoDailyMetrics = {
  talkTimeMin?: number;
  handledCalls?: number;
  aht?: number;
  fcr?: number;
  csat?: number;
  qualityScore?: number;
  revenue?: number;
};

type BpoAgentMetrics = {
  handledCalls?: number;
  talkTimeMin?: number;
  aht?: number;
  fcr?: number;
  csat?: number;
  qualityScore?: number;
};

type TableConfig = {
  freightKpiDaily: {
    uniqueKeys: { ventureId: number; date: Date };
    metrics: FreightKpiMetrics;
  };
  hotelKpiDaily: {
    uniqueKeys: { hotelId: number; date: Date };
    metrics: HotelKpiMetrics;
  };
  bpoDailyMetric: {
    uniqueKeys: { campaignId: number; date: Date };
    metrics: BpoDailyMetrics;
  };
  bpoAgentMetric: {
    uniqueKeys: { campaignId: number; agentId: number; date: Date };
    metrics: BpoAgentMetrics;
  };
};

type TableName = keyof TableConfig;

export type KpiUpsertInput<T extends TableName> = {
  table: T;
  uniqueKeys: TableConfig[T]["uniqueKeys"];
  metrics: TableConfig[T]["metrics"];
};

function buildWhereClause<T extends TableName>(
  table: T,
  keys: TableConfig[T]["uniqueKeys"]
): any {
  switch (table) {
    case "freightKpiDaily": {
      const k = keys as TableConfig["freightKpiDaily"]["uniqueKeys"];
      return { ventureId_date: { ventureId: k.ventureId, date: k.date } };
    }
    case "hotelKpiDaily": {
      const k = keys as TableConfig["hotelKpiDaily"]["uniqueKeys"];
      return { hotelId_date: { hotelId: k.hotelId, date: k.date } };
    }
    case "bpoDailyMetric": {
      const k = keys as TableConfig["bpoDailyMetric"]["uniqueKeys"];
      return { campaignId_date: { campaignId: k.campaignId, date: k.date } };
    }
    case "bpoAgentMetric": {
      const k = keys as TableConfig["bpoAgentMetric"]["uniqueKeys"];
      return {
        campaignId_agentId_date: {
          campaignId: k.campaignId,
          agentId: k.agentId,
          date: k.date,
        },
      };
    }
    default:
      throw new Error(`Unknown table: ${table}`);
  }
}

function buildCreateData<T extends TableName>(
  table: T,
  keys: TableConfig[T]["uniqueKeys"],
  metrics: TableConfig[T]["metrics"]
): any {
  switch (table) {
    case "freightKpiDaily": {
      const k = keys as TableConfig["freightKpiDaily"]["uniqueKeys"];
      return {
        ventureId: k.ventureId,
        date: k.date,
        ...metrics,
      };
    }
    case "hotelKpiDaily": {
      const k = keys as TableConfig["hotelKpiDaily"]["uniqueKeys"];
      return {
        hotelId: k.hotelId,
        date: k.date,
        ...metrics,
      };
    }
    case "bpoDailyMetric": {
      const k = keys as TableConfig["bpoDailyMetric"]["uniqueKeys"];
      return {
        campaignId: k.campaignId,
        date: k.date,
        ...metrics,
      };
    }
    case "bpoAgentMetric": {
      const k = keys as TableConfig["bpoAgentMetric"]["uniqueKeys"];
      return {
        campaignId: k.campaignId,
        userId: k.agentId,
        date: k.date,
        ...metrics,
      };
    }
    default:
      throw new Error(`Unknown table: ${table}`);
  }
}

export async function upsertDailyKpi<T extends TableName>({
  table,
  uniqueKeys,
  metrics,
}: KpiUpsertInput<T>) {
  const model = (prisma as any)[table];
  const where = buildWhereClause(table, uniqueKeys);
  const create = buildCreateData(table, uniqueKeys, metrics);

  const record = await model.upsert({
    where,
    update: metrics,
    create,
  });

  return record;
}

export async function incrementKpiMetric<T extends TableName>(
  table: T,
  uniqueKeys: TableConfig[T]["uniqueKeys"],
  field: string,
  amount: number = 1
) {
  const model = (prisma as any)[table];
  const where = buildWhereClause(table, uniqueKeys);

  const existing = await model.findUnique({ where });

  if (existing) {
    return model.update({
      where,
      data: { [field]: { increment: amount } },
    });
  } else {
    const create = buildCreateData(table, uniqueKeys, { [field]: amount } as any);
    return model.create({ data: create });
  }
}

export async function getDailyKpi<T extends TableName>(
  table: T,
  uniqueKeys: TableConfig[T]["uniqueKeys"]
) {
  const model = (prisma as any)[table];
  const where = buildWhereClause(table, uniqueKeys);
  return model.findUnique({ where });
}

export async function getKpiRange<T extends TableName>(
  table: T,
  filter: Partial<TableConfig[T]["uniqueKeys"]> & {
    dateFrom?: Date;
    dateTo?: Date;
  }
) {
  const model = (prisma as any)[table];
  const where: any = {};

  if ("ventureId" in filter && filter.ventureId) where.ventureId = filter.ventureId;
  if ("hotelId" in filter && filter.hotelId) where.hotelId = filter.hotelId;
  if ("campaignId" in filter && filter.campaignId) where.campaignId = filter.campaignId;
  if ("agentId" in filter && filter.agentId) where.agentId = filter.agentId;

  if (filter.dateFrom || filter.dateTo) {
    where.date = {};
    if (filter.dateFrom) where.date.gte = filter.dateFrom;
    if (filter.dateTo) where.date.lte = filter.dateTo;
  }

  return model.findMany({
    where,
    orderBy: { date: "asc" },
  });
}
