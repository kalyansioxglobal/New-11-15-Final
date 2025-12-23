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
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const targetVentureId = ventureId
        ? parseInt(ventureId, 10)
        : ctx.user.ventureIds?.[0];

      if (!targetVentureId) {
        throw new ApiError("Venture ID is required", 400, "VALIDATION_ERROR");
      }

      const attendance = await prisma.attendance.upsert({
        where: {
          userId_date_ventureId_officeId: {
            userId: targetUserId,
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
          userId: targetUserId,
          ventureId: targetVentureId,
          officeId: officeId ? parseInt(officeId, 10) : null,
          date: targetDate,
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
