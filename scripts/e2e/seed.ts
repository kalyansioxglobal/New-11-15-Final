import { PrismaClient, VentureType, LogisticsRole, UserRole, LoadStatus } from "@prisma/client";

const prisma = new PrismaClient();

const SIOX_VENTURE = {
  name: "SIOX E2E",
  type: VentureType.LOGISTICS,
  logisticsRole: LogisticsRole.BROKER,
};

const MB_VENTURE = {
  name: "MB E2E",
  type: VentureType.LOGISTICS,
  logisticsRole: LogisticsRole.BROKER,
};

const TEST_USERS: Array<{
  email: string;
  fullName: string;
  role: UserRole;
  assignToVenture: "both" | "siox" | "mb";
}> = [
  {
    email: "admin@siox.test",
    fullName: "E2E Admin",
    role: UserRole.CEO,
    assignToVenture: "both",
  },
  {
    email: "manager@siox.test",
    fullName: "SIOX Manager",
    role: UserRole.OFFICE_MANAGER,
    assignToVenture: "siox",
  },
  {
    email: "manager@mb.test",
    fullName: "MB Manager",
    role: UserRole.OFFICE_MANAGER,
    assignToVenture: "mb",
  },
];

async function seed() {
  console.log("[E2E SEED] Starting E2E seed...");

  const sioxVenture = await prisma.venture.upsert({
    where: { name_logisticsRole: { name: SIOX_VENTURE.name, logisticsRole: SIOX_VENTURE.logisticsRole } },
    update: {},
    create: {
      name: SIOX_VENTURE.name,
      type: SIOX_VENTURE.type,
      logisticsRole: SIOX_VENTURE.logisticsRole,
    },
  });
  console.log(`[E2E SEED] SIOX venture ID: ${sioxVenture.id}`);

  const mbVenture = await prisma.venture.upsert({
    where: { name_logisticsRole: { name: MB_VENTURE.name, logisticsRole: MB_VENTURE.logisticsRole } },
    update: {},
    create: {
      name: MB_VENTURE.name,
      type: MB_VENTURE.type,
      logisticsRole: MB_VENTURE.logisticsRole,
    },
  });
  console.log(`[E2E SEED] MB venture ID: ${mbVenture.id}`);

  for (const userData of TEST_USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { fullName: userData.fullName, role: userData.role },
      create: {
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
      },
    });
    console.log(`[E2E SEED] User ${userData.email} ID: ${user.id}`);

    if (userData.assignToVenture === "both" || userData.assignToVenture === "siox") {
      await prisma.ventureUser.upsert({
        where: { userId_ventureId: { userId: user.id, ventureId: sioxVenture.id } },
        update: {},
        create: { userId: user.id, ventureId: sioxVenture.id },
      });
    }
    if (userData.assignToVenture === "both" || userData.assignToVenture === "mb") {
      await prisma.ventureUser.upsert({
        where: { userId_ventureId: { userId: user.id, ventureId: mbVenture.id } },
        update: {},
        create: { userId: user.id, ventureId: mbVenture.id },
      });
    }
  }

  const cities = [
    { origin: "Dallas", destination: "Houston", state: "TX" },
    { origin: "Chicago", destination: "Detroit", state: "IL" },
    { origin: "Atlanta", destination: "Miami", state: "GA" },
    { origin: "Los Angeles", destination: "Phoenix", state: "CA" },
    { origin: "Seattle", destination: "Portland", state: "WA" },
  ];

  for (let i = 1; i <= 10; i++) {
    const city = cities[(i - 1) % cities.length];
    const existingLoad = await prisma.load.findUnique({ where: { id: 100000 + i } });
    if (!existingLoad) {
      await prisma.load.create({
        data: {
          id: 100000 + i,
          ventureId: sioxVenture.id,
          pickupCity: city.origin,
          pickupState: city.state,
          dropCity: city.destination,
          dropState: city.state,
          loadStatus: i <= 3 ? LoadStatus.OPEN : i <= 6 ? LoadStatus.COVERED : LoadStatus.DELIVERED,
          pickupDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          scheduledDeliveryAt: new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000),
          sellRate: 1500 + i * 100,
          costAmount: 1200 + i * 80,
          equipmentType: "DRY_VAN",
        },
      });
    }
  }
  console.log("[E2E SEED] Created 10 SIOX loads");

  for (let i = 1; i <= 10; i++) {
    const city = cities[(i - 1) % cities.length];
    const existingLoad = await prisma.load.findUnique({ where: { id: 200000 + i } });
    if (!existingLoad) {
      await prisma.load.create({
        data: {
          id: 200000 + i,
          ventureId: mbVenture.id,
          pickupCity: city.destination,
          pickupState: city.state,
          dropCity: city.origin,
          dropState: city.state,
          loadStatus: i <= 3 ? LoadStatus.OPEN : i <= 6 ? LoadStatus.COVERED : LoadStatus.DELIVERED,
          pickupDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          scheduledDeliveryAt: new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000),
          sellRate: 1600 + i * 100,
          costAmount: 1300 + i * 80,
          equipmentType: "FLATBED",
        },
      });
    }
  }
  console.log("[E2E SEED] Created 10 MB loads");

  for (let i = 1; i <= 20; i++) {
    const hasContact = i <= 10;
    const existingCarrier = await prisma.carrier.findUnique({ where: { id: 100000 + i } });
    if (!existingCarrier) {
      await prisma.carrier.create({
        data: {
          id: 100000 + i,
          name: `SIOX Carrier ${i}`,
          mcNumber: `MC-SIOX-${String(i).padStart(4, "0")}`,
          dotNumber: `DOT-SIOX-${String(i).padStart(6, "0")}`,
          email: hasContact ? `carrier${i}@siox-e2e.test` : null,
          phone: hasContact ? `555-SIOX-${String(i).padStart(4, "0")}` : null,
          active: true,
          blocked: false,
          fmcsaAuthorized: true,
        },
      });
    }
  }
  console.log("[E2E SEED] Created 20 SIOX carriers");

  for (let i = 1; i <= 20; i++) {
    const hasContact = i <= 10;
    const existingCarrier = await prisma.carrier.findUnique({ where: { id: 200000 + i } });
    if (!existingCarrier) {
      await prisma.carrier.create({
        data: {
          id: 200000 + i,
          name: `MB Carrier ${i}`,
          mcNumber: `MC-MB-${String(i).padStart(4, "0")}`,
          dotNumber: `DOT-MB-${String(i).padStart(6, "0")}`,
          email: hasContact ? `carrier${i}@mb-e2e.test` : null,
          phone: hasContact ? `555-MB-${String(i).padStart(4, "0")}` : null,
          active: true,
          blocked: false,
          fmcsaAuthorized: true,
        },
      });
    }
  }
  console.log("[E2E SEED] Created 20 MB carriers");

  await prisma.ventureOutboundConfig.upsert({
    where: { ventureId: sioxVenture.id },
    update: { isEnabled: true },
    create: {
      ventureId: sioxVenture.id,
      emailProvider: "sendgrid",
      smsProvider: "twilio",
      sendgridApiKeyEnv: "SENDGRID_API_KEY",
      sendgridFromEmail: "dispatch@siox-e2e.test",
      sendgridFromName: "SIOX E2E Dispatch",
      twilioAccountSidEnv: "TWILIO_ACCOUNT_SID",
      twilioAuthTokenEnv: "TWILIO_AUTH_TOKEN",
      twilioFromNumber: "+15551234567",
      isEnabled: true,
    },
  });

  await prisma.ventureOutboundConfig.upsert({
    where: { ventureId: mbVenture.id },
    update: { isEnabled: true },
    create: {
      ventureId: mbVenture.id,
      emailProvider: "sendgrid",
      smsProvider: "twilio",
      sendgridApiKeyEnv: "SENDGRID_API_KEY",
      sendgridFromEmail: "dispatch@mb-e2e.test",
      sendgridFromName: "MB E2E Dispatch",
      twilioAccountSidEnv: "TWILIO_ACCOUNT_SID",
      twilioAuthTokenEnv: "TWILIO_AUTH_TOKEN",
      twilioFromNumber: "+15559876543",
      isEnabled: true,
    },
  });
  console.log("[E2E SEED] Created VentureOutboundConfig for both ventures");

  // Verification step
  const sioxLoadCount = await prisma.load.count({
    where: { id: { gte: 100001, lte: 100010 } },
  });
  const mbLoadCount = await prisma.load.count({
    where: { id: { gte: 200001, lte: 200010 } },
  });
  const sioxCarrierCount = await prisma.carrier.count({
    where: { id: { gte: 100001, lte: 100020 } },
  });
  const mbCarrierCount = await prisma.carrier.count({
    where: { id: { gte: 200001, lte: 200020 } },
  });
  const sioxCarriersWithContact = await prisma.carrier.count({
    where: { id: { gte: 100001, lte: 100020 }, phone: { not: null } },
  });
  const mbCarriersWithContact = await prisma.carrier.count({
    where: { id: { gte: 200001, lte: 200020 }, phone: { not: null } },
  });

  console.log("[E2E SEED] Done!");
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    E2E SEED VERIFICATION                      ║
╠══════════════════════════════════════════════════════════════╣
║  VENTURES                                                      ║
║    SIOX Venture ID: ${String(sioxVenture.id).padEnd(40)}║
║    MB Venture ID: ${String(mbVenture.id).padEnd(42)}║
╠══════════════════════════════════════════════════════════════╣
║  TEST CREDENTIALS                                              ║
║    Admin (all ventures): admin@siox.test                       ║
║    SIOX Manager: manager@siox.test                             ║
║    MB Manager: manager@mb.test                                 ║
╠══════════════════════════════════════════════════════════════╣
║  LOAD DATA (for isolation tests)                               ║
║    SIOX Loads: IDs 100001-100010 (${sioxLoadCount} found)                      ║
║    MB Loads: IDs 200001-200010 (${mbLoadCount} found)                        ║
╠══════════════════════════════════════════════════════════════╣
║  CARRIER DATA (global, no venture isolation)                   ║
║    SIOX-named Carriers: IDs 100001-100020 (${sioxCarrierCount} found)              ║
║    MB-named Carriers: IDs 200001-200020 (${mbCarrierCount} found)                ║
║    SIOX carriers with phone: ${sioxCarriersWithContact}                                  ║
║    MB carriers with phone: ${mbCarriersWithContact}                                    ║
╠══════════════════════════════════════════════════════════════╣
║  ASSERTIONS                                                    ║
║    SIOX loads >= 10: ${sioxLoadCount >= 10 ? "✓ PASS" : "✗ FAIL"}                                   ║
║    MB loads >= 10: ${mbLoadCount >= 10 ? "✓ PASS" : "✗ FAIL"}                                     ║
║    SIOX carriers with contact >= 10: ${sioxCarriersWithContact >= 10 ? "✓ PASS" : "✗ FAIL"}                  ║
║    MB carriers with contact >= 10: ${mbCarriersWithContact >= 10 ? "✓ PASS" : "✗ FAIL"}                    ║
╚══════════════════════════════════════════════════════════════╝
`);

  if (sioxLoadCount < 10 || mbLoadCount < 10) {
    console.error("[E2E SEED] FAIL: Not enough loads seeded!");
    process.exit(1);
  }
  if (sioxCarriersWithContact < 10 || mbCarriersWithContact < 10) {
    console.error("[E2E SEED] FAIL: Not enough carriers with contact info!");
    process.exit(1);
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
