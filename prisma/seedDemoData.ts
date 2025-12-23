import { PrismaClient, LoadStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function seedDemoData() {
  console.log("🎯 Seeding demo data (shippers, carriers, loads only)...");

  const siox = await prisma.venture.findFirst({
    where: { slug: "siox-logistics" },
  });

  if (!siox) {
    throw new Error("SIOX Logistics venture not found. Run main seed first.");
  }

  console.log("🧹 Clearing existing demo data...");
  
  // Get load IDs to delete related records first
  const loadsToDelete = await prisma.load.findMany({
    where: { ventureId: siox.id },
    select: { id: true },
  });
  const loadIds = loadsToDelete.map((l) => l.id);

  if (loadIds.length > 0) {
    // Delete related records first
    await prisma.logisticsLoadEvent.deleteMany({ where: { loadId: { in: loadIds } } });
    await prisma.carrierContact.deleteMany({ where: { loadId: { in: loadIds } } });
    await prisma.load.deleteMany({ where: { ventureId: siox.id } });
  }
  
  // Delete carriers (need to handle related records)
  await prisma.carrierContact.deleteMany({});
  await prisma.carrierDispatcher.deleteMany({});
  await prisma.carrierPreferredLane.deleteMany({});
  await prisma.carrier.deleteMany({});
  
  // Delete customers
  await prisma.shipperPreferredLane.deleteMany({});
  await prisma.customer.deleteMany({ where: { ventureId: siox.id } });

  console.log("📦 Creating shippers (customers)...");
  const shipper1 = await prisma.customer.create({
    data: {
      name: "Walmart Distribution Center",
      email: "shipping@walmart.com",
      phone: "501-555-1000",
      address: "702 SW 8th St, Bentonville, AR 72716",
      tmsCustomerCode: "WAL-001",
      internalCode: "WALMART",
      vertical: "Retail",
      isActive: true,
      ventureId: siox.id,
    },
  });

  const shipper2 = await prisma.customer.create({
    data: {
      name: "Target Regional DC",
      email: "logistics@target.com",
      phone: "612-555-2000",
      address: "1000 Nicollet Mall, Minneapolis, MN 55403",
      tmsCustomerCode: "TGT-001",
      internalCode: "TARGET",
      vertical: "Retail",
      isActive: true,
      ventureId: siox.id,
    },
  });

  console.log("🚚 Creating carriers...");
  const carrier1 = await prisma.carrier.create({
    data: {
      name: "Swift Transportation",
      legalName: "Swift Transportation Co LLC",
      mcNumber: "MC-123456",
      dotNumber: "1234567",
      tmsCarrierCode: "SWIFT",
      email: "dispatch@swift.com",
      phone: "800-555-7946",
      city: "Phoenix",
      state: "AZ",
      country: "USA",
      equipmentTypes: "Dry Van, Reefer",
      powerUnits: 18500,
      rating: 95,
      active: true,
    },
  });

  const carrier2 = await prisma.carrier.create({
    data: {
      name: "JB Hunt Transport",
      legalName: "J.B. Hunt Transport Services Inc",
      mcNumber: "MC-234567",
      dotNumber: "2345678",
      tmsCarrierCode: "JBHUNT",
      email: "dispatch@jbhunt.com",
      phone: "800-555-4269",
      city: "Lowell",
      state: "AR",
      country: "USA",
      equipmentTypes: "Dry Van, Intermodal",
      powerUnits: 12000,
      rating: 92,
      active: true,
    },
  });

  const carrier3 = await prisma.carrier.create({
    data: {
      name: "Schneider National",
      legalName: "Schneider National Carriers Inc",
      mcNumber: "MC-345678",
      dotNumber: "3456789",
      tmsCarrierCode: "SCHNDR",
      email: "dispatch@schneider.com",
      phone: "800-555-8472",
      city: "Green Bay",
      state: "WI",
      country: "USA",
      equipmentTypes: "Dry Van, Flatbed, Reefer",
      powerUnits: 9500,
      rating: 94,
      active: true,
    },
  });

  console.log("📋 Creating freight loads...");
  const today = new Date();
  const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);

  // Load 1: Delivered
  await prisma.load.create({
    data: {
      reference: "SX-ATL-CHI-50001",
      customerName: "Walmart Distribution Center",
      shipperName: "Walmart DC Atlanta",
      pickupCity: "Atlanta",
      pickupState: "GA",
      pickupZip: "30301",
      pickupDate: addDays(today, -2),
      dropCity: "Chicago",
      dropState: "IL",
      dropZip: "60601",
      dropDate: addDays(today, -1),
      loadStatus: LoadStatus.DELIVERED,
      billAmount: 2850,
      costAmount: 2200,
      marginAmount: 650,
      customer: { connect: { id: shipper1.id } },
      carrier: { connect: { id: carrier1.id } },
      venture: { connect: { id: siox.id } },
    },
  });

  // Load 2: Covered
  await prisma.load.create({
    data: {
      reference: "SX-DAL-HOU-50002",
      customerName: "Target Regional DC",
      shipperName: "Target Dallas",
      pickupCity: "Dallas",
      pickupState: "TX",
      pickupZip: "75201",
      pickupDate: addDays(today, 0),
      dropCity: "Houston",
      dropState: "TX",
      dropZip: "77001",
      dropDate: addDays(today, 1),
      loadStatus: LoadStatus.COVERED,
      billAmount: 1450,
      costAmount: 1150,
      marginAmount: 300,
      customer: { connect: { id: shipper2.id } },
      carrier: { connect: { id: carrier2.id } },
      venture: { connect: { id: siox.id } },
    },
  });

  // Load 3: Open (no carrier yet)
  await prisma.load.create({
    data: {
      reference: "SX-LAX-PHX-50003",
      customerName: "Walmart Distribution Center",
      shipperName: "Walmart DC Los Angeles",
      pickupCity: "Los Angeles",
      pickupState: "CA",
      pickupZip: "90001",
      pickupDate: addDays(today, 1),
      dropCity: "Phoenix",
      dropState: "AZ",
      dropZip: "85001",
      dropDate: addDays(today, 2),
      loadStatus: LoadStatus.OPEN,
      sellRate: 1750,
      customer: { connect: { id: shipper1.id } },
      venture: { connect: { id: siox.id } },
    },
  });

  // Load 4: Working (in transit)
  await prisma.load.create({
    data: {
      reference: "SX-MIA-ORL-50004",
      customerName: "Target Regional DC",
      shipperName: "Target Miami",
      pickupCity: "Miami",
      pickupState: "FL",
      pickupZip: "33101",
      pickupDate: addDays(today, -1),
      dropCity: "Orlando",
      dropState: "FL",
      dropZip: "32801",
      dropDate: addDays(today, 0),
      loadStatus: LoadStatus.WORKING,
      billAmount: 1250,
      costAmount: 950,
      marginAmount: 300,
      customer: { connect: { id: shipper2.id } },
      carrier: { connect: { id: carrier3.id } },
      venture: { connect: { id: siox.id } },
    },
  });

  // Load 5: Open
  await prisma.load.create({
    data: {
      reference: "SX-SEA-PDX-50005",
      customerName: "Walmart Distribution Center",
      shipperName: "Walmart DC Seattle",
      pickupCity: "Seattle",
      pickupState: "WA",
      pickupZip: "98101",
      pickupDate: addDays(today, 2),
      dropCity: "Portland",
      dropState: "OR",
      dropZip: "97201",
      dropDate: addDays(today, 3),
      loadStatus: LoadStatus.OPEN,
      sellRate: 980,
      customer: { connect: { id: shipper1.id } },
      venture: { connect: { id: siox.id } },
    },
  });

  console.log("✅ Demo data seeded!");
  console.log(`
Summary:
  - 2 Shippers: Walmart DC, Target DC
  - 3 Carriers: Swift, JB Hunt, Schneider
  - 5 Loads: 1 Delivered, 1 Covered, 1 In Transit, 2 Open
  `);
}

seedDemoData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
