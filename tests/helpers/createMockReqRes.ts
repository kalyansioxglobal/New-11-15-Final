import { createMocks, MockRequest, MockResponse, RequestMethod } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

export interface MockReqResOptions {
  method?: RequestMethod;
  body?: any;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  session?: any;
}

export interface MockReqRes {
  req: MockRequest<NextApiRequest>;
  res: MockResponse<NextApiResponse>;
}

export function createMockReqRes(options: MockReqResOptions = {}): MockReqRes {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: options.method || 'GET',
    body: options.body || {},
    query: options.query || {},
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
    cookies: options.cookies || {},
  });
  
  if (options.session) {
    (req as any).session = options.session;
  }
  
  return { req, res };
}

export async function callHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: MockReqResOptions = {}
): Promise<{ status: number; data: any }> {
  const { req, res } = createMockReqRes(options);
  
  await handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);
  
  return {
    status: res._getStatusCode(),
    data: res._getJSONData ? res._getJSONData() : null,
  };
}

export function mockAuthenticatedUser(fixtures: { userId: string; ventureId: number; officeId: number }) {
  return {
    id: fixtures.userId,
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
    ventureIds: [fixtures.ventureId],
    officeIds: [fixtures.officeId],
  };
}
