/**
 * Current User Endpoint
 * 
 * Example of using createApiHandler with authentication required.
 * Returns minimal user info for the authenticated user.
 */
import { createApiHandler, ApiError } from "@/lib/api/handler";

type MeResponse = {
  id: number;
  email: string;
  name: string;
  role: string;
  isTestUser: boolean;
};

export default createApiHandler(
  {
    GET: async (_req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("User not found", 401, "UNAUTHENTICATED");
      }

      const response: MeResponse = {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.fullName ?? ctx.user.email,
        role: ctx.user.role,
        isTestUser: ctx.user.isTestUser,
      };

      return { data: response };
    },
  },
  { requireAuth: true }
);
