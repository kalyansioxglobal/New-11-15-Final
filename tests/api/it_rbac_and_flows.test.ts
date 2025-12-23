import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    withUser: (fn: any) => fn,
  };
});

import itAssignHandler from "@/pages/api/it-incidents/assign";

function createMockReqRes(method: string = "POST", body?: any): {
  req: Partial<NextApiRequest>;
  res: Partial<NextApiResponse> & { statusCode: number; jsonData: any };
} {
  const req: Partial<NextApiRequest> = {
    method,
    body,
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

// NOTE: This test file is intentionally minimal, confirming that
// the assign handler is wired and returns 400 on missing id.

describe("POST /api/it-incidents/assign - basic validation", () => {
  it("returns 400 when id is missing", async () => {
    const { req, res } = createMockReqRes("POST", {});

    // @ts-expect-error partial
    await itAssignHandler(req, res, { id: 1, role: "CEO" });

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBe("Incident ID is required");
  });
});
