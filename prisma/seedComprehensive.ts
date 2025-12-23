import {
  PrismaClient,
  UserRole,
  Department,
  VentureType,
  LogisticsRole,
  LoadStatus,
  ShipperChurnStatus,
  ReviewSource,
  TaskStatus,
  TaskPriority,
  PolicyType,
} from "@prisma/client";

const prisma = new PrismaClient();

const CONFIG = {
  DAYS_OF_HISTORY: 730,  // 2 years of history
  NUM_CARRIERS: 10000,   // 10,000 carriers for exhaustive testing
  NUM_SHIPPERS: 2000,    // 2,000 shippers for churn logic testing
  NUM_LOADS: 15000,      // More loads for comprehensive coverage
  NUM_CUSTOMERS: 500,    // More customers
  NUM_HOTEL_PROPERTIES: 40,  // More hotels
  NUM_BPO_CAMPAIGNS: 25,     // More BPO campaigns
  NUM_SAAS_CUSTOMERS: 200,   // More SaaS customers
  NUM_BANK_ACCOUNTS: 25,     // More bank accounts
  NUM_HOLDING_ASSETS: 40,    // More holding assets
  BATCH_SIZE: 1000,          // Larger batches for efficiency
};

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number): number => Math.random() * (max - min) + min;
const subtractDays = (date: Date, days: number): Date => new Date(date.getTime() - days * 86400000);
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 86400000);
const today = new Date();

