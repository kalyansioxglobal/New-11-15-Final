import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getEffectiveUser } from "@/lib/effectiveUser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Allow cleanup in production, but require explicit confirmation
  // The frontend already requires typing "DELETE_ALL_TEST_DATA"
  // and only CEO/ADMIN can access this endpoint
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PRODUCTION_CLEANUP) {
    return res.status(403).json({ 
      error: "Disabled in production for safety",
      message: "Cleanup is disabled in production environment. Set ALLOW_PRODUCTION_CLEANUP=true to enable (use with caution)."
    });
  }

  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (user.role !== "CEO" && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Only CEO or ADMIN can cleanup test data" });
  }

  // Allow GET for preview
  if (req.method === "GET" && req.query.preview === "true") {
    try {
      const preview: Record<string, number> = {};
      
      // Tables with isTest/isTestUser fields
      preview.ventures = await prisma.venture.count({ where: { isTest: true } });
      preview.users = await prisma.user.count({ where: { isTestUser: true } });
      preview.policies = await prisma.policy.count({ where: { isTest: true } });
      preview.loads = await prisma.load.count({ where: { isTest: true } });
      preview.tasks = await prisma.task.count({ where: { isTest: true } });
      preview.offices = await prisma.office.count({ where: { isTest: true } });
      preview.attendance = await prisma.attendance.count({ where: { isTest: true } });
      preview.customers = await prisma.customer.count({ where: { venture: { isTest: true } } });
      preview.hotelProperties = await prisma.hotelProperty.count({ where: { venture: { isTest: true } } });
      
      // Tables without isTest field - linked via relationships
      const testUserIds = (await prisma.user.findMany({
        where: { isTestUser: true },
        select: { id: true }
      })).map(u => u.id);

      const testVentureIds = (await prisma.venture.findMany({
        where: { isTest: true },
        select: { id: true }
      })).map(v => v.id);

      if (testVentureIds.length > 0) {
        preview.insurancePolicies = await prisma.insurancePolicy.count({
          where: { ventureId: { in: testVentureIds } }
        });
      } else {
        preview.insurancePolicies = 0;
      }

      if (testUserIds.length > 0) {
        preview.ventureUsers = await prisma.ventureUser.count({
          where: { userId: { in: testUserIds } }
        });
        preview.officeUsers = await prisma.officeUser.count({
          where: { userId: { in: testUserIds } }
        });
        preview.userMappings = await prisma.userMapping.count({
          where: { userId: { in: testUserIds } }
        });
        preview.userPreferences = await prisma.userPreferences.count({
          where: { userId: { in: testUserIds } }
        });
      } else {
        preview.ventureUsers = 0;
        preview.officeUsers = 0;
        preview.userMappings = 0;
        preview.userPreferences = 0;
      }
      
      return res.status(200).json({ preview });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to load preview", message: error.message });
    }
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

    // Delete hotel child tables FIRST (before HotelProperty due to foreign key constraints)
    results.hotelKpiDaily = (await prisma.hotelKpiDaily.deleteMany({
      where: { hotel: { venture: { isTest: true } } }
    })).count;

    results.hotelDailyReports = (await prisma.hotelDailyReport.deleteMany({
      where: { hotel: { venture: { isTest: true } } }
    })).count;

    results.hotelPnlMonthly = (await prisma.hotelPnlMonthly.deleteMany({
      where: { hotel: { venture: { isTest: true } } }
    })).count;

    results.hotelNightAudits = (await prisma.hotelNightAudit.deleteMany({
      where: { hotel: { venture: { isTest: true } } }
    })).count;

    // Get test hotel property IDs first, then delete disputes
    const testHotelIds = (await prisma.hotelProperty.findMany({
      where: { venture: { isTest: true } },
      select: { id: true }
    })).map(h => h.id);
    
    if (testHotelIds.length > 0) {
      results.hotelDisputes = (await prisma.hotelDispute.deleteMany({
        where: { propertyId: { in: testHotelIds } }
      })).count;
    } else {
      results.hotelDisputes = 0;
    }

    // Now delete hotel properties (after all child tables)
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

    // Delete tables without isTest field - linked via relationships
    results.insurancePolicies = (await prisma.insurancePolicy.deleteMany({
      where: { venture: { isTest: true } }
    })).count;

    // Get test user and venture IDs for junction tables
    const testUserIds = (await prisma.user.findMany({
      where: { isTestUser: true },
      select: { id: true }
    })).map(u => u.id);

    const testVentureIds = (await prisma.venture.findMany({
      where: { isTest: true },
      select: { id: true }
    })).map(v => v.id);

    // Delete junction table records (no isTest field)
    if (testUserIds.length > 0) {
      results.ventureUsers = (await prisma.ventureUser.deleteMany({
        where: { userId: { in: testUserIds } }
      })).count;

      results.officeUsers = (await prisma.officeUser.deleteMany({
        where: { userId: { in: testUserIds } }
      })).count;

      results.userMappings = (await prisma.userMapping.deleteMany({
        where: { userId: { in: testUserIds } }
      })).count;

      // Delete user-related tables without isTest field
      results.userPreferences = (await prisma.userPreferences.deleteMany({
        where: { userId: { in: testUserIds } }
      })).count;

      results.staffAliases = (await prisma.staffAlias.deleteMany({
        where: { userId: { in: testUserIds } }
      })).count;

      results.salesPersonCosts = (await prisma.salesPersonCost.deleteMany({
        where: { userId: { in: testUserIds } }
      })).count;

      results.aiUsageLogs = (await prisma.aiUsageLog.deleteMany({
        where: { userId: { in: testUserIds } }
      })).count;
    } else {
      results.ventureUsers = 0;
      results.officeUsers = 0;
      results.userMappings = 0;
      results.userPreferences = 0;
      results.staffAliases = 0;
      results.salesPersonCosts = 0;
      results.aiUsageLogs = 0;
    }


    results.users = (await prisma.user.deleteMany({ where: { isTestUser: true } })).count;

    results.offices = (await prisma.office.deleteMany({ where: { isTest: true } })).count;
    results.ventures = (await prisma.venture.deleteMany({ where: { isTest: true } })).count;

    const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0);

    // Reset sequences for tables that had deletions (to avoid ID gaps)
    const sequencesToReset: string[] = [];
    if (results.policies > 0) sequencesToReset.push('"Policy_id_seq"');
    if (results.tasks > 0) sequencesToReset.push('"Task_id_seq"');
    if (results.users > 0) sequencesToReset.push('"User_id_seq"');
    if (results.ventures > 0) sequencesToReset.push('"Venture_id_seq"');
    if (results.offices > 0) sequencesToReset.push('"Office_id_seq"');
    if (results.loads > 0) sequencesToReset.push('"Load_id_seq"');
    if (results.customers > 0) sequencesToReset.push('"Customer_id_seq"');
    if (results.hotelProperties > 0) sequencesToReset.push('"HotelProperty_id_seq"');
    if (results.insurancePolicies > 0) sequencesToReset.push('"InsurancePolicy_id_seq"');

    if (sequencesToReset.length > 0) {
      console.log("🔄 Resetting sequences to avoid ID gaps...");
      
      for (const seqName of sequencesToReset) {
        try {
          // Extract table name from sequence name (remove quotes and _id_seq)
          // seqName format: "Policy_id_seq" -> Policy
          const tableName = seqName.replace('_id_seq"', '').replace('"', '');
          // Reset sequence to max(id) + 1, or 1 if table is empty
          // This ensures new records get the next available ID (no gaps)
          // Construct SQL with proper quoting for sequence name
          const sql = `SELECT setval(${seqName}, COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1, false)`;
          await prisma.$executeRawUnsafe(sql);
          console.log(`✅ Reset sequence ${seqName} for table ${tableName}`);
        } catch (err: any) {
          console.warn(`⚠️ Failed to reset sequence ${seqName}:`, err.message);
        }
      }
      results.sequencesReset = sequencesToReset.length;
    }
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
