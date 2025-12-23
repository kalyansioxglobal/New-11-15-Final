import { PrismaClient } from "@prisma/client";
import { NormalizedRingCentralCall, NormalizedTmsLoad } from "./types";
import { getAliasId } from "@/lib/staffAlias";

const prisma = new PrismaClient();

export async function upsertUserMappingFromRingCentral(
  row: NormalizedRingCentralCall,
  opts: { autoCreateUser?: boolean } = {},
) {
  const { rcEmail, rcExtension, rcUserName } = row;
  let user = null;

  if (rcEmail) {
    user = await prisma.user.findUnique({
      where: { email: rcEmail },
    });
  }

  if (!user && rcExtension) {
    const existingMapping = await prisma.userMapping.findFirst({
      where: { rcExtension },
      include: { user: true },
    });
    if (existingMapping) user = existingMapping.user;
  }

  if (!user && opts.autoCreateUser && rcEmail) {
    user = await prisma.user.create({
      data: {
        email: rcEmail,
        fullName: rcUserName ?? rcEmail,
        role: "EMPLOYEE",
      },
    });
  }

  if (!user) return null;

  const mapping = await prisma.userMapping.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      rcEmail,
      rcExtension,
      rcUserName,
      tmsEmail: rcEmail,
    },
    update: {
      rcEmail: rcEmail ?? undefined,
      rcExtension: rcExtension ?? undefined,
      rcUserName: rcUserName ?? undefined,
      tmsEmail: rcEmail ?? undefined,
    },
  });

  return { user, mapping };
}

async function ensureShipper(
  tmsShipperCode: string | null,
  ventureId?: number,
): Promise<number | null> {
  if (!tmsShipperCode) return null;

  const existing = await prisma.logisticsShipper.findUnique({
    where: { tmsShipperCode },
  });
  if (existing) return existing.id;

  if (!ventureId) return null;

  const created = await prisma.logisticsShipper.create({
    data: {
      name: tmsShipperCode,
      tmsShipperCode,
      ventureId,
    },
  });
  return created.id;
}

async function ensureCustomerByCodeOrName(
  tmsCustomerCode: string | null,
  customerName: string | null,
): Promise<number | null> {
  if (tmsCustomerCode) {
    const byCode = await prisma.customer.findUnique({
      where: { tmsCustomerCode },
    });
    if (byCode) return byCode.id;

    const created = await prisma.customer.create({
      data: {
        name: customerName ?? tmsCustomerCode,
        tmsCustomerCode,
      },
    });
    return created.id;
  }

  if (customerName) {
    const byName = await prisma.customer.findFirst({
      where: { name: customerName },
    });
    if (byName) return byName.id;

    const created = await prisma.customer.create({
      data: { name: customerName },
    });
    return created.id;
  }

  return null;
}

async function ensureCarrierByCodeOrName(
  tmsCarrierCode: string | null,
  carrierName: string | null,
): Promise<number | null> {
  if (tmsCarrierCode) {
    const byCode = await prisma.carrier.findUnique({
      where: { tmsCarrierCode },
    });
    if (byCode) return byCode.id;

    const created = await prisma.carrier.create({
      data: {
        name: carrierName ?? tmsCarrierCode,
        tmsCarrierCode,
      },
    });
    return created.id;
  }

  if (carrierName) {
    const byName = await prisma.carrier.findFirst({
      where: { name: carrierName },
    });
    if (byName) return byName.id;

    const created = await prisma.carrier.create({
      data: { name: carrierName },
    });
    return created.id;
  }

  return null;
}

async function resolveUserFromTmsIdentity(
  tmsEmployeeCode: string | null,
  tmsUserName: string | null,
): Promise<number | null> {
  if (tmsEmployeeCode) {
    const mapping = await prisma.userMapping.findFirst({
      where: { tmsEmployeeCode },
    });
    if (mapping?.userId) return mapping.userId;
  }

  if (tmsUserName) {
    const mappingByName = await prisma.userMapping.findFirst({
      where: { rcUserName: tmsUserName },
    });
    if (mappingByName?.userId) return mappingByName.userId;
  }

  return null;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Map a RingCentral row to an internal User via UserMapping,
 * and record daily call KPIs in EmployeeKpiDaily.
 */
export async function mapRingCentralAndRecordKpi(
  row: NormalizedRingCentralCall,
  opts: {
    date: Date;
    autoCreateUser?: boolean;
  },
) {
  const mapping = await upsertUserMappingFromRingCentral(row, {
    autoCreateUser: opts.autoCreateUser ?? false,
  });

  if (!mapping || !mapping.user) {
    return { userId: null, kpiUpdated: false };
  }

  const userId = mapping.user.id;

  const ventureUser = await prisma.ventureUser.findFirst({
    where: { userId },
    include: { venture: true },
    orderBy: { id: "asc" },
  });

  if (!ventureUser) {
    return { userId, kpiUpdated: false };
  }

  const ventureId = ventureUser.ventureId;

  const officeUser = await prisma.officeUser.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
  });
  const officeId = officeUser?.officeId ?? null;

  const kpiDate = startOfDay(opts.date);

  const existing = await prisma.employeeKpiDaily.findFirst({
    where: {
      userId,
      ventureId,
      officeId,
      date: kpiDate,
    },
  });

  const calls = row.totalCalls ?? 0;
  const hours = (row.totalMinutes ?? 0) / 60;

  if (existing) {
    await prisma.employeeKpiDaily.update({
      where: { id: existing.id },
      data: {
        callsMade: (existing.callsMade ?? 0) + calls,
        hoursWorked: (existing.hoursWorked ?? 0) + hours,
      },
    });
  } else {
    await prisma.employeeKpiDaily.create({
      data: {
        userId,
        ventureId,
        officeId,
        date: kpiDate,
        callsMade: calls,
        hoursWorked: hours,
      },
    });
  }

  return { userId, kpiUpdated: true };
}

