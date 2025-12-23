import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';

const CONFIG = {
  NUM_CARRIERS: 2000,
  NUM_SHIPPERS: 1000,
  NUM_LOADS: 10000,
  NUM_HOTEL_PROPERTIES: 10,
  NUM_BPO_CAMPAIGNS: 5,
  DAYS_OF_HISTORY: 730,
  BATCH_SIZE: 500,
};

const CARRIER_PREFIXES = ["Swift", "Knight", "Werner", "Schneider", "JB", "Prime", "Heartland", "USA", "Central", "Midwest", "Southern", "Northern", "Pacific", "Atlantic", "Mountain", "Valley", "Eagle", "Star", "Fast", "Express", "National", "Interstate", "Continental", "Global", "Regional", "Metro", "Frontier", "Pioneer", "Liberty", "Victory"];
const CARRIER_SUFFIXES = ["Transport", "Trucking", "Freight", "Logistics", "Carriers", "Lines", "Express", "Hauling", "Transit", "Delivery", "Shipping", "Moving", "Distribution", "Services", "Solutions"];
const SHIPPER_INDUSTRIES = ["Retail", "Manufacturing", "Food & Beverage", "Automotive", "Electronics", "Pharmaceuticals", "Construction", "Agriculture", "Chemical", "Paper", "Packaging", "Textiles", "Metals", "Plastics", "Consumer Goods", "Healthcare", "Technology", "Energy", "Mining", "Aerospace"];
const SHIPPER_SUFFIXES = ["Distribution", "Supply", "Warehouse", "Logistics", "Corp", "Inc", "LLC", "Industries", "Products", "Materials", "Enterprises", "Solutions", "Group", "Holdings", "Partners"];

const CARRIER_REGIONS = [
  { city: 'Atlanta', state: 'GA', region: 'Southeast' },
  { city: 'Dallas', state: 'TX', region: 'Southwest' },
  { city: 'Houston', state: 'TX', region: 'Southwest' },
  { city: 'Chicago', state: 'IL', region: 'Midwest' },
  { city: 'Indianapolis', state: 'IN', region: 'Midwest' },
  { city: 'Detroit', state: 'MI', region: 'Midwest' },
  { city: 'Los Angeles', state: 'CA', region: 'West' },
  { city: 'Phoenix', state: 'AZ', region: 'West' },
  { city: 'Denver', state: 'CO', region: 'Mountain' },
  { city: 'Salt Lake City', state: 'UT', region: 'Mountain' },
  { city: 'Miami', state: 'FL', region: 'Southeast' },
  { city: 'Jacksonville', state: 'FL', region: 'Southeast' },
  { city: 'Charlotte', state: 'NC', region: 'Southeast' },
  { city: 'Nashville', state: 'TN', region: 'Southeast' },
  { city: 'Memphis', state: 'TN', region: 'Southeast' },
  { city: 'Kansas City', state: 'MO', region: 'Midwest' },
  { city: 'Minneapolis', state: 'MN', region: 'Midwest' },
  { city: 'Seattle', state: 'WA', region: 'Northwest' },
  { city: 'Portland', state: 'OR', region: 'Northwest' },
  { city: 'New York', state: 'NY', region: 'Northeast' },
  { city: 'Philadelphia', state: 'PA', region: 'Northeast' },
  { city: 'Boston', state: 'MA', region: 'Northeast' },
  { city: 'Baltimore', state: 'MD', region: 'Northeast' },
];

