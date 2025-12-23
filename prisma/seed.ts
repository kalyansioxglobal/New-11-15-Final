import { PrismaClient, UserRole, Department, VentureType, LogisticsRole, PolicyType, LoadStatus } from "@prisma/client";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// FREIGHT SEEDING CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const FREIGHT_LANES = [
  { origin: "Atlanta, GA", dest: "Chicago, IL" },
  { origin: "Dallas, TX", dest: "Houston, TX" },
  { origin: "Los Angeles, CA", dest: "Phoenix, AZ" },
  { origin: "Miami, FL", dest: "Orlando, FL" },
  { origin: "Seattle, WA", dest: "Portland, OR" },
  { origin: "Denver, CO", dest: "Salt Lake City, UT" },
  { origin: "New York, NY", dest: "Philadelphia, PA" },
  { origin: "Detroit, MI", dest: "Cleveland, OH" },
  { origin: "Minneapolis, MN", dest: "Milwaukee, WI" },
  { origin: "Nashville, TN", dest: "Memphis, TN" },
];

const LOST_LOAD_REASONS = [
  "Carrier cancelled",
  "Rate too low",
  "No capacity",
  "Shipper cancelled",
  "Equipment mismatch",
  "Timing issue",
  "Competitor won",
  "Credit hold",
];

const OFFICE_CITIES = ["Atlanta", "Dallas", "Chicago", "Los Angeles", "Houston", "Phoenix", "Miami"];

const CONFIG = {
  NUM_SHIPPERS: 5,
  NUM_CARRIERS: 8,
  NUM_LOADS: 25,
  NUM_OFFICES_PER_VENTURE: 2,
};

const cityToCode = (city: string): string => {
  if (!city) return "XXX";
  const main = city.split(",")[0].trim();
  if (main.length <= 3) return main.toUpperCase();
  return main.slice(0, 3).toUpperCase();
};

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 86400000);
const today = new Date();

