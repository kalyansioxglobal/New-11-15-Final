import { spawn } from "child_process";

const ENV_GUARDS = {
  TEST_AUTH_BYPASS: "true",
  OUTREACH_DRY_RUN: "true",
};

function log(msg: string) {
  console.log(`[E2E] ${new Date().toISOString()} ${msg}`);
}

async function runCommand(cmd: string, args: string[], env: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve) => {
    log(`Running: ${cmd} ${args.join(" ")}`);
    const proc = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    proc.on("close", (code) => resolve(code || 0));
  });
}

async function main() {
  log("=== E2E Test Runner ===");
  
  log("Checking environment guards...");
  for (const [key, value] of Object.entries(ENV_GUARDS)) {
    if (process.env[key] !== value) {
      log(`Setting ${key}=${value}`);
      process.env[key] = value;
    }
  }
  
  const skipSeed = process.env.E2E_SKIP_SEED === "true";
  if (!skipSeed) {
    log("Running E2E seed...");
    const seedCode = await runCommand("npm", ["run", "seed:e2e"], ENV_GUARDS);
    if (seedCode !== 0) {
      log("Seed failed!");
      process.exit(1);
    }
  } else {
    log("Skipping seed (E2E_SKIP_SEED=true)");
  }
  
  log("Running Playwright tests...");
  const isBurnMode = process.env.E2E_BURN === "true";
  const rounds = parseInt(process.env.E2E_BURN_ROUNDS || "1", 10);
  
  log(`Mode: ${isBurnMode ? "BURN" : "SAFE"}, Rounds: ${rounds}`);
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  
  for (let round = 1; round <= rounds; round++) {
    if (rounds > 1) {
      log(`=== Round ${round}/${rounds} ===`);
    }
    
    const testCode = await runCommand("npx", ["playwright", "test"], {
      ...ENV_GUARDS,
      ...(isBurnMode ? { E2E_BURN: "true" } : {}),
    });
    
    if (testCode !== 0) {
      totalFailed++;
    } else {
      totalPassed++;
    }
  }
  
  log("\n=== E2E Summary ===");
  log(`Rounds: ${rounds}`);
  log(`Passed: ${totalPassed}`);
  log(`Failed: ${totalFailed}`);
  log(`Mode: ${isBurnMode ? "BURN" : "SAFE"}`);
  log("==================\n");
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
