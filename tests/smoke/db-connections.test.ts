import { describe, test, expect } from '@jest/globals';
import prisma from '../../lib/prisma';

describe('Database Connection Smoke Tests', () => {
  test('Prisma client connects to database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    expect(result).toBeDefined();
  });

  test('Load model is queryable', async () => {
    const count = await prisma.load.count();
    expect(typeof count).toBe('number');
  });

  test('FreightQuote model is queryable', async () => {
    const count = await prisma.freightQuote.count();
    expect(typeof count).toBe('number');
  });

  test('Carrier model is queryable', async () => {
    const count = await prisma.carrier.count();
    expect(typeof count).toBe('number');
  });

  test('Customer model is queryable', async () => {
    const count = await prisma.customer.count();
    expect(typeof count).toBe('number');
  });

  test('LogisticsShipper model is queryable', async () => {
    const count = await prisma.logisticsShipper.count();
    expect(typeof count).toBe('number');
  });

  test('OutreachMessage model is queryable', async () => {
    const count = await prisma.outreachMessage.count();
    expect(typeof count).toBe('number');
  });

  test('LogisticsLoadEvent model is queryable', async () => {
    const count = await prisma.logisticsLoadEvent.count();
    expect(typeof count).toBe('number');
  });

  test('LostLoadReason model is queryable', async () => {
    const count = await prisma.lostLoadReason.count();
    expect(typeof count).toBe('number');
  });

  test('LoadStatus enum values match schema', async () => {
    const validStatuses = [
      'OPEN', 'WORKING', 'COVERED', 'AT_RISK', 'FELL_OFF',
      'LOST', 'DELIVERED', 'DORMANT', 'MAYBE', 'MOVED'
    ];
    
    const loadsWithStatus = await prisma.load.findMany({
      take: 100,
      select: { loadStatus: true },
    });
    
    for (const load of loadsWithStatus) {
      expect(validStatuses).toContain(load.loadStatus);
    }
  });

  test('FreightQuoteStatus enum values match schema', async () => {
    const validStatuses = [
      'DRAFT', 'SENT', 'NO_RESPONSE', 'REJECTED', 
      'COUNTERED', 'ACCEPTED', 'BOOKED', 'EXPIRED'
    ];
    
    const quotesWithStatus = await prisma.freightQuote.findMany({
      take: 100,
      select: { status: true },
    });
    
    for (const quote of quotesWithStatus) {
      expect(validStatuses).toContain(quote.status);
    }
  });
});

describe('Foreign Key Relationship Tests', () => {
  test('Load → Customer relationship is valid', async () => {
    const loadsWithCustomer = await prisma.load.findMany({
      where: { customerId: { not: null } },
      take: 10,
      include: { customer: true },
    });
    
    for (const load of loadsWithCustomer) {
      if (load.customerId) {
        expect(load.customer).toBeDefined();
        expect(load.customer?.id).toBe(load.customerId);
      }
    }
  });

  test('Load → Carrier relationship is valid', async () => {
    const loadsWithCarrier = await prisma.load.findMany({
      where: { carrierId: { not: null } },
      take: 10,
      include: { carrier: true },
    });
    
    for (const load of loadsWithCarrier) {
      if (load.carrierId) {
        expect(load.carrier).toBeDefined();
        expect(load.carrier?.id).toBe(load.carrierId);
      }
    }
  });

  test('FreightQuote → Load relationship is valid', async () => {
    const quotesWithLoad = await prisma.freightQuote.findMany({
      where: { loadId: { not: null } },
      take: 10,
      include: { load: true },
    });
    
    for (const quote of quotesWithLoad) {
      if (quote.loadId) {
        expect(quote.load).toBeDefined();
        expect(quote.load?.id).toBe(quote.loadId);
      }
    }
  });

  test('LogisticsLoadEvent → Load relationship is valid', async () => {
    const events = await prisma.logisticsLoadEvent.findMany({
      take: 10,
      include: { load: true },
    });
    
    for (const event of events) {
      expect(event.load).toBeDefined();
      expect(event.load.id).toBe(event.loadId);
    }
  });
});
