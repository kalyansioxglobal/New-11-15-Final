import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/eod-reports";

function createMockReqRes(method: string, body: any = {}, query: any = {}): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method, body, query };
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

jest.mock("@/lib/scope", () => ({
  getUserScope: () => ({ allVentures: true, ventureIds: [1], officeIds: [] }),
}));

// Align prisma mock shape with actual lib/prisma export (default + named prisma)
jest.mock("@/lib/prisma", () => {
  const eodMock = {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({ id: 1, status: "NEEDS_ATTENTION" }),
    create: jest.fn().mockResolvedValue({ id: 2 }),
  };

  return {
    __esModule: true,
    default: { eodReport: eodMock },
    prisma: { eodReport: eodMock },
  };
});

const { requireUser } = jest.requireMock("@/lib/apiAuth");
const { prisma } = jest.requireMock("@/lib/prisma");

describe("POST /api/eod-reports preserves manager status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      id: 10,
      role: "EMPLOYEE",
      isTestUser: false,
    });
  });

  it("does not overwrite non-DRAFT status when updating existing report", async () => {
    (prisma.eodReport.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      status: "NEEDS_ATTENTION",
      userId: 10,
      ventureId: 1,
      date: new Date(),
    });

    const { req, res } = createMockReqRes("POST", {
      ventureId: 1,
      summary: "Updated summary",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.eodReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ status: "NEEDS_ATTENTION" }),
      }),
    );
  });
});
