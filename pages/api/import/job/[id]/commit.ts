import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { parseFile } from '@/lib/import/parser';
import fs from 'fs';

function parseDate(value: string): Date | null {
  if (!value) return null;
  const cleaned = value.trim();
  const isoDate = new Date(cleaned);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];
  
  for (const regex of formats) {
    const match = cleaned.match(regex);
    if (match) {
      let year: number, month: number, day: number;
      if (match[1].length === 4) {
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
      } else if (match[3].length === 4) {
        month = parseInt(match[1]) - 1;
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      } else continue;
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

function parseNumber(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = Number(session.user.id);
  const jobId = Number(req.query.id);

  if (isNaN(jobId)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  try {
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
      include: { mapping: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    if (job.status !== 'VALIDATED') {
      return res.status(400).json({ error: 'Job must be validated before import' });
    }

    if (!job.filePath || !fs.existsSync(job.filePath)) {
      return res.status(400).json({ error: 'File not found' });
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'IMPORTING' },
    });

    const content = fs.readFileSync(job.filePath);
    const parseResult = await parseFile(content, job.mimeType || '', job.fileName);

    const mapping = job.mapping?.configJson as { 
      columnToField: Record<string, string>;
      options?: { dateFormat?: string; ventureId?: number; propertyId?: number };
    } | null;

    if (!mapping?.columnToField) {
      throw new Error('No column mapping found');
    }

    const { columnToField, options } = mapping;
    const dateFields = ['date', 'pickupDate', 'deliveryDate', 'postedDate', 'stayFrom', 'stayTo', 'reviewDate', 'evidenceDueDate'];
    const integerFields = ['hotelId', 'ventureId', 'campaignId', 'propertyId'];
    const numberFields = [
      'amount', 'disputedAmount', 'originalAmount', 'customerRate', 'carrierRate', 'margin', 'weight',
      'occupancy', 'occupancyPct', 'adr', 'revpar', 'roomRevenue', 'roomsSold', 'roomsAvailable', 'totalRevenue',
      'otherRevenue', 'grossOperatingProfit', 'goppar', 'cancellations', 'noShows', 'walkins', 'complaints',
      'roomsOutOfOrder', 'reviewScore',
      'totalRoom', 'roomSold', 'cash', 'credit', 'online', 'refund', 'total', 'dues', 'lostDues',
      'loadsInbound', 'loadsQuoted', 'loadsCovered', 'loadsLost', 'totalCost', 'totalProfit', 'avgMarginPct',
      'activeShippers', 'newShippers', 'churnedShippers', 'reactivatedShippers', 'atRiskShippers',
      'activeCarriers', 'newCarriers',
      'revenue', 'cost', 'marginPercent', 'coverageRate', 'totalLoads', 'coveredLoads', 'rating',
      'outboundCalls', 'handledCalls', 'talkTimeMin', 'leadsCreated', 'demosBooked', 'salesClosed',
      'fteCount', 'avgQaScore', 'qaScore'
    ];

    let successCount = 0;
    let errorCount = 0;
    const errors: { row: number; message: string }[] = [];

    for (let rowIndex = 0; rowIndex < parseResult.rows.length; rowIndex++) {
      const row = parseResult.rows[rowIndex];
      const record: Record<string, unknown> = {};

      for (const [colName, fieldName] of Object.entries(columnToField)) {
        if (fieldName === '__ignore__' || !fieldName) continue;

        const colIndex = parseResult.columns.indexOf(colName);
        if (colIndex === -1) continue;

        const rawValue = row[colIndex] || '';

        if (dateFields.includes(fieldName)) {
          record[fieldName] = parseDate(rawValue);
        } else if (integerFields.includes(fieldName)) {
          const trimmed = rawValue.trim();
          if (trimmed) {
            const parsed = parseInt(trimmed, 10);
            record[fieldName] = isNaN(parsed) ? null : parsed;
          }
        } else if (numberFields.includes(fieldName)) {
          record[fieldName] = parseNumber(rawValue);
        } else {
          record[fieldName] = rawValue.trim();
        }
      }

      if (options?.ventureId) record.ventureId = options.ventureId;
      if (options?.propertyId) record.propertyId = options.propertyId;

      try {
        switch (job.type) {
          case 'LOADS':
            await importLoad(record, userId);
            break;
          case 'SHIPPERS':
            await importShipper(record);
            break;
          case 'CARRIERS':
            await importCarrier(record);
            break;
          case 'HOTEL_KPIS':
            await importHotelKpi(record);
            break;
          case 'HOTEL_DAILY':
            await importHotelDailyReport(record);
            break;
          case 'FREIGHT_KPIS':
            await importFreightKpi(record);
            break;
          case 'HOTEL_DISPUTES':
            await importHotelDispute(record, userId);
            break;
          case 'HOTEL_REVIEWS':
            await importHotelReview(record);
            break;
          case 'BPO_METRICS':
            await importBpoMetric(record);
            break;
          default:
            throw new Error(`Unsupported import type: ${job.type}`);
        }
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push({
          row: rowIndex + 2,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'IMPORTED',
        successCount,
        errorCount,
        errorRows: errors.length > 0 ? errors.slice(0, 100) : undefined,
      },
    });

    if (job.filePath && fs.existsSync(job.filePath)) {
      fs.unlinkSync(job.filePath);
    }

    return res.status(200).json({
      success: true,
      jobId,
      successCount,
      errorCount,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error('Import error:', error);
    
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Import failed',
      },
    });

    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Import failed' 
    });
  }
}