export async function upsertLoadFromTms(row: NormalizedTmsLoad) {
  if (!row.tmsLoadId) {
    throw new Error("TMS load row missing tmsLoadId");
  }

  const shipperId = await ensureShipper(row.tmsShipperCode);
  const customerId = await ensureCustomerByCodeOrName(
    row.tmsCustomerCode,
    row.customerName,
  );
  const carrierId = await ensureCarrierByCodeOrName(
    row.tmsCarrierCode,
    row.carrierName,
  );
  const createdById = await resolveUserFromTmsIdentity(
    row.tmsEmployeeCode,
    row.createdByTmsUserName,
  );

  const salesAgentAliasId = await getAliasId(row.salesAgentName, "SALES_AGENT");
  const csrAliasId = await getAliasId(row.csrName, "CSR");
  const dispatcherAliasId = await getAliasId(row.dispatcherName, "DISPATCHER");

  const marginAmount =
    row.marginAmount ??
    (row.billAmount != null && row.costAmount != null
      ? row.billAmount - row.costAmount
      : undefined);

  const marginPercentage =
    row.marginPercentage ??
    (row.billAmount != null && row.billAmount > 0 && marginAmount != null
      ? (marginAmount / row.billAmount) * 100
      : undefined);

  const load = await prisma.load.upsert({
    where: { tmsLoadId: row.tmsLoadId },
    create: {
      tmsLoadId: row.tmsLoadId,
      reference: row.referenceNo,
      status: row.status,

      shipperId: shipperId ?? undefined,
      customerId: customerId ?? undefined,
      carrierId: carrierId ?? undefined,
      createdById: createdById ?? undefined,

      salesAgentAliasId: salesAgentAliasId ?? undefined,
      csrAliasId: csrAliasId ?? undefined,
      dispatcherAliasId: dispatcherAliasId ?? undefined,

      billAmount: row.billAmount ?? undefined,
      costAmount: row.costAmount ?? undefined,
      marginAmount: marginAmount ?? undefined,
      marginPercentage: marginPercentage ?? undefined,

      arInvoiceDate: row.arInvoiceDate ?? undefined,
      apInvoiceDate: row.apInvoiceDate ?? undefined,
      dispatchDate: row.dispatchDate ?? undefined,
      arPaymentStatus: row.arPaymentStatus ?? undefined,
      arDatePaid: row.arDatePaid ?? undefined,
      arBalanceDue: row.arBalanceDue ?? undefined,

      createdByTmsName: row.createdByTmsUserName ?? undefined,
    },
    update: {
      reference: row.referenceNo ?? undefined,
      status: row.status ?? undefined,

      shipperId: shipperId ?? undefined,
      customerId: customerId ?? undefined,
      carrierId: carrierId ?? undefined,
      createdById: createdById ?? undefined,

      salesAgentAliasId: salesAgentAliasId ?? undefined,
      csrAliasId: csrAliasId ?? undefined,
      dispatcherAliasId: dispatcherAliasId ?? undefined,

      billAmount: row.billAmount ?? undefined,
      costAmount: row.costAmount ?? undefined,
      marginAmount: marginAmount ?? undefined,
      marginPercentage: marginPercentage ?? undefined,

      arInvoiceDate: row.arInvoiceDate ?? undefined,
      apInvoiceDate: row.apInvoiceDate ?? undefined,
      dispatchDate: row.dispatchDate ?? undefined,
      arPaymentStatus: row.arPaymentStatus ?? undefined,
      arDatePaid: row.arDatePaid ?? undefined,
      arBalanceDue: row.arBalanceDue ?? undefined,

      createdByTmsName: row.createdByTmsUserName ?? undefined,
    },
  });

  if (shipperId) {
    const loadDate = row.dispatchDate ?? row.arInvoiceDate ?? load.createdAt;
    await prisma.logisticsShipper.update({
      where: { id: shipperId },
      data: { lastLoadDate: loadDate },
    });
  }

  return load;
}
