import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    withUser: (fn: any) => fn,
  };
});

import handlerMyIncentives from "@/pages/api/me/incentives";

function createMockReqRes(method: string = "GET", body?: any): {
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

// NOTE: This file focuses on my-* incentives endpoint behaviour.
// Admin/manager-only incentives endpoints are not re-implemented here
// because they are not present in this Next.js codebase portion.

describe("GET /api/me/incentives - my incentives scoping", () => {
  it("returns 401 when unauthenticated", async () => {
    const { req, res } = createMockReqRes("GET");

    // @ts-expect-error partial
    await handlerMyIncentives(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.error).toBe("Unauthorized");
  });
});
