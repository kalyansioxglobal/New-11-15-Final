import { test, expect } from "../fixtures/auth";

test.describe("Freight Whoami and Venture Switch", () => {
  test("whoami endpoint returns user info with ventures", async ({ page, loginAs }) => {
    await loginAs("admin@siox.test");
    
    const response = await page.request.get("/api/test/whoami");
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data.userId).toBeDefined();
    expect(data.email).toBe("admin@siox.test");
    expect(data.role).toBe("CEO");
    expect(data.ventureIds).toBeDefined();
    expect(Array.isArray(data.ventureIds)).toBe(true);
    expect(data.ventures).toBeDefined();
    expect(data.ventures.length).toBeGreaterThanOrEqual(2);
  });

  test("whoami reflects requested ventureId parameter", async ({ page, loginAs }) => {
    await loginAs("admin@siox.test");
    
    // First get the list of ventures
    const whoamiResponse = await page.request.get("/api/test/whoami");
    const whoamiData = await whoamiResponse.json();
    
    // Find SIOX and MB ventures
    const sioxVenture = whoamiData.ventures.find((v: any) => v.name.includes("SIOX"));
    const mbVenture = whoamiData.ventures.find((v: any) => v.name.includes("MB"));
    
    expect(sioxVenture).toBeDefined();
    expect(mbVenture).toBeDefined();
    
    // Request with SIOX ventureId
    const sioxResponse = await page.request.get(`/api/test/whoami?ventureId=${sioxVenture.id}`);
    const sioxData = await sioxResponse.json();
    expect(sioxData.requestedVentureId).toBe(sioxVenture.id);
    expect(sioxData.effectiveVenture?.id).toBe(sioxVenture.id);
    
    // Request with MB ventureId
    const mbResponse = await page.request.get(`/api/test/whoami?ventureId=${mbVenture.id}`);
    const mbData = await mbResponse.json();
    expect(mbData.requestedVentureId).toBe(mbVenture.id);
    expect(mbData.effectiveVenture?.id).toBe(mbVenture.id);
  });

  test("venture-restricted user cannot access other ventures", async ({ page, loginAs, logout }) => {
    await loginAs("manager@siox.test");
    
    const response = await page.request.get("/api/test/whoami");
    const data = await response.json();
    
    expect(data.email).toBe("manager@siox.test");
    expect(data.role).toBe("OFFICE_MANAGER");
    
    // Should only have access to SIOX venture
    const sioxVenture = data.ventures.find((v: any) => v.name.includes("SIOX"));
    const mbVenture = data.ventures.find((v: any) => v.name.includes("MB"));
    
    expect(sioxVenture).toBeDefined();
    expect(mbVenture).toBeUndefined();
  });
});
