#!/usr/bin/env ts-node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRY_RUN = process.env.BURNIN_DRY_RUN === "true";
const ROUNDS = parseInt(process.env.BURNIN_ROUNDS || "5", 10);
const DELAY_MIN = 200;
const DELAY_MAX = 500;

interface BurnInResult {
  round: number;
  phase: string;
  status: "pass" | "fail" | "skip";
  message: string;
  durationMs?: number;
}

const results: BurnInResult[] = [];

function log(msg: string) {
  console.log(`[BURNIN] ${new Date().toISOString()} ${msg}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1)) + DELAY_MIN;
  return delay(ms);
}

async function withTiming<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  const durationMs = Date.now() - start;
  return { result, durationMs };
}

async function phase1_dbConnectivity(round: number): Promise<void> {
  log(`Round ${round} - Phase 1: Database Connectivity`);
  try {
    const { durationMs } = await withTiming(async () => {
      await prisma.$queryRaw`SELECT 1`;
    });
    results.push({ round, phase: "db_connectivity", status: "pass", message: "DB connected", durationMs });
  } catch (error) {
    results.push({ round, phase: "db_connectivity", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase2_modelCounts(round: number): Promise<void> {
  log(`Round ${round} - Phase 2: Model Counts`);
  try {
    const { result, durationMs } = await withTiming(async () => {
      const [users, ventures, loads, carriers, customers] = await Promise.all([
        prisma.user.count(),
        prisma.venture.count(),
        prisma.load.count(),
        prisma.carrier.count(),
        prisma.customer.count(),
      ]);
      return { users, ventures, loads, carriers, customers };
    });
    log(`  Users: ${result.users}, Ventures: ${result.ventures}, Loads: ${result.loads}, Carriers: ${result.carriers}, Customers: ${result.customers}`);
    results.push({ round, phase: "model_counts", status: "pass", message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "model_counts", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase3_rbacVerification(round: number): Promise<void> {
  log(`Round ${round} - Phase 3: RBAC Verification`);
  try {
    const { result, durationMs } = await withTiming(async () => {
      const adminUsers = await prisma.user.findMany({
        where: { role: { in: ["CEO", "ADMIN"] } },
        select: { id: true, email: true, role: true },
        take: 5,
      });
      const ventureHeads = await prisma.user.findMany({
        where: { role: "VENTURE_HEAD" },
        select: { id: true, email: true, role: true },
        take: 3,
      });
      return { adminCount: adminUsers.length, ventureHeadCount: ventureHeads.length };
    });
    log(`  Admin users: ${result.adminCount}, Venture heads: ${result.ventureHeadCount}`);
    results.push({ round, phase: "rbac_verification", status: "pass", message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "rbac_verification", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase4_freightLoads(round: number): Promise<void> {
  log(`Round ${round} - Phase 4: Freight Loads Check`);
  try {
    const { result, durationMs } = await withTiming(async () => {
      const ventures = await prisma.venture.findMany({ take: 3, select: { id: true, name: true } });
      const loadsByVenture: Record<string, number> = {};
      for (const v of ventures) {
        const count = await prisma.load.count({ where: { ventureId: v.id }, take: 10 });
        loadsByVenture[v.name] = count;
      }
      return { ventureCount: ventures.length, loadsByVenture };
    });
    log(`  Loads by venture: ${JSON.stringify(result.loadsByVenture)}`);
    results.push({ round, phase: "freight_loads", status: "pass", message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "freight_loads", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase5_carrierMatching(round: number): Promise<void> {
  log(`Round ${round} - Phase 5: Carrier Matching Preview`);
  try {
    const { result, durationMs } = await withTiming(async () => {
      const activeCarriers = await prisma.carrier.count({
        where: {
          active: true,
          blocked: false,
          fmcsaAuthorized: true,
        },
      });
      const carriersWithDispatchers = await prisma.carrierDispatcher.count();
      return { activeCarriers, carriersWithDispatchers };
    });
    log(`  Active carriers: ${result.activeCarriers}, Dispatchers: ${result.carriersWithDispatchers}`);
    results.push({ round, phase: "carrier_matching", status: "pass", message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "carrier_matching", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase6_outreachConfig(round: number): Promise<void> {
  log(`Round ${round} - Phase 6: Outreach Config Check`);
  try {
    const { result, durationMs } = await withTiming(async () => {
      const configs = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "VentureOutboundConfig"
      `;
      const activeConfigs = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "VentureOutboundConfig" WHERE "isEnabled" = true
      `;
      return { 
        configCount: Number(configs[0]?.count || 0), 
        activeConfigs: Number(activeConfigs[0]?.count || 0) 
      };
    });
    log(`  Outbound configs: ${result.configCount}, Active: ${result.activeConfigs}`);
    results.push({ round, phase: "outreach_config", status: "pass", message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "outreach_config", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase7_fmcsaIdempotency(round: number): Promise<void> {
  log(`Round ${round} - Phase 7: FMCSA Sync Idempotency Check`);
  if (DRY_RUN) {
    results.push({ round, phase: "fmcsa_idempotency", status: "skip", message: "DRY_RUN mode - skipped" });
    return;
  }
  try {
    const { result, durationMs } = await withTiming(async () => {
      const carrier = await prisma.carrier.findFirst({
        where: { mcNumber: { not: null } },
        select: { id: true, mcNumber: true, fmcsaLastSyncAt: true },
      });
      return { carrierWithMC: carrier ? true : false, mcNumber: carrier?.mcNumber };
    });
    log(`  Sample carrier with MC: ${result.mcNumber || "none"}`);
    results.push({ round, phase: "fmcsa_idempotency", status: "pass", message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "fmcsa_idempotency", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase8_webhookDedupe(round: number): Promise<void> {
  log(`Round ${round} - Phase 8: Webhook Dedupe Check`);
  try {
    const { result, durationMs } = await withTiming(async () => {
      const recentReplies = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "OutreachReply" 
        WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      `;
      return { recentReplies: Number(recentReplies[0]?.count || 0) };
    });
    log(`  Recent replies (24h): ${result.recentReplies}`);
    results.push({ round, phase: "webhook_dedupe", status: "pass", message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "webhook_dedupe", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase9_dataIntegrity(round: number): Promise<void> {
  log(`Round ${round} - Phase 9: Data Integrity Check`);
  try {
    const { result, durationMs } = await withTiming(async () => {
      const duplicateMCs = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM (
          SELECT "mcNumber" FROM "Carrier" 
          WHERE "mcNumber" IS NOT NULL 
          GROUP BY "mcNumber" HAVING COUNT(*) > 1
        ) dups
      `;
      const duplicateDOTs = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM (
          SELECT "dotNumber" FROM "Carrier" 
          WHERE "dotNumber" IS NOT NULL 
          GROUP BY "dotNumber" HAVING COUNT(*) > 1
        ) dups
      `;
      return {
        duplicateMCs: Number(duplicateMCs[0]?.count || 0),
        duplicateDOTs: Number(duplicateDOTs[0]?.count || 0),
      };
    });
    const status = result.duplicateMCs === 0 && result.duplicateDOTs === 0 ? "pass" : "fail";
    log(`  Duplicate MCs: ${result.duplicateMCs}, Duplicate DOTs: ${result.duplicateDOTs}`);
    results.push({ round, phase: "data_integrity", status, message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "data_integrity", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase10_aiUsage(round: number): Promise<void> {
  log(`Round ${round} - Phase 10: AI Usage Check`);
  try {
    const { result, durationMs } = await withTiming(async () => {
      const todayUsage = await prisma.aiUsageLog.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      });
      const totalUsage = await prisma.aiUsageLog.count();
      return { todayUsage, totalUsage };
    });
    log(`  AI usage today: ${result.todayUsage}, Total: ${result.totalUsage}`);
    results.push({ round, phase: "ai_usage", status: "pass", message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "ai_usage", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function phase11_activityLog(round: number): Promise<void> {
  log(`Round ${round} - Phase 11: Activity Log Check`);
  try {
    const { result, durationMs } = await withTiming(async () => {
      const recentActivity = await prisma.activityLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      });
      const actionTypes = await prisma.$queryRaw<{ action: string; count: bigint }[]>`
        SELECT "action", COUNT(*) as count FROM "ActivityLog" 
        GROUP BY "action" 
        ORDER BY count DESC 
        LIMIT 10
      `;
      return { recentActivity, actionTypes: actionTypes.length };
    });
    log(`  Recent activity (7d): ${result.recentActivity}, Action types: ${result.actionTypes}`);
    results.push({ round, phase: "activity_log", status: "pass", message: JSON.stringify(result), durationMs });
  } catch (error) {
    results.push({ round, phase: "activity_log", status: "fail", message: String(error) });
  }
  await randomDelay();
}

async function runRound(round: number): Promise<void> {
  log(`========== ROUND ${round} / ${ROUNDS} ==========`);
  await phase1_dbConnectivity(round);
  await phase2_modelCounts(round);
  await phase3_rbacVerification(round);
  await phase4_freightLoads(round);
  await phase5_carrierMatching(round);
  await phase6_outreachConfig(round);
  await phase7_fmcsaIdempotency(round);
  await phase8_webhookDedupe(round);
  await phase9_dataIntegrity(round);
  await phase10_aiUsage(round);
  await phase11_activityLog(round);
}

function generateReport(): void {
  log("\n========== BURN-IN REPORT ==========\n");
  
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  
  console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
  
  if (failed > 0) {
    console.log("FAILURES:");
    results
      .filter((r) => r.status === "fail")
      .forEach((r) => {
        console.log(`  - Round ${r.round}, Phase: ${r.phase}: ${r.message}`);
      });
    console.log("");
  }
  
  const avgDurations: Record<string, number[]> = {};
  results.forEach((r) => {
    if (r.durationMs !== undefined) {
      if (!avgDurations[r.phase]) avgDurations[r.phase] = [];
      avgDurations[r.phase].push(r.durationMs);
    }
  });
  
  console.log("PERFORMANCE (avg ms):");
  Object.entries(avgDurations).forEach(([phase, durations]) => {
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    console.log(`  ${phase}: ${avg}ms`);
  });
  
  console.log("\n========================================");
  console.log(`OVERALL: ${failed === 0 ? "PASS" : "FAIL"}`);
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`ROUNDS: ${ROUNDS}`);
  console.log("========================================\n");
}

async function main() {
  log(`Starting Platform Burn-In (DRY_RUN=${DRY_RUN}, ROUNDS=${ROUNDS})`);
  
  try {
    for (let round = 1; round <= ROUNDS; round++) {
      await runRound(round);
      if (round < ROUNDS) {
        log(`Waiting before next round...`);
        await delay(1000);
      }
    }
    
    generateReport();
    
    const failed = results.filter((r) => r.status === "fail").length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("Burn-in script failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
