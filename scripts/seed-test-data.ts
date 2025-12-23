import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CONFIG = {
  NUM_CARRIERS: 500,
  NUM_SHIPPERS: 200,
  NUM_LOADS: 1000,
  DAYS_OF_HISTORY: 365,
};

const CARRIER_PREFIXES = ['Swift', 'Knight', 'Werner', 'Schneider', 'JB', 'Prime', 'Heartland', 'USA', 'Central', 'Midwest'];
const CARRIER_SUFFIXES = ['Transport', 'Trucking', 'Freight', 'Logistics', 'Carriers'];
const SHIPPER_INDUSTRIES = ['Retail', 'Manufacturing', 'Food', 'Automotive', 'Electronics'];
const SHIPPER_SUFFIXES = ['Distribution', 'Supply', 'Warehouse', 'Logistics', 'Corp'];

const CARRIER_REGIONS = [
  { city: 'Atlanta', state: 'GA' },
  { city: 'Dallas', state: 'TX' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Miami', state: 'FL' },
];

const LANES = [
  { origin: 'Atlanta', originState: 'GA', dest: 'Chicago', destState: 'IL', miles: 720 },
  { origin: 'Dallas', originState: 'TX', dest: 'Houston', destState: 'TX', miles: 240 },
  { origin: 'Miami', originState: 'FL', dest: 'Orlando', destState: 'FL', miles: 235 },
  { origin: 'Los Angeles', originState: 'CA', dest: 'Phoenix', destState: 'AZ', miles: 370 },
  { origin: 'Chicago', originState: 'IL', dest: 'Detroit', destState: 'MI', miles: 280 },
];

const randomItem = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number): number => Math.random() * (max - min) + min;