const LANES = [
  { origin: 'Atlanta', originState: 'GA', dest: 'Chicago', destState: 'IL', miles: 720 },
  { origin: 'Dallas', originState: 'TX', dest: 'Houston', destState: 'TX', miles: 240 },
  { origin: 'Miami', originState: 'FL', dest: 'Orlando', destState: 'FL', miles: 235 },
  { origin: 'Los Angeles', originState: 'CA', dest: 'Phoenix', destState: 'AZ', miles: 370 },
  { origin: 'Seattle', originState: 'WA', dest: 'Portland', destState: 'OR', miles: 175 },
  { origin: 'Denver', originState: 'CO', dest: 'Salt Lake City', destState: 'UT', miles: 525 },
  { origin: 'New York', originState: 'NY', dest: 'Philadelphia', destState: 'PA', miles: 95 },
  { origin: 'Detroit', originState: 'MI', dest: 'Cleveland', destState: 'OH', miles: 170 },
  { origin: 'Minneapolis', originState: 'MN', dest: 'Milwaukee', destState: 'WI', miles: 340 },
  { origin: 'Nashville', originState: 'TN', dest: 'Memphis', destState: 'TN', miles: 210 },
  { origin: 'Boston', originState: 'MA', dest: 'Hartford', destState: 'CT', miles: 100 },
  { origin: 'San Francisco', originState: 'CA', dest: 'Sacramento', destState: 'CA', miles: 90 },
  { origin: 'Las Vegas', originState: 'NV', dest: 'Los Angeles', destState: 'CA', miles: 270 },
  { origin: 'Kansas City', originState: 'MO', dest: 'St. Louis', destState: 'MO', miles: 250 },
  { origin: 'Indianapolis', originState: 'IN', dest: 'Columbus', destState: 'OH', miles: 175 },
  { origin: 'Charlotte', originState: 'NC', dest: 'Raleigh', destState: 'NC', miles: 170 },
  { origin: 'Tampa', originState: 'FL', dest: 'Jacksonville', destState: 'FL', miles: 200 },
  { origin: 'Austin', originState: 'TX', dest: 'San Antonio', destState: 'TX', miles: 80 },
  { origin: 'Phoenix', originState: 'AZ', dest: 'Tucson', destState: 'AZ', miles: 115 },
  { origin: 'Baltimore', originState: 'MD', dest: 'Washington', destState: 'DC', miles: 40 },
  { origin: 'Atlanta', originState: 'GA', dest: 'Miami', destState: 'FL', miles: 660 },
  { origin: 'Chicago', originState: 'IL', dest: 'Dallas', destState: 'TX', miles: 920 },
  { origin: 'Los Angeles', originState: 'CA', dest: 'Denver', destState: 'CO', miles: 1020 },
  { origin: 'Seattle', originState: 'WA', dest: 'Los Angeles', destState: 'CA', miles: 1140 },
  { origin: 'New York', originState: 'NY', dest: 'Chicago', destState: 'IL', miles: 790 },
];

const randomItem = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number): number => Math.random() * (max - min) + min;

