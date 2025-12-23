import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/incentives/user-timeseries";

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

jest.mock("@/lib/effectiveUser", () => ({
  getEffectiveUser: jest.fn(),
}));

jest.mock("@/lib/scope", () => ({
  getUserScope: () => ({ allVentures: true, ventureIds: [], officeIds: [] }),
}));

jest.mock("@/lib/prisma", () => ({
  default: {
    incentiveDaily: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
  },
}));

const { getEffectiveUser } = jest.requireMock("@/lib/effectiveUser");

describe("GET /api/incentives/user-timeseries limits", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getEffectiveUser as jest.Mock).mockResolvedValue({ id: 1, role: "CEO" });
  });

  it("rejects invalid userId", async () => {
    const { req, res } = createMockReqRes({ userId: "bad", ventureId: "1" });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("Invalid userId");
  });

  it("rejects range over max days", async () => {
    const { req, res } = createMockReqRes({
      userId: "1",
      ventureId: "1",
      from: "2020-01-01",
      to: "2022-01-01",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("Date range too large");
  });
});
