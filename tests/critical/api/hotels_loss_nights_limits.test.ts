import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/hotels/loss-nights";

function createMockReqRes(query: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method: "GET", query };
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

jest.mock("@/lib/apiAuth", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  canViewPortfolioResource: () => true,
}));

jest.mock("@/lib/scope", () => ({
  getUserScope: () => ({ allVentures: true, ventureIds: [], officeIds: [] }),
}));

jest.mock("@/lib/prisma", () => ({
  default: {
    hotelDailyReport: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

const { requireUser } = jest.requireMock("@/lib/apiAuth");

describe("GET /api/hotels/loss-nights limits & validation", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "CEO" });
  });

  it("rejects invalid from date", async () => {
    const { req, res } = createMockReqRes({ from: "not-a-date" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("Invalid from date");
  });

  it("rejects date range over max window", async () => {
    const { req, res } = createMockReqRes({ from: "2020-01-01", to: "2022-01-01" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("Date range too large");
  });
});
