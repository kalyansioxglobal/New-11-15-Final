import { createApiHandler, ApiError } from "@/lib/api/handler";
import { prisma } from "@/lib/prisma";
import { isLeadership } from "@/lib/permissions";

const VALID_STATUSES = ["PRESENT", "PTO", "HALF_DAY", "SICK", "REMOTE", "LATE"] as const;
type AttendanceStatus = typeof VALID_STATUSES[number];

export default createApiHandler(
  {
    GET: async (req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("Authentication required", 401, "UNAUTHENTICATED");
      }

      const { userId, ventureId, startDate, endDate, page = "1", pageSize = "50" } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 50));
      const skip = (pageNum - 1) * limit;

      const where: any = { isTest: ctx.user.isTestUser };

      const targetUserId = userId ? parseInt(userId as string, 10) : null;
      if (targetUserId && targetUserId !== ctx.user.id && !isLeadership({ role: ctx.user.role })) {
        throw new ApiError("You can only view your own attendance", 403, "FORBIDDEN");
      }

      if (targetUserId) {
        where.userId = targetUserId;
      } else if (!isLeadership({ role: ctx.user.role })) {
        where.userId = ctx.user.id;
      }

      const isGlobalLeader = ["CEO", "ADMIN", "COO"].includes(ctx.user.role);
      const targetVentureId = ventureId ? parseInt(ventureId as string, 10) : null;
      
      if (targetVentureId) {
        if (!ctx.user.ventureIds?.includes(targetVentureId) && !isGlobalLeader) {
          throw new ApiError("Venture access denied", 403, "FORBIDDEN");
        }
        where.ventureId = targetVentureId;
      } else if (!isGlobalLeader && ctx.user.ventureIds?.length) {
        where.ventureId = { in: ctx.user.ventureIds };
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.date.lte = new Date(endDate as string);
        }
      }

      const [items, total] = await Promise.all([
        prisma.attendance.findMany({
          where,
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            venture: { select: { id: true, name: true } },
            office: { select: { id: true, name: true } },
          },
          orderBy: { date: "desc" },
          skip,
          take: limit,
        }),
        prisma.attendance.count({ where }),
      ]);

      return {
        data: {
          items,
          total,
          page: pageNum,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    },

    POST: async (req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("Authentication required", 401, "UNAUTHENTICATED");
      }

      const { date, status, notes, ventureId, officeId, userId } = req.body;

      if (!date) {
        throw new ApiError("Date is required", 400, "VALIDATION_ERROR");
      }

      if (!status || !VALID_STATUSES.includes(status)) {
        throw new ApiError(
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );
      }

      const targetUserId = userId ? parseInt(userId, 10) : ctx.user.id;
      const targetVentureId = ventureId ? parseInt(ventureId, 10) : ctx.user.ventureIds?.[0];

      if (targetUserId !== ctx.user.id && !isLeadership({ role: ctx.user.role })) {
        throw new ApiError("You can only mark your own attendance", 403, "FORBIDDEN");
      }

      if (!targetVentureId) {
        throw new ApiError("Venture ID is required", 400, "VALIDATION_ERROR");
      }

      const parsedDate = new Date(date);
      parsedDate.setHours(0, 0, 0, 0);

      const attendance = await prisma.attendance.upsert({
        where: {
          userId_date_ventureId_officeId: {
            userId: targetUserId,
            date: parsedDate,
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
          userId: targetUserId,
          ventureId: targetVentureId,
          officeId: officeId ? parseInt(officeId, 10) : null,
          date: parsedDate,
          status,
          notes: notes || null,
          isTest: ctx.user.isTestUser,
        },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          venture: { select: { id: true, name: true } },
        },
      });

      return { data: attendance, status: 201 };
    },
  },
  { requireAuth: true }
);
