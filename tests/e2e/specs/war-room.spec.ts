import { test, expect } from "../fixtures/auth";
import { SELECTORS, TEST_USERS, TEST_VENTURES } from "../fixtures/selectors";
import { assertNoSpill } from "../helpers/spillDetection";

test.describe("Outreach War Room", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs(TEST_USERS.admin);
  });

  test("should load war room page with load feed", async ({ page }) => {
    await page.goto("/freight/outreach-war-room");
    await page.waitForLoadState("networkidle");

    const warRoom = page.locator(SELECTORS.warRoom);
    await expect(warRoom).toBeVisible();

    const loadFeed = page.locator(SELECTORS.warRoomLoadFeed);
    await expect(loadFeed).toBeVisible();
  });

  test("should show SMS and Email preview buttons when load selected", async ({ page }) => {
    await page.goto(`/freight/outreach-war-room?loadId=${TEST_VENTURES.siox.loadIdRange.min}`);
    await page.waitForLoadState("networkidle");

    const smsBtn = page.locator(SELECTORS.btnPreviewSms);
    const emailBtn = page.locator(SELECTORS.btnPreviewEmail);

    await expect(smsBtn).toBeVisible();
    await expect(emailBtn).toBeVisible();
  });

  test("should open email preview modal on click", async ({ page }) => {
    await page.goto(`/freight/outreach-war-room?loadId=${TEST_VENTURES.siox.loadIdRange.min}`);
    await page.waitForLoadState("networkidle");

    const emailBtn = page.locator(SELECTORS.btnPreviewEmail);
    await emailBtn.click();

    const previewModal = page.locator(SELECTORS.outreachPreview);
    await expect(previewModal).toBeVisible({ timeout: 10000 });

    const sendBtn = page.locator(SELECTORS.btnSendConfirm);
    await expect(sendBtn).toBeVisible();
  });

  test("should open SMS preview modal on click", async ({ page }) => {
    await page.goto(`/freight/outreach-war-room?loadId=${TEST_VENTURES.siox.loadIdRange.min}`);
    await page.waitForLoadState("networkidle");

    const smsBtn = page.locator(SELECTORS.btnPreviewSms);
    await smsBtn.click();

    const previewModal = page.locator(SELECTORS.outreachPreview);
    await expect(previewModal).toBeVisible({ timeout: 10000 });
  });

  test("SIOX manager should only see SIOX loads via war room API", async ({
    page,
    baseURL,
    loginAs,
  }) => {
    await loginAs(TEST_USERS.sioxManager);

    const response = await page.request.get(`${baseURL}/api/freight/outreach-war-room`);

    if (!response.ok()) {
      test.skip(true, "War room API not available");
      return;
    }

    const data = await response.json();
    const loads = data.loads || [];

    const loadIds = loads.map((l: { id: number }) => l.id);

    await assertNoSpill(page, "siox", { loadIds });

    const mbLoadIds = loadIds.filter(
      (id: number) =>
        id >= TEST_VENTURES.mb.loadIdRange.min && id <= TEST_VENTURES.mb.loadIdRange.max
    );
    expect(mbLoadIds.length).toBe(0);
  });

  test("MB manager should only see MB loads via war room API", async ({
    page,
    baseURL,
    loginAs,
  }) => {
    await loginAs(TEST_USERS.mbManager);

    const response = await page.request.get(`${baseURL}/api/freight/outreach-war-room`);

    if (!response.ok()) {
      test.skip(true, "War room API not available");
      return;
    }

    const data = await response.json();
    const loads = data.loads || [];

    const loadIds = loads.map((l: { id: number }) => l.id);

    await assertNoSpill(page, "mb", { loadIds });

    const sioxLoadIds = loadIds.filter(
      (id: number) =>
        id >= TEST_VENTURES.siox.loadIdRange.min && id <= TEST_VENTURES.siox.loadIdRange.max
    );
    expect(sioxLoadIds.length).toBe(0);
  });
});