async function importLoad(record: Record<string, unknown>, userId: number) {
  const ventureId = record.ventureId as number | undefined;
  
  let venture = null;
  if (ventureId) {
    venture = await prisma.venture.findUnique({ where: { id: ventureId } });
  } else {
    venture = await prisma.venture.findFirst({ 
      where: { type: 'LOGISTICS', isActive: true }
    });
  }

  if (!venture) throw new Error('No logistics venture found');

  await prisma.load.create({
    data: {
      reference: (record.referenceNumber as string) || (record.reference as string) || `IMP-${Date.now()}`,
      ventureId: venture.id,
      pickupDate: record.pickupDate as Date | undefined,
      dropDate: record.deliveryDate as Date | undefined,
      loadStatus: 'OPEN',
      shipperName: record.shipperName as string | undefined,
      customerName: record.customerName as string | undefined,
      pickupCity: (record.originCity as string) || (record.pickupCity as string) || undefined,
      pickupState: (record.originState as string) || (record.pickupState as string) || undefined,
      pickupZip: (record.originZip as string) || (record.pickupZip as string) || undefined,
      dropCity: (record.destCity as string) || (record.dropCity as string) || undefined,
      dropState: (record.destState as string) || (record.dropState as string) || undefined,
      dropZip: (record.destZip as string) || (record.dropZip as string) || undefined,
      equipmentType: (record.equipment as string) || (record.equipmentType as string) || undefined,
      weightLbs: (record.weight as number) || (record.weightLbs as number) || undefined,
      rate: (record.customerRate as number) || (record.rate as number) || undefined,
      createdById: userId,
    },
  });
}

async function importShipper(record: Record<string, unknown>) {
  const ventureId = record.ventureId as number | undefined;
  
  let venture = null;
  if (ventureId) {
    venture = await prisma.venture.findUnique({ where: { id: ventureId } });
  } else {
    venture = await prisma.venture.findFirst({ 
      where: { type: 'LOGISTICS', isActive: true }
    });
  }

  if (!venture) throw new Error('No logistics venture found');

  await prisma.logisticsShipper.create({
    data: {
      name: record.name as string,
      ventureId: venture.id,
      contactName: record.contact as string | undefined,
      email: record.email as string | undefined,
      phone: record.phone as string | undefined,
      addressLine1: record.address as string | undefined,
      city: record.city as string | undefined,
      state: record.state as string | undefined,
      postalCode: record.zip as string | undefined,
      notes: record.notes as string | undefined,
    },
  });
}

async function importCarrier(record: Record<string, unknown>) {
  await prisma.carrier.create({
    data: {
      name: record.name as string,
      mcNumber: record.mcNumber as string | undefined,
      dotNumber: record.dotNumber as string | undefined,
      phone: record.phone as string | undefined,
      email: record.email as string | undefined,
      addressLine1: record.address as string | undefined,
      city: record.city as string | undefined,
      state: record.state as string | undefined,
      postalCode: record.zip as string | undefined,
      equipmentTypes: record.equipment as string | undefined,
      lanesJson: record.lanes as string | undefined,
      notes: record.notes as string | undefined,
    },
  });
}

