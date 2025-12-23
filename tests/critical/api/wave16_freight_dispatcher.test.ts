import type { NextApiRequest, NextApiResponse } from "next";

function createMockReqRes(
  method: string,
  body: any = {},
): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = {
    method,
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

jest.mock("@/lib/apiAuth", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    carrierDispatcher: {
      findUnique: jest.fn(),
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

jest.mock("@/lib/config/ai", () => ({
  aiConfig: {
    enabled: true,
    freightAssistantEnabled: true,
  },
}));

jest.mock("@/lib/ai/freightCarrierOutreachAssistant", () => ({
  generateCarrierOutreachDraft: jest.fn().mockResolvedValue("Test draft output"),
}));

import handler from "@/pages/api/ai/freight-carrier-draft";
const { requireUser } = jest.requireMock("@/lib/apiAuth");
const prisma = jest.requireMock("@/lib/prisma").default;

describe("POST /api/ai/freight-carrier-draft – Wave 16 Dispatcher Resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const basePayload = {
    carrierName: "Acme Logistics",
    lane: { origin: "Dallas, TX", destination: "Los Angeles, CA" },
    load: {
      pickupDate: "2025-12-15",
      weight: 42000,
      equipment: "Dry Van",
      commodity: "Food Goods",
    },
    draftType: "inquiry",
  };

  const mockUser = {
    id: 1,
    email: "test@example.com",
    role: "CSR",
  };

  describe("Test 1: Invalid dispatcherId", () => {
    it("should return DISPATCHER_NOT_FOUND error when dispatcherId doesn't exist", async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(mockUser);
      (prisma.carrierDispatcher.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const { req, res } = createMockReqRes("POST", {
        ...basePayload,
        contactRole: "dispatcher",
        dispatcherId: "invalid-id",
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe("DISPATCHER_NOT_FOUND");
    });
  });

  describe("Test 2: Missing dispatcherName in fallback", () => {
    it("should return DISPATCHER_NAME_REQUIRED when no dispatcherId and no dispatcherName", async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(mockUser);

      const { req, res } = createMockReqRes("POST", {
        ...basePayload,
        contactRole: "dispatcher",
        // No dispatcherId, no dispatcherName
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe("DISPATCHER_NAME_REQUIRED");
    });
  });

  describe("Test 3: INVALID_CONTACT_ROLE", () => {
    it("should reject invalid contactRole", async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(mockUser);

      const { req, res } = createMockReqRes("POST", {
        ...basePayload,
        contactRole: "invalid_role",
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe("INVALID_CONTACT_ROLE");
    });
  });

  describe("Test 4: Default contactRole to carrier_owner", () => {
    it("should default to carrier_owner when contactRole is omitted", async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(mockUser);

      const { req, res } = createMockReqRes("POST", {
        ...basePayload,
        // No contactRole provided
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Should succeed, defaulting to carrier_owner
      expect(res.statusCode).toBeLessThan(400);
    });
  });

  describe("Test 5: Free-form dispatcher fallback", () => {
    it("should accept dispatcherName + dispatcherEmail when dispatcherId is not provided", async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(mockUser);

      const { req, res } = createMockReqRes("POST", {
        ...basePayload,
        contactRole: "dispatcher",
        dispatcherName: "Jane Free-form",
        dispatcherEmail: "jane@carrier.com",
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Should succeed with free-form dispatcher
      expect(res.statusCode).toBeLessThan(400);
    });
  });
});
