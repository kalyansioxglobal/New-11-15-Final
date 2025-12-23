// lib/api.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { getEffectiveUser } from "./effectiveUser";
import type { SessionUser } from "./scope";

type ErrorResponse = { error: string };

export type HandlerWithUser<T = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse<T | ErrorResponse>,
  user: SessionUser
) => void | Promise<void | NextApiResponse<T | ErrorResponse>>;

/**
 * Wrap an API handler with effective user resolution.
 * - Uses impersonation
 * - Returns 401 if no user
 * - Catches/logs unexpected errors
 */
export function withUser<T = unknown>(
  handler: HandlerWithUser<T>
): NextApiHandler<T | ErrorResponse> {
  return async (req, res) => {
    try {
      const user = await getEffectiveUser(req, res);
      if (!user) {
        return res.status(401).json({ error: "UNAUTHENTICATED" });
      }

      const result = await handler(req, res, user);
      return result;
    } catch (error) {
      console.error("Unhandled API error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

/**
 * Normalize `from`/`to` OR `dateFrom`/`dateTo` query params into Date objects.
 */
export function parseDateRange(query: {
  from?: string | string[];
  to?: string | string[];
  dateFrom?: string | string[];
  dateTo?: string | string[];
}) {
  const normalize = (val?: string | string[]) =>
    Array.isArray(val) ? val[0] : val;

  const fromStr = normalize(query.from ?? query.dateFrom);
  const toStr = normalize(query.to ?? query.dateTo);

  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;

  return { from, to };
}
