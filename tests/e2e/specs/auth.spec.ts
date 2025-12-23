import { test, expect } from "../fixtures/auth";
import { TEST_USERS } from "../fixtures/selectors";

test.describe("Authentication", () => {
  test("should login via test bypass as admin", async ({ page, loginAs, baseURL }) => {
    const user = await loginAs(TEST_USERS.admin);
    
    expect(user.email).toBe(TEST_USERS.admin);
    expect(user.role).toBe("CEO");
    
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");
  });

  test("should login via test bypass as SIOX manager", async ({ page, loginAs }) => {
    const user = await loginAs(TEST_USERS.sioxManager);
    
    expect(user.email).toBe(TEST_USERS.sioxManager);
    expect(user.role).toBe("OFFICE_MANAGER");
    
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/login");
  });

  test("should logout successfully", async ({ page, loginAs, logout }) => {
    await loginAs(TEST_USERS.admin);
    
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/login");
    
    await logout();
    
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/login");
  });

  test("should reject login for non-existent user", async ({ page, baseURL }) => {
    const response = await page.request.post(`${baseURL}/api/test/login`, {
      data: { email: "nonexistent@test.com" },
    });
    
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("User not found");
  });
});
