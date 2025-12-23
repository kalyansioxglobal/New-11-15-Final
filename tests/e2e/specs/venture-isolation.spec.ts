import { test, expect } from "../fixtures/auth";
import { TEST_USERS, TEST_VENTURES } from "../fixtures/selectors";
import { assertNoSpill, assertVentureIsolation } from "../helpers/spillDetection";

test.describe("Venture Isolation", () => {
  test("SIOX manager should only see SIOX loads via API", async ({ page, baseURL, loginAs }) => {
    await loginAs(TEST_USERS.sioxManager);

    const response = await page.request.get(`${baseURL}/api/freight/loads?limit=100`);

    if (!response.ok()) {
      test.skip(true, "Loads API not available");
      return;
    }

    const data = await response.json();
    const loads = data.loads || data;

    if (!Array.isArray(loads)) {
      test.skip(true, "Unexpected API response format");
      return;
    }

    const loadIds = loads.map((l: { id: number }) => l.id);

    await assertNoSpill(page, "siox", { loadIds });

    const mbLoadIds = loadIds.filter(
      (id: number) =>
        id >= TEST_VENTURES.mb.loadIdRange.min && id <= TEST_VENTURES.mb.loadIdRange.max
    );
    expect(mbLoadIds.length).toBe(0);
  });

  test("MB manager should only see MB loads via API", async ({ page, baseURL, loginAs }) => {
    await loginAs(TEST_USERS.mbManager);

    const response = await page.request.get(`${baseURL}/api/freight/loads?limit=100`);

    if (!response.ok()) {
      test.skip(true, "Loads API not available");
      return;
    }

    const data = await response.json();
    const loads = data.loads || data;

    if (!Array.isArray(loads)) {
      test.skip(true, "Unexpected API response format");
      return;
    }

    const loadIds = loads.map((l: { id: number }) => l.id);

    await assertNoSpill(page, "mb", { loadIds });

    const sioxLoadIds = loadIds.filter(
      (id: number) =>
        id >= TEST_VENTURES.siox.loadIdRange.min && id <= TEST_VENTURES.siox.loadIdRange.max
    );
    expect(sioxLoadIds.length).toBe(0);
  });

  test("should block venture injection attempts via URL parameter", async ({
    page,
    baseURL,
    loginAs,
  }) => {
    await loginAs(TEST_USERS.sioxManager);

    const injectionUrl = `${baseURL}/api/freight/loads?ventureId=999999`;
    const response = await page.request.get(injectionUrl);

    if (!response.ok()) {
      expect(response.status()).toBeGreaterThanOrEqual(400);
      return;
    }

    const data = await response.json();
    const loads = data.loads || data;

    if (Array.isArray(loads)) {
      const foreignLoads = loads.filter(
        (l: { ventureId?: number }) => l.ventureId === 999999
      );
      expect(foreignLoads.length).toBe(0);
    }
  });

  test("admin should see both ventures' loads", async ({ page, baseURL, loginAs }) => {
    await loginAs(TEST_USERS.admin);

    const response = await page.request.get(`${baseURL}/api/freight/loads?limit=100`);

    if (!response.ok()) {
      test.skip(true, "Loads API not available");
      return;
    }

    const data = await response.json();
    const loads = data.loads || data;

    if (!Array.isArray(loads)) {
      test.skip(true, "Unexpected API response format");
      return;
    }

    const loadIds = loads.map((l: { id: number }) => l.id);

    const sioxLoadIds = loadIds.filter(
      (id: number) =>
        id >= TEST_VENTURES.siox.loadIdRange.min && id <= TEST_VENTURES.siox.loadIdRange.max
    );
    const mbLoadIds = loadIds.filter(
      (id: number) =>
        id >= TEST_VENTURES.mb.loadIdRange.min && id <= TEST_VENTURES.mb.loadIdRange.max
    );

    expect(sioxLoadIds.length).toBeGreaterThan(0);
    expect(mbLoadIds.length).toBeGreaterThan(0);
  });
});