async function importHotelKpi(record: Record<string, unknown>) {
  const hotelId = (record.hotelId as number) || (record.propertyId as number);
  const date = record.date as Date;
  const ventureId = record.ventureId as number | undefined;

  if (!hotelId || !date) {
    throw new Error('hotelId/propertyId and date are required');
  }

  const property = await prisma.hotelProperty.findUnique({
    where: { id: hotelId },
  });

  if (!property) throw new Error(`Hotel property ${hotelId} not found`);

  const finalVentureId = ventureId || property.ventureId;

  await prisma.hotelKpiDaily.upsert({
    where: {
      hotelId_date: {
        hotelId,
        date,
      },
    },
    update: {
      occupancyPct: (record.occupancy as number) || (record.occupancyPct as number) || undefined,
      adr: record.adr as number | undefined,
      revpar: record.revpar as number | undefined,
      roomRevenue: record.roomRevenue as number | undefined,
      roomsSold: record.roomsSold as number | undefined,
      roomsAvailable: record.roomsAvailable as number | undefined,
      totalRevenue: record.totalRevenue as number | undefined,
      otherRevenue: record.otherRevenue as number | undefined,
      grossOperatingProfit: record.grossOperatingProfit as number | undefined,
      goppar: record.goppar as number | undefined,
      cancellations: record.cancellations as number | undefined,
      noShows: record.noShows as number | undefined,
      walkins: record.walkins as number | undefined,
      complaints: record.complaints as number | undefined,
      roomsOutOfOrder: record.roomsOutOfOrder as number | undefined,
      reviewScore: record.reviewScore as number | undefined,
    },
    create: {
      ventureId: finalVentureId,
      hotelId,
      date,
      occupancyPct: (record.occupancy as number) || (record.occupancyPct as number) || 0,
      adr: (record.adr as number) || 0,
      revpar: (record.revpar as number) || 0,
      roomRevenue: (record.roomRevenue as number) || 0,
      roomsSold: (record.roomsSold as number) || 0,
      roomsAvailable: (record.roomsAvailable as number) || 0,
      totalRevenue: (record.totalRevenue as number) || 0,
      otherRevenue: (record.otherRevenue as number) || 0,
      grossOperatingProfit: (record.grossOperatingProfit as number) || 0,
      goppar: (record.goppar as number) || 0,
      cancellations: (record.cancellations as number) || 0,
      noShows: (record.noShows as number) || 0,
      walkins: (record.walkins as number) || 0,
      complaints: (record.complaints as number) || 0,
      roomsOutOfOrder: (record.roomsOutOfOrder as number) || 0,
      reviewScore: record.reviewScore as number | undefined,
    },
  });
}

async function importHotelDailyReport(record: Record<string, unknown>) {
  const hotelId = (record.hotelId as number) || (record.propertyId as number);
  const date = record.date as Date;

  if (!hotelId || !date) {
    throw new Error('hotelId and date are required');
  }

  const property = await prisma.hotelProperty.findUnique({
    where: { id: hotelId },
  });

  if (!property) throw new Error(`Hotel property ${hotelId} not found`);

  const totalRoom = (record.totalRoom as number) || 0;
  const roomSold = (record.roomSold as number) || 0;
  const cash = (record.cash as number) || 0;
  const credit = (record.credit as number) || 0;
  const online = (record.online as number) || 0;
  const refund = (record.refund as number) || 0;
  const total = (record.total as number) || 0;
  const dues = (record.dues as number) || 0;
  const lostDues = (record.lostDues as number) || 0;
  const occupancy = (record.occupancy as number) || 0;
  const revpar = (record.revpar as number) || 0;

  const adrNet = roomSold > 0 ? (total - lostDues) / roomSold : 0;

  const LOST_DUES_ABS_THRESHOLD = 100;
  const LOST_DUES_RATIO_THRESHOLD = 0.05;
  let highLossFlag = false;
  if (lostDues > 0 && total > 0) {
    const ratio = lostDues / total;
    if (lostDues >= LOST_DUES_ABS_THRESHOLD || ratio >= LOST_DUES_RATIO_THRESHOLD) {
      highLossFlag = true;
    }
  }

  await prisma.hotelDailyReport.upsert({
    where: {
      hotelId_date: { hotelId, date },
    },
    update: {
      totalRoom,
      roomSold,
      cash,
      credit,
      online,
      refund,
      total,
      dues,
      lostDues,
      occupancy,
      adr: adrNet,
      revpar,
      highLossFlag,
    },
    create: {
      hotelId,
      date,
      totalRoom,
      roomSold,
      cash,
      credit,
      online,
      refund,
      total,
      dues,
      lostDues,
      occupancy,
      adr: adrNet,
      revpar,
      highLossFlag,
    },
  });

  const roomsAvailable = totalRoom;
  const roomsSold = roomSold;
  const roomRevenue = total;
  const totalRevenue = total;
  const occPct = roomsAvailable > 0 ? (roomsSold / roomsAvailable) * 100 : 0;
  const adrValue = roomsSold > 0 ? (total - lostDues) / roomsSold : 0;
  const revparValue = roomsAvailable > 0 ? (total - lostDues) / roomsAvailable : 0;

  await prisma.hotelKpiDaily.upsert({
    where: {
      hotelId_date: { hotelId, date },
    },
    update: {
      roomsSold,
      roomsAvailable,
      occupancyPct: occPct,
      roomRevenue,
      adr: adrValue,
      revpar: revparValue,
      totalRevenue,
      otherRevenue: 0,
      ventureId: property.ventureId,
    },
    create: {
      hotelId,
      date,
      ventureId: property.ventureId,
      roomsSold,
      roomsAvailable,
      occupancyPct: occPct,
      roomRevenue,
      adr: adrValue,
      revpar: revparValue,
      totalRevenue,
      otherRevenue: 0,
    },
  });
}

