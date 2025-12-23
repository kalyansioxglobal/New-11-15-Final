import { test, expect } from "../fixtures/auth";

// Load ID ranges from seed
const SIOX_LOAD_ID_MIN = 100001;
const SIOX_LOAD_ID_MAX = 100010;
const MB_LOAD_ID_MIN = 200001;
const MB_LOAD_ID_MAX = 200010;

test.describe("Freight Loads Venture Isolation", () => {
  test("loads API returns only SIOX loads when filtered by SIOX venture", async ({ page, loginAs }) => {
    await loginAs("admin@siox.test");
    
    // Get ventures first
    const whoami = await page.request.get("/api/test/whoami");
    const whoamiData = await whoami.json();
    const sioxVenture = whoamiData.ventures.find((v: any) => v.name.includes("SIOX"));
    
    expect(sioxVenture).toBeDefined();
    
    // Fetch loads for SIOX venture
    const response = await page.request.get(`/api/freight/loads/list?ventureId=${sioxVenture.id}&limit=50`);
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data.items).toBeDefined();
    
    // Check that SIOX loads are present
    const sioxLoads = data.items.filter((l: any) => l.id >= SIOX_LOAD_ID_MIN && l.id <= SIOX_LOAD_ID_MAX);
    expect(sioxLoads.length).toBeGreaterThan(0);
    
    // Check that NO MB loads are present
    const mbLoads = data.items.filter((l: any) => l.id >= MB_LOAD_ID_MIN && l.id <= MB_LOAD_ID_MAX);
    expect(mbLoads.length).toBe(0);
  });

  test("loads API returns only MB loads when filtered by MB venture", async ({ page, loginAs }) => {
    await loginAs("admin@siox.test");
    
    // Get ventures first
    const whoami = await page.request.get("/api/test/whoami");
    const whoamiData = await whoami.json();
    const mbVenture = whoamiData.ventures.find((v: any) => v.name.includes("MB"));
    
    expect(mbVenture).toBeDefined();
    
    // Fetch loads for MB venture
    const response = await page.request.get(`/api/freight/loads/list?ventureId=${mbVenture.id}&limit=50`);
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data.items).toBeDefined();
    
    // Check that MB loads are present
    const mbLoads = data.items.filter((l: any) => l.id >= MB_LOAD_ID_MIN && l.id <= MB_LOAD_ID_MAX);
    expect(mbLoads.length).toBeGreaterThan(0);
    
    // Check that NO SIOX loads are present
    const sioxLoads = data.items.filter((l: any) => l.id >= SIOX_LOAD_ID_MIN && l.id <= SIOX_LOAD_ID_MAX);
    expect(sioxLoads.length).toBe(0);
  });

  test("SIOX-only manager cannot see MB loads via API", async ({ page, loginAs }) => {
    await loginAs("manager@siox.test");
    
    // Fetch all loads (should be scoped to SIOX only)
    const response = await page.request.get(`/api/freight/loads/list?limit=100`);
    const data = await response.json();
    
    // Verify no MB loads are present
    const mbLoads = data.items.filter((l: any) => l.id >= MB_LOAD_ID_MIN && l.id <= MB_LOAD_ID_MAX);
    expect(mbLoads.length).toBe(0);
    
    // Verify SIOX loads ARE present
    const sioxLoads = data.items.filter((l: any) => l.id >= SIOX_LOAD_ID_MIN && l.id <= SIOX_LOAD_ID_MAX);
    expect(sioxLoads.length).toBeGreaterThan(0);
  });

  test("MB-only manager cannot see SIOX loads via API", async ({ page, loginAs }) => {
    await loginAs("manager@mb.test");
    
    // Fetch all loads (should be scoped to MB only)
    const response = await page.request.get(`/api/freight/loads/list?limit=100`);
    const data = await response.json();
    
    // Verify no SIOX loads are present
    const sioxLoads = data.items.filter((l: any) => l.id >= SIOX_LOAD_ID_MIN && l.id <= SIOX_LOAD_ID_MAX);
    expect(sioxLoads.length).toBe(0);
    
    // Verify MB loads ARE present
    const mbLoads = data.items.filter((l: any) => l.id >= MB_LOAD_ID_MIN && l.id <= MB_LOAD_ID_MAX);
    expect(mbLoads.length).toBeGreaterThan(0);
  });
});
