import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;
const subtractDays = (date: Date, days: number) => new Date(date.getTime() - days * 86400000);
const today = new Date();

async function main() {
  console.log("📊 Completing remaining seed data...\n");

  const ventures = await prisma.venture.findMany();
  const bpoVenture = ventures.find(v => v.slug?.includes("bpo") || v.code === "RX");
  const saasVenture = ventures.find(v => v.slug?.includes("rank") || v.code === "RM");
  const users = await prisma.user.findMany({ take: 10 });

  console.log("📞 Creating BPO campaigns...");
  const campaignNames = [
    "HealthPlus Appointments", "TechCorp Lead Gen", "Insurance Renewals",
    "Solar Sales Outbound", "Financial Services", "Medicare Enrollments",
    "Auto Insurance Quotes", "Home Security Sales", "Telecom Upsells",
    "Credit Card Acquisitions", "Mortgage Refinance", "Travel Bookings",
    "Subscription Renewals", "B2B Lead Qualification", "Customer Win-Back",
    "Debt Collection", "Survey Outreach", "Product Recalls",
    "Appointment Reminders", "Event Registration", "Tech Support Tier1",
    "Loyalty Programs", "Payment Collections", "Market Research", "Brand Awareness"
  ];
  
  const campaigns: any[] = [];
  for (const name of campaignNames) {
    const campaign = await prisma.bpoCampaign.create({
      data: {
        name,
        ventureId: bpoVenture?.id || ventures[0].id,
        isActive: Math.random() > 0.2,
        clientName: `${name.split(" ")[0]} Corp`,
      }
    });
    campaigns.push(campaign);
  }
  console.log("✅ Created 25 BPO campaigns");

  console.log("👥 Creating BPO agents...");
  for (let i = 0; i < 50; i++) {
    const user = users[i % users.length];
    await prisma.bpoAgent.create({
      data: {
        userId: user.id,
        ventureId: bpoVenture?.id || ventures[0].id,
        campaignId: campaigns[i % campaigns.length].id,
        employeeId: `BPO-${String(i + 1).padStart(4, "0")}`,
        isActive: Math.random() > 0.1,
      }
    });
  }
  console.log("✅ Created 50 BPO agents");

  console.log("📊 Creating BPO agent metrics...");
  for (const campaign of campaigns) {
    for (let d = 0; d < 60; d++) {
      const date = subtractDays(today, d);
      await prisma.bpoAgentMetric.create({
        data: {
          campaignId: campaign.id,
          agentName: `Agent ${randomInt(1, 50)}`,
          date,
          talkTimeMin: randomInt(100, 400),
          handledCalls: randomInt(20, 80),
          outboundCalls: randomInt(50, 150),
          leadsCreated: randomInt(5, 30),
          demosBooked: randomInt(1, 10),
          salesClosed: randomInt(0, 5),
          avgQaScore: randomFloat(70, 100),
          isTest: true,
        }
      });
    }
  }
  console.log("✅ Created BPO metrics (60 days x 25 campaigns)");

  console.log("🖥️ Creating SaaS customers and subscriptions...");
  for (let i = 0; i < 200; i++) {
    const startDate = subtractDays(today, randomInt(30, 700));
    const customer = await prisma.saasCustomer.create({
      data: {
        name: `SaaS Customer ${i + 1}`,
        email: `customer${i + 1}@saasclient.com`,
        domain: `customer${i + 1}.example.com`,
        ventureId: saasVenture?.id || ventures[0].id,
      }
    });
    
    const plans = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
    await prisma.saasSubscription.create({
      data: {
        customerId: customer.id,
        planName: plans[randomInt(0, 2)],
        mrr: randomFloat(50, 2000),
        isActive: Math.random() > 0.15,
        startedAt: startDate,
      }
    });
  }
  console.log("✅ Created 200 SaaS customers with subscriptions");

  console.log("🏦 Creating bank accounts and snapshots...");
  const bankNames = ["Chase", "Bank of America", "Wells Fargo", "Citi", "Capital One", "HDFC", "ICICI", "SBI"];
  const currencies = ["USD", "USD", "USD", "USD", "INR", "INR"];
  
  for (let i = 0; i < 25; i++) {
    const account = await prisma.bankAccount.create({
      data: {
        name: `${bankNames[i % bankNames.length]} - ${i % 3 === 0 ? "Operating" : i % 3 === 1 ? "Payroll" : "Reserve"}`,
        bankName: bankNames[i % bankNames.length],
        accountNumber: `****${randomInt(1000, 9999)}`,
        currency: currencies[i % currencies.length],
        ventureId: ventures[i % ventures.length]?.id || ventures[0].id,
        isActive: true,
      }
    });
    
    for (let d = 0; d < 30; d++) {
      await prisma.bankSnapshot.create({
        data: {
          bankAccountId: account.id,
          snapshotDate: subtractDays(today, d),
          balance: randomFloat(10000, 5000000),
        }
      });
    }
  }
  console.log("✅ Created 25 bank accounts with 30-day snapshots");

  console.log("🏢 Creating holding assets...");
  const assetTypes = ["REAL_ESTATE", "EQUIPMENT", "VEHICLE", "INTELLECTUAL_PROPERTY", "INVESTMENT"];
  for (let i = 0; i < 40; i++) {
    await prisma.holdingAsset.create({
      data: {
        name: `Asset ${i + 1}`,
        type: assetTypes[i % assetTypes.length],
        valueEstimate: randomFloat(50000, 5000000),
        ventureId: ventures[i % ventures.length]?.id,
        acquiredDate: subtractDays(today, randomInt(100, 1000)),
        isActive: true,
      }
    });
  }
  console.log("✅ Created 40 holding assets");

  console.log("\n✅ Supplemental seed complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
