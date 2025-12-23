import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/ai/freight-ops-diagnostics";

jest.mock("@/lib/apiAuth", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/config/ai", () => ({
  aiConfig: {
    enabled: true,
    freightAssistantEnabled: true,
    freightAssistantModel: "test-model",
    maxTokensPerRequest: 2000,
    maxDailyCalls: 100,
  },
}));

jest.mock("@/lib/ai/freightOpsDiagnosticsAssistant", () => ({
  generateFreightOpsDiagnosticsDraft: jest.fn().mockResolvedValue("diag text"),
}));

const { requireUser } = jest.requireMock("@/lib/apiAuth");

function createMockReqRes(
  body: any = {},
): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = { method: "POST", body };
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

describe("POST /api/ai/freight-ops-diagnostics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects non-POST methods", async () => {
    const { req, res } = createMockReqRes();
    req.method = "GET";

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });

  it("returns 503 when AI flags are disabled", async () => {
    const { aiConfig } = jest.requireMock("@/lib/config/ai");
    aiConfig.enabled = false;
    aiConfig.freightAssistantEnabled = false;

    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "ADMIN" });

    const { req, res } = createMockReqRes({
      draftType: "sre_summary",
      recentLogSample: [{ endpoint: "/api/x", outcome: "error" }],
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(503);
  });

  it("returns diagnosticsDraft for allowed role and valid payload", async () => {
    const { aiConfig } = jest.requireMock("@/lib/config/ai");
    aiConfig.enabled = true;
    aiConfig.freightAssistantEnabled = true;

    (requireUser as jest.Mock).mockResolvedValue({ id: 1, role: "ADMIN" });

    const { req, res } = createMockReqRes({
      draftType: "sre_summary",
      recentLogSample: [{ endpoint: "/api/x", outcome: "error" }],
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("diagnosticsDraft", "diag text");
  });
});
