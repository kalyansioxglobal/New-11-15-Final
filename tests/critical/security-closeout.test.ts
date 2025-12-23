import { createMocks } from "node-mocks-http";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    load: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          pickupCity: "Chicago",
          pickupState: "IL",
          dropCity: "Dallas",
          dropState: "TX",
          equipmentType: "Van",
          weightLbs: 40000,
          pickupDate: new Date("2025-01-15"),
          dropDate: new Date("2025-01-17"),
        },
      ]),
    },
  },
}));

jest.mock("@/lib/apiAuth", () => ({
  requireUser: jest.fn().mockImplementation((req, res) => {
    if (req.headers.authorization === "Bearer valid-token") {
      return Promise.resolve({
        id: 1,
        email: "test@example.com",
        role: "CSR",
        ventureIds: [1],
        officeIds: [1],
      });
    }
    res.status(401).json({ error: "UNAUTHENTICATED" });
    return Promise.resolve(null);
  }),
  requireAdminUser: jest.fn().mockImplementation((req, res) => {
    if (req.headers.authorization === "Bearer admin-token") {
      return Promise.resolve({
        id: 1,
        email: "admin@example.com",
        role: "ADMIN",
        ventureIds: [],
        officeIds: [],
      });
    }
    res.status(401).json({ error: "UNAUTHENTICATED" });
    return Promise.resolve(null);
  }),
}));

describe("Security Closeout Tests", () => {
  describe("Test Routes Production Guard - Code Verification", () => {
    it("test/login has production guard check", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/test/login.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('process.env.NODE_ENV !== "production"');
      expect(content).toContain('process.env.TEST_AUTH_BYPASS === "true"');
      expect(content).toContain('status(404)');
    });

    it("test/logout has production guard check", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/test/logout.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('process.env.NODE_ENV !== "production"');
      expect(content).toContain('process.env.TEST_AUTH_BYPASS === "true"');
      expect(content).toContain('status(404)');
    });

    it("test/whoami has production guard check", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/test/whoami.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('process.env.NODE_ENV !== "production"');
      expect(content).toContain('process.env.TEST_AUTH_BYPASS === "true"');
      expect(content).toContain('status(404)');
    });

    it("test/freight/outreach-last has production guard check", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/test/freight/outreach-last.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('process.env.NODE_ENV !== "production"');
      expect(content).toContain('process.env.TEST_AUTH_BYPASS === "true"');
      expect(content).toContain('status(404)');
    });
  });

  describe("Carrier Portal Sanitization - Integration", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
      const handler = (await import("../../pages/api/carrier-portal/available-loads")).default;
      const { req, res } = createMocks({
        method: "GET",
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it("returns sanitized data without sensitive fields when authenticated", async () => {
      const handler = (await import("../../pages/api/carrier-portal/available-loads")).default;
      const { req, res } = createMocks({
        method: "GET",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = res._getJSONData();
      expect(data.loads).toBeDefined();
      expect(data.loads.length).toBeGreaterThan(0);

      const load = data.loads[0];
      expect(load).toHaveProperty("id");
      expect(load).toHaveProperty("originCity");
      expect(load).toHaveProperty("originState");
      expect(load).toHaveProperty("destCity");
      expect(load).toHaveProperty("destState");
      expect(load).toHaveProperty("equipmentType");

      expect(load).not.toHaveProperty("rate");
      expect(load).not.toHaveProperty("sellRate");
      expect(load).not.toHaveProperty("notes");
      expect(load).not.toHaveProperty("shipperName");
      expect(load).not.toHaveProperty("customerName");
      expect(load).not.toHaveProperty("margin");
      expect(load).not.toHaveProperty("cost");
      expect(load).not.toHaveProperty("refNumber");
      expect(load).not.toHaveProperty("reference");
    });
  });

  describe("RingCentral Test Endpoint Auth - Integration", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("returns 401 when not authenticated as admin", async () => {
      const handler = (await import("../../pages/api/integrations/ringcentral/test")).default;
      const { req, res } = createMocks({
        method: "GET",
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it("requires admin authentication in code", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/integrations/ringcentral/test.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain("requireAdminUser");
      const authCallLine = content.indexOf("requireAdminUser");
      const firstExportLine = content.indexOf("export default");
      expect(authCallLine).toBeLessThan(content.indexOf("RC_SERVER_URL"));
    });
  });

  describe("Public Autocomplete Endpoints Are Actually Authenticated", () => {
    it("city-suggestions requires auth", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/freight/city-suggestions.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain("requireAuth: true");
    });

    it("zip-lookup requires auth", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/freight/zip-lookup.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain("getSessionUser");
    });
  });

  describe("KPI Endpoints Require Auth", () => {
    it("freight kpi/csr requires auth", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/freight/kpi/csr.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain("requireAuth: true");
    });

    it("freight kpi/dispatch requires auth", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/freight/kpi/dispatch.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain("requireAuth: true");
    });
  });

  describe("Hotel Properties Meta Requires Auth", () => {
    it("hotel-properties requires hotel access", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "pages/api/meta/hotel-properties.ts");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain("requireHotelAccess");
    });
  });

  describe("RBAC Audit Document Compliance", () => {
    it("audit document has zero NEEDS_REVIEW route entries", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "docs/RBAC_ENFORCEMENT_AUDIT.md");
      const content = fs.readFileSync(filePath, "utf-8");

      const lines = content.split("\n");
      const actualNeedsReviewRoutes = lines.filter(line => 
        line.startsWith("| `/api/") && 
        line.includes("NEEDS_REVIEW")
      );

      expect(actualNeedsReviewRoutes.length).toBe(0);
    });

    it("audit document confirms all P0 issues resolved", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "docs/RBAC_ENFORCEMENT_AUDIT.md");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain("ALL P0 ISSUES RESOLVED");
      expect(content).toContain("ALL P1 ISSUES RESOLVED");
    });
  });
});
