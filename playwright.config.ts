import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:5000";
const isBurnMode = process.env.E2E_BURN === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: isBurnMode,
  forbidOnly: !!process.env.CI,
  retries: isBurnMode ? 0 : 1,
  workers: isBurnMode ? 4 : 1,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_START_SERVER === "true"
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120000,
      }
    : undefined,
});
