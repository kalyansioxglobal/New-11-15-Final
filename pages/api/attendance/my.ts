import { createApiHandler, ApiError } from "@/lib/api/handler";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["PRESENT", "PTO", "HALF_DAY", "SICK", "REMOTE", "LATE"] as const;

export default createApiHandler(
  {
    GET: async (req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("Authentication required", 401, "UNAUTHENTICATED");
      }

      const { startDate, endDate, limit = "30" } = req.query;

      const where: any = {
        userId: ctx.user.id,
        isTest: ctx.user.isTestUser,
      };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.date.lte = new Date(endDate as string);
        }
      }

      const records = await prisma.attendance.findMany({
        where,
        include: {
          venture: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
        take: Math.min(100, parseInt(limit as string, 10) || 30),
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayRecord = records.find((r: { date: Date }) => {
        const recordDate = new Date(r.date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });

      return {
        data: {
          today: todayRecord || null,
          history: records,
          statuses: [...VALID_STATUSES],
        },
      };
    },

    POST: async (req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("Authentication required", 401, "UNAUTHENTICATED");
      }

      const { status, notes, ventureId, officeId, date } = req.body;

      if (!status || !VALID_STATUSES.includes(status)) {
        throw new ApiError(
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );
      }

      const targetVentureId = ventureId
        ? parseInt(ventureId, 10)
        : ctx.user.ventureIds?.[0];

      if (!targetVentureId) {
        throw new ApiError("No venture associated with your account", 400, "VALIDATION_ERROR");
      }

      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const attendance = await prisma.attendance.upsert({
        where: {
          userId_date_ventureId_officeId: {
            userId: ctx.user.id,
            date: targetDate,
            ventureId: targetVentureId,
            officeId: officeId ? parseInt(officeId, 10) : null,
          },
        },
        update: {
          status,
          notes: notes || null,
          updatedAt: new Date(),
        },
        create: {
          userId: ctx.user.id,
          ventureId: targetVentureId,
          officeId: officeId ? parseInt(officeId, 10) : null,
          date: targetDate,
          status,
          notes: notes || null,
          isTest: ctx.user.isTestUser,
        },
        include: {
          venture: { select: { id: true, name: true } },
        },
      });

      return { data: attendance, status: 201 };
    },
  },
  { requireAuth: true }
);
