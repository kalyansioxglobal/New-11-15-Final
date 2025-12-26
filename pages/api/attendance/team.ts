import { createApiHandler, ApiError } from "@/lib/api/handler";
import { prisma } from "@/lib/prisma";
import { isLeadership } from "@/lib/permissions";

export default createApiHandler(
  {
    GET: async (req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("Authentication required", 401, "UNAUTHENTICATED");
      }

      if (!isLeadership({ role: ctx.user.role })) {
        throw new ApiError("Leadership access required", 403, "FORBIDDEN");
      }

      const { ventureId, date, startDate, endDate } = req.query;

      let targetDate: Date;
      if (date) {
        targetDate = new Date(date as string);
      } else {
        targetDate = new Date();
      }
      targetDate.setHours(0, 0, 0, 0);

      const teamWhere: any = {
        isActive: true,
        isTestUser: ctx.user.isTestUser,
      };

      if (ventureId) {
        teamWhere.ventures = {
          some: { ventureId: parseInt(ventureId as string, 10) },
        };
      } else if (ctx.user.ventureIds?.length) {
        teamWhere.ventures = {
          some: { ventureId: { in: ctx.user.ventureIds } },
        };
      }

      const teamMembers = await prisma.user.findMany({
        where: teamWhere,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          ventures: {
            select: {
              venture: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { fullName: "asc" },
      });

      const attendanceWhere: any = {
        userId: { in: teamMembers.map((m: { id: number }) => m.id) },
        isTest: ctx.user.isTestUser,
      };

      if (startDate && endDate) {
        attendanceWhere.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      } else {
        attendanceWhere.date = targetDate;
      }

      const attendanceRecords = await prisma.attendance.findMany({
        where: attendanceWhere,
        select: {
          userId: true,
          date: true,
          status: true,
          notes: true,
          ventureId: true,
        },
      });

      const attendanceMap = new Map<string, any>();
      for (const record of attendanceRecords) {
        const key = `${record.userId}-${record.date.toISOString().split("T")[0]}`;
        attendanceMap.set(key, record);
      }

      const teamWithAttendance = teamMembers.map((member: typeof teamMembers[0]) => {
        const dateKey = `${member.id}-${targetDate.toISOString().split("T")[0]}`;
        const attendance = attendanceMap.get(dateKey);

        return {
          ...member,
          ventures: member.ventures.map((v: { venture: { id: number; name: string } }) => v.venture),
          attendance: attendance || null,
          hasMarkedToday: !!attendance,
        };
      });

      const summary = {
        total: teamMembers.length,
        marked: teamWithAttendance.filter((m: { hasMarkedToday: boolean }) => m.hasMarkedToday).length,
        present: attendanceRecords.filter((r: { status: string }) => r.status === "PRESENT" || r.status === "REMOTE").length,
        pto: attendanceRecords.filter((r: { status: string }) => r.status === "PTO").length,
        halfDay: attendanceRecords.filter((r: { status: string }) => r.status === "HALF_DAY").length,
        sick: attendanceRecords.filter((r: { status: string }) => r.status === "SICK").length,
        late: attendanceRecords.filter((r: { status: string }) => r.status === "LATE").length,
        notMarked: teamWithAttendance.filter((m: { hasMarkedToday: boolean }) => !m.hasMarkedToday).length,
      };

      return {
        data: {
          date: targetDate.toISOString().split("T")[0],
          team: teamWithAttendance,
          summary,
        },
      };
    },

    POST: async (req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("Authentication required", 401, "UNAUTHENTICATED");
      }

      if (!isLeadership({ role: ctx.user.role })) {
        throw new ApiError("Leadership access required to update team attendance", 403, "FORBIDDEN");
      }

      const { userId, date, status, notes, ventureId, officeId } = req.body;

      if (!userId) {
        throw new ApiError("User ID is required", 400, "VALIDATION_ERROR");
      }

      const VALID_STATUSES = ["PRESENT", "PTO", "HALF_DAY", "SICK", "REMOTE", "LATE"];
      if (!status || !VALID_STATUSES.includes(status)) {
        throw new ApiError(
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );
      }

      const targetUserId = parseInt(userId, 10);
      if (isNaN(targetUserId) || targetUserId <= 0) {
        throw new ApiError("Invalid user ID", 400, "VALIDATION_ERROR");
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

        // Priority 3: Query VentureUser table for the target user
        if (!targetVentureId) {
          const userVenture = await prisma.ventureUser.findFirst({
            where: { userId: targetUserId },
            select: { ventureId: true },
            orderBy: { id: "asc" },
          });
          if (userVenture) {
            targetVentureId = userVenture.ventureId;
          }
        }

        // Priority 4: Check previous attendance records for the target user
        if (!targetVentureId) {
          const previousAttendance = await prisma.attendance.findFirst({
            where: {
              userId: targetUserId,
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

      // Verify the target user exists and get their test mode
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, isTestUser: true },
      });

      if (!targetUser) {
        throw new ApiError("User not found", 404, "NOT_FOUND");
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

        // Verify the venture exists
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
            userId: targetUserId,
            date: targetDate,
            ventureId: targetVentureId,
            officeId: parsedOfficeId,
          },
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            venture: { select: { id: true, name: true } },
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
              user: { select: { id: true, fullName: true, email: true } },
              venture: { select: { id: true, name: true } },
              office: parsedOfficeId ? { select: { id: true, name: true } } : undefined,
            },
          });
        } else {
          // Create new record
          attendance = await prisma.attendance.create({
            data: {
              userId: targetUserId,
              ventureId: targetVentureId,
              officeId: parsedOfficeId,
              date: targetDate,
              status,
              notes: notes || null,
              isTest: targetUser.isTestUser,
            },
            include: {
              user: { select: { id: true, fullName: true, email: true } },
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