async function seed() {
  console.log('Checking for existing test ventures...');
  const existing = await prisma.venture.findFirst({ where: { isTest: true } });
  if (existing) {
    console.log('Test venture already exists. Deleting first...');
    await prisma.venture.deleteMany({ where: { isTest: true } });
  }
  
  console.log('Creating test ventures...');
  const [logisticsVenture, hotelVenture, bpoVenture] = await Promise.all([
    prisma.venture.create({ data: { name: 'Test Siox Logistics', code: 'TSIOX', type: 'LOGISTICS', logisticsRole: 'BROKER', isTest: true, isActive: true } }),
    prisma.venture.create({ data: { name: 'Test Harbor Hotels', code: 'THHG', type: 'HOSPITALITY', isTest: true, isActive: true } }),
    prisma.venture.create({ data: { name: 'Test RevenelX BPO', code: 'TRVX', type: 'BPO', isTest: true, isActive: true } }),
  ]);
  
  console.log('Creating offices...');
  const offices = await Promise.all([
    prisma.office.create({ data: { name: 'Test Atlanta HQ', city: 'Atlanta', ventureId: logisticsVenture.id, isTest: true, isActive: true } }),
    prisma.office.create({ data: { name: 'Test Dallas Branch', city: 'Dallas', ventureId: logisticsVenture.id, isTest: true, isActive: true } }),
  ]);
  
  console.log(`Creating ${CONFIG.NUM_CARRIERS} carriers...`);
  const carrierData = Array.from({ length: CONFIG.NUM_CARRIERS }, (_, i) => {
    const region = CARRIER_REGIONS[i % CARRIER_REGIONS.length];
    return {
      name: `${randomItem(CARRIER_PREFIXES)} ${randomItem(CARRIER_SUFFIXES)} ${region.city.slice(0,3)}${i+1}`,
      mcNumber: `MC${String(900000 + i).padStart(7, '0')}`,
      dotNumber: `DOT${String(900000 + i).padStart(7, '0')}`,
      phone: `555-${String(randomInt(100,999))}-${String(randomInt(1000,9999))}`,
      email: `dispatch${i+1}@testcarrier.com`,
      city: region.city,
      state: region.state,
      equipmentTypes: randomItem(['Dry Van', 'Reefer', 'Flatbed', 'Dry Van,Reefer'] as const),
      active: true,
    };
  });
  
  await prisma.carrier.createMany({ data: carrierData, skipDuplicates: true });
  const carriers = await prisma.carrier.findMany({ where: { mcNumber: { startsWith: 'MC9' } }, take: CONFIG.NUM_CARRIERS });
  console.log(`Created ${carriers.length} carriers`);
  
  console.log(`Creating ${CONFIG.NUM_SHIPPERS} shippers...`);
  const today = new Date();
  const shipperData = Array.from({ length: CONFIG.NUM_SHIPPERS }, (_, i) => {
    const region = CARRIER_REGIONS[i % CARRIER_REGIONS.length];
    return {
      name: `${randomItem(SHIPPER_INDUSTRIES)} ${randomItem(SHIPPER_SUFFIXES)} ${i+1}`,
      tmsShipperCode: `TST${String(i+1).padStart(5, '0')}`,
      internalCode: `TSHIP${i+1}`,
      ventureId: logisticsVenture.id,
      email: `shipping${i+1}@testshipper.com`,
      phone: `555-${String(randomInt(100,999))}-${String(randomInt(1000,9999))}`,
      city: region.city,
      state: region.state,
      churnStatus: 'ACTIVE' as const,
      isTest: true,
    };
  });
  
  await prisma.logisticsShipper.createMany({ data: shipperData, skipDuplicates: true });
  const shippers = await prisma.logisticsShipper.findMany({ where: { isTest: true }, take: CONFIG.NUM_SHIPPERS });
  console.log(`Created ${shippers.length} shippers`);
  
  console.log(`Creating ${CONFIG.NUM_LOADS} loads...`);
  const loadStatuses = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'COVERED', 'AT_RISK', 'LOST'] as const;
  const equipmentTypes = ['Dry Van', 'Reefer', 'Flatbed'] as const;
  
  const loadData = Array.from({ length: CONFIG.NUM_LOADS }, (_, i) => {
    const lane = LANES[i % LANES.length];
    const daysAgo = randomInt(1, CONFIG.DAYS_OF_HISTORY);
    const pickupDate = new Date(today);
    pickupDate.setDate(pickupDate.getDate() - daysAgo);
    
    const billAmount = randomInt(1200, 8000);
    const marginPct = randomFloat(0.10, 0.25);
    const costAmount = Math.round(billAmount * (1 - marginPct));
    const status = randomItem(loadStatuses);
    
    const dropDate = new Date(pickupDate);
    dropDate.setDate(dropDate.getDate() + randomInt(1, 3));
    
    return {
      reference: `TST-${lane.origin.slice(0,3).toUpperCase()}-${String(i+1).padStart(5, '0')}`,
      ventureId: logisticsVenture.id,
      officeId: offices[i % offices.length].id,
      shipperId: shippers[i % shippers.length].id,
      carrierId: carriers[i % carriers.length].id,
      pickupCity: lane.origin,
      pickupState: lane.originState,
      pickupDate,
      dropCity: lane.dest,
      dropState: lane.destState,
      dropDate,
      billAmount,
      costAmount,
      marginAmount: billAmount - costAmount,
      marginPercentage: marginPct * 100,
      loadStatus: status,
      atRiskFlag: status === 'AT_RISK',
      lostAt: status === 'LOST' ? pickupDate : null,
      equipmentType: randomItem(equipmentTypes),
      weightLbs: randomInt(10000, 45000),
      miles: lane.miles + randomInt(-50, 50),
      isTest: true,
      createdAt: pickupDate,
    };
  });
  
  await prisma.load.createMany({ data: loadData, skipDuplicates: true });
  console.log('Created loads');
  
  console.log('Test data seeding complete!');
  console.log({
    ventures: 3,
    offices: offices.length,
    carriers: carriers.length,
    shippers: shippers.length,
    loads: CONFIG.NUM_LOADS,
  });
}

seed()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
