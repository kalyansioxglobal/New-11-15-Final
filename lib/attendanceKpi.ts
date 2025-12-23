import prisma from "@/lib/prisma";

export type AttendanceContext = {
  totalBusinessDays: number;
  effectiveWorkDays: number;
  attendanceRate: number;
  missingDays: number;
  breakdown: {
    present: number;
    remote: number;
    pto: number;
    halfDay: number;
    sick: number;
    late: number;
    notMarked: number;
  };
};

export type TeamAttendanceContext = {
  teamSize: number;
  totalPersonDays: number;
  effectivePersonDays: number;
  attendanceRate: number;
  byStatus: {
    present: number;
    remote: number;
    pto: number;
    halfDay: number;
    sick: number;
    late: number;
    notMarked: number;
  };
};

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

export async function getAttendanceContext(
  userId: number,
  startDate: Date,
  endDate: Date,
  options: { ventureId?: number; isTest?: boolean } = {}
): Promise<AttendanceContext> {
  const where: any = {
    userId,
    date: { gte: startDate, lte: endDate },
  };
  
  if (options.ventureId) {
    where.ventureId = options.ventureId;
  }
  if (typeof options.isTest === "boolean") {
    where.isTest = options.isTest;
  }

  const records = await prisma.attendance.findMany({
    where,
    select: { status: true },
  });

  let present = 0;
  let remote = 0;
  let pto = 0;
  let halfDay = 0;
  let sick = 0;
  let late = 0;

  for (const r of records) {
    switch (r.status) {
      case "PRESENT": present++; break;
      case "REMOTE": remote++; break;
      case "PTO": pto++; break;
      case "HALF_DAY": halfDay++; break;
      case "SICK": sick++; break;
      case "LATE": late++; break;
    }
  }

  const totalBusinessDays = getBusinessDaysBetween(startDate, endDate);
  const workedDays = present + remote + late;
  const effectiveWorkDays = workedDays + halfDay * 0.5;
  const notMarked = totalBusinessDays - records.length;

  return {
    totalBusinessDays,
    effectiveWorkDays,
    attendanceRate: totalBusinessDays > 0 
      ? Math.round((effectiveWorkDays / totalBusinessDays) * 100) 
      : 0,
    missingDays: notMarked,
    breakdown: { present, remote, pto, halfDay, sick, late, notMarked },
  };
}

export async function getTeamAttendanceContext(
  userIds: number[],
  startDate: Date,
  endDate: Date,
  options: { ventureId?: number; isTest?: boolean } = {}
): Promise<TeamAttendanceContext> {
  if (userIds.length === 0) {
    return {
      teamSize: 0,
      totalPersonDays: 0,
      effectivePersonDays: 0,
      attendanceRate: 0,
      byStatus: { present: 0, remote: 0, pto: 0, halfDay: 0, sick: 0, late: 0, notMarked: 0 },
    };
  }

  const where: any = {
    userId: { in: userIds },
    date: { gte: startDate, lte: endDate },
  };

  if (options.ventureId) {
    where.ventureId = options.ventureId;
  }
  if (typeof options.isTest === "boolean") {
    where.isTest = options.isTest;
  }

  const records = await prisma.attendance.findMany({
    where,
    select: { status: true },
  });

  let present = 0;
  let remote = 0;
  let pto = 0;
  let halfDay = 0;
  let sick = 0;
  let late = 0;

  for (const r of records) {
    switch (r.status) {
      case "PRESENT": present++; break;
      case "REMOTE": remote++; break;
      case "PTO": pto++; break;
      case "HALF_DAY": halfDay++; break;
      case "SICK": sick++; break;
      case "LATE": late++; break;
    }
  }

  const totalBusinessDays = getBusinessDaysBetween(startDate, endDate);
  const teamSize = userIds.length;
  const totalPersonDays = totalBusinessDays * teamSize;
  const workedDays = present + remote + late;
  const effectivePersonDays = workedDays + halfDay * 0.5;
  const notMarked = totalPersonDays - records.length;

  return {
    teamSize,
    totalPersonDays,
    effectivePersonDays,
    attendanceRate: totalPersonDays > 0 
      ? Math.round((effectivePersonDays / totalPersonDays) * 100) 
      : 0,
    byStatus: { present, remote, pto, halfDay, sick, late, notMarked },
  };
}

export function prorateKpi(
  rawValue: number, 
  effectiveWorkDays: number, 
  totalBusinessDays: number
): number {
  if (effectiveWorkDays === 0 || totalBusinessDays === 0) return rawValue;
  const adjustmentFactor = totalBusinessDays / effectiveWorkDays;
  return rawValue * adjustmentFactor;
}

export function calculateKpiPerActiveDay(
  totalValue: number,
  effectiveWorkDays: number
): number {
  if (effectiveWorkDays === 0) return 0;
  return totalValue / effectiveWorkDays;
}
