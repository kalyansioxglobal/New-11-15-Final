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

      // Determine target venture ID with multiple fallbacks
      let targetVentureId: number | null = null;
      const isGlobalLeader = ["CEO", "ADMIN", "COO"].includes(ctx.user.role);

      try {
        // Priority 1: Use ventureId from request body if provided
        if (ventureId) {
          const parsed = typeof ventureId === "string" ? parseInt(ventureId, 10) : ventureId;
          if (!isNaN(parsed) && parsed > 0) {
            targetVentureId = parsed;
          }
        }

        // Priority 2: Use first venture from user's session ventureIds
        if (!targetVentureId && ctx.user.ventureIds && ctx.user.ventureIds.length > 0) {
          targetVentureId = ctx.user.ventureIds[0];
        }

        // Priority 3: Query VentureUser table directly
        if (!targetVentureId) {
          const userVenture = await prisma.ventureUser.findFirst({
            where: { userId: ctx.user.id },
            select: { ventureId: true },
            orderBy: { id: "asc" },
          });
          if (userVenture) {
            targetVentureId = userVenture.ventureId;
          }
        }

        // Priority 4: Check previous attendance records
        if (!targetVentureId) {
          const previousAttendance = await prisma.attendance.findFirst({
            where: {
              userId: ctx.user.id,
              isTest: ctx.user.isTestUser,
            },
            select: { ventureId: true },
            orderBy: { date: "desc" },
          });
          if (previousAttendance) {
            targetVentureId = previousAttendance.ventureId;
          }
        }

        // Priority 5: For global leaders, find first active venture
        if (!targetVentureId && isGlobalLeader) {
          const firstVenture = await prisma.venture.findFirst({
            where: {
              isActive: true,
              isTest: ctx.user.isTestUser,
            },
            select: { id: true },
            orderBy: { id: "asc" },
          });
          if (firstVenture) {
            targetVentureId = firstVenture.id;
          }
        }
      } catch (error: any) {
        console.error("Error determining venture ID:", error);
        throw new ApiError(
          "Failed to determine venture. Please provide a ventureId in your request.",
          500,
          "INTERNAL_ERROR"
        );
      }

      // Validate we have a venture ID
      if (!targetVentureId || isNaN(targetVentureId)) {
        throw new ApiError(
          "Venture ID is required. Please provide a ventureId in your request.",
          400,
          "VALIDATION_ERROR"
        );
      }

      // Verify venture access and existence
      try {
        // For non-global leaders, verify they have access to this venture
        if (!isGlobalLeader) {
          const userVentureAccess = await prisma.ventureUser.findFirst({
            where: {
              userId: ctx.user.id,
              ventureId: targetVentureId,
            },
          });

          if (!userVentureAccess) {
            throw new ApiError(
              "You do not have access to this venture",
              403,
              "FORBIDDEN"
            );
          }
        }

        // Verify the venture exists and is active
        const venture = await prisma.venture.findUnique({
          where: { id: targetVentureId },
          select: { id: true, isActive: true, isTest: true },
        });

        if (!venture) {
          throw new ApiError("Venture not found", 404, "NOT_FOUND");
        }

        // Verify test mode matches
        if (venture.isTest !== ctx.user.isTestUser) {
          throw new ApiError(
            "Venture test mode does not match your account",
            400,
            "VALIDATION_ERROR"
          );
        }
      } catch (error: any) {
        if (error instanceof ApiError) {
          throw error;
        }
        console.error("Error validating venture:", error);
        throw new ApiError(
          "Failed to validate venture access",
          500,
          "INTERNAL_ERROR"
        );
      }

      // Parse and validate date
      let targetDate: Date;
      try {
        targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        if (isNaN(targetDate.getTime())) {
          throw new ApiError("Invalid date provided", 400, "VALIDATION_ERROR");
        }
      } catch (error: any) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError("Invalid date format", 400, "VALIDATION_ERROR");
      }

      // Parse officeId if provided
      const parsedOfficeId = officeId
        ? (typeof officeId === "string" ? parseInt(officeId, 10) : officeId)
        : null;

      // Create or update attendance record
      // Note: Using findFirst + create/update instead of upsert because
      // Prisma doesn't support null values in compound unique constraint where clauses
      try {
        // First, try to find existing record
        const existing = await prisma.attendance.findFirst({
          where: {
            userId: ctx.user.id,
            date: targetDate,
            ventureId: targetVentureId,
            officeId: parsedOfficeId,
          },
          include: {
            venture: { select: { id: true, name: true } },
            office: parsedOfficeId ? { select: { id: true, name: true } } : undefined,
          },
        });

        let attendance;
        if (existing) {
          // Update existing record
          attendance = await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              status,
              notes: notes || null,
              updatedAt: new Date(),
            },
            include: {
              venture: { select: { id: true, name: true } },
              office: parsedOfficeId ? { select: { id: true, name: true } } : undefined,
            },
          });
        } else {
          // Create new record
          attendance = await prisma.attendance.create({
            data: {
              userId: ctx.user.id,
              ventureId: targetVentureId,
              officeId: parsedOfficeId,
              date: targetDate,
              status,
              notes: notes || null,
              isTest: ctx.user.isTestUser,
            },
            include: {
              venture: { select: { id: true, name: true } },
              office: parsedOfficeId ? { select: { id: true, name: true } } : undefined,
            },
          });
        }

        return { data: attendance, status: existing ? 200 : 201 };
      } catch (error: any) {
        console.error("Error saving attendance:", error);
        // Check for unique constraint violation
        if (error.code === "P2002") {
          throw new ApiError(
            "Attendance record already exists for this date, venture, and office",
            409,
            "CONFLICT"
          );
        }
        throw new ApiError(
          "Failed to save attendance record",
          500,
          "INTERNAL_ERROR"
        );
      }
    },
  },
  { requireAuth: true }
);