// ═══════════════════════════════════════════════════════════════
// HELPER: Seed Job Departments and Roles
// ═══════════════════════════════════════════════════════════════
async function seedJobDepartmentsAndRoles() {
  console.log("🏢 Creating job departments and roles...");

  // ───────────────────────────────────────────────
  // LOGISTICS (SIOX, MB Logistics)
  // ───────────────────────────────────────────────
  const logisticsSales = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Sales", ventureType: VentureType.LOGISTICS } },
    update: {},
    create: { name: "Sales", ventureType: VentureType.LOGISTICS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Sales Executive", departmentId: logisticsSales.id } },
    update: {},
    create: { name: "Sales Executive", departmentId: logisticsSales.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Sales Team Lead", departmentId: logisticsSales.id } },
    update: {},
    create: { name: "Sales Team Lead", departmentId: logisticsSales.id, isManager: true },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Sales Manager", departmentId: logisticsSales.id } },
    update: {},
    create: { name: "Sales Manager", departmentId: logisticsSales.id, isManager: true },
  });

  const logisticsCsr = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "CSR", ventureType: VentureType.LOGISTICS } },
    update: {},
    create: { name: "CSR", ventureType: VentureType.LOGISTICS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "CSR", departmentId: logisticsCsr.id } },
    update: {},
    create: { name: "CSR", departmentId: logisticsCsr.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "CSR Team Lead", departmentId: logisticsCsr.id } },
    update: {},
    create: { name: "CSR Team Lead", departmentId: logisticsCsr.id, isManager: true },
  });

  const logisticsDispatch = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Dispatch", ventureType: VentureType.LOGISTICS } },
    update: {},
    create: { name: "Dispatch", ventureType: VentureType.LOGISTICS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Dispatcher", departmentId: logisticsDispatch.id } },
    update: {},
    create: { name: "Dispatcher", departmentId: logisticsDispatch.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Dispatch Team Lead", departmentId: logisticsDispatch.id } },
    update: {},
    create: { name: "Dispatch Team Lead", departmentId: logisticsDispatch.id, isManager: true },
  });

  const logisticsCarrier = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Carrier Compliance", ventureType: VentureType.LOGISTICS } },
    update: {},
    create: { name: "Carrier Compliance", ventureType: VentureType.LOGISTICS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Carrier Compliance Specialist", departmentId: logisticsCarrier.id } },
    update: {},
    create: { name: "Carrier Compliance Specialist", departmentId: logisticsCarrier.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Carrier Onboarding", departmentId: logisticsCarrier.id } },
    update: {},
    create: { name: "Carrier Onboarding", departmentId: logisticsCarrier.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Carrier Sales Person", departmentId: logisticsCarrier.id } },
    update: {},
    create: { name: "Carrier Sales Person", departmentId: logisticsCarrier.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Carrier Sales Onboarder", departmentId: logisticsCarrier.id } },
    update: {},
    create: { name: "Carrier Sales Onboarder", departmentId: logisticsCarrier.id, isManager: false },
  });

  const logisticsCustomerCompliance = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Customer Compliance", ventureType: VentureType.LOGISTICS } },
    update: {},
    create: { name: "Customer Compliance", ventureType: VentureType.LOGISTICS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Customer Compliance Specialist", departmentId: logisticsCustomerCompliance.id } },
    update: {},
    create: { name: "Customer Compliance Specialist", departmentId: logisticsCustomerCompliance.id, isManager: false },
  });

  const logisticsAccounting = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Accounting", ventureType: VentureType.LOGISTICS } },
    update: {},
    create: { name: "Accounting", ventureType: VentureType.LOGISTICS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "AR", departmentId: logisticsAccounting.id } },
    update: {},
    create: { name: "AR", departmentId: logisticsAccounting.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "AP", departmentId: logisticsAccounting.id } },
    update: {},
    create: { name: "AP", departmentId: logisticsAccounting.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Accounting Manager", departmentId: logisticsAccounting.id } },
    update: {},
    create: { name: "Accounting Manager", departmentId: logisticsAccounting.id, isManager: true },
  });

  const logisticsQA = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "QA", ventureType: VentureType.LOGISTICS } },
    update: {},
    create: { name: "QA", ventureType: VentureType.LOGISTICS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Quality Control Analyst", departmentId: logisticsQA.id } },
    update: {},
    create: { name: "Quality Control Analyst", departmentId: logisticsQA.id, isManager: false },
  });

  const logisticsManagement = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Management", ventureType: VentureType.LOGISTICS } },
    update: {},
    create: { name: "Management", ventureType: VentureType.LOGISTICS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Venture Manager", departmentId: logisticsManagement.id } },
    update: {},
    create: { name: "Venture Manager", departmentId: logisticsManagement.id, isManager: true },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Office Manager", departmentId: logisticsManagement.id } },
    update: {},
    create: { name: "Office Manager", departmentId: logisticsManagement.id, isManager: true },
  });

  // ───────────────────────────────────────────────
  // HOSPITALITY (Chokshi Hotels)
  // ───────────────────────────────────────────────
  const hotelFrontOffice = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Front Office", ventureType: VentureType.HOSPITALITY } },
    update: {},
    create: { name: "Front Office", ventureType: VentureType.HOSPITALITY },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Front Desk Associate", departmentId: hotelFrontOffice.id } },
    update: {},
    create: { name: "Front Desk Associate", departmentId: hotelFrontOffice.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Front Desk Supervisor", departmentId: hotelFrontOffice.id } },
    update: {},
    create: { name: "Front Desk Supervisor", departmentId: hotelFrontOffice.id, isManager: true },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Front Desk Manager", departmentId: hotelFrontOffice.id } },
    update: {},
    create: { name: "Front Desk Manager", departmentId: hotelFrontOffice.id, isManager: true },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "AGM", departmentId: hotelFrontOffice.id } },
    update: {},
    create: { name: "AGM", departmentId: hotelFrontOffice.id, isManager: true },
  });

  const hotelHousekeeping = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Housekeeping", ventureType: VentureType.HOSPITALITY } },
    update: {},
    create: { name: "Housekeeping", ventureType: VentureType.HOSPITALITY },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Room Attendant", departmentId: hotelHousekeeping.id } },
    update: {},
    create: { name: "Room Attendant", departmentId: hotelHousekeeping.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Housekeeping Supervisor", departmentId: hotelHousekeeping.id } },
    update: {},
    create: { name: "Housekeeping Supervisor", departmentId: hotelHousekeeping.id, isManager: true },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Housekeeping Manager", departmentId: hotelHousekeeping.id } },
    update: {},
    create: { name: "Housekeeping Manager", departmentId: hotelHousekeeping.id, isManager: true },
  });

  const hotelMaintenance = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Maintenance", ventureType: VentureType.HOSPITALITY } },
    update: {},
    create: { name: "Maintenance", ventureType: VentureType.HOSPITALITY },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Maintenance Tech", departmentId: hotelMaintenance.id } },
    update: {},
    create: { name: "Maintenance Tech", departmentId: hotelMaintenance.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Maintenance Supervisor", departmentId: hotelMaintenance.id } },
    update: {},
    create: { name: "Maintenance Supervisor", departmentId: hotelMaintenance.id, isManager: true },
  });

  const hotelManagement = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Management", ventureType: VentureType.HOSPITALITY } },
    update: {},
    create: { name: "Management", ventureType: VentureType.HOSPITALITY },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "General Manager", departmentId: hotelManagement.id } },
    update: {},
    create: { name: "General Manager", departmentId: hotelManagement.id, isManager: true },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Operations Manager", departmentId: hotelManagement.id } },
    update: {},
    create: { name: "Operations Manager", departmentId: hotelManagement.id, isManager: true },
  });

  // ───────────────────────────────────────────────
  // SAAS (Rank Me Now)
  // ───────────────────────────────────────────────
  const saasSales = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Sales", ventureType: VentureType.SAAS } },
    update: {},
    create: { name: "Sales", ventureType: VentureType.SAAS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Sales Executive", departmentId: saasSales.id } },
    update: {},
    create: { name: "Sales Executive", departmentId: saasSales.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Sales Team Lead", departmentId: saasSales.id } },
    update: {},
    create: { name: "Sales Team Lead", departmentId: saasSales.id, isManager: true },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Head of Sales", departmentId: saasSales.id } },
    update: {},
    create: { name: "Head of Sales", departmentId: saasSales.id, isManager: true },
  });

  const saasRevenue = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Revenue Management", ventureType: VentureType.SAAS } },
    update: {},
    create: { name: "Revenue Management", ventureType: VentureType.SAAS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Revenue Manager", departmentId: saasRevenue.id } },
    update: {},
    create: { name: "Revenue Manager", departmentId: saasRevenue.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Head of Revenue Management", departmentId: saasRevenue.id } },
    update: {},
    create: { name: "Head of Revenue Management", departmentId: saasRevenue.id, isManager: true },
  });

  const saasReputation = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Reputation", ventureType: VentureType.SAAS } },
    update: {},
    create: { name: "Reputation", ventureType: VentureType.SAAS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Review Response Agent", departmentId: saasReputation.id } },
    update: {},
    create: { name: "Review Response Agent", departmentId: saasReputation.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Reputation Manager", departmentId: saasReputation.id } },
    update: {},
    create: { name: "Reputation Manager", departmentId: saasReputation.id, isManager: true },
  });

  const saasOperations = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Operations", ventureType: VentureType.SAAS } },
    update: {},
    create: { name: "Operations", ventureType: VentureType.SAAS },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Head of Revenue & Reputation", departmentId: saasOperations.id } },
    update: {},
    create: { name: "Head of Revenue & Reputation", departmentId: saasOperations.id, isManager: true },
  });

  // ───────────────────────────────────────────────
  // BPO (RevenelX)
  // ───────────────────────────────────────────────
  const bpoOperations = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Operations", ventureType: VentureType.BPO } },
    update: {},
    create: { name: "Operations", ventureType: VentureType.BPO },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "BPO Agent", departmentId: bpoOperations.id } },
    update: {},
    create: { name: "BPO Agent", departmentId: bpoOperations.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Client Account Owner", departmentId: bpoOperations.id } },
    update: {},
    create: { name: "Client Account Owner", departmentId: bpoOperations.id, isManager: true },
  });

  const bpoSales = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Sales", ventureType: VentureType.BPO } },
    update: {},
    create: { name: "Sales", ventureType: VentureType.BPO },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Sales Manager", departmentId: bpoSales.id } },
    update: {},
    create: { name: "Sales Manager", departmentId: bpoSales.id, isManager: true },
  });

  // ───────────────────────────────────────────────
  // TRANSPORT (SIOX Transports - Owner-Ops)
  // ───────────────────────────────────────────────
  const transportFleet = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Fleet", ventureType: VentureType.TRANSPORT } },
    update: {},
    create: { name: "Fleet", ventureType: VentureType.TRANSPORT },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Fleet Manager", departmentId: transportFleet.id } },
    update: {},
    create: { name: "Fleet Manager", departmentId: transportFleet.id, isManager: true },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Driver Manager", departmentId: transportFleet.id } },
    update: {},
    create: { name: "Driver Manager", departmentId: transportFleet.id, isManager: true },
  });

  const transportSafety = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Safety & Compliance", ventureType: VentureType.TRANSPORT } },
    update: {},
    create: { name: "Safety & Compliance", ventureType: VentureType.TRANSPORT },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Safety Officer", departmentId: transportSafety.id } },
    update: {},
    create: { name: "Safety Officer", departmentId: transportSafety.id, isManager: false },
  });
  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Compliance Coordinator", departmentId: transportSafety.id } },
    update: {},
    create: { name: "Compliance Coordinator", departmentId: transportSafety.id, isManager: false },
  });

  const transportDispatch = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Dispatch", ventureType: VentureType.TRANSPORT } },
    update: {},
    create: { name: "Dispatch", ventureType: VentureType.TRANSPORT },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Transport Dispatcher", departmentId: transportDispatch.id } },
    update: {},
    create: { name: "Transport Dispatcher", departmentId: transportDispatch.id, isManager: false },
  });

  const transportAccounting = await prisma.jobDepartment.upsert({
    where: { name_ventureType: { name: "Accounting", ventureType: VentureType.TRANSPORT } },
    update: {},
    create: { name: "Accounting", ventureType: VentureType.TRANSPORT },
  });

  await prisma.jobRole.upsert({
    where: { name_departmentId: { name: "Transport Accountant", departmentId: transportAccounting.id } },
    update: {},
    create: { name: "Transport Accountant", departmentId: transportAccounting.id, isManager: false },
  });

  console.log("✅ Job departments and roles seeded!");
}