const getSeasonalMultiplier = (date: Date): number => {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 1.1;
  if (month >= 5 && month <= 7) return 0.95;
  if (month >= 8 && month <= 10) return 1.15;
  return 0.85;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Disabled in production" });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const existingTestVenture = await prisma.venture.findFirst({
      where: { isTest: true },
    });

    if (existingTestVenture) {
      return res.status(200).json({ 
        seeded: false, 
        message: 'Test data already exists',
        hasData: true 
      });
    }

    console.log('Starting 2-year test data seeding...');

    const testVentures = await Promise.all([
      prisma.venture.create({
        data: { 
          name: 'Test Siox Logistics', 
          code: 'SIOX',
          type: 'LOGISTICS', 
          logisticsRole: 'BROKER',
          isTest: true, 
          isActive: true 
        },
      }),
      prisma.venture.create({
        data: { 
          name: 'Test Harbor Hotels', 
          code: 'HHG',
          type: 'HOSPITALITY', 
          isTest: true, 
          isActive: true 
        },
      }),
      prisma.venture.create({
        data: { 
          name: 'Test RevenelX BPO', 
          code: 'RVX',
          type: 'BPO', 
          isTest: true, 
          isActive: true 
        },
      }),
      prisma.venture.create({
        data: { 
          name: 'Test CloudStack SaaS', 
          code: 'CSS',
          type: 'SAAS', 
          isTest: true, 
          isActive: true 
        },
      }),
      prisma.venture.create({
        data: { 
          name: 'Test Chokshi Holdings', 
          code: 'CHD',
          type: 'HOLDINGS', 
          isTest: true, 
          isActive: true 
        },
      }),
    ]);

    const [logisticsVenture, hotelVenture, bpoVenture, saasVenture, holdingsVenture] = testVentures;

    const offices = await Promise.all([
      prisma.office.create({ data: { name: 'Atlanta HQ', city: 'Atlanta', ventureId: logisticsVenture.id, isTest: true, isActive: true } }),
      prisma.office.create({ data: { name: 'Dallas Branch', city: 'Dallas', ventureId: logisticsVenture.id, isTest: true, isActive: true } }),
      prisma.office.create({ data: { name: 'Chicago Office', city: 'Chicago', ventureId: logisticsVenture.id, isTest: true, isActive: true } }),
      prisma.office.create({ data: { name: 'LA Office', city: 'Los Angeles', ventureId: logisticsVenture.id, isTest: true, isActive: true } }),
      prisma.office.create({ data: { name: 'Miami Hotels Office', city: 'Miami', ventureId: hotelVenture.id, isTest: true, isActive: true } }),
      prisma.office.create({ data: { name: 'LA Hotels Office', city: 'Los Angeles', ventureId: hotelVenture.id, isTest: true, isActive: true } }),
      prisma.office.create({ data: { name: 'BPO Center Hyderabad', city: 'Hyderabad', ventureId: bpoVenture.id, isTest: true, isActive: true } }),
      prisma.office.create({ data: { name: 'BPO Center Manila', city: 'Manila', ventureId: bpoVenture.id, isTest: true, isActive: true } }),
      prisma.office.create({ data: { name: 'SaaS HQ', city: 'San Francisco', ventureId: saasVenture.id, isTest: true, isActive: true } }),
      prisma.office.create({ data: { name: 'Holdings Office', city: 'New York', ventureId: holdingsVenture.id, isTest: true, isActive: true } }),
    ]);

    const logisticsOffices = offices.filter(o => o.ventureId === logisticsVenture.id);
    const today = new Date();
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    console.log(`Creating ${CONFIG.NUM_CARRIERS} carriers with regional distribution...`);
    const carrierData = Array.from({ length: CONFIG.NUM_CARRIERS }, (_, i) => {
      const region = CARRIER_REGIONS[i % CARRIER_REGIONS.length];
      const createdDaysAgo = randomInt(0, CONFIG.DAYS_OF_HISTORY);
      const createdAt = new Date(today);
      createdAt.setDate(createdAt.getDate() - createdDaysAgo);
      
      return {
        name: `${randomItem(CARRIER_PREFIXES)} ${randomItem(CARRIER_SUFFIXES)} ${region.city.slice(0, 3)}${i + 1}`,
        mcNumber: `MC-${String(100000 + i).padStart(7, '0')}`,
        dotNumber: `DOT-${String(200000 + i).padStart(7, '0')}`,
        phone: `555-${String(randomInt(100, 999))}-${String(randomInt(1000, 9999))}`,
        email: `dispatch${i + 1}@${randomItem(CARRIER_PREFIXES).toLowerCase()}carrier.com`,
        city: region.city,
        state: region.state,
        equipmentTypes: randomItem(['Dry Van', 'Reefer', 'Flatbed', 'Dry Van,Reefer', 'Flatbed,Step Deck', 'Dry Van,Flatbed,Reefer']),
        createdAt,
      };
    });

    for (let i = 0; i < carrierData.length; i += CONFIG.BATCH_SIZE) {
      const batch = carrierData.slice(i, i + CONFIG.BATCH_SIZE);
      await prisma.carrier.createMany({ data: batch, skipDuplicates: true });
    }

    const carriers = await prisma.carrier.findMany({ take: CONFIG.NUM_CARRIERS, orderBy: { id: 'desc' } });
    console.log(`Created ${carriers.length} carriers`);

    console.log(`Creating ${CONFIG.NUM_SHIPPERS} shippers with churn simulation...`);
    const shipperStatuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'AT_RISK', 'CHURNED', 'REACTIVATED', 'NEW'] as const;
    
    const shipperData = Array.from({ length: CONFIG.NUM_SHIPPERS }, (_, i) => {
      const startDaysAgo = randomInt(30, CONFIG.DAYS_OF_HISTORY);
      const firstLoadDate = new Date(today);
      firstLoadDate.setDate(firstLoadDate.getDate() - startDaysAgo);
      
      const status = randomItem(shipperStatuses);
      let lastLoadDate: Date | null = new Date(today);
      
      if (status === 'CHURNED') {
        const churnDaysAgo = randomInt(30, Math.min(startDaysAgo - 30, 365));
        lastLoadDate.setDate(lastLoadDate.getDate() - churnDaysAgo);
      } else if (status === 'AT_RISK') {
        const lastDaysAgo = randomInt(21, 45);
        lastLoadDate.setDate(lastLoadDate.getDate() - lastDaysAgo);
      } else if (status === 'REACTIVATED') {
        const lastDaysAgo = randomInt(1, 14);
        lastLoadDate.setDate(lastLoadDate.getDate() - lastDaysAgo);
      } else {
        const lastDaysAgo = randomInt(0, 20);
        lastLoadDate.setDate(lastLoadDate.getDate() - lastDaysAgo);
      }

      const region = CARRIER_REGIONS[i % CARRIER_REGIONS.length];
      
      return {
        name: `${randomItem(SHIPPER_INDUSTRIES)} ${randomItem(SHIPPER_SUFFIXES)} ${i + 1}`,
        tmsShipperCode: `SHP${String(i + 1).padStart(5, '0')}`,
        internalCode: `SHIP${i + 1}`,
        ventureId: logisticsVenture.id,
        contactName: `Contact Person ${i + 1}`,
        email: `shipping${i + 1}@${randomItem(SHIPPER_INDUSTRIES).toLowerCase().replace(/\s+/g, '')}.com`,
        phone: `555-${String(randomInt(100, 999))}-${String(randomInt(1000, 9999))}`,
        city: region.city,
        state: region.state,
        churnStatus: status,
        lastLoadDate,
        createdAt: firstLoadDate,
        isTest: true,
      };
    });

    for (let i = 0; i < shipperData.length; i += CONFIG.BATCH_SIZE) {
      const batch = shipperData.slice(i, i + CONFIG.BATCH_SIZE);
      await prisma.logisticsShipper.createMany({ data: batch, skipDuplicates: true });
    }

    const shippers = await prisma.logisticsShipper.findMany({ 
      where: { ventureId: logisticsVenture.id }, 
      take: CONFIG.NUM_SHIPPERS, 
      orderBy: { id: 'desc' } 
    });
    console.log(`Created ${shippers.length} shippers`);

    console.log(`Creating ${CONFIG.NUM_LOADS} freight loads spread over 2 years...`);
    const loadStatuses = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'COVERED', 'COVERED', 'AT_RISK', 'LOST', 'FELL_OFF'] as const;
    const equipmentTypes = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Power Only'];

    for (let batch = 0; batch < CONFIG.NUM_LOADS; batch += CONFIG.BATCH_SIZE) {
      const batchSize = Math.min(CONFIG.BATCH_SIZE, CONFIG.NUM_LOADS - batch);
      const loadBatch = Array.from({ length: batchSize }, (_, i) => {
        const idx = batch + i;
        const lane = LANES[idx % LANES.length];
        
        const daysAgo = randomInt(1, CONFIG.DAYS_OF_HISTORY);
        const pickupDate = new Date(today);
        pickupDate.setDate(pickupDate.getDate() - daysAgo);
        
        const seasonalMult = getSeasonalMultiplier(pickupDate);
        const baseBillAmount = randomInt(1200, 8000);
        const billAmount = Math.round(baseBillAmount * seasonalMult);
        
        const marginVariation = randomFloat(-0.05, 0.08);
        const baseMargin = 0.15;
        const marginPct = Math.max(0.05, Math.min(0.35, baseMargin + marginVariation));
        const costAmount = Math.round(billAmount * (1 - marginPct));
        
        const status = randomItem(loadStatuses);
        const dropDate = new Date(pickupDate);
        dropDate.setDate(dropDate.getDate() + randomInt(1, 4));

        const shipper = shippers[idx % shippers.length];
        const carrier = carriers[idx % carriers.length];

        return {
          reference: `TST-${lane.origin.slice(0, 3).toUpperCase()}-${pickupDate.getFullYear()}${String(pickupDate.getMonth() + 1).padStart(2, '0')}-${String(idx + 1).padStart(5, '0')}`,
          ventureId: logisticsVenture.id,
          officeId: randomItem(logisticsOffices).id,
          shipperId: shipper.id,
          carrierId: carrier.id,
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

      await prisma.load.createMany({ data: loadBatch, skipDuplicates: true });
      
      if ((batch + CONFIG.BATCH_SIZE) % 2000 === 0) {
        console.log(`  ${Math.min(batch + CONFIG.BATCH_SIZE, CONFIG.NUM_LOADS)}/${CONFIG.NUM_LOADS} loads created`);
      }
    }

    console.log(`Created ${CONFIG.NUM_LOADS} loads`);

    console.log('Creating hotel properties with 2-year KPI history...');
    const hotelCities = ['Miami', 'Orlando', 'Tampa', 'Los Angeles', 'San Diego', 'Las Vegas', 'Phoenix', 'Denver', 'Atlanta', 'Dallas'];
    const hotelBrands = ['Harbor', 'Coastal', 'Summit', 'Grand', 'Royal'];
    const hotelTypes = ['Inn', 'Suites', 'Resort', 'Hotel', 'Plaza'];

    const hotelProperties = await Promise.all(
      Array.from({ length: CONFIG.NUM_HOTEL_PROPERTIES }, (_, i) => 
        prisma.hotelProperty.create({
          data: {
            name: `${randomItem(hotelBrands)} ${randomItem(hotelTypes)} ${hotelCities[i]}`,
            code: `${hotelCities[i].slice(0, 3).toUpperCase()}${i + 1}`,
            ventureId: hotelVenture.id,
            city: hotelCities[i],
            state: randomItem(['FL', 'CA', 'NV', 'AZ', 'CO', 'GA', 'TX']),
            rooms: randomInt(80, 250),
          },
        })
      )
    );

    const hotelKpiData: any[] = [];
    for (const property of hotelProperties) {
      for (let dayOffset = 0; dayOffset < CONFIG.DAYS_OF_HISTORY; dayOffset++) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const seasonMult = getSeasonalMultiplier(date);
        const weekendMult = isWeekend ? 1.2 : 1.0;
        
        const totalRooms = property.rooms || 100;
        const baseOccupancy = randomFloat(0.50, 0.85);
        const occupancy = Math.min(0.99, baseOccupancy * seasonMult * weekendMult);
        const roomsSold = Math.round(totalRooms * occupancy);
        
        const baseAdr = randomFloat(89, 199);
        const adr = baseAdr * seasonMult * (isWeekend ? 1.15 : 1.0);
        const roomRevenue = roomsSold * adr;
        const revpar = roomRevenue / totalRooms;

        hotelKpiData.push({
          hotelId: property.id,
          ventureId: hotelVenture.id,
          date,
          roomsAvailable: totalRooms,
          roomsSold,
          occupancyPct: occupancy * 100,
          roomRevenue,
          adr,
          revpar,
          totalRevenue: roomRevenue * 1.18,
          otherRevenue: roomRevenue * 0.18,
          grossOperatingProfit: roomRevenue * randomFloat(0.28, 0.48),
          goppar: (roomRevenue * randomFloat(0.28, 0.48)) / totalRooms,
          cancellations: randomInt(0, Math.ceil(roomsSold * 0.05)),
          noShows: randomInt(0, Math.ceil(roomsSold * 0.02)),
          walkins: randomInt(0, Math.ceil(totalRooms * 0.08)),
          complaints: randomInt(0, 3),
        });
      }
    }

    console.log(`Inserting ${hotelKpiData.length} hotel KPI records...`);
    for (let i = 0; i < hotelKpiData.length; i += CONFIG.BATCH_SIZE) {
      const batch = hotelKpiData.slice(i, i + CONFIG.BATCH_SIZE);
      await prisma.hotelKpiDaily.createMany({ data: batch, skipDuplicates: true });
    }

    console.log('Creating BPO campaigns with 2-year metrics...');
    const bpoCampaigns = await Promise.all(
      Array.from({ length: CONFIG.NUM_BPO_CAMPAIGNS }, (_, i) => 
        prisma.bpoCampaign.create({
          data: {
            name: `Test Campaign ${['Lead Gen', 'Customer Support', 'Sales', 'Retention', 'Surveys'][i]}`,
            ventureId: bpoVenture.id,
            clientName: `Enterprise Client ${i + 1}`,
            isActive: i < 4,
          },
        })
      )
    );

    const bpoMetricData: any[] = [];
    for (const campaign of bpoCampaigns) {
      for (let dayOffset = 0; dayOffset < CONFIG.DAYS_OF_HISTORY; dayOffset++) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        
        const isWeekday = date.getDay() !== 0 && date.getDay() !== 6;
        if (!isWeekday && Math.random() < 0.7) continue;
        
        const growthFactor = 1 + ((CONFIG.DAYS_OF_HISTORY - dayOffset) / CONFIG.DAYS_OF_HISTORY) * 0.3;
        
        bpoMetricData.push({
          campaignId: campaign.id,
          date,
          outboundCalls: Math.round(randomInt(180, 550) * growthFactor),
          handledCalls: Math.round(randomInt(140, 420) * growthFactor),
          talkTimeMin: Math.round(randomInt(550, 1600) * growthFactor),
          leadsCreated: Math.round(randomInt(12, 70) * growthFactor),
          demosBooked: Math.round(randomInt(4, 22) * growthFactor),
          salesClosed: Math.round(randomInt(1, 12) * growthFactor),
          fteCount: randomFloat(5, 14),
          avgQaScore: randomFloat(80, 98),
          revenue: randomFloat(4000, 22000) * growthFactor,
          cost: randomFloat(2500, 13000) * growthFactor,
          isTest: true,
        });
      }
    }

    console.log(`Inserting ${bpoMetricData.length} BPO metric records...`);
    for (let i = 0; i < bpoMetricData.length; i += CONFIG.BATCH_SIZE) {
      const batch = bpoMetricData.slice(i, i + CONFIG.BATCH_SIZE);
      await prisma.bpoDailyMetric.createMany({ data: batch, skipDuplicates: true });
    }

    console.log('Creating sample tasks across ventures...');
    await prisma.task.createMany({
      data: [
        { title: 'Test: Review carrier rates for Chicago lane', status: 'OPEN', priority: 'HIGH', ventureId: logisticsVenture.id, officeId: logisticsOffices[0].id, isTest: true },
        { title: 'Test: Follow up with at-risk shipper', status: 'IN_PROGRESS', priority: 'CRITICAL', ventureId: logisticsVenture.id, officeId: logisticsOffices[0].id, isTest: true },
        { title: 'Test: Negotiate rates with carrier pool', status: 'OPEN', priority: 'MEDIUM', ventureId: logisticsVenture.id, officeId: logisticsOffices[1].id, isTest: true },
        { title: 'Test: Weekly margin analysis', status: 'DONE', priority: 'LOW', ventureId: logisticsVenture.id, officeId: logisticsOffices[0].id, isTest: true },
        { title: 'Test: Carrier compliance audit', status: 'OPEN', priority: 'HIGH', ventureId: logisticsVenture.id, officeId: logisticsOffices[2].id, isTest: true },
        { title: 'Test: Shipper churn prevention outreach', status: 'IN_PROGRESS', priority: 'CRITICAL', ventureId: logisticsVenture.id, officeId: logisticsOffices[0].id, isTest: true },
        { title: 'Test: Check Miami hotel occupancy trends', status: 'OPEN', priority: 'HIGH', ventureId: hotelVenture.id, officeId: offices[4].id, isTest: true },
        { title: 'Test: Review guest complaints', status: 'IN_PROGRESS', priority: 'CRITICAL', ventureId: hotelVenture.id, officeId: offices[4].id, isTest: true },
        { title: 'Test: OTA rate parity audit', status: 'OPEN', priority: 'MEDIUM', ventureId: hotelVenture.id, officeId: offices[5].id, isTest: true },
        { title: 'Test: Quarterly revenue report', status: 'DONE', priority: 'MEDIUM', ventureId: hotelVenture.id, officeId: offices[4].id, isTest: true },
        { title: 'Test: QA score improvement plan', status: 'OPEN', priority: 'HIGH', ventureId: bpoVenture.id, officeId: offices[6].id, isTest: true },
        { title: 'Test: Agent training session', status: 'IN_PROGRESS', priority: 'MEDIUM', ventureId: bpoVenture.id, officeId: offices[6].id, isTest: true },
        { title: 'Test: Campaign performance review', status: 'OPEN', priority: 'HIGH', ventureId: bpoVenture.id, officeId: offices[7].id, isTest: true },
        { title: 'Test: Update SaaS pricing tiers', status: 'OPEN', priority: 'MEDIUM', ventureId: saasVenture.id, officeId: offices[8].id, isTest: true },
        { title: 'Test: Customer onboarding call', status: 'IN_PROGRESS', priority: 'HIGH', ventureId: saasVenture.id, officeId: offices[8].id, isTest: true },
        { title: 'Test: Review asset valuations', status: 'OPEN', priority: 'HIGH', ventureId: holdingsVenture.id, officeId: offices[9].id, isTest: true },
      ],
      skipDuplicates: true,
    });

    console.log('2-year test data seeding complete!');

    return res.status(200).json({ 
      seeded: true, 
      message: 'Test data created successfully (2 years of history)',
      hasData: true,
      summary: {
        ventures: testVentures.length,
        offices: offices.length,
        carriers: CONFIG.NUM_CARRIERS,
        shippers: CONFIG.NUM_SHIPPERS,
        loads: CONFIG.NUM_LOADS,
        hotels: hotelProperties.length,
        hotelKpiDays: CONFIG.DAYS_OF_HISTORY,
        bpoCampaigns: bpoCampaigns.length,
        bpoMetricDays: CONFIG.DAYS_OF_HISTORY,
        tasks: 16,
        dateRange: `${twoYearsAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`,
      }
    });
  } catch (error) {
    console.error('Auto-seed error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to seed test data' 
    });
  }
}
