import type { NextApiRequest, NextApiResponse } from "next";

// Mock requireUser so we can inject different roles
jest.mock("@/lib/apiAuth", () => {
  const actual = jest.requireActual("@/lib/apiAuth");
  return {
    ...actual,
    requireUser: jest.fn(),
  };
});

import { requireUser } from "@/lib/apiAuth";
import freightPnlHandler from "@/pages/api/logistics/freight-pnl";
import logisticsDashboardHandler from "@/pages/api/logistics/dashboard";
import lossInsightsHandler from "@/pages/api/logistics/loss-insights";

function createMockReqRes(query: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = {
    method: "GET",
    query,
  };
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (key: string, value: string) => {
    res.headers[key] = value;
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.jsonData = null;
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  return { req, res };
}

const ALLOWED_ROLES = ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"] as const;
const DISALLOWED_ROLES = ["EMPLOYEE", "CONTRACTOR"] as const;

describe("Logistics analytics RBAC", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test.each(ALLOWED_ROLES)(
    "freight-pnl allows %s",
    async (role) => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 1,
        role,
        ventureIds: [1],
        officeIds: [1],
      });

      const { req, res } = createMockReqRes({});

      // @ts-expect-error partial
      await freightPnlHandler(req, res);

      expect(res.statusCode).not.toBe(403);
    },
  );

  test.each(DISALLOWED_ROLES)(
    "freight-pnl blocks %s",
    async (role) => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 1,
        role,
        ventureIds: [1],
        officeIds: [1],
      });

      const { req, res } = createMockReqRes({});

      // @ts-expect-error partial
      await freightPnlHandler(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData).toHaveProperty("error");
    },
  );

  test.each(ALLOWED_ROLES)(
    "logistics dashboard allows %s",
    async (role) => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 1,
        role,
        ventureIds: [1],
        officeIds: [1],
      });

      const { req, res } = createMockReqRes({ ventureId: "1" });

      // @ts-expect-error partial
      await logisticsDashboardHandler(req, res);

      expect(res.statusCode).not.toBe(403);
    },
  );

  test.each(DISALLOWED_ROLES)(
    "logistics dashboard blocks %s",
    async (role) => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 1,
        role,
        ventureIds: [1],
        officeIds: [1],
      });

      const { req, res } = createMockReqRes({ ventureId: "1" });

      // @ts-expect-error partial
      await logisticsDashboardHandler(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData).toHaveProperty("error");
    },
  );

  test.each(ALLOWED_ROLES)(
    "loss-insights allows %s",
    async (role) => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 1,
        role,
        ventureIds: [1],
        officeIds: [1],
      });

      const { req, res } = createMockReqRes({ ventureId: "1" });

      // @ts-expect-error partial
      await lossInsightsHandler(req, res);

      expect(res.statusCode).not.toBe(403);
    },
  );

  test.each(DISALLOWED_ROLES)(
    "loss-insights blocks %s",
    async (role) => {
      (requireUser as jest.Mock).mockResolvedValue({
        id: 1,
        role,
        ventureIds: [1],
        officeIds: [1],
      });

      const { req, res } = createMockReqRes({ ventureId: "1" });

      // @ts-expect-error partial
      await lossInsightsHandler(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData).toHaveProperty("error");
    },
  );
});
