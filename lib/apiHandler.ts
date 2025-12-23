import type { NextApiRequest, NextApiResponse } from "next";
import { logger } from "./logger";

export type ApiHandlerFn = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

export function withApiErrorHandling(handler: ApiHandlerFn): ApiHandlerFn {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err: unknown) {
      const errorId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const error = err as Error;

      logger.error("Unhandled API error", {
        errorId,
        route: req.url,
        method: req.method,
        errorMessage: error?.message,
        stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal Server Error",
          errorId,
        });
      }
    }
  };
}
