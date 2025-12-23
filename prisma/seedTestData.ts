import { PrismaClient, UserRole, VentureType, LogisticsRole, PolicyType, LoadStatus, TaskStatus, TaskPriority, IncentiveCalcType, ReviewSource } from "@prisma/client";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION - Adjust these values for different test volumes
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  // Freight
  NUM_CARRIERS: 500,           // 5X recommended (was 8)
  NUM_SHIPPERS: 150,           // 5X recommended (was 5)
  NUM_LOADS: 2000,             // Realistic 6-12 month volume
  NUM_CUSTOMERS: 50,           // Customer diversity
  
  // Hotel
  NUM_HOTEL_PROPERTIES: 20,    // Realistic portfolio
  
  // BPO
  NUM_BPO_CAMPAIGNS: 15,       // More client diversity
  NUM_CALL_LOGS_PER_AGENT: 150, // ~5000+ total call logs
  
  // Users
  NUM_EMPLOYEES_PER_VENTURE: 6, // More realistic team sizes
  
  // Time range
  DAYS_OF_HISTORY: 60,         // 2 months of historical data
  
  // Tasks & Policies
  NUM_TASKS: 100,
  NUM_POLICIES: 50,
  
  // SaaS
  NUM_SAAS_CUSTOMERS: 25,
  
  // Holdings
  NUM_BANK_ACCOUNTS: 8,
  NUM_HOLDING_ASSETS: 5,
  
  // IT Assets & Incidents
  NUM_IT_ASSETS: 50,
  NUM_IT_INCIDENTS: 30,
};

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number): number => Math.random() * (max - min) + min;
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 86400000);
const subtractDays = (date: Date, days: number): Date => addDays(date, -days);
const today = new Date();

