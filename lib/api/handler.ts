/**
 * Centralized API Handler Wrapper
 * 
 * Usage:
 * ```typescript
 * import { createApiHandler, ApiError } from '@/lib/api/handler';
 * 
 * export default createApiHandler({
 *   GET: async (req, res, ctx) => {
 *     // ctx.user is the authenticated user (if requireAuth: true)
 *     return { data: { items: [] } };
 *   },
 *   POST: async (req, res, ctx) => {
 *     if (!req.body.name) {
 *       throw new ApiError('Name is required', 400, 'VALIDATION_ERROR');
 *     }
 *     return { data: { id: 1 } };
 *   }
 * }, { requireAuth: true });
 * ```
 * 
 * Benefits:
 * - Consistent error response format: { ok: false, error: { code, message } }
 * - Consistent success format: { ok: true, data: ... }
 * - Automatic error logging with request IDs
 * - Method routing built-in
 * - Optional authentication requirement
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import type { SessionUser } from "@/lib/scope";
import { logger } from "@/lib/logger";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = "BAD_REQUEST"
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiContext = {
  user: SessionUser | null;
  requestId: string;
};

export type ApiHandlerResult<T = unknown> = {
  data: T;
  status?: number;
};

export type MethodHandler<T = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: ApiContext
) => Promise<ApiHandlerResult<T> | void>;

export type ApiHandlerConfig = {
  GET?: MethodHandler;
  POST?: MethodHandler;
  PUT?: MethodHandler;
  PATCH?: MethodHandler;
  DELETE?: MethodHandler;
};

export type ApiHandlerOptions = {
  requireAuth?: boolean;
};

export function createApiHandler(
  handlers: ApiHandlerConfig,
  options: ApiHandlerOptions = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const method = req.method?.toUpperCase() as keyof ApiHandlerConfig;

    try {
      const handler = handlers[method];
      if (!handler) {
        const allowed = Object.keys(handlers).join(", ");
        res.setHeader("Allow", allowed);
        return res.status(405).json({
          ok: false,
          error: { code: "METHOD_NOT_ALLOWED", message: `Method ${method} not allowed` },
        });
      }

      let user: SessionUser | null = null;
      if (options.requireAuth) {
        user = await getEffectiveUser(req, res);
        if (!user) {
          return res.status(401).json({
            ok: false,
            error: { code: "UNAUTHENTICATED", message: "Authentication required" },
          });
        }
      } else {
        user = await getEffectiveUser(req, res);
      }

      const ctx: ApiContext = { user, requestId };
      const result = await handler(req, res, ctx);

      if (result && !res.headersSent) {
        const status = result.status ?? 200;
        return res.status(status).json({
          ok: true,
          data: result.data,
        });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
          ok: false,
          error: { code: err.code, message: err.message },
        });
      }

      const error = err as Error;
      logger.error("Unhandled API error", {
        requestId,
        route: req.url,
        method: req.method,
        errorMessage: error?.message,
        stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
      });

      if (!res.headersSent) {
        return res.status(500).json({
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
            requestId,
          },
        });
      }
    }
  };
}

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