async function importFreightKpi(record: Record<string, unknown>) {
  const ventureId = record.ventureId as number;
  const date = record.date as Date;

  if (!ventureId || !date) {
    throw new Error('ventureId and date are required');
  }

  await prisma.freightKpiDaily.upsert({
    where: {
      ventureId_date: {
        ventureId,
        date,
      },
    },
    update: {
      loadsInbound: (record.loadsInbound as number) || undefined,
      loadsQuoted: (record.totalLoads as number) || (record.loadsQuoted as number) || undefined,
      loadsCovered: (record.coveredLoads as number) || (record.loadsCovered as number) || undefined,
      loadsLost: (record.loadsLost as number) || undefined,
      totalRevenue: (record.revenue as number) || (record.totalRevenue as number) || undefined,
      totalCost: (record.cost as number) || (record.totalCost as number) || undefined,
      totalProfit: (record.margin as number) || (record.totalProfit as number) || undefined,
      avgMarginPct: (record.marginPercent as number) || (record.avgMarginPct as number) || undefined,
      activeShippers: (record.activeShippers as number) || undefined,
      newShippers: (record.newShippers as number) || undefined,
      churnedShippers: (record.churnedShippers as number) || undefined,
      reactivatedShippers: (record.reactivatedShippers as number) || undefined,
      atRiskShippers: (record.atRiskShippers as number) || undefined,
      activeCarriers: (record.activeCarriers as number) || undefined,
      newCarriers: (record.newCarriers as number) || undefined,
    },
    create: {
      ventureId,
      date,
      loadsInbound: (record.loadsInbound as number) || 0,
      loadsQuoted: (record.totalLoads as number) || (record.loadsQuoted as number) || 0,
      loadsCovered: (record.coveredLoads as number) || (record.loadsCovered as number) || 0,
      loadsLost: (record.loadsLost as number) || 0,
      totalRevenue: (record.revenue as number) || (record.totalRevenue as number) || 0,
      totalCost: (record.cost as number) || (record.totalCost as number) || 0,
      totalProfit: (record.margin as number) || (record.totalProfit as number) || 0,
      avgMarginPct: (record.marginPercent as number) || (record.avgMarginPct as number) || 0,
      activeShippers: (record.activeShippers as number) || 0,
      newShippers: (record.newShippers as number) || 0,
      churnedShippers: (record.churnedShippers as number) || 0,
      reactivatedShippers: (record.reactivatedShippers as number) || 0,
      atRiskShippers: (record.atRiskShippers as number) || 0,
      activeCarriers: (record.activeCarriers as number) || 0,
      newCarriers: (record.newCarriers as number) || 0,
    },
  });
}

