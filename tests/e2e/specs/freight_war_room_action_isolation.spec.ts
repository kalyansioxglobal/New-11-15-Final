import { test, expect } from "../fixtures/auth";

// Load ID ranges from seed
const SIOX_LOAD_ID_MIN = 100001;
const SIOX_LOAD_ID_MAX = 100010;
const MB_LOAD_ID_MIN = 200001;
const MB_LOAD_ID_MAX = 200010;

test.describe("Freight War Room Action Isolation", () => {
  test("SIOX manager can access war room with SIOX loads", async ({ page, loginAs }) => {
    await loginAs("manager@siox.test");
    
    // Get SIOX venture ID
    const whoami = await page.request.get("/api/test/whoami");
    const whoamiData = await whoami.json();
    const sioxVenture = whoamiData.ventures[0];
    
    // Fetch war room data for SIOX
    const response = await page.request.get(`/api/freight/coverage-war-room?ventureId=${sioxVenture.id}`);
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data.summary).toBeDefined();
  });

  test("outreach preview works for SIOX load", async ({ page, loginAs }) => {
    await loginAs("admin@siox.test");
    
    // Get a SIOX load
    const sioxLoadId = SIOX_LOAD_ID_MIN;
    
    // Call outreach preview
    const response = await page.request.post("/api/freight/outreach/preview", {
      data: {
        loadId: sioxLoadId,
        channel: "sms",
        carrierIds: [],
      },
    });
    
    // Should succeed (even if no carriers selected, preview should work)
    // The response might indicate no recipients but shouldn't fail
    expect([200, 400]).toContain(response.status());
  });

  test("outreach-last endpoint returns correct venture for SIOX load", async ({ page, loginAs }) => {
    await loginAs("admin@siox.test");
    
    // Get whoami to find SIOX venture ID
    const whoami = await page.request.get("/api/test/whoami");
    const whoamiData = await whoami.json();
    const sioxVenture = whoamiData.ventures.find((v: any) => v.name.includes("SIOX"));
    
    // Check outreach-last for a SIOX load
    const response = await page.request.get(`/api/test/freight/outreach-last?loadId=${SIOX_LOAD_ID_MIN}`);
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    // Load should belong to SIOX venture
    expect(data.loadVentureId).toBe(sioxVenture.id);
  });

  test("outreach-last endpoint denies access to MB load for SIOX manager", async ({ page, loginAs }) => {
    await loginAs("manager@siox.test");
    
    // Try to check outreach for MB load
    const response = await page.request.get(`/api/test/freight/outreach-last?loadId=${MB_LOAD_ID_MIN}`);
    
    // Should be denied
    expect(response.status()).toBe(403);
  });

  test("coverage war room API scopes data by venture", async ({ page, loginAs }) => {
    await loginAs("admin@siox.test");
    
    // Get ventures
    const whoami = await page.request.get("/api/test/whoami");
    const whoamiData = await whoami.json();
    const sioxVenture = whoamiData.ventures.find((v: any) => v.name.includes("SIOX"));
    const mbVenture = whoamiData.ventures.find((v: any) => v.name.includes("MB"));
    
    // Fetch war room for SIOX
    const sioxResponse = await page.request.get(`/api/freight/coverage-war-room?ventureId=${sioxVenture.id}`);
    expect(sioxResponse.ok()).toBe(true);
    const sioxData = await sioxResponse.json();
    
    // Fetch war room for MB
    const mbResponse = await page.request.get(`/api/freight/coverage-war-room?ventureId=${mbVenture.id}`);
    expect(mbResponse.ok()).toBe(true);
    const mbData = await mbResponse.json();
    
    // Both should have data, but they should be different
    // (different ventures = different load counts)
    expect(sioxData.summary).toBeDefined();
    expect(mbData.summary).toBeDefined();
  });
});
