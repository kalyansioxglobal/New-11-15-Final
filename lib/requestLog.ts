import type { NextApiRequest, NextApiResponse } from "next";
import { logger } from "@/lib/logger";
import type { SessionUser } from "@/lib/scope";

export interface RequestLogContext {
  user: SessionUser | null;
  ventureId?: number | null;
  officeId?: number | null;
}

export interface RequestLogParams {
  endpoint: string; // route key, e.g. "/logistics/freight-pnl"
  page?: number;
  pageSize?: number;
  dateFrom?: Date | null;
  dateTo?: Date | null;
}

function getRequestId(req: NextApiRequest): string | undefined {
  const headerId = req.headers["x-request-id"];
  if (typeof headerId === "string" && headerId.trim()) return headerId;
  if (Array.isArray(headerId) && headerId[0]) return headerId[0];
  return undefined;
}

export function withRequestLogging(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: RequestLogContext,
  params: RequestLogParams
): void {
  const start = Date.now();

  const origEnd = res.end.bind(res);

  res.end = ((...args) => {
    const latencyMs = Date.now() - start;

    const requestId = getRequestId(req);

    logger.info("api_request", {
      requestId,
      endpoint: params.endpoint,
      method: req.method,
      statusCode: res.statusCode,
      latencyMs,
      userId: ctx.user?.id ?? null,
      userRole: ctx.user?.role ?? null,
      ventureId: ctx.ventureId ?? null,
      officeId: ctx.officeId ?? null,
      page: params.page ?? null,
      pageSize: params.pageSize ?? null,
      dateFrom: params.dateFrom ? params.dateFrom.toISOString() : null,
      dateTo: params.dateTo ? params.dateTo.toISOString() : null,
    });

    return origEnd(...args);
  }) as typeof res.end;
}
