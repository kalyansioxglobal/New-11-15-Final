import type { NextApiRequest, NextApiResponse } from "next";
import { buildCarrierDraftPrompt } from "@/lib/ai/freightCarrierOutreachAssistant";
import handler from "@/pages/api/ai/freight-carrier-draft";

jest.mock("@/lib/apiAuth", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
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

jest.mock("@/lib/ai/freightCarrierOutreachAssistant", () => ({
  generateCarrierOutreachDraft: jest.fn().mockResolvedValue("draft text"),
  buildCarrierDraftPrompt: jest.requireActual("@/lib/ai/freightCarrierOutreachAssistant").buildCarrierDraftPrompt,
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    carrierDispatcher: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    aiRateLimit: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    aiUsage: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    },
  },
}));

const { requireUser } = jest.requireMock("@/lib/apiAuth");
const prisma = jest.requireMock("@/lib/prisma").default;
const { generateCarrierOutreachDraft } = jest.requireMock(
  "@/lib/ai/freightCarrierOutreachAssistant",
);

function createMockReqRes(
  body: any = {},
): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = {
    method: "POST",
    body,
    headers: { "x-request-id": "test-request-id" },
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

describe("freightCarrierOutreach assistant prompt", () => {
  it("includes carrier, lane, and load context", () => {
    const prompt = buildCarrierDraftPrompt({
      draftType: "coverage_request",
      carrierName: "Acme Logistics",
      lane: { origin: "Dallas, TX", destination: "Los Angeles, CA" },
      load: { pickupDate: "2025-01-12", weight: 42000, equipment: "Dry Van", commodity: "Food" },
      contextNotes: "Repeat carrier, prefers email in the morning.",
      userId: 1,
    } as any);

    expect(prompt).toContain("Acme Logistics");
    expect(prompt).toContain("Dallas, TX");
    expect(prompt).toContain("Los Angeles, CA");
    expect(prompt).toContain("pickupDate: 2025-01-12");
    expect(prompt).toContain("This is a coverage request");
  });

  it("includes template hint and tone when provided", () => {
    const prompt = buildCarrierDraftPrompt({
      draftType: "inquiry",
      carrierName: "Acme Logistics",
      lane: { origin: "Dallas, TX", destination: "Los Angeles, CA" },
      load: {},
      contextNotes: "",
      templateId: "freight_lane_inquiry_polite",
      toneId: "friendly",
      userId: 1,
    } as any);

    expect(prompt).toContain("Template: Polite Lane Inquiry");
    expect(prompt).toContain("Use a warm, friendly, but still professional tone.");
  });
});

describe("POST /api/ai/freight-carrier-draft", () => {
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

    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CSR",
      email: "x@example.com",
      fullName: "CSR",
      ventureIds: [],
      officeIds: [],
      isTestUser: false,
    });

    const { req, res } = createMockReqRes({
      carrierName: "Acme",
      lane: { origin: "Dallas", destination: "LA" },
      load: {},
      draftType: "inquiry",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.jsonData.error).toBe("AI_DISABLED");
  });

  it("enforces RBAC and rejects disallowed roles", async () => {
    const { aiConfig } = jest.requireMock("@/lib/config/ai");
    aiConfig.enabled = true;
    aiConfig.freightAssistantEnabled = true;

    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "EMPLOYEE",
      email: "x@example.com",
      fullName: "Emp",
      ventureIds: [],
      officeIds: [],
      isTestUser: false,
    });

    const { req, res } = createMockReqRes({
      carrierName: "Acme",
      lane: { origin: "Dallas", destination: "LA" },
      load: {},
      draftType: "inquiry",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toBe("FORBIDDEN");
  });

  it("validates required body fields", async () => {
    const { aiConfig } = jest.requireMock("@/lib/config/ai");
    aiConfig.enabled = true;
    aiConfig.freightAssistantEnabled = true;

    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CSR",
      email: "x@example.com",
      fullName: "CSR",
      ventureIds: [],
      officeIds: [],
      isTestUser: false,
    });

    const { req, res } = createMockReqRes({});

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });
  it("requires dispatcherName when contactRole is dispatcher", async () => {
    const { aiConfig } = jest.requireMock("@/lib/config/ai");
    aiConfig.enabled = true;
    aiConfig.freightAssistantEnabled = true;

    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CSR",
      email: "x@example.com",
      fullName: "CSR",
      ventureIds: [],
      officeIds: [],
      isTestUser: false,
    });

    const { req, res } = createMockReqRes({
      carrierName: "Acme",
      lane: { origin: "Dallas", destination: "LA" },
      load: { pickupDate: "2025-01-12" },
      draftType: "inquiry",
      contactRole: "dispatcher",
      // No dispatcherName and no dispatcherId
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("DISPATCHER_NAME_REQUIRED");
  });


  it("uses DB-backed dispatcher when dispatcherId is provided", async () => {
    const { aiConfig } = jest.requireMock("@/lib/config/ai");
    aiConfig.enabled = true;
    aiConfig.freightAssistantEnabled = true;

    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CSR",
      email: "x@example.com",
      fullName: "CSR",
      ventureIds: [],
      officeIds: [],
      isTestUser: false,
    });

    (prisma.carrierDispatcher.findUnique as jest.Mock).mockResolvedValue({
      id: 10,
      carrierId: 123,
      name: "DB Dispatcher",
      email: "db@example.com",
      phone: "123",
      isPrimary: false,
      carrier: { id: 123, name: "Acme" },
    });

    const { req, res } = createMockReqRes({
      carrierName: "Acme",
      lane: { origin: "Dallas", destination: "LA" },
      load: { pickupDate: "2025-01-12" },
      draftType: "inquiry",
      contactRole: "dispatcher",
      dispatcherId: "10",
      dispatcherName: "Manual Should Be Ignored",
      dispatcherEmail: "manual@example.com",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(generateCarrierOutreachDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        contactRole: "dispatcher",
        dispatcherName: "DB Dispatcher",
        dispatcherEmail: "db@example.com",
      }),
    );
  });

  it("returns DISPATCHER_NOT_FOUND when dispatcherId does not resolve", async () => {
    const { aiConfig } = jest.requireMock("@/lib/config/ai");
    aiConfig.enabled = true;
    aiConfig.freightAssistantEnabled = true;

    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CSR",
      email: "x@example.com",
      fullName: "CSR",
      ventureIds: [],
      officeIds: [],
      isTestUser: false,
    });

    (prisma.carrierDispatcher.findUnique as jest.Mock).mockResolvedValue(null);

    const { req, res } = createMockReqRes({
      carrierName: "Acme",
      lane: { origin: "Dallas", destination: "LA" },
      load: { pickupDate: "2025-01-12" },
      draftType: "inquiry",
      contactRole: "dispatcher",
      dispatcherId: "999",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("DISPATCHER_NOT_FOUND");
  });

  it("uses free-form dispatcher when dispatcherId is not provided", async () => {
    const { aiConfig } = jest.requireMock("@/lib/config/ai");
    aiConfig.enabled = true;
    aiConfig.freightAssistantEnabled = true;

    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CSR",
      email: "x@example.com",
      fullName: "CSR",
      ventureIds: [],
      officeIds: [],
      isTestUser: false,
    });

    const { req, res } = createMockReqRes({
      carrierName: "Acme",
      lane: { origin: "Dallas", destination: "LA" },
      load: { pickupDate: "2025-01-12" },
      draftType: "inquiry",
      contactRole: "dispatcher",
      dispatcherName: "Manual Dispatcher",
      dispatcherEmail: "manual@example.com",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(generateCarrierOutreachDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        contactRole: "dispatcher",
        dispatcherName: "Manual Dispatcher",
        dispatcherEmail: "manual@example.com",
      }),
    );
  });


  it("returns draft when input is valid and user is allowed", async () => {
    const { aiConfig } = jest.requireMock("@/lib/config/ai");
    aiConfig.enabled = true;
    aiConfig.freightAssistantEnabled = true;

    (requireUser as jest.Mock).mockResolvedValue({
      id: 1,
      role: "CSR",
      email: "x@example.com",
      fullName: "CSR",
      ventureIds: [],
      officeIds: [],
      isTestUser: false,
    });

    const { req, res } = createMockReqRes({
      carrierName: "Acme",
      lane: { origin: "Dallas", destination: "LA" },
      load: { pickupDate: "2025-01-12" },
      draftType: "inquiry",
    });

    // @ts-expect-error partial
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toHaveProperty("draft", "draft text");
    expect(res.jsonData).toHaveProperty("tokensEstimated");
  });
});
