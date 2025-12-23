import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import prisma from "@/lib/prisma";
import listHandler from "@/pages/api/carriers/dispatchers/list";
import addHandler from "@/pages/api/carriers/dispatchers/add";
import removeHandler from "@/pages/api/carriers/dispatchers/remove";
import carriersIndexHandler from "@/pages/api/freight/carriers/index";
import { parseCarrierDispatchersJson } from "@/lib/carriers/dispatchers";

jest.mock("@/lib/requestLog", () => ({
  withRequestLogging: jest.fn(),
}));

jest.mock("@/lib/audit", () => ({
  logAuditEvent: jest.fn(),
}));

// Dynamic role mock so we can test RBAC behaviours
jest.mock("@/lib/api", () => {
  const original = jest.requireActual("@/lib/api");

  return {
    ...original,
    withUser:
      (handler: any) =>
      async (req: NextApiRequest, res: NextApiResponse) => {
        const role = (process.env.MOCK_USER_ROLE as any) || "ADMIN";
        const user = {
          id: 1,
          role,
          email: "test@example.com",
          fullName: "Test User",
          ventureIds: [1],
          officeIds: [],
          isTestUser: false,
        } as any;
        return handler(req, res, user);
      },
  };
});

jest.mock("@/lib/scope", () => ({
  getUserScope: () => ({ allVentures: false, ventureIds: [1], officeIds: [] }),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    carrier: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    carrierDispatcher: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as jest.Mocked<typeof prisma>;

function createMockReqRes(method: string, query: any = {}, body: any = {}) {
  const { req, res } = createMocks({ method, query, body });
  return { req: req as unknown as NextApiRequest, res: res as unknown as any };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MOCK_USER_ROLE = "ADMIN";
});

describe("Carrier dispatcher helpers", () => {
  it("parses dispatchersJson safely", () => {
    const json = JSON.stringify([
      { userId: 1, name: "John", email: "john@example.com" },
      { userId: 2, name: "Jane", email: null },
    ]);
    const parsed = parseCarrierDispatchersJson(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].userId).toBe(1);
    expect(parsed[0].name).toBe("John");
  });
});

describe("/api/carriers/dispatchers endpoints", () => {
  it("lists dispatchers for a carrier", async () => {
    (mockedPrisma.carrier.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 10,
      ventureId: 1,
      dispatchersJson: JSON.stringify([
        { userId: 22, name: "John Doe", email: "john@example.com" },
      ]),
    });

    const { req, res } = createMockReqRes("GET", { carrierId: "10" });

    // @ts-expect-error partial
    await listHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.carrierId).toBe(10);
    expect(data.dispatchers).toHaveLength(1);
    expect(data.dispatchers[0].userId).toBe(22);
  });

  it("adds a dispatcher mapping and syncs JSON", async () => {
    (mockedPrisma.carrier.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 10,
      ventureId: 1,
      dispatchersJson: null,
    });

    (mockedPrisma.carrierDispatcher.create as jest.Mock).mockResolvedValueOnce({});

    (mockedPrisma.carrier.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 10,
      ventureId: 1,
      dispatchersJson: JSON.stringify([
        { userId: 22, name: "John Doe", email: "john@example.com" },
      ]),
    });

    const { req, res } = createMockReqRes("POST", {}, { carrierId: 10, userId: 22 });

    // @ts-expect-error partial
    await addHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.dispatchers).toHaveLength(1);
  });

  it("removes a dispatcher mapping and syncs JSON", async () => {
    (mockedPrisma.carrier.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 10,
      ventureId: 1,
      dispatchersJson: JSON.stringify([
        { userId: 22, name: "John Doe", email: "john@example.com" },
      ]),
    });

    (mockedPrisma.carrierDispatcher.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });

    (mockedPrisma.carrier.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 10,
      ventureId: 1,
      dispatchersJson: JSON.stringify([]),
    });

    const { req, res } = createMockReqRes("POST", {}, { carrierId: 10, userId: 22 });

    // @ts-expect-error partial
    await removeHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.dispatchers).toHaveLength(0);
  });

  it("rejects forbidden roles with 403 on all dispatcher endpoints", async () => {
    process.env.MOCK_USER_ROLE = "EMPLOYEE";

    // list
    let { req, res } = createMockReqRes("GET", { carrierId: "10" });
    // @ts-expect-error partial
    await listHandler(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe("FORBIDDEN");

    // add
    ({ req, res } = createMockReqRes("POST", {}, { carrierId: 10, userId: 22 }));
    // @ts-expect-error partial
    await addHandler(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe("FORBIDDEN");

    // remove
    ({ req, res } = createMockReqRes("POST", {}, { carrierId: 10, userId: 22 }));
    // @ts-expect-error partial
    await removeHandler(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe("FORBIDDEN");
  });

  it("enforces venture scoping and returns FORBIDDEN_VENTURE", async () => {
    // Carrier in venture 2, while user is scoped to venture 1
    (mockedPrisma.carrier.findUnique as jest.Mock).mockResolvedValue({
      id: 10,
      ventureId: 2,
      dispatchersJson: JSON.stringify([]),
    });

    // list
    let { req, res } = createMockReqRes("GET", { carrierId: "10" });
    // @ts-expect-error partial
    await listHandler(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe("FORBIDDEN_VENTURE");

    // add
    ({ req, res } = createMockReqRes("POST", {}, { carrierId: 10, userId: 22 }));
    // @ts-expect-error partial
    await addHandler(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe("FORBIDDEN_VENTURE");

    // remove
    ({ req, res } = createMockReqRes("POST", {}, { carrierId: 10, userId: 22 }));
    // @ts-expect-error partial
    await removeHandler(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe("FORBIDDEN_VENTURE");
  });
});

describe("GET /api/freight/carriers with dispatcherId filter", () => {
  it("returns only carriers mapped to the given dispatcher", async () => {
    // carrierDispatcher lookup for dispatcher 22
    (mockedPrisma.carrierDispatcher.findMany as jest.Mock).mockResolvedValueOnce([
      { carrierId: 10 },
      { carrierId: 11 },
    ]);

    (mockedPrisma.carrier.count as jest.Mock).mockResolvedValueOnce(2);

    (mockedPrisma.carrier.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 10,
        name: "Carrier A",
        legalName: null,
        dbaName: null,
        mcNumber: "MC1",
        dotNumber: "DOT1",
        tmsCarrierCode: null,
        email: "a@example.com",
        phone: null,
        city: "CityA",
        state: "TX",
        postalCode: null,
        equipmentTypes: null,
        rating: 3,
        drivers: null,
        powerUnits: null,
        active: true,
        complianceStatus: "PASS",
        fmcsaStatus: null,
        dispatchersJson: JSON.stringify([
          { userId: 22, name: "John Doe", email: "john@example.com" },
        ]),
      },
      {
        id: 11,
        name: "Carrier B",
        legalName: null,
        dbaName: null,
        mcNumber: "MC2",
        dotNumber: "DOT2",
        tmsCarrierCode: null,
        email: "b@example.com",
        phone: null,
        city: "CityB",
        state: "CA",
        postalCode: null,
        equipmentTypes: null,
        rating: 4,
        drivers: null,
        powerUnits: null,
        active: true,
        complianceStatus: "PASS",
        fmcsaStatus: null,
        dispatchersJson: JSON.stringify([
          { userId: 22, name: "John Doe", email: "john@example.com" },
        ]),
      },
    ]);

    const { req, res } = createMockReqRes("GET", { dispatcherId: "22" });

    // @ts-expect-error partial
    await carriersIndexHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = res._getJSONData();
    expect(body.carriers).toHaveLength(2);
    const ids = body.carriers.map((c: any) => c.id).sort();
    expect(ids).toEqual([10, 11]);
    expect(body.totalCount).toBe(2);
    expect(body.totalPages).toBe(1);
  });

  it("returns empty list when dispatcher has no carriers", async () => {
    (mockedPrisma.carrierDispatcher.findMany as jest.Mock).mockResolvedValueOnce([]);

    const { req, res } = createMockReqRes("GET", { dispatcherId: "22" });

    // @ts-expect-error partial
    await carriersIndexHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = res._getJSONData();
    expect(body.carriers).toHaveLength(0);
    expect(body.totalCount).toBe(0);
    expect(body.totalPages).toBe(0);
  });
});