const FIRST_NAMES = ["John", "Sarah", "Mike", "Emily", "David", "Lisa", "James", "Anna", "Robert", "Maria", "Chris", "Jennifer", "Daniel", "Michelle", "Kevin", "Amanda", "Brian", "Nicole", "Steven", "Ashley", "William", "Jessica", "Joseph", "Stephanie", "Thomas", "Lauren", "Charles", "Megan", "Christopher", "Rachel"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

const FREIGHT_LANES = [
  { origin: "Atlanta, GA", dest: "Chicago, IL", miles: 720 },
  { origin: "Dallas, TX", dest: "Houston, TX", miles: 240 },
  { origin: "Los Angeles, CA", dest: "Phoenix, AZ", miles: 370 },
  { origin: "Miami, FL", dest: "Orlando, FL", miles: 235 },
  { origin: "Seattle, WA", dest: "Portland, OR", miles: 175 },
  { origin: "Denver, CO", dest: "Salt Lake City, UT", miles: 525 },
  { origin: "New York, NY", dest: "Philadelphia, PA", miles: 95 },
  { origin: "Detroit, MI", dest: "Cleveland, OH", miles: 170 },
  { origin: "Minneapolis, MN", dest: "Milwaukee, WI", miles: 340 },
  { origin: "Nashville, TN", dest: "Memphis, TN", miles: 210 },
  { origin: "Boston, MA", dest: "Hartford, CT", miles: 100 },
  { origin: "San Francisco, CA", dest: "Sacramento, CA", miles: 90 },
  { origin: "Las Vegas, NV", dest: "Los Angeles, CA", miles: 270 },
  { origin: "Kansas City, MO", dest: "St. Louis, MO", miles: 250 },
  { origin: "Indianapolis, IN", dest: "Columbus, OH", miles: 175 },
  { origin: "Charlotte, NC", dest: "Raleigh, NC", miles: 170 },
  { origin: "Tampa, FL", dest: "Jacksonville, FL", miles: 200 },
  { origin: "Austin, TX", dest: "San Antonio, TX", miles: 80 },
  { origin: "Phoenix, AZ", dest: "Tucson, AZ", miles: 115 },
  { origin: "Baltimore, MD", dest: "Washington, DC", miles: 40 },
];

const HOTEL_BRANDS = ["Marriott", "Hilton", "IHG", "Hyatt", "Wyndham", "Choice", "Best Western"];
const HOTEL_TYPES = ["Inn", "Suites", "Resort", "Hotel", "Plaza", "Lodge", "Express"];
const HOTEL_CITIES = [
  "Miami, FL", "Los Angeles, CA", "Chicago, IL", "New York, NY", "Houston, TX", 
  "Phoenix, AZ", "Dallas, TX", "San Diego, CA", "Denver, CO", "Seattle, WA",
  "Atlanta, GA", "Boston, MA", "Las Vegas, NV", "Orlando, FL", "San Francisco, CA",
  "Austin, TX", "Nashville, TN", "Portland, OR", "Charlotte, NC", "Tampa, FL"
];

const BPO_CAMPAIGN_NAMES = [
  "HealthPlus Appointments", "TechCorp Lead Gen", "Insurance Renewals", 
  "Solar Sales Outbound", "Financial Services", "Medicare Enrollments",
  "Auto Insurance Quotes", "Home Security Sales", "Telecom Upsells",
  "Credit Card Acquisitions", "Mortgage Refinance", "Travel Bookings",
  "Subscription Renewals", "B2B Lead Qualification", "Customer Win-Back"
];

const CARRIER_PREFIXES = ["Swift", "Knight", "Werner", "Schneider", "JB", "Prime", "Heartland", "USA", "Central", "Midwest", "Southern", "Northern", "Pacific", "Atlantic", "Mountain", "Valley", "Eagle", "Star", "Fast", "Express"];
const CARRIER_SUFFIXES = ["Transport", "Trucking", "Freight", "Logistics", "Carriers", "Lines", "Express", "Hauling", "Transit", "Delivery"];

const SHIPPER_INDUSTRIES = ["Retail", "Manufacturing", "Food & Beverage", "Automotive", "Electronics", "Pharmaceuticals", "Construction", "Agriculture", "Chemical", "Paper & Packaging"];
const SHIPPER_SUFFIXES = ["Distribution", "Supply", "Warehouse", "Logistics", "Corp", "Inc", "LLC", "Industries", "Products", "Materials"];

async function main() {
  console.log("🌱 Starting comprehensive test data seeding...\n");
  console.log("📊 Configuration:");
  console.log(`   - Carriers: ${CONFIG.NUM_CARRIERS}`);
  console.log(`   - Shippers: ${CONFIG.NUM_SHIPPERS}`);
  console.log(`   - Loads: ${CONFIG.NUM_LOADS}`);
  console.log(`   - Hotels: ${CONFIG.NUM_HOTEL_PROPERTIES}`);
  console.log(`   - BPO Campaigns: ${CONFIG.NUM_BPO_CAMPAIGNS}`);
  console.log(`   - Days of history: ${CONFIG.DAYS_OF_HISTORY}`);
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // 1. VENTURES (use upsert to handle existing data)
  // ═══════════════════════════════════════════════════════════════
  console.log("🏢 Creating/updating ventures...");

  const ventures = await Promise.all([
    prisma.venture.upsert({
      where: { code: "SIOX" },
      update: { isTest: true },
      create: {
        name: "SIOX Freight Solutions",
        code: "SIOX",
        type: VentureType.LOGISTICS,
        logisticsRole: LogisticsRole.BROKER,
        isTest: true,
      },
    }),
    prisma.venture.upsert({
      where: { code: "MBT" },
      update: { isTest: true },
      create: {
        name: "MB Transport",
        code: "MBT",
        type: VentureType.TRANSPORT,
        logisticsRole: LogisticsRole.CARRIER,
        isTest: true,
      },
    }),
    prisma.venture.upsert({
      where: { code: "HHG" },
      update: { isTest: true },
      create: {
        name: "Harbor Hotels Group",
        code: "HHG",
        type: VentureType.HOSPITALITY,
        isTest: true,
      },
    }),
    prisma.venture.upsert({
      where: { code: "RVX" },
      update: { isTest: true },
      create: {
        name: "RevenelX BPO",
        code: "RVX",
        type: VentureType.BPO,
        isTest: true,
      },
    }),
    prisma.venture.upsert({
      where: { code: "CSS" },
      update: { isTest: true },
      create: {
        name: "CloudStack SaaS",
        code: "CSS",
        type: VentureType.SAAS,
        isTest: true,
      },
    }),
    prisma.venture.upsert({
      where: { code: "CHD" },
      update: { isTest: true },
      create: {
        name: "Chokshi Holdings",
        code: "CHD",
        type: VentureType.HOLDINGS,
        isTest: true,
      },
    }),
  ]);

  const [v_freight, v_transport, v_hotels, v_bpo, v_saas, v_holdings] = ventures;
  console.log(`✅ Created ${ventures.length} ventures`);

  // ═══════════════════════════════════════════════════════════════
  // 2. OFFICES
  // ═══════════════════════════════════════════════════════════════
  console.log("🏬 Creating offices...");

  const officeData = [
    { name: "Atlanta HQ", ventureId: v_freight.id, city: "Atlanta", country: "USA", isTest: true },
    { name: "Dallas Branch", ventureId: v_freight.id, city: "Dallas", country: "USA", isTest: true },
    { name: "Chicago Office", ventureId: v_freight.id, city: "Chicago", country: "USA", isTest: true },
    { name: "Los Angeles Office", ventureId: v_freight.id, city: "Los Angeles", country: "USA", isTest: true },
    { name: "Transport Hub Houston", ventureId: v_transport.id, city: "Houston", country: "USA", isTest: true },
    { name: "Transport Hub Dallas", ventureId: v_transport.id, city: "Dallas", country: "USA", isTest: true },
    { name: "Hotel Operations Miami", ventureId: v_hotels.id, city: "Miami", country: "USA", isTest: true },
    { name: "Hotel Operations LA", ventureId: v_hotels.id, city: "Los Angeles", country: "USA", isTest: true },
    { name: "BPO Center Hyderabad", ventureId: v_bpo.id, city: "Hyderabad", country: "India", isTest: true },
    { name: "BPO Center Manila", ventureId: v_bpo.id, city: "Manila", country: "Philippines", isTest: true },
    { name: "BPO Center Mexico City", ventureId: v_bpo.id, city: "Mexico City", country: "Mexico", isTest: true },
    { name: "SaaS Headquarters", ventureId: v_saas.id, city: "San Francisco", country: "USA", isTest: true },
    { name: "Holdings Office", ventureId: v_holdings.id, city: "New York", country: "USA", isTest: true },
  ];

  const offices = await Promise.all(
    officeData.map((data) =>
      prisma.office.upsert({
        where: { name: data.name },
        update: { isTest: true },
        create: data,
      })
    )
  );

  console.log(`✅ Created ${offices.length} offices`);

  // ═══════════════════════════════════════════════════════════════
  // 3. USERS (Increased for realistic team sizes)
  // ═══════════════════════════════════════════════════════════════
  console.log("👥 Creating users...");

  const users: any[] = [];

  const u_ceo = await prisma.user.upsert({
    where: { email: "test.ceo@siox.com" },
    update: { isTestUser: true },
    create: {
      email: "test.ceo@siox.com",
      fullName: "Test CEO",
      role: UserRole.CEO,
      isTestUser: true,
    },
  });
  users.push(u_ceo);

  const u_admin = await prisma.user.upsert({
    where: { email: "test.admin@siox.com" },
    update: { isTestUser: true },
    create: {
      email: "test.admin@siox.com",
      fullName: "Test Admin",
      role: UserRole.ADMIN,
      isTestUser: true,
    },
  });
  users.push(u_admin);

  for (const venture of ventures) {
    const managerEmail = `test.manager.${venture.code.toLowerCase()}@siox.com`;
    const manager = await prisma.user.upsert({
      where: { email: managerEmail },
      update: { isTestUser: true },
      create: {
        email: managerEmail,
        fullName: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
        role: UserRole.VENTURE_HEAD,
        isTestUser: true,
      },
    });
    users.push(manager);

    await prisma.ventureUser.upsert({
      where: { userId_ventureId: { userId: manager.id, ventureId: venture.id } },
      update: {},
      create: { userId: manager.id, ventureId: venture.id },
    });

    for (let i = 0; i < CONFIG.NUM_EMPLOYEES_PER_VENTURE; i++) {
      const empEmail = `test.emp${i + 1}.${venture.code.toLowerCase()}@siox.com`;
      const emp = await prisma.user.upsert({
        where: { email: empEmail },
        update: { isTestUser: true },
        create: {
          email: empEmail,
          fullName: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
          role: randomItem([UserRole.EMPLOYEE, UserRole.TEAM_LEAD, UserRole.OFFICE_MANAGER]),
          isTestUser: true,
        },
      });
      users.push(emp);

      await prisma.ventureUser.upsert({
        where: { userId_ventureId: { userId: emp.id, ventureId: venture.id } },
        update: {},
        create: { userId: emp.id, ventureId: venture.id },
      });
    }
  }

  console.log(`✅ Created ${users.length} users`);

  // ═══════════════════════════════════════════════════════════════
  // 4. FREIGHT DATA - Carriers, Shippers, Customers, Loads
  // ═══════════════════════════════════════════════════════════════
  console.log("🚛 Creating freight data...");

  // Lost Load Reasons - use findFirst + create pattern to avoid upsert issues
  const reasonNames = ["Rate too low", "No capacity", "Carrier cancelled", "Shipper cancelled", "Equipment mismatch", "Competitor won", "Timing issue", "Credit hold"];
  const lostLoadReasons: any[] = [];
  for (const name of reasonNames) {
    let reason = await prisma.lostLoadReason.findFirst({ where: { name } });
    if (!reason) {
      reason = await prisma.lostLoadReason.create({ data: { name } });
    }
    lostLoadReasons.push(reason);
  }

  // Generate Carriers (500)
  console.log(`   Creating ${CONFIG.NUM_CARRIERS} carriers...`);
  const carriers: any[] = [];
  for (let i = 0; i < CONFIG.NUM_CARRIERS; i++) {
    const mcNumber = `MC-${100000 + i}`;
    const carrier = await prisma.carrier.upsert({
      where: { mcNumber },
      update: {},
      create: {
        name: `${randomItem(CARRIER_PREFIXES)} ${randomItem(CARRIER_SUFFIXES)} ${i + 1}`,
        mcNumber,
        dotNumber: `DOT-${200000 + i}`,
      },
    });
    carriers.push(carrier);
    if ((i + 1) % 100 === 0) console.log(`      ${i + 1}/${CONFIG.NUM_CARRIERS} carriers created`);
  }

  // Generate Shippers (150)
  console.log(`   Creating ${CONFIG.NUM_SHIPPERS} shippers...`);
  const shippers: any[] = [];
  for (let i = 0; i < CONFIG.NUM_SHIPPERS; i++) {
    const tmsShipperCode = `SHP${String(i + 1).padStart(4, '0')}`;
    const shipper = await prisma.logisticsShipper.upsert({
      where: { tmsShipperCode },
      update: {},
      create: {
        name: `${randomItem(SHIPPER_INDUSTRIES)} ${randomItem(SHIPPER_SUFFIXES)} ${i + 1}`,
        tmsShipperCode,
        internalCode: `SHIP${i + 1}`,
        ventureId: v_freight.id,
      },
    });
    shippers.push(shipper);
    if ((i + 1) % 50 === 0) console.log(`      ${i + 1}/${CONFIG.NUM_SHIPPERS} shippers created`);
  }

  // Generate Customers (50)
  console.log(`   Creating ${CONFIG.NUM_CUSTOMERS} customers...`);
  const customers: any[] = [];
  for (let i = 0; i < CONFIG.NUM_CUSTOMERS; i++) {
    const internalCode = `CUST${String(i + 1).padStart(3, '0')}`;
    const customer = await prisma.customer.upsert({
      where: { internalCode },
      update: {},
      create: {
        name: `${randomItem(SHIPPER_INDUSTRIES)} Customer ${i + 1}`,
        internalCode,
        ventureId: v_freight.id,
      },
    });
    customers.push(customer);
  }

  // Generate Loads (2000)
  console.log(`   Creating ${CONFIG.NUM_LOADS} freight loads...`);
  const freightUsers = users.filter(u => u.email.includes(v_freight.code.toLowerCase()));
  const freightOffices = offices.filter(o => o.ventureId === v_freight.id);
  const loadStatuses = [LoadStatus.DELIVERED, LoadStatus.DELIVERED, LoadStatus.DELIVERED, LoadStatus.COVERED, LoadStatus.AT_RISK, LoadStatus.LOST, LoadStatus.FELL_OFF];

  for (let i = 0; i < CONFIG.NUM_LOADS; i++) {
    const lane = randomItem(FREIGHT_LANES);
    const [originCity, originState] = lane.origin.split(", ");
    const [destCity, destState] = lane.dest.split(", ");
    const billAmount = randomInt(1500, 12000);
    const marginPct = randomFloat(0.08, 0.28);
    const costAmount = Math.round(billAmount * (1 - marginPct));
    const loadStatus = randomItem(loadStatuses);
    const pickupDate = subtractDays(today, randomInt(1, CONFIG.DAYS_OF_HISTORY));
    const billingDate = loadStatus === LoadStatus.DELIVERED ? addDays(pickupDate, randomInt(1, 5)) : null;

    await prisma.load.create({
      data: {
        reference: `SX-${originCity.slice(0, 3).toUpperCase()}-${destCity.slice(0, 3).toUpperCase()}-${10000 + i}`,
        ventureId: v_freight.id,
        officeId: randomItem(freightOffices).id,
        customerId: randomItem(customers).id,
        shipperId: randomItem(shippers).id,
        carrierId: randomItem(carriers).id,
        createdById: freightUsers.length > 0 ? randomItem(freightUsers).id : null,
        pickupCity: originCity,
        pickupState: originState,
        pickupDate,
        dropCity: destCity,
        dropState: destState,
        dropDate: addDays(pickupDate, randomInt(1, 3)),
        billingDate,
        billAmount,
        costAmount,
        marginAmount: billAmount - costAmount,
        marginPercentage: marginPct * 100,
        miles: lane.miles + randomInt(-50, 50),
        loadStatus,
        atRiskFlag: loadStatus === LoadStatus.AT_RISK,
        lostAt: loadStatus === LoadStatus.LOST ? pickupDate : null,
        lostReasonId: loadStatus === LoadStatus.LOST ? randomItem(lostLoadReasons).id : null,
        equipmentType: randomItem(["Dry Van", "Reefer", "Flatbed", "Step Deck", "Power Only"]),
        weightLbs: randomInt(10000, 45000),
        isTest: true,
      },
    });
    if ((i + 1) % 500 === 0) console.log(`      ${i + 1}/${CONFIG.NUM_LOADS} loads created`);
  }

  console.log(`✅ Created ${CONFIG.NUM_CARRIERS} carriers, ${CONFIG.NUM_SHIPPERS} shippers, ${CONFIG.NUM_CUSTOMERS} customers, ${CONFIG.NUM_LOADS} loads`);

  // ═══════════════════════════════════════════════════════════════
  // 5. FREIGHT KPIs (Employee Daily KPIs - 60 days)
  // ═══════════════════════════════════════════════════════════════
  console.log("📊 Creating freight KPIs...");

  let kpiCount = 0;
  for (let dayOffset = 0; dayOffset < CONFIG.DAYS_OF_HISTORY; dayOffset++) {
    const date = subtractDays(today, dayOffset);
    for (const user of freightUsers) {
      await prisma.employeeKpiDaily.create({
        data: {
          userId: user.id,
          ventureId: v_freight.id,
          officeId: randomItem(freightOffices).id,
          date,
          callsMade: randomInt(20, 100),
          hoursWorked: randomFloat(6, 10),
          quotesGiven: randomInt(5, 30),
          quotesWon: randomInt(1, 12),
          revenueGenerated: randomFloat(2000, 25000),
          isTest: true,
        },
      });
      kpiCount++;
    }
  }

  console.log(`✅ Created ${kpiCount} freight KPI records (${CONFIG.DAYS_OF_HISTORY} days)`);

  // ═══════════════════════════════════════════════════════════════
  // 6. HOTEL DATA (Properties, Daily Reports, Reviews)
  // ═══════════════════════════════════════════════════════════════
  console.log("🏨 Creating hotel data...");

  const hotelProperties: any[] = [];
  for (let i = 0; i < CONFIG.NUM_HOTEL_PROPERTIES; i++) {
    const [city, state] = HOTEL_CITIES[i % HOTEL_CITIES.length].split(", ");
    const property = await prisma.hotelProperty.create({
      data: {
        name: `${randomItem(HOTEL_BRANDS)} ${randomItem(HOTEL_TYPES)} ${city}`,
        code: `${city.slice(0, 3).toUpperCase()}${i + 1}`,
        ventureId: v_hotels.id,
        city,
        state,
        rooms: randomInt(80, 250),
      },
    });
    hotelProperties.push(property);
  }

  let reportCount = 0;
  let kpiDailyCount = 0;
  let reviewCount = 0;
  for (const property of hotelProperties) {
    for (let dayOffset = 0; dayOffset < CONFIG.DAYS_OF_HISTORY; dayOffset++) {
      const date = subtractDays(today, dayOffset);
      const totalRooms = property.rooms || 100;
      const occupancy = randomFloat(0.45, 0.98);
      const roomsSold = Math.round(totalRooms * occupancy);
      const adr = randomFloat(79, 249);
      const roomRevenue = roomsSold * adr;
      const otherRevenue = randomFloat(500, 3000);
      const totalRevenue = roomRevenue + otherRevenue;
      const revpar = roomRevenue / totalRooms;

      // Create HotelDailyReport (raw daily data)
      await prisma.hotelDailyReport.create({
        data: {
          hotelId: property.id,
          date,
          totalRoom: totalRooms,
          roomSold: roomsSold,
          occupancy: occupancy * 100,
          adr,
          revpar,
          total: totalRevenue,
        },
      });
      reportCount++;

      // Create HotelKpiDaily (what the snapshot API reads)
      await prisma.hotelKpiDaily.create({
        data: {
          hotel: { connect: { id: property.id } },
          venture: { connect: { id: v_hotels.id } },
          date,
          roomsAvailable: totalRooms,
          roomsSold,
          occupancyPct: occupancy * 100,
          roomRevenue,
          adr,
          revpar,
          otherRevenue,
          totalRevenue,
          grossOperatingProfit: totalRevenue * randomFloat(0.3, 0.5),
          goppar: (totalRevenue * randomFloat(0.3, 0.5)) / totalRooms,
          cancellations: randomInt(0, 5),
          noShows: randomInt(0, 3),
          walkins: randomInt(0, 8),
          complaints: randomInt(0, 2),
          reviewScore: randomFloat(3.5, 5.0),
        },
      });
      kpiDailyCount++;
    }

    const reviewSources = [ReviewSource.GOOGLE, ReviewSource.TRIPADVISOR, ReviewSource.BOOKING, ReviewSource.EXPEDIA];
    for (let i = 0; i < randomInt(10, 30); i++) {
      await prisma.hotelReview.create({
        data: {
          hotelId: property.id,
          source: randomItem(reviewSources),
          rating: randomInt(2, 5),
          title: randomItem(["Great stay!", "Very comfortable", "Nice location", "Good value", "Excellent service", "Will return!", "Perfect getaway", "Needs improvement"]),
          comment: "This is a test review with sample feedback about the hotel experience.",
          reviewerName: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
          reviewDate: subtractDays(today, randomInt(1, CONFIG.DAYS_OF_HISTORY)),
          isTest: true,
        },
      });
      reviewCount++;
    }
  }

  console.log(`✅ Created ${hotelProperties.length} hotel properties, ${reportCount} daily reports, ${kpiDailyCount} KPI records, ${reviewCount} reviews`);

  // Add LAST YEAR data for year-over-year comparison
  console.log("   Adding last year hotel data for YoY comparison...");
  let lyKpiCount = 0;
  for (const property of hotelProperties) {
    for (let dayOffset = 0; dayOffset < CONFIG.DAYS_OF_HISTORY; dayOffset++) {
      const date = subtractDays(subtractDays(today, 365), dayOffset); // Same day last year
      const totalRooms = property.rooms || 100;
      const occupancy = randomFloat(0.40, 0.92); // Slightly lower LY for realistic comparison
      const roomsSold = Math.round(totalRooms * occupancy);
      const adr = randomFloat(69, 219); // Slightly lower LY
      const roomRevenue = roomsSold * adr;
      const otherRevenue = randomFloat(400, 2500);
      const totalRevenue = roomRevenue + otherRevenue;
      const revpar = roomRevenue / totalRooms;

      await prisma.hotelKpiDaily.create({
        data: {
          hotel: { connect: { id: property.id } },
          venture: { connect: { id: v_hotels.id } },
          date,
          roomsAvailable: totalRooms,
          roomsSold,
          occupancyPct: occupancy * 100,
          roomRevenue,
          adr,
          revpar,
          otherRevenue,
          totalRevenue,
          grossOperatingProfit: totalRevenue * randomFloat(0.25, 0.45),
          goppar: (totalRevenue * randomFloat(0.25, 0.45)) / totalRooms,
          cancellations: randomInt(0, 6),
          noShows: randomInt(0, 4),
          walkins: randomInt(0, 6),
          complaints: randomInt(0, 3),
          reviewScore: randomFloat(3.2, 4.8),
        },
      });
      lyKpiCount++;
    }
  }
  console.log(`✅ Added ${lyKpiCount} last year KPI records for YoY comparison`);

  // ═══════════════════════════════════════════════════════════════
  // 7. BPO DATA (Campaigns, Agents, Metrics, Call Logs)
  // ═══════════════════════════════════════════════════════════════
  console.log("📞 Creating BPO data...");

  const bpoUsers = users.filter(u => u.email.includes(v_bpo.code.toLowerCase()));
  const bpoOffices = offices.filter(o => o.ventureId === v_bpo.id);

  const bpoCampaigns: any[] = [];
  for (let i = 0; i < CONFIG.NUM_BPO_CAMPAIGNS; i++) {
    const campaign = await prisma.bpoCampaign.create({
      data: {
        name: BPO_CAMPAIGN_NAMES[i % BPO_CAMPAIGN_NAMES.length] + (i >= BPO_CAMPAIGN_NAMES.length ? ` ${Math.floor(i / BPO_CAMPAIGN_NAMES.length) + 1}` : ""),
        ventureId: v_bpo.id,
        officeId: randomItem(bpoOffices).id,
        clientName: `Client ${i + 1}`,
        description: `Campaign for outbound calling and lead generation`,
        vertical: randomItem(["Healthcare", "Technology", "Insurance", "Finance", "Energy", "Telecom", "Retail"]),
        isActive: true,
      },
    });
    bpoCampaigns.push(campaign);
  }

  const bpoAgents: any[] = [];
  for (const user of bpoUsers) {
    const agent = await prisma.bpoAgent.create({
      data: {
        userId: user.id,
        ventureId: v_bpo.id,
        campaignId: randomItem(bpoCampaigns).id,
        employeeId: `EMP${randomInt(1000, 9999)}`,
        seatMonthlyCost: randomFloat(800, 1800),
        isActive: true,
      },
    });
    bpoAgents.push(agent);
  }

  let metricCount = 0;
  for (const campaign of bpoCampaigns) {
    for (let dayOffset = 0; dayOffset < CONFIG.DAYS_OF_HISTORY; dayOffset++) {
      const date = subtractDays(today, dayOffset);
      const fteCount = randomFloat(3, 12);
      const outboundCalls = Math.round(fteCount * randomInt(80, 180));
      const handledCalls = Math.round(outboundCalls * randomFloat(0.3, 0.6));

      await prisma.bpoDailyMetric.create({
        data: {
          campaignId: campaign.id,
          date,
          outboundCalls,
          handledCalls,
          talkTimeMin: Math.round(handledCalls * randomFloat(3, 10)),
          leadsCreated: randomInt(5, 50),
          demosBooked: randomInt(2, 25),
          salesClosed: randomInt(0, 15),
          fteCount,
          avgQaScore: randomFloat(0.70, 0.98),
          revenue: randomFloat(1000, 15000),
          cost: randomFloat(500, 5000),
          isTest: true,
        },
      });
      metricCount++;
    }
  }

  let callLogCount = 0;
  for (const agent of bpoAgents) {
    for (let i = 0; i < CONFIG.NUM_CALL_LOGS_PER_AGENT; i++) {
      const callStart = subtractDays(today, randomInt(0, CONFIG.DAYS_OF_HISTORY));
      const durationMin = randomInt(1, 25);
      await prisma.bpoCallLog.create({
        data: {
          agentId: agent.id,
          ventureId: v_bpo.id,
          officeId: randomItem(bpoOffices).id,
          campaignId: agent.campaignId,
          callStartedAt: callStart,
          callEndedAt: new Date(callStart.getTime() + durationMin * 60000),
          dialCount: randomInt(1, 4),
          isConnected: Math.random() > 0.35,
          appointmentSet: Math.random() > 0.75,
          dealWon: Math.random() > 0.92,
          revenue: Math.random() > 0.92 ? randomFloat(500, 3000) : 0,
          isTest: true,
        },
      });
      callLogCount++;
    }
  }

  console.log(`✅ Created ${bpoCampaigns.length} BPO campaigns, ${bpoAgents.length} agents, ${metricCount} daily metrics, ${callLogCount} call logs`);

  // ═══════════════════════════════════════════════════════════════
  // 8. GAMIFICATION DATA
  // ═══════════════════════════════════════════════════════════════
  console.log("🎮 Creating gamification data...");

  for (const venture of [v_freight, v_bpo, v_hotels, v_saas]) {
    await prisma.gamificationConfig.create({
      data: {
        ventureId: venture.id,
        config: {
          isEnabled: true,
          showLeaderboard: true,
          showBadges: true,
          pointsConfig: {
            loadWon: 10,
            callMade: 1,
            dealClosed: 50,
            targetHit: 100,
            reviewResponded: 5,
          },
        },
      },
    });
  }

  const eventTypes = ["LOAD_WON", "CALL_MADE", "DEAL_CLOSED", "TARGET_HIT", "STREAK_BONUS", "REVIEW_RESPONDED", "CUSTOMER_SAVED"];
  let eventCount = 0;
  for (const user of users) {
    let totalPoints = 0;
    const numEvents = randomInt(30, 80);
    for (let i = 0; i < numEvents; i++) {
      const points = randomInt(5, 150);
      totalPoints += points;
      await prisma.gamificationEvent.create({
        data: {
          userId: user.id,
          ventureId: randomItem(ventures).id,
          type: randomItem(eventTypes),
          points,
        },
      });
      eventCount++;
    }

    await prisma.gamificationPointsBalance.upsert({
      where: { userId: user.id },
      update: { points: totalPoints },
      create: { userId: user.id, points: totalPoints },
    });
  }

  console.log(`✅ Created ${eventCount} gamification events with point balances`);

  // ═══════════════════════════════════════════════════════════════
  // 9. SAAS DATA
  // ═══════════════════════════════════════════════════════════════
  console.log("💻 Creating SaaS data...");

  const saasCustomers: any[] = [];
  for (let i = 0; i < CONFIG.NUM_SAAS_CUSTOMERS; i++) {
    const customer = await prisma.saasCustomer.create({
      data: {
        name: `${randomItem(["Acme", "Tech", "Global", "Data", "Cloud", "Smart", "Apex", "Prime", "Next", "Core"])} ${randomItem(["Corp", "Inc", "Ltd", "Solutions", "Systems", "Group", "Labs", "Ventures"])} ${i + 1}`,
        email: `billing${i + 1}@customer${i + 1}.com`,
        ventureId: v_saas.id,
      },
    });
    saasCustomers.push(customer);
  }

  for (const customer of saasCustomers) {
    const isActive = Math.random() > 0.15;
    await prisma.saasSubscription.create({
      data: {
        customerId: customer.id,
        planName: randomItem(["Starter", "Professional", "Enterprise", "Growth", "Scale"]),
        mrr: randomFloat(49, 1999),
        isActive,
        startedAt: subtractDays(today, randomInt(30, 400)),
        cancelledAt: !isActive ? subtractDays(today, randomInt(1, 30)) : null,
      },
    });
  }

  console.log(`✅ Created ${CONFIG.NUM_SAAS_CUSTOMERS} SaaS customers with subscriptions`);

  // ═══════════════════════════════════════════════════════════════
  // 10. HOLDINGS DATA (Bank Accounts, Snapshots, Assets)
  // ═══════════════════════════════════════════════════════════════
  console.log("🏦 Creating holdings data...");

  const bankNames = ["Chase Bank", "Bank of America", "Wells Fargo", "Citibank", "HDFC Bank", "ICICI Bank", "Capital One", "US Bank"];
  const bankAccounts: any[] = [];
  
  for (let i = 0; i < CONFIG.NUM_BANK_ACCOUNTS; i++) {
    const account = await prisma.bankAccount.create({
      data: {
        name: `${randomItem(["Operating", "Savings", "Payroll", "Reserve", "Investment"])} Account ${i + 1}`,
        bankName: randomItem(bankNames),
        accountNumber: `****${randomInt(1000, 9999)}`,
        currency: i < 6 ? "USD" : "INR",
        ventureId: v_holdings.id,
      },
    });
    bankAccounts.push(account);
  }

  for (const account of bankAccounts) {
    for (let dayOffset = 0; dayOffset < CONFIG.DAYS_OF_HISTORY; dayOffset += 7) {
      const baseBalance = account.currency === "USD" ? randomFloat(50000, 800000) : randomFloat(2000000, 20000000);
      await prisma.bankSnapshot.create({
        data: {
          bankAccountId: account.id,
          snapshotDate: subtractDays(today, dayOffset),
          balance: baseBalance + randomFloat(-20000, 20000),
        },
      });
    }
  }

  const assetTypes = ["REAL_ESTATE", "EQUIPMENT", "VEHICLE", "INVESTMENT", "INTELLECTUAL_PROPERTY"];
  for (let i = 0; i < CONFIG.NUM_HOLDING_ASSETS; i++) {
    await prisma.holdingAsset.create({
      data: {
        name: `${randomItem(["Downtown", "Suburban", "Industrial", "Commercial", "Residential"])} ${randomItem(["Office Building", "Warehouse", "Property", "Complex", "Land"])} ${i + 1}`,
        type: randomItem(assetTypes),
        ventureId: v_holdings.id,
        valueEstimate: randomFloat(500000, 5000000),
        acquiredDate: subtractDays(today, randomInt(180, 1000)),
        notes: "Test asset for development purposes",
      },
    });
  }

  console.log(`✅ Created ${CONFIG.NUM_BANK_ACCOUNTS} bank accounts with snapshots and ${CONFIG.NUM_HOLDING_ASSETS} assets`);

  // ═══════════════════════════════════════════════════════════════
  // 11. TASKS AND POLICIES
  // ═══════════════════════════════════════════════════════════════
  console.log("📋 Creating tasks and policies...");

  const taskTitles = [
    "Review Q4 financial reports", "Update carrier compliance docs", "Hotel inspection follow-up",
    "BPO training schedule", "Software license renewal", "Annual insurance review",
    "Fleet maintenance check", "Customer satisfaction survey", "Vendor contract negotiation",
    "Quarterly performance review", "Safety audit preparation", "Marketing campaign review",
    "Budget planning meeting", "IT infrastructure upgrade", "Employee onboarding process",
  ];

  const taskStatuses = [TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.DONE];
  const taskPriorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH];

  for (let i = 0; i < CONFIG.NUM_TASKS; i++) {
    await prisma.task.create({
      data: {
        title: `${randomItem(taskTitles)} #${i + 1}`,
        description: "This is a test task for development purposes with detailed description.",
        ventureId: randomItem(ventures).id,
        assignedTo: randomItem(users).id,
        status: randomItem(taskStatuses),
        priority: randomItem(taskPriorities),
        dueDate: addDays(today, randomInt(-10, 45)),
        isTest: true,
      },
    });
  }

  const policyTypes = [PolicyType.CONTRACT, PolicyType.PERMIT, PolicyType.LICENSE, PolicyType.INSURANCE];
  const policyProviders = ["State Farm", "Allstate", "Liberty Mutual", "Progressive", "Travelers", "Hartford", "Nationwide", "GEICO"];
  
  for (let i = 0; i < CONFIG.NUM_POLICIES; i++) {
    await prisma.policy.create({
      data: {
        name: `${randomItem(["Commercial", "Fleet", "General", "Workers Comp", "Property", "Liability"])} Policy ${i + 1}`,
        type: randomItem(policyTypes),
        ventureId: randomItem(ventures).id,
        provider: randomItem(policyProviders),
        startDate: subtractDays(today, randomInt(30, 365)),
        endDate: addDays(today, randomInt(30, 365)),
        notes: "Test policy for development",
        isTest: true,
      },
    });
  }

  console.log(`✅ Created ${CONFIG.NUM_TASKS} tasks and ${CONFIG.NUM_POLICIES} policies`);

  // ═══════════════════════════════════════════════════════════════
  // 12. IT ASSETS & INCIDENTS
  // ═══════════════════════════════════════════════════════════════
  console.log("💻 Creating IT assets and incidents...");

  const itCategories = ["Laptop", "Desktop", "Monitor", "Keyboard", "Mouse", "Headset", "Webcam", "Printer", "Router", "Server", "Phone", "Tablet"];
  const itMakes = ["Dell", "HP", "Lenovo", "Apple", "Asus", "Acer", "Microsoft", "Samsung", "LG", "Cisco", "Logitech"];
  const itModels: Record<string, string[]> = {
    "Laptop": ["Latitude 5520", "ProBook 450", "ThinkPad T14", "MacBook Pro 14", "ZenBook 14", "Aspire 5"],
    "Desktop": ["OptiPlex 7090", "ProDesk 400", "ThinkCentre M90", "iMac 24", "ROG Strix", "Veriton X"],
    "Monitor": ["U2722D", "E24q G4", "ThinkVision T24", "Studio Display", "ProArt PA278", "CB272"],
    "Keyboard": ["K120", "K380", "MX Keys", "Magic Keyboard", "G915", "Sculpt Ergonomic"],
    "Mouse": ["M185", "MX Master 3", "Magic Mouse", "G502", "Precision", "Pro Click"],
    "Headset": ["H390", "Evolve2 65", "AirPods Pro", "Zone Wireless", "Voyager Focus", "HS80"],
    "Webcam": ["C920", "Brio 4K", "StreamCam", "FaceTime HD", "C1000e", "Kiyo Pro"],
    "Printer": ["LaserJet Pro M404", "OfficeJet Pro 9015", "PIXMA TR8620", "Brother HL-L2350DW", "EcoTank ET-4760"],
    "Router": ["Catalyst 9200", "Meraki MR46", "UniFi Dream", "Nighthawk AX12", "Orbi Pro"],
    "Server": ["PowerEdge R750", "ProLiant DL380", "ThinkSystem SR650", "Xserve", "RS720"],
    "Phone": ["iPhone 14 Pro", "Galaxy S23", "Pixel 7", "OnePlus 11", "Surface Duo"],
    "Tablet": ["iPad Pro 12.9", "Galaxy Tab S9", "Surface Pro 9", "Pixel Tablet", "Fire HD 10"],
  };
  const itStatuses = ["Available", "In Use", "In Repair", "Retired"];
  const itConditions = ["Excellent", "Good", "Fair", "Poor"];

  const itAssets: any[] = [];
  for (let i = 0; i < CONFIG.NUM_IT_ASSETS; i++) {
    const category = randomItem(itCategories);
    const make = randomItem(itMakes);
    const models = itModels[category] || ["Standard Model"];
    const status = randomItem(itStatuses);
    
    const asset = await prisma.iTAsset.create({
      data: {
        tag: `IT-${String(i + 1).padStart(5, '0')}`,
        serialNumber: `SN${randomInt(100000, 999999)}${String.fromCharCode(65 + randomInt(0, 25))}`,
        type: category,
        make,
        model: randomItem(models),
        status: status === "In Use" ? "ASSIGNED" : status === "Available" ? "AVAILABLE" : status === "In Repair" ? "REPAIR" : "RETIRED",
        purchaseDate: subtractDays(today, randomInt(30, 730)),
        warrantyExpiry: addDays(today, randomInt(-180, 730)),
        assignedToUserId: status === "In Use" ? randomItem(users).id : null,
        assignedSince: status === "In Use" ? subtractDays(today, randomInt(1, 365)) : null,
        ventureId: randomItem(ventures).id,
        notes: Math.random() > 0.7 ? "Test asset for development" : null,
      },
    });
    itAssets.push(asset);
  }

  console.log(`✅ Created ${CONFIG.NUM_IT_ASSETS} IT assets`);

  const incidentTypes = ["Hardware", "Software", "Network", "Security", "Other"];
  const incidentSeverities = ["Low", "Medium", "High", "Critical"];
  const incidentStatuses = ["Open", "In Progress", "Resolved", "Cancelled"];
  const incidentTitles: Record<string, string[]> = {
    "Hardware": ["Screen flickering", "Keyboard not responding", "Battery not charging", "Fan making noise", "USB port broken", "Power button stuck"],
    "Software": ["Application crash", "Slow performance", "Update failed", "License expired", "Blue screen error", "Driver issue"],
    "Network": ["Cannot connect to WiFi", "VPN not working", "Slow internet", "Network drive inaccessible", "IP conflict"],
    "Security": ["Suspicious email received", "Malware detected", "Unauthorized access attempt", "Password reset needed", "Security certificate expired"],
    "Other": ["Equipment upgrade request", "New software needed", "Training request", "General inquiry", "Configuration change"],
  };

  for (let i = 0; i < CONFIG.NUM_IT_INCIDENTS; i++) {
    const incidentCategory = randomItem(incidentTypes);
    const titles = incidentTitles[incidentCategory] || ["General issue"];
    const status = randomItem(incidentStatuses);
    const asset = randomItem(itAssets);
    
    await prisma.iTIncident.create({
      data: {
        ventureId: asset.ventureId,
        assetId: asset.id,
        title: randomItem(titles),
        description: `Test incident for ${asset.tag} (${asset.type}). This is a ${incidentCategory.toLowerCase()} issue requiring attention.`,
        category: incidentCategory,
        severity: randomItem(incidentSeverities).toUpperCase(),
        status: status === "Open" ? "OPEN" : status === "In Progress" ? "IN_PROGRESS" : status === "Resolved" ? "RESOLVED" : "CANCELLED",
        reporterUserId: randomItem(users).id,
        assignedToUserId: status !== "Open" ? randomItem(users).id : null,
        resolvedAt: status === "Resolved" ? subtractDays(today, randomInt(0, 14)) : null,
      },
    });
  }

  console.log(`✅ Created ${CONFIG.NUM_IT_INCIDENTS} IT incidents`);

  // ═══════════════════════════════════════════════════════════════
  // 13. NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  console.log("🔔 Creating notifications...");

  let notifCount = 0;
  for (const user of users) {
    const numNotifs = randomInt(5, 15);
    for (let i = 0; i < numNotifs; i++) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: randomItem(["New task assigned", "Load status update", "Review requested", "Policy expiring soon", "KPI target achieved", "New lead assigned", "Approval needed"]),
          body: "This is a test notification message with relevant details.",
          type: randomItem(["info", "warning", "success", "error"]),
          isRead: Math.random() > 0.4,
          isTest: true,
          createdAt: subtractDays(today, randomInt(0, 21)),
        },
      });
      notifCount++;
    }
  }

  console.log(`✅ Created ${notifCount} notifications`);

  // ═══════════════════════════════════════════════════════════════
  // 13. INCENTIVE DATA
  // ═══════════════════════════════════════════════════════════════
  console.log("💰 Creating incentive data...");

  for (const venture of [v_freight, v_bpo, v_hotels]) {
    const plan = await prisma.incentivePlan.create({
      data: {
        ventureId: venture.id,
        name: `${venture.name} Monthly Incentive`,
        effectiveFrom: subtractDays(today, CONFIG.DAYS_OF_HISTORY),
        isActive: true,
      },
    });

    await prisma.incentiveRule.create({
      data: {
        planId: plan.id,
        roleKey: "SALES",
        metricKey: "freight_margin_usd",
        calcType: IncentiveCalcType.FLAT_PER_UNIT,
        rate: randomInt(3, 8),
        currency: "USD",
        isEnabled: true,
      },
    });
  }

  let incentiveCount = 0;
  for (let dayOffset = 0; dayOffset < CONFIG.DAYS_OF_HISTORY; dayOffset++) {
    const date = subtractDays(today, dayOffset);
    for (const user of users.slice(0, Math.min(users.length, 20))) {
      await prisma.incentiveDaily.create({
        data: {
          userId: user.id,
          ventureId: randomItem([v_freight, v_bpo, v_hotels]).id,
          date,
          amount: randomFloat(50, 800),
          currency: "USD",
          breakdown: { loads: randomInt(1, 8), calls: randomInt(10, 80), deals: randomInt(0, 3) },
          isTest: true,
        },
      });
      incentiveCount++;
    }
  }

  console.log(`✅ Created ${incentiveCount} incentive daily records`);

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log("\n🎉 Test data seeding complete!");
  console.log(`
══════════════════════════════════════════════════════════════
                      SEEDING SUMMARY
══════════════════════════════════════════════════════════════
  Ventures:           ${ventures.length}
  Offices:            ${offices.length}
  Users:              ${users.length}
  
  FREIGHT:
    Carriers:         ${CONFIG.NUM_CARRIERS}
    Shippers:         ${CONFIG.NUM_SHIPPERS}
    Customers:        ${CONFIG.NUM_CUSTOMERS}
    Loads:            ${CONFIG.NUM_LOADS}
    KPI Records:      ${kpiCount}
  
  HOSPITALITY:
    Properties:       ${hotelProperties.length}
    Daily Reports:    ${reportCount}
    KPI Daily:        ${kpiDailyCount} (current year)
    KPI Daily (LY):   ${lyKpiCount} (last year for YoY)
    Reviews:          ${reviewCount}
  
  BPO:
    Campaigns:        ${bpoCampaigns.length}
    Agents:           ${bpoAgents.length}
    Daily Metrics:    ${metricCount}
    Call Logs:        ${callLogCount}
  
  SAAS:
    Customers:        ${CONFIG.NUM_SAAS_CUSTOMERS}
  
  HOLDINGS:
    Bank Accounts:    ${CONFIG.NUM_BANK_ACCOUNTS}
    Assets:           ${CONFIG.NUM_HOLDING_ASSETS}
  
  OTHER:
    Tasks:            ${CONFIG.NUM_TASKS}
    Policies:         ${CONFIG.NUM_POLICIES}
    Notifications:    ${notifCount}
    Gamification:     ${eventCount} events
    Incentives:       ${incentiveCount} daily records
══════════════════════════════════════════════════════════════

All test data is marked with isTest: true and can be removed using the cleanup API.
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
