import prisma from "@/lib/prisma";

export async function computeDeliveryStats({ ventureId, since }: { ventureId?: number; since?: Date } = {}) {
  const where: any = { actualDeliveryAt: { not: null }, dropDate: { not: null } };
  if (ventureId) where.ventureId = ventureId;
  if (since) where.actualDeliveryAt = { gte: since };

  const loads = await prisma.load.findMany({ where, select: { carrierId: true, actualDeliveryAt: true, dropDate: true } });

  const carrierMap: Record<number, { total: number; onTime: number }> = {};
  for (const l of loads) {
    if (!l.carrierId) continue;
    const cid = l.carrierId;
    if (!carrierMap[cid]) carrierMap[cid] = { total: 0, onTime: 0 };
    carrierMap[cid].total += 1;
    if (l.actualDeliveryAt && l.dropDate && l.actualDeliveryAt <= l.dropDate) carrierMap[cid].onTime += 1;
  }

  const stats = [] as any[];
  for (const cidStr of Object.keys(carrierMap)) {
    const cid = Number(cidStr);
    const entry = carrierMap[cid];
    const onTimePercentage = entry.total > 0 ? Math.round((entry.onTime / entry.total) * 100) : 0;
    stats.push({ carrierId: cid, totalDelivered: entry.total, onTimeDelivered: entry.onTime, onTimePercentage });
  }

  const disqualifiedCount = await prisma.carrier.count({ where: { disqualified: true } });

  return { stats, disqualifiedCount };
}

export async function getCarrierDeliveryStats(carrierId: number, { ventureId, since }: { ventureId?: number; since?: Date } = {}) {
  const where: any = { 
    carrierId,
    actualDeliveryAt: { not: null }, 
    dropDate: { not: null } 
  };
  if (ventureId) where.ventureId = ventureId;
  if (since) where.actualDeliveryAt = { gte: since };

  const loads = await prisma.load.findMany({ 
    where, 
    select: { 
      id: true,
      actualDeliveryAt: true, 
      dropDate: true,
      pickupCity: true,
      dropCity: true,
      miles: true,
      rate: true
    } 
  });

  let totalDelivered = 0;
  let onTimeDelivered = 0;
  let totalMiles = 0;
  let totalRevenue = 0;

  for (const load of loads) {
    totalDelivered += 1;
    if (load.actualDeliveryAt && load.dropDate && load.actualDeliveryAt <= load.dropDate) {
      onTimeDelivered += 1;
    }
    if (load.miles) totalMiles += load.miles;
    if (load.rate) totalRevenue += load.rate;
  }

  const onTimePercentage = totalDelivered > 0 ? Math.round((onTimeDelivered / totalDelivered) * 100) : 0;
  const avgMilesPerLoad = totalDelivered > 0 ? Math.round(totalMiles / totalDelivered) : 0;
  const avgRevenuePerLoad = totalDelivered > 0 ? Math.round(totalRevenue / totalDelivered) : 0;

  // Get carrier info
  const carrier = await prisma.carrier.findUnique({
    where: { id: carrierId },
    select: {
      name: true,
      mcNumber: true,
      dotNumber: true,
      fmcsaAuthorized: true,
      complianceStatus: true,
      disqualified: true
    }
  });

  return {
    carrierId,
    carrier,
    totalDelivered,
    onTimeDelivered,
    onTimePercentage,
    totalMiles,
    totalRevenue,
    avgMilesPerLoad,
    avgRevenuePerLoad,
    loads: loads.map((l: any) => ({
      id: l.id,
      onTime: l.actualDeliveryAt && l.dropDate && l.actualDeliveryAt <= l.dropDate,
      route: `${l.pickupCity || 'Unknown'} → ${l.dropCity || 'Unknown'}`,
      miles: l.miles,
      rate: l.rate
    }))
  };
}
