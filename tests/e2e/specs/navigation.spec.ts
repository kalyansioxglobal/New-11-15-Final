import { test, expect } from "../fixtures/auth";
import { TEST_USERS, SELECTORS } from "../fixtures/selectors";

test.describe("Navigation", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs(TEST_USERS.admin);
  });

  test("should load dashboard without 500 errors", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState("networkidle");
  });

  test("should load logistics dashboard", async ({ page }) => {
    const response = await page.goto("/logistics/dashboard");
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState("networkidle");
  });

  test("should load freight loads page", async ({ page }) => {
    const response = await page.goto("/freight/loads");
    if (response?.status() === 404) {
      test.skip(true, "Freight loads page not found");
      return;
    }
    expect(response?.status()).toBeLessThan(500);
  });

  test("should load carrier search page", async ({ page }) => {
    const response = await page.goto("/freight/carrier-search");
    if (response?.status() === 404) {
      test.skip(true, "Carrier search page not found");
      return;
    }
    expect(response?.status()).toBeLessThan(500);
  });

  test("should load outreach war room page", async ({ page }) => {
    const response = await page.goto("/freight/outreach-war-room");
    if (response?.status() === 404) {
      test.skip(true, "Outreach war room page not found");
      return;
    }
    expect(response?.status()).toBeLessThan(500);
  });

  test("should crawl sidebar links without 500 errors", async ({ page }) => {
    await page.goto("/logistics/dashboard");
    await page.waitForLoadState("networkidle");
    
    const sidebarLinks = await page.locator("nav a[href^='/']").all();
    const visitedUrls = new Set<string>();
    const errors: string[] = [];
    
    const linksToCheck = Math.min(sidebarLinks.length, 15);
    
    for (let i = 0; i < linksToCheck; i++) {
      const link = sidebarLinks[i];
      const href = await link.getAttribute("href");
      
      if (!href || visitedUrls.has(href) || href === "#") continue;
      visitedUrls.add(href);
      
      try {
        const response = await page.goto(href, { timeout: 15000 });
        if (response && response.status() >= 500) {
          errors.push(`${href}: ${response.status()}`);
        }
      } catch (e) {
        errors.push(`${href}: Navigation error`);
      }
    }
    
    if (errors.length > 0) {
      console.log("Navigation errors:", errors);
    }
    expect(errors.length).toBe(0);
  });
});
