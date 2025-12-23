import { createApiHandler, ApiError } from "@/lib/api/handler";
import { prisma } from "@/lib/prisma";

export type AttendanceStats = {
  userId: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  workedDays: number;
  ptoDays: number;
  halfDays: number;
  sickDays: number;
  effectiveWorkDays: number;
  attendanceRate: number;
};

export default createApiHandler(
  {
    GET: async (req, _res, ctx) => {
      if (!ctx.user) {
        throw new ApiError("Authentication required", 401, "UNAUTHENTICATED");
      }

      const { userId, startDate, endDate, ventureId } = req.query;

      const targetUserId = userId ? parseInt(userId as string, 10) : ctx.user.id;

      if (!startDate || !endDate) {
        throw new ApiError("startDate and endDate are required", 400, "VALIDATION_ERROR");
      }

      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const where: any = {
        userId: targetUserId,
        date: { gte: start, lte: end },
        isTest: ctx.user.isTestUser,
      };

      if (ventureId) {
        where.ventureId = parseInt(ventureId as string, 10);
      }

      const records = await prisma.attendance.findMany({
        where,
        select: {
          date: true,
          status: true,
        },
      });

      let workedDays = 0;
      let ptoDays = 0;
      let halfDays = 0;
      let sickDays = 0;
      let remoteDays = 0;
      let lateDays = 0;

      for (const record of records) {
        switch (record.status) {
          case "PRESENT":
            workedDays++;
            break;
          case "REMOTE":
            remoteDays++;
            workedDays++;
            break;
          case "PTO":
            ptoDays++;
            break;
          case "HALF_DAY":
            halfDays++;
            break;
          case "SICK":
            sickDays++;
            break;
          case "LATE":
            lateDays++;
            workedDays++;
            break;
        }
      }

      const effectiveWorkDays = workedDays + halfDays * 0.5;

      const totalBusinessDays = getBusinessDaysBetween(start, end);

      const attendanceRate =
        totalBusinessDays > 0
          ? Math.round((effectiveWorkDays / totalBusinessDays) * 100)
          : 0;

      const stats: AttendanceStats = {
        userId: targetUserId,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        totalDays: totalBusinessDays,
        workedDays,
        ptoDays,
        halfDays,
        sickDays,
        effectiveWorkDays,
        attendanceRate,
      };

      return {
        data: {
          stats,
          breakdown: {
            present: workedDays - remoteDays - lateDays,
            remote: remoteDays,
            late: lateDays,
            pto: ptoDays,
            halfDay: halfDays,
            sick: sickDays,
            notMarked: totalBusinessDays - records.length,
          },
        },
      };
    },
  },
  { requireAuth: true }
);

function getBusinessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
