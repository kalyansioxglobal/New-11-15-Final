import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Disabled in production" });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (user.role !== "CEO" && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Only CEO or ADMIN can cleanup test data" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { confirm } = req.body;
  if (confirm !== "DELETE_ALL_TEST_DATA") {
    return res.status(400).json({ 
      error: "Must send { confirm: 'DELETE_ALL_TEST_DATA' } to proceed",
      message: "This action will permanently delete all test data. Send the confirmation to proceed."
    });
  }

  try {
    console.log("🗑️ Starting test data cleanup...");

    const results: Record<string, number> = {};

    const { logAuditEvent } = await import("@/lib/audit");

    results.incentiveDaily = (await prisma.incentiveDaily.deleteMany({ where: { isTest: true } })).count;
    
    results.incentiveRules = (await prisma.incentiveRule.deleteMany({
      where: { plan: { venture: { isTest: true } } }
    })).count;
    
    results.incentivePlans = (await prisma.incentivePlan.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.notifications = (await prisma.notification.deleteMany({ where: { isTest: true } })).count;

    results.gamificationEvents = (await prisma.gamificationEvent.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.gamificationPointsBalance = (await prisma.gamificationPointsBalance.deleteMany({
      where: { user: { isTestUser: true } }
    })).count;

    results.gamificationConfig = (await prisma.gamificationConfig.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.bpoCallLogs = (await prisma.bpoCallLog.deleteMany({ where: { isTest: true } })).count;
    results.bpoAgentMetrics = (await prisma.bpoAgentMetric.deleteMany({ where: { isTest: true } })).count;
    results.bpoDailyMetrics = (await prisma.bpoDailyMetric.deleteMany({ where: { isTest: true } })).count;
    results.bpoKpiRecords = (await prisma.bpoKpiRecord.deleteMany({ where: { isTest: true } })).count;

    results.bpoAgents = (await prisma.bpoAgent.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.bpoCampaigns = (await prisma.bpoCampaign.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.saasSubscriptions = (await prisma.saasSubscription.deleteMany({
      where: { customer: { venture: { isTest: true } } }
    })).count;

    results.saasCustomers = (await prisma.saasCustomer.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.bankSnapshots = (await prisma.bankSnapshot.deleteMany({
      where: { bankAccount: { venture: { isTest: true } } }
    })).count;

    results.bankAccounts = (await prisma.bankAccount.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.holdingAssets = (await prisma.holdingAsset.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.hotelReviews = (await prisma.hotelReview.deleteMany({ where: { isTest: true } })).count;

    results.hotelDailyReports = (await prisma.hotelDailyReport.deleteMany({
      where: { hotel: { venture: { isTest: true } } }
    })).count;

    results.hotelProperties = (await prisma.hotelProperty.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.employeeKpiDaily = (await prisma.employeeKpiDaily.deleteMany({ where: { isTest: true } })).count;

    results.logisticsLoadEvents = (await prisma.logisticsLoadEvent.deleteMany({
      where: { load: { isTest: true } }
    })).count;

    results.loads = (await prisma.load.deleteMany({ where: { isTest: true } })).count;

    results.customers = (await prisma.customer.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.logisticsShippers = (await prisma.logisticsShipper.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    results.policies = (await prisma.policy.deleteMany({ where: { isTest: true } })).count;
    results.tasks = (await prisma.task.deleteMany({ where: { isTest: true } })).count;
    results.attendance = (await prisma.attendance.deleteMany({ where: { isTest: true } })).count;

    results.ventureUsers = (await prisma.ventureUser.deleteMany({
      where: { user: { isTestUser: true } }
    })).count;

    results.officeUsers = (await prisma.officeUser.deleteMany({
      where: { user: { isTestUser: true } }
    })).count;

    results.userMappings = (await prisma.userMapping.deleteMany({
      where: { user: { isTestUser: true } }
    })).count;

    results.users = (await prisma.user.deleteMany({ where: { isTestUser: true } })).count;

    results.offices = (await prisma.office.deleteMany({ where: { isTest: true } })).count;
    results.ventures = (await prisma.venture.deleteMany({ where: { isTest: true } })).count;

    const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0);
    logAuditEvent(req, user, {
      domain: "admin",
      action: "CLEANUP_TEST_DATA",
      entityType: "system",
      metadata: {
        totalDeleted,
        details: results,
      },
    });


    console.log("✅ Test data cleanup complete!");

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${totalDeleted} test records`,
      details: results,
    });
  } catch (error: any) {
    console.error("❌ Cleanup failed:", error);
    return res.status(500).json({
      error: "Cleanup failed",
      message: error.message,
    });
  }
}
