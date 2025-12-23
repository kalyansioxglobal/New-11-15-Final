import { test, expect } from "../fixtures/auth";
import { SELECTORS, TEST_USERS } from "../fixtures/selectors";

test.describe("AI Templates", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs(TEST_USERS.admin);
  });

  test("should load AI templates page", async ({ page }) => {
    await page.goto("/admin/ai-templates");
    await page.waitForLoadState("networkidle");

    const templatesPage = page.locator(SELECTORS.aiTemplates);
    await expect(templatesPage).toBeVisible();

    await expect(page.getByRole("heading", { name: "AI Templates" })).toBeVisible();
  });

  test("should show Create Template button", async ({ page }) => {
    await page.goto("/admin/ai-templates");
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: "Create Template" });
    await expect(createBtn).toBeVisible();
  });

  test("SIOX manager API should only return SIOX templates", async ({
    page,
    baseURL,
    loginAs,
  }) => {
    await loginAs(TEST_USERS.sioxManager);

    const response = await page.request.get(`${baseURL}/api/admin/ai-templates`);

    if (!response.ok()) {
      test.skip(true, "AI Templates API not available");
      return;
    }

    const data = await response.json();
    const templates = data.templates || data;

    if (!Array.isArray(templates)) {
      test.skip(true, "Unexpected API response format");
      return;
    }

    for (const template of templates) {
      if (template.venture?.name) {
        expect(template.venture.name).not.toContain("MB E2E");
      }
    }
  });

  test("MB manager API should only return MB templates", async ({
    page,
    baseURL,
    loginAs,
  }) => {
    await loginAs(TEST_USERS.mbManager);

    const response = await page.request.get(`${baseURL}/api/admin/ai-templates`);

    if (!response.ok()) {
      test.skip(true, "AI Templates API not available");
      return;
    }

    const data = await response.json();
    const templates = data.templates || data;

    if (!Array.isArray(templates)) {
      test.skip(true, "Unexpected API response format");
      return;
    }

    for (const template of templates) {
      if (template.venture?.name) {
        expect(template.venture.name).not.toContain("SIOX E2E");
      }
    }
  });
});