async function main() {
  console.log("🌱 Seeding Command Center test data...");

  // ───────────────────────────────────────────────
  // 0. JOB DEPARTMENTS + ROLES (Run first)
  // ───────────────────────────────────────────────
  await seedJobDepartmentsAndRoles();

  // ───────────────────────────────────────────────
  // 1. VENTURES
  // ───────────────────────────────────────────────
  console.log("📦 Creating ventures...");

  const v_siox = await prisma.venture.upsert({
    where: { slug: "siox-logistics" },
    update: { code: "SX" },
    create: {
      name: "Siox Logistics",
      slug: "siox-logistics",
      code: "SX",
      type: VentureType.LOGISTICS,
      logisticsRole: LogisticsRole.BROKER,
      isActive: true,
    },
  });

  const v_mb = await prisma.venture.upsert({
    where: { slug: "mb-logistics" },
    update: { code: "MB" },
    create: {
      name: "MB Logistics",
      slug: "mb-logistics",
      code: "MB",
      type: VentureType.LOGISTICS,
      logisticsRole: LogisticsRole.BROKER,
      isActive: true,
    },
  });

  const v_trans = await prisma.venture.upsert({
    where: { slug: "siox-transports" },
    update: { code: "ST" },
    create: {
      name: "Siox Transports",
      slug: "siox-transports",
      code: "ST",
      type: VentureType.LOGISTICS,
      logisticsRole: LogisticsRole.CARRIER,
      isActive: true,
    },
  });

  const v_rmn = await prisma.venture.upsert({
    where: { slug: "rank-me-now" },
    update: { code: "RM" },
    create: {
      name: "Rank Me Now",
      slug: "rank-me-now",
      code: "RM",
      type: VentureType.SAAS,
      isActive: true,
    },
  });

  const v_bpo = await prisma.venture.upsert({
    where: { slug: "revenelx" },
    update: { code: "RX" },
    create: {
      name: "RevenelX",
      slug: "revenelx",
      code: "RX",
      type: VentureType.BPO,
      isActive: true,
    },
  });

  const v_hotels = await prisma.venture.upsert({
    where: { slug: "chokshi-hotels" },
    update: { code: "CH" },
    create: {
      name: "Chokshi Hotels",
      slug: "chokshi-hotels",
      code: "CH",
      type: VentureType.HOSPITALITY,
      isActive: true,
    },
  });

  // ───────────────────────────────────────────────
  // 2. USERS (ALL ROLES)
  // ───────────────────────────────────────────────
  console.log("👤 Creating users...");

  const u_ceo = await prisma.user.upsert({
    where: { email: "ceo@sioxglobal.com" },
    update: {},
    create: {
      fullName: "Herry Chokshi",
      email: "ceo@sioxglobal.com",
      role: UserRole.CEO,
      legacyDepartment: Department.MANAGEMENT,
      phone: "9999999999",
      isActive: true,
    },
  });

  const u_herry = await prisma.user.upsert({
    where: { email: "herry@sioxglobal.com" },
    update: {},
    create: {
      fullName: "Herry Chokshi",
      email: "herry@sioxglobal.com",
      role: UserRole.CEO,
      legacyDepartment: Department.MANAGEMENT,
      phone: "9999999998",
      isActive: true,
    },
  });

  const u_admin = await prisma.user.upsert({
    where: { email: "admin@sioxglobal.com" },
    update: {},
    create: {
      fullName: "Admin User",
      email: "admin@sioxglobal.com",
      role: UserRole.ADMIN,
      legacyDepartment: Department.MANAGEMENT,
      phone: "1111111111",
      isActive: true,
    },
  });

  const u_siox_manager = await prisma.user.upsert({
    where: { email: "manager.siox@sioxglobal.com" },
    update: {},
    create: {
      fullName: "Siox Logistics Manager",
      email: "manager.siox@sioxglobal.com",
      role: UserRole.VENTURE_HEAD,
      legacyDepartment: Department.OPERATIONS,
      phone: "2222222222",
      isActive: true,
    },
  });

  const u_csr = await prisma.user.upsert({
    where: { email: "csr1@sioxglobal.com" },
    update: {},
    create: {
      fullName: "CSR A",
      email: "csr1@sioxglobal.com",
      role: UserRole.EMPLOYEE,
      legacyDepartment: Department.SHIPPER_SALES,
      phone: "3333333333",
      isActive: true,
    },
  });

  const u_dispatch = await prisma.user.upsert({
    where: { email: "dispatch1@sioxglobal.com" },
    update: {},
    create: {
      fullName: "Dispatcher A",
      email: "dispatch1@sioxglobal.com",
      role: UserRole.EMPLOYEE,
      legacyDepartment: Department.DISPATCH,
      phone: "4444444444",
      isActive: true,
    },
  });

  const u_carrier = await prisma.user.upsert({
    where: { email: "carrierrep@sioxglobal.com" },
    update: {},
    create: {
      fullName: "Carrier Rep A",
      email: "carrierrep@sioxglobal.com",
      role: UserRole.EMPLOYEE,
      legacyDepartment: Department.CARRIER_TEAM,
      phone: "5555555555",
      isActive: true,
    },
  });

  const u_mb_manager = await prisma.user.upsert({
    where: { email: "manager.mb@sioxglobal.com" },
    update: {},
    create: {
      fullName: "MB Logistics Manager",
      email: "manager.mb@sioxglobal.com",
      role: UserRole.VENTURE_HEAD,
      legacyDepartment: Department.OPERATIONS,
      phone: "6666666666",
      isActive: true,
    },
  });

  const u_rmn_manager = await prisma.user.upsert({
    where: { email: "manager.rmn@sioxglobal.com" },
    update: {},
    create: {
      fullName: "Rank Me Now Manager",
      email: "manager.rmn@sioxglobal.com",
      role: UserRole.VENTURE_HEAD,
      legacyDepartment: Department.OPERATIONS,
      phone: "7777777777",
      isActive: true,
    },
  });

  const u_hotels_manager = await prisma.user.upsert({
    where: { email: "manager.hotel@sioxglobal.com" },
    update: {},
    create: {
      fullName: "Hotel Manager",
      email: "manager.hotel@sioxglobal.com",
      role: UserRole.VENTURE_HEAD,
      legacyDepartment: Department.OPERATIONS,
      phone: "8888888888",
      isActive: true,
    },
  });

  // ───────────────────────────────────────────────
  // 3. USER → VENTURE ASSIGNMENTS (SCOPE)
  // ───────────────────────────────────────────────
  console.log("🔗 Creating user-venture assignments...");

  const ventureAssignments = [
    // CEO sees all ventures
    { userId: u_ceo.id, ventureId: v_siox.id },
    { userId: u_ceo.id, ventureId: v_mb.id },
    { userId: u_ceo.id, ventureId: v_trans.id },
    { userId: u_ceo.id, ventureId: v_rmn.id },
    { userId: u_ceo.id, ventureId: v_bpo.id },
    { userId: u_ceo.id, ventureId: v_hotels.id },

    // Admin sees logistics ventures
    { userId: u_admin.id, ventureId: v_siox.id },
    { userId: u_admin.id, ventureId: v_mb.id },

    // Venture managers see their own ventures
    { userId: u_siox_manager.id, ventureId: v_siox.id },
    { userId: u_mb_manager.id, ventureId: v_mb.id },
    { userId: u_rmn_manager.id, ventureId: v_rmn.id },
    { userId: u_hotels_manager.id, ventureId: v_hotels.id },

    // CSR/Dispatch/Carrier only → Siox Logistics
    { userId: u_csr.id, ventureId: v_siox.id },
    { userId: u_dispatch.id, ventureId: v_siox.id },
    { userId: u_carrier.id, ventureId: v_siox.id },
  ];

  for (const va of ventureAssignments) {
    await prisma.ventureUser.upsert({
      where: { userId_ventureId: { userId: va.userId, ventureId: va.ventureId } },
      update: {},
      create: va,
    });
  }

  // ───────────────────────────────────────────────
  // 4. SHIPPERS + INTERNAL CODES
  // ───────────────────────────────────────────────
  console.log("📦 Creating shippers...");

  const shipper_walmart = await prisma.logisticsShipper.upsert({
    where: { tmsShipperCode: "WM123" },
    update: {},
    create: {
      ventureId: v_siox.id,
      name: "Walmart DC",
      email: "dc@walmart.com",
      tmsShipperCode: "WM123",
      internalCode: "INT-WM-001",
    },
  });

  const shipper_target = await prisma.logisticsShipper.upsert({
    where: { tmsShipperCode: "TG445" },
    update: {},
    create: {
      ventureId: v_siox.id,
      name: "Target Warehouse",
      email: "ops@target.com",
      tmsShipperCode: "TG445",
      internalCode: "INT-TG-002",
    },
  });

  // ───────────────────────────────────────────────
  // 5. CARRIERS (BROKER + DEDICATED)
  // ───────────────────────────────────────────────
  console.log("🚚 Creating carriers...");

  const carrier_swift = await prisma.carrier.upsert({
    where: { mcNumber: "MC123456" },
    update: {},
    create: {
      name: "Swift Transportation",
      mcNumber: "MC123456",
      dotNumber: "DOT555111",
      tmsCarrierCode: "CR-SWIFT",
    },
  });

  const carrier_jbhunt = await prisma.carrier.upsert({
    where: { mcNumber: "MC789101" },
    update: {},
    create: {
      name: "JB Hunt Transport",
      mcNumber: "MC789101",
      dotNumber: "DOT222333",
      tmsCarrierCode: "CR-JBHUNT",
    },
  });

  // ───────────────────────────────────────────────
  // 6. CUSTOMERS (BROKERAGE ONLY)
  // ───────────────────────────────────────────────
  console.log("🏢 Creating customers...");

  const c_amazon = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Amazon Fulfillment",
      email: "ship@amazon.com",
      ventureId: v_siox.id,
    },
  });

  const c_costco = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Costco Distribution",
      email: "ship@costco.com",
      ventureId: v_mb.id,
    },
  });

  // ───────────────────────────────────────────────
  // 7. LOADS (BROKER LOADS WITH CODED REFERENCES)
  // ───────────────────────────────────────────────
  console.log("📋 Creating loads with coded references...");

  const freightVentures = [v_siox, v_mb];
  const ventureCodeById: Record<number, string> = {
    [v_siox.id]: "SX",
    [v_mb.id]: "MB",
  };

  const lostReasons = [];
  for (const reason of LOST_LOAD_REASONS) {
    const existing = await prisma.lostLoadReason.findFirst({ where: { name: reason } });
    if (existing) {
      lostReasons.push(existing);
    } else {
      const r = await prisma.lostLoadReason.create({
        data: { name: reason, category: reason.includes("Carrier") ? "CARRIER" : reason.includes("Shipper") ? "SHIPPER" : "OPERATIONS" },
      });
      lostReasons.push(r);
    }
  }

  const allCarriers = [carrier_swift, carrier_jbhunt];
  const allShippers = [shipper_walmart, shipper_target];
  const allCustomers = [c_amazon, c_costco];

  for (let i = 0; i < CONFIG.NUM_LOADS; i++) {
    const venture = randomItem(freightVentures);
    const carrier = randomItem(allCarriers);
    const shipper = randomItem(allShippers);
    const customer = randomItem(allCustomers);
    const lane = randomItem(FREIGHT_LANES);

    const createdAt = addDays(today, -randomInt(0, 30));
    const pickupDate = addDays(createdAt, randomInt(1, 5));
    const dropDate = addDays(pickupDate, randomInt(1, 3));

    const billAmount = randomInt(1500, 5000);
    const costAmount = Math.round(billAmount * (0.70 + Math.random() * 0.22));
    const marginAmount = billAmount - costAmount;
    const marginPercentage = Math.round((marginAmount / billAmount) * 100);

    const ventureCode = ventureCodeById[venture.id] || "XX";
    const originCode = cityToCode(lane.origin);
    const destCode = cityToCode(lane.dest);
    const seq = 10000 + i;
    const reference = `${ventureCode}-${originCode}-${destCode}-${seq}`;

    const rnd = Math.random();
    let loadStatus: LoadStatus = LoadStatus.OPEN;
    let atRiskFlag = false;
    let lostAt: Date | null = null;
    let fellOffAt: Date | null = null;
    let lostReasonId: number | null = null;

    if (rnd < 0.50) {
      loadStatus = LoadStatus.DELIVERED;
    } else if (rnd < 0.70) {
      loadStatus = LoadStatus.COVERED;
    } else if (rnd < 0.85) {
      loadStatus = LoadStatus.AT_RISK;
      atRiskFlag = true;
    } else if (rnd < 0.92) {
      loadStatus = LoadStatus.FELL_OFF;
      atRiskFlag = true;
      fellOffAt = addDays(createdAt, randomInt(0, 3));
    } else {
      loadStatus = LoadStatus.LOST;
      atRiskFlag = true;
      lostAt = addDays(createdAt, randomInt(0, 5));
      fellOffAt = addDays(createdAt, randomInt(0, 3));
      lostReasonId = randomItem(lostReasons).id;
    }

    const [originCity, originState] = lane.origin.split(", ");
    const [destCity, destState] = lane.dest.split(", ");

    const load = await prisma.load.create({
      data: {
        reference,
        ventureId: venture.id,
        customerId: customer.id,
        shipperId: shipper.id,
        carrierId: carrier.id,
        pickupCity: originCity,
        pickupState: originState,
        pickupDate,
        dropCity: destCity,
        dropState: destState,
        dropDate,
        billAmount,
        costAmount,
        marginAmount,
        marginPercentage,
        loadStatus,
        atRiskFlag,
        lostAt,
        fellOffAt,
        lostReasonId,
        equipmentType: randomItem(["Dry Van", "Reefer", "Flatbed"]),
        weightLbs: randomInt(10000, 45000),
        createdAt,
        isTest: true,
      },
    });

    const events: { type: string; offset: number }[] = [
      { type: "STATUS_CHANGED", offset: 0 },
    ];
    if (loadStatus === LoadStatus.COVERED || loadStatus === LoadStatus.DELIVERED) {
      events.push({ type: "CARRIER_OFFERED", offset: 1 });
      events.push({ type: "STATUS_CHANGED", offset: 2 });
    }
    if (loadStatus === LoadStatus.FELL_OFF) {
      events.push({ type: "FELL_OFF", offset: 2 });
    }
    if (loadStatus === LoadStatus.LOST) {
      events.push({ type: "FELL_OFF", offset: 2 });
      events.push({ type: "LOST_CONFIRMED", offset: 3 });
    }

    for (const ev of events) {
      await prisma.logisticsLoadEvent.create({
        data: {
          loadId: load.id,
          type: ev.type as any,
          createdAt: addDays(createdAt, ev.offset),
          createdById: u_dispatch.id,
          message: `Auto-seeded event: ${ev.type}`,
        },
      });
    }
  }

  console.log(`✅ Created ${CONFIG.NUM_LOADS} loads with coded references`);

  // ───────────────────────────────────────────────
  // 8. TASKS + POLICIES
  // ───────────────────────────────────────────────
  console.log("📋 Creating tasks and policies...");

  await prisma.task.create({
    data: {
      title: "Daily Load Review",
      description: "Review all open loads and update statuses",
      ventureId: v_siox.id,
      assignedTo: u_siox_manager.id,
      dueDate: new Date(),
      isTest: true,
    },
  });

  await prisma.task.create({
    data: {
      title: "Hotel P&L Upload",
      description: "Upload daily hotel P&L reports",
      ventureId: v_hotels.id,
      assignedTo: u_hotels_manager.id,
      dueDate: new Date(),
      isTest: true,
    },
  });

  await prisma.policy.create({
    data: {
      name: "Broker Carrier Compliance",
      type: PolicyType.CONTRACT,
      ventureId: v_siox.id,
      endDate: new Date(Date.now() + 86400000 * 30),
      isTest: true,
    },
  });

  await prisma.policy.create({
    data: {
      name: "Hotel Fire Safety",
      type: PolicyType.PERMIT,
      ventureId: v_hotels.id,
      endDate: new Date(Date.now() + 86400000 * 60),
      isTest: true,
    },
  });

  // ───────────────────────────────────────────────
  // 9. USER MAPPINGS (RingCentral / TMS)
  // ───────────────────────────────────────────────
  console.log("🔗 Creating user mappings...");

  await prisma.userMapping.upsert({
    where: { userId: u_dispatch.id },
    update: {},
    create: {
      userId: u_dispatch.id,
      rcExtension: "104",
    },
  });

  await prisma.userMapping.upsert({
    where: { userId: u_csr.id },
    update: {},
    create: {
      userId: u_csr.id,
      rcExtension: "105",
    },
  });

  console.log("✅ Seed complete!");
  console.log(`
Summary:
  - 6 Ventures with codes (SX, MB, ST, RM, RX, CH)
  - 9 Users (1 CEO, 1 Admin, 4 Venture Managers, 3 Employees)
  - 2 Shippers (Walmart DC, Target Warehouse)
  - 2 Carriers (Swift, JB Hunt)
  - 2 Customers (Amazon, Costco)
  - ${CONFIG.NUM_LOADS} Loads with coded references (e.g., SX-ATL-CHI-10000)
  - 8 Lost Load Reasons
  - 2 Tasks
  - 2 Policies
  - 2 User Mappings
  `);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