async function importHotelDispute(record: Record<string, unknown>, userId: number) {
  const propertyId = record.propertyId as number;
  const type = (record.type as string) || 'CHARGEBACK';
  const rawChannel = (record.channel as string) || 'OTHER';
  
  const channelMap: Record<string, string> = {
    'DIRECT': 'DIRECT_GUEST',
    'BOOKING': 'OTA',
    'BOOKING_COM': 'OTA',
    'BOOKING.COM': 'OTA',
    'EXPEDIA': 'OTA',
    'AIRBNB': 'OTA',
    'HOTELS_COM': 'OTA',
    'HOTELS.COM': 'OTA',
    'VRBO': 'OTA',
    'OTHER_OTA': 'OTA',
    'CREDIT_CARD': 'CREDIT_CARD_PROCESSOR',
    'CC': 'CREDIT_CARD_PROCESSOR',
    'VISA': 'CREDIT_CARD_PROCESSOR',
    'MASTERCARD': 'CREDIT_CARD_PROCESSOR',
    'AMEX': 'CREDIT_CARD_PROCESSOR',
  };
  const channel = channelMap[rawChannel] || rawChannel;

  if (!propertyId) throw new Error('propertyId is required');

  await prisma.hotelDispute.create({
    data: {
      propertyId,
      type: type as 'CHARGEBACK' | 'OTA_DISPUTE' | 'RATE_DISCREPANCY' | 'GUEST_COMPLAINT',
      channel: channel as 'OTA' | 'CREDIT_CARD_PROCESSOR' | 'BANK' | 'DIRECT_GUEST' | 'CORPORATE' | 'OTHER',
      disputedAmount: (record.disputedAmount as number) || 0,
      originalAmount: record.originalAmount as number | undefined,
      reservationId: record.reservationId as string | undefined,
      folioNumber: record.folioNumber as string | undefined,
      guestName: record.guestName as string | undefined,
      guestEmail: record.guestEmail as string | undefined,
      guestPhone: record.guestPhone as string | undefined,
      postedDate: record.postedDate as Date | undefined,
      stayFrom: record.stayFrom as Date | undefined,
      stayTo: record.stayTo as Date | undefined,
      reason: record.reason as string | undefined,
      evidenceDueDate: record.evidenceDueDate as Date | undefined,
      createdById: userId,
    },
  });
}

async function importHotelReview(record: Record<string, unknown>) {
  const hotelId = (record.propertyId as number) || (record.hotelId as number);
  const rating = record.rating as number;
  const rawSource = (record.source as string) || 'OTHER';
  const source = rawSource as 'GOOGLE' | 'TRIPADVISOR' | 'BOOKING' | 'EXPEDIA' | 'OTHER';

  if (!hotelId) throw new Error('hotelId/propertyId is required');

  await prisma.hotelReview.create({
    data: {
      hotelId,
      rating: rating || 0,
      source,
      reviewerName: (record.guestName as string) || (record.reviewerName as string) || undefined,
      reviewDate: record.reviewDate as Date || new Date(),
      title: record.title as string | undefined,
      comment: (record.reviewText as string) || (record.comment as string) || undefined,
      responseText: record.responseText as string | undefined,
    },
  });
}

async function importBpoMetric(record: Record<string, unknown>) {
  const campaignId = record.campaignId as number;
  const date = record.date as Date;

  if (!campaignId || !date) {
    throw new Error('campaignId and date are required');
  }

  await prisma.bpoDailyMetric.upsert({
    where: {
      campaignId_date: {
        campaignId,
        date,
      },
    },
    update: {
      outboundCalls: (record.outboundCalls as number) || undefined,
      handledCalls: (record.inboundCalls as number) || (record.handledCalls as number) || undefined,
      talkTimeMin: (record.talkTimeMin as number) || undefined,
      leadsCreated: (record.leads as number) || (record.leadsCreated as number) || undefined,
      demosBooked: (record.demos as number) || (record.demosBooked as number) || undefined,
      salesClosed: (record.sales as number) || (record.salesClosed as number) || undefined,
      fteCount: (record.fteCount as number) || undefined,
      revenue: (record.revenue as number) || undefined,
      cost: (record.cost as number) || undefined,
      avgQaScore: (record.qaScore as number) || (record.avgQaScore as number) || undefined,
    },
    create: {
      campaignId,
      date,
      outboundCalls: (record.outboundCalls as number) || 0,
      handledCalls: (record.inboundCalls as number) || (record.handledCalls as number) || 0,
      talkTimeMin: (record.talkTimeMin as number) || undefined,
      leadsCreated: (record.leads as number) || (record.leadsCreated as number) || 0,
      demosBooked: (record.demos as number) || (record.demosBooked as number) || 0,
      salesClosed: (record.sales as number) || (record.salesClosed as number) || 0,
      fteCount: (record.fteCount as number) || undefined,
      revenue: (record.revenue as number) || 0,
      cost: (record.cost as number) || 0,
      avgQaScore: (record.qaScore as number) || (record.avgQaScore as number) || undefined,
    },
  });
}