const FIRST_NAMES = ["John", "Sarah", "Mike", "Emily", "David", "Lisa", "James", "Anna", "Robert", "Maria", "Chris", "Jennifer", "Daniel", "Michelle", "Kevin", "Amanda", "Brian", "Nicole", "Steven", "Ashley", "William", "Jessica", "Joseph", "Stephanie", "Thomas", "Lauren", "Charles", "Megan", "Christopher", "Rachel", "Raj", "Priya", "Amit", "Neha", "Vikram", "Anjali"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Patel", "Shah", "Kumar", "Singh", "Sharma", "Gupta", "Mehta", "Chopra"];

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

const CARRIER_PREFIXES = ["Swift", "Knight", "Werner", "Schneider", "JB", "Prime", "Heartland", "USA", "Central", "Midwest", "Southern", "Northern", "Pacific", "Atlantic", "Mountain", "Valley", "Eagle", "Star", "Fast", "Express", "Elite", "Premier", "National", "Interstate", "Continental", "Freedom", "Liberty", "American", "United", "Global"];
const CARRIER_SUFFIXES = ["Transport", "Trucking", "Freight", "Logistics", "Carriers", "Lines", "Express", "Hauling", "Transit", "Delivery", "Moving", "Shipping"];

const SHIPPER_INDUSTRIES = ["Retail", "Manufacturing", "Food & Beverage", "Automotive", "Electronics", "Pharmaceuticals", "Construction", "Agriculture", "Chemical", "Paper & Packaging", "Textiles", "Machinery", "Steel", "Plastics", "Consumer Goods"];
const SHIPPER_SUFFIXES = ["Distribution", "Supply", "Warehouse", "Logistics", "Corp", "Inc", "LLC", "Industries", "Products", "Materials", "Group", "Company"];

const HOTEL_BRANDS = ["Marriott", "Hilton", "IHG", "Hyatt", "Wyndham", "Choice", "Best Western", "La Quinta", "Hampton", "Holiday Inn"];
const HOTEL_TYPES = ["Inn", "Suites", "Resort", "Hotel", "Plaza", "Lodge", "Express", "Select", "Garden"];

const BPO_CAMPAIGN_NAMES = [
  "HealthPlus Appointments", "TechCorp Lead Gen", "Insurance Renewals",
  "Solar Sales Outbound", "Financial Services", "Medicare Enrollments",
  "Auto Insurance Quotes", "Home Security Sales", "Telecom Upsells",
  "Credit Card Acquisitions", "Mortgage Refinance", "Travel Bookings",
  "Subscription Renewals", "B2B Lead Qualification", "Customer Win-Back"
];

const LOST_LOAD_REASONS = [
  { name: "Carrier cancelled", category: "CARRIER" },
  { name: "Rate too low", category: "RATE" },
  { name: "No capacity", category: "CAPACITY" },
  { name: "Shipper cancelled", category: "SHIPPER" },
  { name: "Equipment mismatch", category: "OPERATIONS" },
  { name: "Timing issue", category: "OPERATIONS" },
  { name: "Competitor won", category: "COMPETITION" },
  { name: "Credit hold", category: "FINANCE" },
];

async function main() {
  console.log("🌱 Starting comprehensive 3-year data seeding...\n");
  console.log("📊 Configuration:");
  console.log(`   - Date Range: ${CONFIG.DAYS_OF_HISTORY} days (3 years)`);
  console.log(`   - Carriers: ${CONFIG.NUM_CARRIERS}`);
  console.log(`   - Shippers: ${CONFIG.NUM_SHIPPERS}`);
  console.log(`   - Loads: ${CONFIG.NUM_LOADS}`);
  console.log(`   - Customers: ${CONFIG.NUM_CUSTOMERS}`);
  console.log(`   - Hotels: ${CONFIG.NUM_HOTEL_PROPERTIES}`);
  console.log(`   - BPO Campaigns: ${CONFIG.NUM_BPO_CAMPAIGNS}`);
  console.log("");

  const v_siox = await prisma.venture.upsert({
    where: { slug: "siox-logistics" },
    update: {},
    create: { name: "Siox Logistics", slug: "siox-logistics", code: "SX", type: VentureType.LOGISTICS, logisticsRole: LogisticsRole.BROKER, isActive: true },
  });
  const v_mb = await prisma.venture.upsert({
    where: { slug: "mb-logistics" },
    update: {},
    create: { name: "MB Logistics", slug: "mb-logistics", code: "MB", type: VentureType.LOGISTICS, logisticsRole: LogisticsRole.BROKER, isActive: true },
  });
  const v_trans = await prisma.venture.upsert({
    where: { slug: "siox-transports" },
    update: {},
    create: { name: "Siox Transports", slug: "siox-transports", code: "ST", type: VentureType.TRANSPORT, logisticsRole: LogisticsRole.CARRIER, isActive: true },
  });
  const v_rmn = await prisma.venture.upsert({
    where: { slug: "rank-me-now" },
    update: {},
    create: { name: "Rank Me Now", slug: "rank-me-now", code: "RM", type: VentureType.SAAS, isActive: true },
  });
  const v_bpo = await prisma.venture.upsert({
    where: { slug: "revenelx" },
    update: {},
    create: { name: "RevenelX", slug: "revenelx", code: "RX", type: VentureType.BPO, isActive: true },
  });
  const v_hotels = await prisma.venture.upsert({
    where: { slug: "chokshi-hotels" },
    update: {},
    create: { name: "Chokshi Hotels", slug: "chokshi-hotels", code: "CH", type: VentureType.HOSPITALITY, isActive: true },
  });

  const ventures = { siox: v_siox, mb: v_mb, trans: v_trans, rmn: v_rmn, bpo: v_bpo, hotels: v_hotels };
  console.log("✅ Ventures ready (6 total)");

  console.log("\n🏬 Creating offices...");
  const officeData = [
    { name: "SIOX Atlanta", ventureId: v_siox.id, city: "Atlanta", country: "USA" },
    { name: "SIOX Dallas", ventureId: v_siox.id, city: "Dallas", country: "USA" },
    { name: "SIOX Chicago", ventureId: v_siox.id, city: "Chicago", country: "USA" },
    { name: "MB Houston", ventureId: v_mb.id, city: "Houston", country: "USA" },
    { name: "MB Los Angeles", ventureId: v_mb.id, city: "Los Angeles", country: "USA" },
    { name: "Transports HQ", ventureId: v_trans.id, city: "Atlanta", country: "USA" },
    { name: "Hotels East", ventureId: v_hotels.id, city: "Miami", country: "USA" },
    { name: "Hotels West", ventureId: v_hotels.id, city: "Los Angeles", country: "USA" },
    { name: "BPO Vadodara", ventureId: v_bpo.id, city: "Vadodara", country: "India" },
    { name: "BPO Mohali", ventureId: v_bpo.id, city: "Mohali", country: "India" },
    { name: "SaaS HQ", ventureId: v_rmn.id, city: "San Francisco", country: "USA" },
    { name: "SaaS Support", ventureId: v_rmn.id, city: "Austin", country: "USA" },
  ];

  const offices: any[] = [];
  for (const o of officeData) {
    const office = await prisma.office.upsert({
      where: { name: o.name },
      update: {},
      create: o,
    });
    offices.push(office);
  }
  console.log(`✅ Created ${offices.length} offices`);

  console.log("\n👥 Creating 32 users...");

  const userDefs = [
    { email: "ceo@sioxglobal.com", name: "Herry Chokshi", role: UserRole.CEO, dept: Department.MANAGEMENT, ventures: ["all"] },
    { email: "admin@sioxglobal.com", name: "Admin User", role: UserRole.ADMIN, dept: Department.MANAGEMENT, ventures: ["all"] },
    { email: "cfo@sioxglobal.com", name: "CFO Finance", role: UserRole.VENTURE_HEAD, dept: Department.FINANCE, ventures: ["all"] },
    { email: "vp.siox@sioxglobal.com", name: "VP SIOX Logistics", role: UserRole.VENTURE_HEAD, dept: Department.OPERATIONS, ventures: ["siox"] },
    { email: "sales1.siox@sioxglobal.com", name: "Alex Sales", role: UserRole.EMPLOYEE, dept: Department.SHIPPER_SALES, ventures: ["siox"] },
    { email: "sales2.siox@sioxglobal.com", name: "Beth Sales Lead", role: UserRole.TEAM_LEAD, dept: Department.SHIPPER_SALES, ventures: ["siox"] },
    { email: "csr1.siox@sioxglobal.com", name: "Carlos CSR", role: UserRole.CSR, dept: Department.SHIPPER_SALES, ventures: ["siox"] },
    { email: "csr2.siox@sioxglobal.com", name: "Diana CSR", role: UserRole.CSR, dept: Department.SHIPPER_SALES, ventures: ["siox"] },
    { email: "dispatch1.siox@sioxglobal.com", name: "Eric Dispatch", role: UserRole.DISPATCHER, dept: Department.DISPATCH, ventures: ["siox"] },
    { email: "dispatch2.siox@sioxglobal.com", name: "Fiona Dispatch Lead", role: UserRole.TEAM_LEAD, dept: Department.DISPATCH, ventures: ["siox"] },
    { email: "carrier1.siox@sioxglobal.com", name: "Greg Carrier Rep", role: UserRole.CARRIER_TEAM, dept: Department.CARRIER_TEAM, ventures: ["siox"] },
    { email: "vp.mb@sioxglobal.com", name: "VP MB Logistics", role: UserRole.VENTURE_HEAD, dept: Department.OPERATIONS, ventures: ["mb"] },
    { email: "sales1.mb@sioxglobal.com", name: "Hannah Sales MB", role: UserRole.EMPLOYEE, dept: Department.SHIPPER_SALES, ventures: ["mb"] },
    { email: "csr1.mb@sioxglobal.com", name: "Ivan CSR MB", role: UserRole.CSR, dept: Department.SHIPPER_SALES, ventures: ["mb"] },
    { email: "dispatch1.mb@sioxglobal.com", name: "Julia Dispatch MB", role: UserRole.DISPATCHER, dept: Department.DISPATCH, ventures: ["mb"] },
    { email: "vp.transport@sioxglobal.com", name: "VP Transports", role: UserRole.VENTURE_HEAD, dept: Department.OPERATIONS, ventures: ["trans"] },
    { email: "fleet1.transport@sioxglobal.com", name: "Kyle Fleet Mgr", role: UserRole.EMPLOYEE, dept: Department.OPERATIONS, ventures: ["trans"] },
    { email: "safety1.transport@sioxglobal.com", name: "Laura Safety", role: UserRole.EMPLOYEE, dept: Department.OPERATIONS, ventures: ["trans"] },
    { email: "vp.hotels@sioxglobal.com", name: "VP Hotels", role: UserRole.VENTURE_HEAD, dept: Department.OPERATIONS, ventures: ["hotels"] },
    { email: "gm.miami@sioxglobal.com", name: "Mike GM Miami", role: UserRole.OFFICE_MANAGER, dept: Department.OPERATIONS, ventures: ["hotels"] },
    { email: "gm.la@sioxglobal.com", name: "Nancy GM LA", role: UserRole.OFFICE_MANAGER, dept: Department.OPERATIONS, ventures: ["hotels"] },
    { email: "frontdesk1@sioxglobal.com", name: "Oscar Front Desk", role: UserRole.EMPLOYEE, dept: Department.OPERATIONS, ventures: ["hotels"] },
    { email: "housekeeping1@sioxglobal.com", name: "Pam Housekeeping", role: UserRole.EMPLOYEE, dept: Department.OPERATIONS, ventures: ["hotels"] },
    { email: "vp.bpo@sioxglobal.com", name: "VP BPO", role: UserRole.VENTURE_HEAD, dept: Department.OPERATIONS, ventures: ["bpo"] },
    { email: "manager.vadodara@sioxglobal.com", name: "Qasim Vadodara Mgr", role: UserRole.OFFICE_MANAGER, dept: Department.OPERATIONS, ventures: ["bpo"] },
    { email: "agent1.bpo@sioxglobal.com", name: "Raj BPO Agent", role: UserRole.EMPLOYEE, dept: Department.OPERATIONS, ventures: ["bpo"] },
    { email: "agent2.bpo@sioxglobal.com", name: "Sita BPO Agent", role: UserRole.EMPLOYEE, dept: Department.OPERATIONS, ventures: ["bpo"] },
    { email: "agent3.bpo@sioxglobal.com", name: "Tanya BPO Agent", role: UserRole.EMPLOYEE, dept: Department.OPERATIONS, ventures: ["bpo"] },
    { email: "vp.saas@sioxglobal.com", name: "VP SaaS", role: UserRole.VENTURE_HEAD, dept: Department.OPERATIONS, ventures: ["rmn"] },
    { email: "sales1.saas@sioxglobal.com", name: "Uma SaaS Sales", role: UserRole.EMPLOYEE, dept: Department.SHIPPER_SALES, ventures: ["rmn"] },
    { email: "revmgr.saas@sioxglobal.com", name: "Victor Rev Manager", role: UserRole.EMPLOYEE, dept: Department.OPERATIONS, ventures: ["rmn"] },
    { email: "accounting1@sioxglobal.com", name: "Wendy Accounting", role: UserRole.ACCOUNTING, dept: Department.FINANCE, ventures: ["all"] },
  ];

  const users: Record<string, any> = {};
  for (const u of userDefs) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, fullName: u.name, role: u.role, legacyDepartment: u.dept, isActive: true, isTestUser: true },
    });
    users[u.email] = user;

    const ventureList = u.ventures.includes("all")
      ? Object.values(ventures)
      : u.ventures.map((v) => ventures[v as keyof typeof ventures]);

    for (const v of ventureList) {
      await prisma.ventureUser.upsert({
        where: { userId_ventureId: { userId: user.id, ventureId: v.id } },
        update: {},
        create: { userId: user.id, ventureId: v.id },
      });
    }
  }
  console.log(`✅ Created ${Object.keys(users).length} users with venture assignments`);

  const freightUsers = Object.values(users).filter((u: any) =>
    ["sales1.siox@sioxglobal.com", "sales2.siox@sioxglobal.com", "csr1.siox@sioxglobal.com", "csr2.siox@sioxglobal.com", 
     "dispatch1.siox@sioxglobal.com", "dispatch2.siox@sioxglobal.com", "carrier1.siox@sioxglobal.com",
     "sales1.mb@sioxglobal.com", "csr1.mb@sioxglobal.com", "dispatch1.mb@sioxglobal.com"].includes(u.email)
  );

  console.log("\n🏷️ Creating staff aliases for load attribution...");
  const staffAliases: any[] = [];
  for (const u of freightUsers) {
    const role = u.email.includes("sales") ? "SALES_AGENT" : u.email.includes("csr") ? "CSR" : "DISPATCHER";
    const alias = await prisma.staffAlias.upsert({
      where: { normalizedName: u.fullName.toLowerCase().replace(/\s+/g, "") },
      update: { userId: u.id },
      create: {
        name: u.fullName,
        normalizedName: u.fullName.toLowerCase().replace(/\s+/g, ""),
        role: role as any,
        userId: u.id,
        isPrimaryForUser: true,
      },
    });
    staffAliases.push(alias);
  }
  console.log(`✅ Created ${staffAliases.length} staff aliases`);

  console.log("\n🚛 Creating carriers...");
  const carriers: any[] = [];
  const PERFORMANCE_TIERS = [
    { tier: "excellent", pct: 0.20, onTime: [95, 99], claims: [0, 1] },
    { tier: "good", pct: 0.40, onTime: [85, 94], claims: [1, 3] },
    { tier: "average", pct: 0.30, onTime: [70, 84], claims: [3, 8] },
    { tier: "poor", pct: 0.10, onTime: [50, 69], claims: [8, 15] },
  ];

  for (let i = 0; i < CONFIG.NUM_CARRIERS; i++) {
    let tier = PERFORMANCE_TIERS[3];
    const rand = Math.random();
    if (rand < 0.20) tier = PERFORMANCE_TIERS[0];
    else if (rand < 0.60) tier = PERFORMANCE_TIERS[1];
    else if (rand < 0.90) tier = PERFORMANCE_TIERS[2];

    const mcNumber = `MC${String(100000 + i).padStart(7, "0")}`;
    const dotNumber = `DOT${String(200000 + i).padStart(7, "0")}`;

    const carrier = await prisma.carrier.upsert({
      where: { mcNumber },
      update: {},
      create: {
        name: `${randomItem(CARRIER_PREFIXES)} ${randomItem(CARRIER_SUFFIXES)} ${i + 1}`,
        mcNumber,
        dotNumber,
        tmsCarrierCode: `CR${String(i + 1).padStart(5, "0")}`,
        powerUnits: randomInt(1, 50),
        drivers: randomInt(1, 100),
        operatingStatus: tier.tier === "poor" && Math.random() < 0.3 ? "OUT_OF_SERVICE" : "AUTHORIZED",
        onTimePercentage: randomInt(tier.onTime[0], tier.onTime[1]),
        recentLoadsDelivered: randomInt(0, 500),
        active: tier.tier !== "poor" || Math.random() > 0.5,
        blocked: tier.tier === "poor" && Math.random() < 0.2,
        city: randomItem(["Atlanta", "Dallas", "Chicago", "Los Angeles", "Houston"]),
        state: randomItem(["GA", "TX", "IL", "CA", "FL"]),
      },
    });
    carriers.push(carrier);

    if ((i + 1) % 500 === 0) console.log(`   ${i + 1}/${CONFIG.NUM_CARRIERS} carriers...`);
  }
  console.log(`✅ Created ${carriers.length} carriers`);

  console.log("\n📦 Creating shippers with churn patterns...");
  const shippers: any[] = [];
  const CHURN_PATTERNS = [
    { status: ShipperChurnStatus.ACTIVE, pct: 0.50, loadsPerMonth: [8, 30] },
    { status: ShipperChurnStatus.AT_RISK, pct: 0.20, loadsPerMonth: [2, 8] },
    { status: ShipperChurnStatus.CHURNED, pct: 0.20, loadsPerMonth: [0, 0] },
    { status: ShipperChurnStatus.NEW, pct: 0.10, loadsPerMonth: [1, 5] },
  ];

  for (let i = 0; i < CONFIG.NUM_SHIPPERS; i++) {
    let pattern = CHURN_PATTERNS[0];
    const rand = Math.random();
    if (rand < 0.50) pattern = CHURN_PATTERNS[0];
    else if (rand < 0.70) pattern = CHURN_PATTERNS[1];
    else if (rand < 0.90) pattern = CHURN_PATTERNS[2];
    else pattern = CHURN_PATTERNS[3];

    const tmsCode = `SHP${String(i + 1).padStart(5, "0")}`;
    const ventureId = i % 2 === 0 ? v_siox.id : v_mb.id;

    const firstLoadDate = pattern.status === ShipperChurnStatus.NEW
      ? subtractDays(today, randomInt(1, 60))
      : subtractDays(today, randomInt(180, CONFIG.DAYS_OF_HISTORY));

    const lastLoadDate = pattern.status === ShipperChurnStatus.CHURNED
      ? subtractDays(today, randomInt(90, 365))
      : pattern.status === ShipperChurnStatus.AT_RISK
        ? subtractDays(today, randomInt(30, 90))
        : subtractDays(today, randomInt(0, 14));

    const shipper = await prisma.logisticsShipper.upsert({
      where: { tmsShipperCode: tmsCode },
      update: {},
      create: {
        name: `${randomItem(SHIPPER_INDUSTRIES)} ${randomItem(SHIPPER_SUFFIXES)} ${i + 1}`,
        tmsShipperCode: tmsCode,
        internalCode: `INT-SHP-${i + 1}`,
        ventureId,
        churnStatus: pattern.status,
        firstLoadDate,
        lastLoadDate,
        totalLoadsHistoric: randomInt(10, 500),
        avgLoadsPerMonth: randomFloat(pattern.loadsPerMonth[0], pattern.loadsPerMonth[1]),
        churnRiskScore: pattern.status === ShipperChurnStatus.CHURNED ? randomInt(80, 100)
          : pattern.status === ShipperChurnStatus.AT_RISK ? randomInt(50, 80)
          : randomInt(0, 30),
        city: randomItem(["Atlanta", "Dallas", "Chicago", "Los Angeles", "Houston", "Miami", "Seattle"]),
        state: randomItem(["GA", "TX", "IL", "CA", "FL", "WA"]),
      },
    });
    shippers.push(shipper);

    if ((i + 1) % 200 === 0) console.log(`   ${i + 1}/${CONFIG.NUM_SHIPPERS} shippers...`);
  }
  console.log(`✅ Created ${shippers.length} shippers`);

  console.log("\n🏢 Creating customers...");
  const customers: any[] = [];
  for (let i = 0; i < CONFIG.NUM_CUSTOMERS; i++) {
    const internalCode = `CUST${String(i + 1).padStart(4, "0")}`;
    const customer = await prisma.customer.upsert({
      where: { internalCode },
      update: {},
      create: {
        name: `${randomItem(SHIPPER_INDUSTRIES)} Customer ${i + 1}`,
        internalCode,
        tmsCustomerCode: `TMS-C${i + 1}`,
        ventureId: i % 2 === 0 ? v_siox.id : v_mb.id,
        vertical: randomItem(SHIPPER_INDUSTRIES),
      },
    });
    customers.push(customer);
  }
  console.log(`✅ Created ${customers.length} customers`);

  console.log("\n📋 Creating lost load reasons...");
  const lostReasons: any[] = [];
  for (const r of LOST_LOAD_REASONS) {
    let reason = await prisma.lostLoadReason.findFirst({ where: { name: r.name } });
    if (!reason) {
      reason = await prisma.lostLoadReason.create({ data: { name: r.name, category: r.category } });
    }
    lostReasons.push(reason);
  }
  console.log(`✅ Created ${lostReasons.length} lost load reasons`);

  console.log("\n📦 Creating loads (this may take a while)...");
  const freightVentures = [v_siox, v_mb];
  const freightOffices = offices.filter((o) => 
    ["SIOX Atlanta", "SIOX Dallas", "SIOX Chicago", "MB Houston", "MB Los Angeles"].includes(o.name)
  );

  const salesAliases = staffAliases.filter((a) => a.role === "SALES_AGENT");
  const csrAliases = staffAliases.filter((a) => a.role === "CSR");
  const dispatcherAliases = staffAliases.filter((a) => a.role === "DISPATCHER");

  const loadStatuses = [
    { status: LoadStatus.DELIVERED, weight: 0.65 },
    { status: LoadStatus.COVERED, weight: 0.15 },
    { status: LoadStatus.AT_RISK, weight: 0.08 },
    { status: LoadStatus.LOST, weight: 0.07 },
    { status: LoadStatus.FELL_OFF, weight: 0.03 },
    { status: LoadStatus.OPEN, weight: 0.02 },
  ];

  function pickStatus(): LoadStatus {
    const rand = Math.random();
    let cumulative = 0;
    for (const s of loadStatuses) {
      cumulative += s.weight;
      if (rand < cumulative) return s.status;
    }
    return LoadStatus.DELIVERED;
  }

  for (let i = 0; i < CONFIG.NUM_LOADS; i++) {
    const venture = randomItem(freightVentures);
    const ventureOffices = freightOffices.filter((o) => o.ventureId === venture.id);
    const office = ventureOffices.length > 0 ? randomItem(ventureOffices) : null;

    const lane = randomItem(FREIGHT_LANES);
    const [originCity, originState] = lane.origin.split(", ");
    const [destCity, destState] = lane.dest.split(", ");

    const daysAgo = randomInt(0, CONFIG.DAYS_OF_HISTORY);
    const pickupDate = subtractDays(today, daysAgo);
    const dropDate = addDays(pickupDate, randomInt(1, 4));
    const createdAt = subtractDays(pickupDate, randomInt(1, 7));

    const billAmount = randomInt(1200, 15000);
    const marginPct = randomFloat(0.08, 0.28);
    const costAmount = Math.round(billAmount * (1 - marginPct));

    const loadStatus = pickStatus();
    const atRiskFlag = loadStatus === LoadStatus.AT_RISK || loadStatus === LoadStatus.LOST || loadStatus === LoadStatus.FELL_OFF;

    const ventureCode = venture.code || "XX";
    const reference = `${ventureCode}-${originCity.slice(0, 3).toUpperCase()}-${destCity.slice(0, 3).toUpperCase()}-${10000 + i}`;

    await prisma.load.create({
      data: {
        reference,
        ventureId: venture.id,
        officeId: office?.id,
        customerId: randomItem(customers).id,
        shipperId: randomItem(shippers).id,
        carrierId: randomItem(carriers).id,
        createdById: freightUsers.length > 0 ? randomItem(freightUsers).id : null,
        salesAgentAliasId: salesAliases.length > 0 ? randomItem(salesAliases).id : null,
        csrAliasId: csrAliases.length > 0 ? randomItem(csrAliases).id : null,
        dispatcherAliasId: dispatcherAliases.length > 0 ? randomItem(dispatcherAliases).id : null,
        pickupCity: originCity,
        pickupState: originState,
        pickupDate,
        dropCity: destCity,
        dropState: destState,
        dropDate,
        billingDate: loadStatus === LoadStatus.DELIVERED ? addDays(dropDate, randomInt(1, 5)) : null,
        billAmount,
        costAmount,
        marginAmount: billAmount - costAmount,
        marginPercentage: marginPct * 100,
        miles: lane.miles + randomInt(-50, 50),
        loadStatus,
        atRiskFlag,
        lostAt: loadStatus === LoadStatus.LOST ? pickupDate : null,
        fellOffAt: (loadStatus === LoadStatus.LOST || loadStatus === LoadStatus.FELL_OFF) ? pickupDate : null,
        lostReasonId: loadStatus === LoadStatus.LOST ? randomItem(lostReasons).id : null,
        equipmentType: randomItem(["Dry Van", "Reefer", "Flatbed", "Step Deck", "Power Only"]),
        weightLbs: randomInt(10000, 45000),
        createdAt,
      },
    });

    if ((i + 1) % 500 === 0) console.log(`   ${i + 1}/${CONFIG.NUM_LOADS} loads...`);
  }
  console.log(`✅ Created ${CONFIG.NUM_LOADS} loads`);

  console.log("\n📊 Creating freight KPIs (calls, quotes, win/loss)...");
  let kpiCount = 0;
  const kpiSampleDays = Math.min(CONFIG.DAYS_OF_HISTORY, 365);
  
  for (const user of freightUsers) {
    const ventureId = user.email.includes(".mb@") ? v_mb.id : v_siox.id;
    const userOffices = freightOffices.filter((o) => o.ventureId === ventureId);
    const office = userOffices.length > 0 ? randomItem(userOffices) : null;

    for (let dayOffset = 0; dayOffset < kpiSampleDays; dayOffset += randomInt(1, 3)) {
      const date = subtractDays(today, dayOffset);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend && Math.random() < 0.8) continue;

      const callsMade = randomInt(20, 150);
      const quotesGiven = randomInt(5, 50);
      const quotesWon = Math.min(quotesGiven, randomInt(1, Math.ceil(quotesGiven * 0.35)));
      const revenueQuoted = quotesGiven * randomInt(1500, 8000);
      const revenueWon = quotesWon * randomInt(1500, 8000);

      await prisma.employeeKpiDaily.upsert({
        where: {
          userId_date_ventureId_officeId: {
            userId: user.id,
            date,
            ventureId,
            officeId: office?.id ?? 0,
          },
        },
        update: {},
        create: {
          userId: user.id,
          ventureId,
          officeId: office?.id,
          date,
          callsMade,
          hoursWorked: randomFloat(6, 10),
          quotesGiven,
          quotesWon,
          revenueGenerated: revenueWon,
          loadsTouched: randomInt(5, 30),
          loadsCovered: randomInt(1, 15),
          contactsMade: randomInt(10, 50),
        },
      });
      kpiCount++;
    }
  }
  console.log(`✅ Created ${kpiCount} employee KPI records`);

  console.log("\n📈 Creating freight daily KPIs...");
  let freightKpiCount = 0;
  for (const venture of freightVentures) {
    for (let dayOffset = 0; dayOffset < CONFIG.DAYS_OF_HISTORY; dayOffset++) {
      const date = subtractDays(today, dayOffset);

      await prisma.freightKpiDaily.upsert({
        where: { ventureId_date: { ventureId: venture.id, date } },
        update: {},
        create: {
          ventureId: venture.id,
          date,
          loadsInbound: randomInt(10, 50),
          loadsQuoted: randomInt(20, 80),
          loadsCovered: randomInt(8, 40),
          loadsLost: randomInt(0, 5),
          totalRevenue: randomFloat(20000, 150000),
          totalCost: randomFloat(15000, 120000),
          totalProfit: randomFloat(5000, 30000),
          avgMarginPct: randomFloat(12, 22),
          activeShippers: randomInt(50, 200),
          newShippers: randomInt(0, 5),
          churnedShippers: randomInt(0, 3),
          activeCarriers: randomInt(100, 500),
          newCarriers: randomInt(0, 10),
        },
      });
      freightKpiCount++;
    }
  }
  console.log(`✅ Created ${freightKpiCount} freight daily KPI records`);

  console.log("\n🏨 Creating hotel data...");
  const hotelCities = [
    "Miami, FL", "Los Angeles, CA", "Atlanta, GA", "Dallas, TX", "Houston, TX",
    "Chicago, IL", "Denver, CO", "Phoenix, AZ", "Seattle, WA", "Boston, MA",
    "New York, NY", "San Francisco, CA", "Las Vegas, NV", "Orlando, FL", "Nashville, TN",
    "Austin, TX", "San Diego, CA", "Tampa, FL", "Charlotte, NC", "Portland, OR"
  ];

  const hotelProperties: any[] = [];
  for (let i = 0; i < CONFIG.NUM_HOTEL_PROPERTIES; i++) {
    const [city, state] = hotelCities[i % hotelCities.length].split(", ");
    const property = await prisma.hotelProperty.upsert({
      where: { code: `HTL${String(i + 1).padStart(3, "0")}` },
      update: {},
      create: {
        name: `${randomItem(HOTEL_BRANDS)} ${randomItem(HOTEL_TYPES)} ${city}`,
        code: `HTL${String(i + 1).padStart(3, "0")}`,
        ventureId: v_hotels.id,
        brand: randomItem(HOTEL_BRANDS),
        city,
        state,
        rooms: randomInt(80, 200),
      },
    });
    hotelProperties.push(property);
  }
  console.log(`   Created ${hotelProperties.length} hotel properties`);

  let hotelKpiCount = 0;
  const hotelKpiSampleDays = Math.min(CONFIG.DAYS_OF_HISTORY, 730);
  
  for (const hotel of hotelProperties) {
    for (let dayOffset = 0; dayOffset < hotelKpiSampleDays; dayOffset++) {
      const date = subtractDays(today, dayOffset);
      const totalRooms = hotel.rooms || 100;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6 || date.getDay() === 5;
      const baseOccupancy = isWeekend ? 0.85 : 0.65;
      const occupancy = Math.min(0.98, baseOccupancy + randomFloat(-0.15, 0.15));
      const roomsSold = Math.round(totalRooms * occupancy);
      const adr = randomFloat(89, 199);
      const roomRevenue = roomsSold * adr;
      const otherRevenue = randomFloat(200, 2000);

      await prisma.hotelKpiDaily.upsert({
        where: { hotelId_date: { hotelId: hotel.id, date } },
        update: {},
        create: {
          hotelId: hotel.id,
          ventureId: v_hotels.id,
          date,
          roomsAvailable: totalRooms,
          roomsSold,
          occupancyPct: occupancy * 100,
          roomRevenue,
          adr,
          revpar: roomRevenue / totalRooms,
          otherRevenue,
          totalRevenue: roomRevenue + otherRevenue,
          grossOperatingProfit: (roomRevenue + otherRevenue) * randomFloat(0.3, 0.5),
          goppar: ((roomRevenue + otherRevenue) * randomFloat(0.3, 0.5)) / totalRooms,
          cancellations: randomInt(0, 5),
          noShows: randomInt(0, 3),
          walkins: randomInt(0, 10),
          complaints: randomInt(0, 2),
          reviewScore: randomFloat(3.8, 4.9),
        },
      });
      hotelKpiCount++;
    }
  }
  console.log(`   Created ${hotelKpiCount} hotel KPI records`);

  let reviewCount = 0;
  const reviewSources = [ReviewSource.GOOGLE, ReviewSource.TRIPADVISOR, ReviewSource.BOOKING, ReviewSource.EXPEDIA];
  for (const hotel of hotelProperties) {
    const numReviews = randomInt(50, 150);
    for (let i = 0; i < numReviews; i++) {
      await prisma.hotelReview.create({
        data: {
          hotelId: hotel.id,
          source: randomItem(reviewSources),
          rating: randomInt(2, 5),
          title: randomItem(["Great stay!", "Very comfortable", "Nice location", "Good value", "Excellent service", "Will return!", "Perfect getaway", "Needs improvement", "Average experience", "Highly recommend"]),
          comment: "Sample review comment for testing purposes.",
          reviewerName: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
          reviewDate: subtractDays(today, randomInt(1, CONFIG.DAYS_OF_HISTORY)),
        },
      });
      reviewCount++;
    }
  }
  console.log(`   Created ${reviewCount} hotel reviews`);
  console.log(`✅ Hotel data complete`);

  console.log("\n📞 Creating BPO data...");
  const bpoOffices = offices.filter((o) => o.name.includes("BPO"));
  const bpoUsers = Object.values(users).filter((u: any) =>
    ["agent1.bpo@sioxglobal.com", "agent2.bpo@sioxglobal.com", "agent3.bpo@sioxglobal.com"].includes(u.email)
  );

  const campaigns: any[] = [];
  for (let i = 0; i < CONFIG.NUM_BPO_CAMPAIGNS; i++) {
    const campaign = await prisma.bpoCampaign.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        name: BPO_CAMPAIGN_NAMES[i % BPO_CAMPAIGN_NAMES.length],
        clientName: `Client ${i + 1}`,
        ventureId: v_bpo.id,
        officeId: randomItem(bpoOffices).id,
        isActive: i < 12,
        vertical: randomItem(["Healthcare", "Insurance", "Finance", "Telecom", "Tech"]),
      },
    });
    campaigns.push(campaign);
  }
  console.log(`   Created ${campaigns.length} BPO campaigns`);

  const bpoAgents: any[] = [];
  for (const user of bpoUsers) {
    const agent = await prisma.bpoAgent.upsert({
      where: { id: bpoAgents.length + 1 },
      update: {},
      create: {
        userId: user.id,
        ventureId: v_bpo.id,
        campaignId: randomItem(campaigns).id,
        employeeId: `EMP${String(bpoAgents.length + 1).padStart(4, "0")}`,
        isActive: true,
        seatMonthlyCost: randomFloat(800, 1500),
      },
    });
    bpoAgents.push(agent);
  }
  console.log(`   Created ${bpoAgents.length} BPO agents`);

  let callLogCount = 0;
  const callLogSampleDays = Math.min(CONFIG.DAYS_OF_HISTORY, 365);
  
  for (const agent of bpoAgents) {
    for (let dayOffset = 0; dayOffset < callLogSampleDays; dayOffset++) {
      const date = subtractDays(today, dayOffset);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend) continue;

      const callsPerDay = randomInt(30, 80);
      for (let c = 0; c < callsPerDay; c++) {
        const startHour = randomInt(9, 17);
        const startMin = randomInt(0, 59);
        const callStart = new Date(date);
        callStart.setHours(startHour, startMin, 0, 0);

        const durationMin = randomInt(1, 15);
        const callEnd = new Date(callStart.getTime() + durationMin * 60000);

        const isConnected = Math.random() < 0.6;
        const appointmentSet = isConnected && Math.random() < 0.15;
        const dealWon = appointmentSet && Math.random() < 0.3;

        await prisma.bpoCallLog.create({
          data: {
            agentId: agent.id,
            ventureId: v_bpo.id,
            officeId: randomItem(bpoOffices).id,
            campaignId: randomItem(campaigns).id,
            callStartedAt: callStart,
            callEndedAt: callEnd,
            isConnected,
            appointmentSet,
            dealWon,
            revenue: dealWon ? randomFloat(100, 500) : 0,
          },
        });
        callLogCount++;
      }

      if (callLogCount % 10000 === 0) console.log(`   ${callLogCount} call logs...`);
    }
  }
  console.log(`   Created ${callLogCount} BPO call logs`);
  console.log(`✅ BPO data complete`);

  console.log("\n💻 Creating SaaS data...");
  const saasCustomers: any[] = [];
  const planNames = ["Starter", "Pro", "Enterprise"];
  const mrrByPlan: Record<string, number[]> = {
    Starter: [29, 49],
    Pro: [99, 199],
    Enterprise: [499, 999],
  };

  for (let i = 0; i < CONFIG.NUM_SAAS_CUSTOMERS; i++) {
    const customer = await prisma.saasCustomer.create({
      data: {
        ventureId: v_rmn.id,
        name: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)} Company`,
        email: `customer${i + 1}@example.com`,
        domain: `company${i + 1}.com`,
      },
    });
    saasCustomers.push(customer);

    const plan = randomItem(planNames);
    const mrr = randomInt(mrrByPlan[plan][0], mrrByPlan[plan][1]);
    const startedMonthsAgo = randomInt(1, 36);
    const startedAt = subtractDays(today, startedMonthsAgo * 30);
    const isActive = Math.random() > 0.15;
    const cancelledAt = !isActive ? subtractDays(today, randomInt(1, startedMonthsAgo * 30)) : null;

    await prisma.saasSubscription.create({
      data: {
        customerId: customer.id,
        planName: plan,
        mrr,
        startedAt,
        isActive,
        cancelledAt,
        cancelReason: cancelledAt ? randomItem(["Price", "Not using", "Competitor", "Budget cuts"]) : null,
      },
    });
  }
  console.log(`✅ Created ${saasCustomers.length} SaaS customers with subscriptions`);

  console.log("\n🏦 Creating Holdings data...");
  const bankAccounts: any[] = [];
  const currencies = ["USD", "USD", "USD", "INR", "EUR", "GBP"];
  const bankNames = ["Chase", "Bank of America", "Wells Fargo", "HDFC", "ICICI", "Barclays"];

  for (let i = 0; i < CONFIG.NUM_BANK_ACCOUNTS; i++) {
    const currency = currencies[i % currencies.length];
    const account = await prisma.bankAccount.create({
      data: {
        ventureId: [v_siox, v_mb, v_hotels, v_bpo, v_rmn][i % 5].id,
        name: `${bankNames[i % bankNames.length]} - ${currency} Account ${i + 1}`,
        bankName: bankNames[i % bankNames.length],
        accountNumber: `****${String(1000 + i).slice(-4)}`,
        currency,
      },
    });
    bankAccounts.push(account);

    let balance = randomFloat(10000, 500000);
    for (let dayOffset = 0; dayOffset < Math.min(CONFIG.DAYS_OF_HISTORY, 365); dayOffset += 7) {
      const date = subtractDays(today, dayOffset);
      balance += randomFloat(-20000, 50000);
      balance = Math.max(1000, balance);

      await prisma.bankSnapshot.create({
        data: {
          bankAccountId: account.id,
          balance,
          snapshotDate: date,
        },
      });
    }
  }
  console.log(`✅ Created ${bankAccounts.length} bank accounts with snapshots`);

  const holdingAssets: any[] = [];
  const assetTypes = ["Real Estate", "Vehicle", "Equipment", "Investment", "IP"];
  for (let i = 0; i < CONFIG.NUM_HOLDING_ASSETS; i++) {
    const asset = await prisma.holdingAsset.create({
      data: {
        name: `Asset ${i + 1} - ${randomItem(assetTypes)}`,
        type: randomItem(assetTypes),
        location: randomItem(["Atlanta, GA", "Dallas, TX", "Miami, FL", "Los Angeles, CA", "New York, NY"]),
        valueEstimate: randomFloat(50000, 5000000),
        acquiredDate: subtractDays(today, randomInt(30, CONFIG.DAYS_OF_HISTORY)),
        isActive: true,
      },
    });
    holdingAssets.push(asset);
  }
  console.log(`✅ Created ${holdingAssets.length} holding assets`);

  console.log("\n📋 Creating incentive plans...");
  for (const venture of [v_siox, v_mb, v_bpo, v_rmn]) {
    await prisma.incentivePlan.upsert({
      where: { id: venture.id },
      update: {},
      create: {
        ventureId: venture.id,
        name: `${venture.name} Incentive Plan`,
        isActive: true,
        effectiveFrom: subtractDays(today, CONFIG.DAYS_OF_HISTORY),
      },
    });
  }
  console.log(`✅ Created incentive plans`);

  console.log("\n🎯 Validation...");
  const counts = {
    ventures: await prisma.venture.count(),
    offices: await prisma.office.count(),
    users: await prisma.user.count(),
    carriers: await prisma.carrier.count(),
    shippers: await prisma.logisticsShipper.count(),
    customers: await prisma.customer.count(),
    loads: await prisma.load.count(),
    employeeKpis: await prisma.employeeKpiDaily.count(),
    freightKpis: await prisma.freightKpiDaily.count(),
    hotelProperties: await prisma.hotelProperty.count(),
    hotelKpis: await prisma.hotelKpiDaily.count(),
    hotelReviews: await prisma.hotelReview.count(),
    bpoCampaigns: await prisma.bpoCampaign.count(),
    bpoAgents: await prisma.bpoAgent.count(),
    bpoCallLogs: await prisma.bpoCallLog.count(),
    saasCustomers: await prisma.saasCustomer.count(),
    bankAccounts: await prisma.bankAccount.count(),
    holdingAssets: await prisma.holdingAsset.count(),
  };

  console.log("\n═══════════════════════════════════════════");
  console.log("📊 SEED COMPLETE - FINAL COUNTS");
  console.log("═══════════════════════════════════════════");
  console.log(`   Ventures:        ${counts.ventures}`);
  console.log(`   Offices:         ${counts.offices}`);
  console.log(`   Users:           ${counts.users}`);
  console.log(`   Carriers:        ${counts.carriers}`);
  console.log(`   Shippers:        ${counts.shippers}`);
  console.log(`   Customers:       ${counts.customers}`);
  console.log(`   Loads:           ${counts.loads}`);
  console.log(`   Employee KPIs:   ${counts.employeeKpis}`);
  console.log(`   Freight KPIs:    ${counts.freightKpis}`);
  console.log(`   Hotel Properties:${counts.hotelProperties}`);
  console.log(`   Hotel KPIs:      ${counts.hotelKpis}`);
  console.log(`   Hotel Reviews:   ${counts.hotelReviews}`);
  console.log(`   BPO Campaigns:   ${counts.bpoCampaigns}`);
  console.log(`   BPO Agents:      ${counts.bpoAgents}`);
  console.log(`   BPO Call Logs:   ${counts.bpoCallLogs}`);
  console.log(`   SaaS Customers:  ${counts.saasCustomers}`);
  console.log(`   Bank Accounts:   ${counts.bankAccounts}`);
  console.log(`   Holding Assets:  ${counts.holdingAssets}`);
  console.log("═══════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
