/**
 * User Preferences Endpoint
 * 
 * Example of using createApiHandler with Zod validation.
 * GET: Returns user preferences (creates defaults if none exist)
 * PUT: Updates user preferences with validated input
 */
import { createApiHandler, ApiError } from "@/lib/api/handler";
import { validateBody } from "@/lib/api/validation";
import prisma from "@/lib/prisma";
import { z } from "zod";

const UpdatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  density: z.enum(["comfortable", "compact"]).optional(),
  fontSize: z.enum(["small", "medium", "large"]).optional(),
  landingPage: z.enum(["freight", "hotels", "bpo", "holdings"]).optional(),
  layout: z.unknown().optional(),
});

type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

export default createApiHandler(
  {
    GET: async (_req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("User not found", 401, "UNAUTHENTICATED");
      }

      const prefs = await prisma.userPreferences.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!prefs) {
        const created = await prisma.userPreferences.create({
          data: {
            userId: ctx.user.id,
            theme: "system",
            density: "comfortable",
            fontSize: "medium",
            landingPage: "freight",
          },
        });
        return { data: created };
      }

      return { data: prefs };
    },

    PUT: async (req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("User not found", 401, "UNAUTHENTICATED");
      }

      const payload: UpdatePreferencesInput = validateBody(
        UpdatePreferencesSchema,
        req
      );

      const layoutValue = payload.layout as object | undefined;

      const updated = await prisma.userPreferences.upsert({
        where: { userId: ctx.user.id },
        update: {
          theme: payload.theme,
          density: payload.density,
          fontSize: payload.fontSize,
          landingPage: payload.landingPage,
          layout: layoutValue,
        },
        create: {
          userId: ctx.user.id,
          theme: payload.theme ?? "system",
          density: payload.density ?? "comfortable",
          fontSize: payload.fontSize ?? "medium",
          landingPage: payload.landingPage ?? "freight",
          layout: layoutValue,
        },
      });

      return { data: updated };
    },
  },
  { requireAuth: true }
);
