import { prisma } from "../lib/prisma";
import { SDK } from "@ringcentral/sdk";

interface RcPoint {
  time: string;
  counters?: { allCalls?: { values?: number } };
  timers?: { allCalls?: { values?: number } };
}

interface RcRecord {
  key: string;
  info?: { extensionNumber?: string; name?: string };
  points?: RcPoint[];
}

interface RcResponse {
  paging?: { page?: number; totalPages?: number };
  data?: { records?: RcRecord[] };
}

async function runKpiSync(daysBack = 2) {
  console.log(`[${new Date().toISOString()}] Starting RingCentral KPI sync...`);

  const serverUrl = process.env.RC_SERVER_URL || "https://platform.ringcentral.com";
  const clientId = process.env.RC_APP_CLIENT_ID;
  const clientSecret = process.env.RC_APP_CLIENT_SECRET;
  const jwtToken = process.env.RC_USER_JWT;

  if (!clientId || !clientSecret || !jwtToken) {
    console.error("Missing RingCentral credentials");
    return;
  }

  const rcsdk = new SDK({
    server: serverUrl,
    clientId,
    clientSecret,
  });

  const platform = rcsdk.platform();

  try {
    await platform.login({ jwt: jwtToken });
  } catch (err: any) {
    console.error("RingCentral login failed:", err.message);
    return;
  }

  try {
    const now = new Date();
    const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const body = {
      grouping: { groupBy: "Users", keys: [] as string[] },
      timeSettings: {
        timeZone: "America/New_York",
        timeRange: {
          timeFrom: from.toISOString(),
          timeTo: now.toISOString(),
        },
      },
      responseOptions: {
        counters: { allCalls: true },
        timers: { allCallsDuration: true },
      },
      callFilters: { directions: ["Outbound"] },
    };

    const allRecords: RcRecord[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const resp = await platform.post(
        `/analytics/calls/v1/accounts/~/timeline/fetch?interval=Day&page=${page}&perPage=20`,
        body
      );
      const data: RcResponse = await resp.json();

      if (data.paging?.totalPages) {
        totalPages = data.paging.totalPages;
      }
      if (data.data?.records) {
        allRecords.push(...data.data.records);
      }
      page++;
    }

    await platform.logout();

    const userMappings = await prisma.userMapping.findMany({
      where: { rcExtension: { not: null } },
      include: {
        user: {
          include: {
            ventures: { take: 1 },
            offices: { take: 1 },
          },
        },
      },
    });

    const extToMapping = new Map<string, typeof userMappings[0]>();
    for (const m of userMappings) {
      if (m.rcExtension) {
        extToMapping.set(m.rcExtension, m);
      }
    }

    let recordsProcessed = 0;
    let mappedUsersUpdated = 0;

    for (const record of allRecords) {
      const ext = record.info?.extensionNumber;
      if (!ext) continue;

      const mapping = extToMapping.get(ext);
      if (!mapping) continue;

      const userId = mapping.userId;
      const ventureId = mapping.user.ventures[0]?.ventureId;
      const officeId = mapping.user.offices[0]?.officeId || null;

      if (!ventureId) continue;

      for (const point of record.points || []) {
        const callsMade = point.counters?.allCalls?.values ?? 0;
        const totalSeconds = point.timers?.allCalls?.values ?? 0;
        const totalCallMinutes = totalSeconds / 60;
        const avgCallMinutes = callsMade > 0 ? totalCallMinutes / callsMade : 0;

        const dateStr = point.time?.split("T")[0];
        if (!dateStr) continue;

        const date = new Date(dateStr + "T00:00:00Z");
        recordsProcessed++;

        const existing = await prisma.employeeKpiDaily.findFirst({
          where: { userId, date, ventureId, officeId },
        });

        if (existing) {
          await prisma.employeeKpiDaily.update({
            where: { id: existing.id },
            data: { callsMade, totalCallMinutes, avgCallMinutes },
          });
        } else {
          await prisma.employeeKpiDaily.create({
            data: { userId, ventureId, officeId, date, callsMade, totalCallMinutes, avgCallMinutes },
          });
        }
        mappedUsersUpdated++;
      }
    }

    console.log(`[${new Date().toISOString()}] Sync complete: ${recordsProcessed} records, ${mappedUsersUpdated} updates`);
  } catch (err: any) {
    console.error("RingCentral API error:", err.message);
    try {
      await platform.logout();
    } catch {}
  }
}

function getNextScheduledTime(): Date {
  const now = new Date();
  const estOffset = -5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const est = new Date(utc + estOffset * 60000);

  const currentHour = est.getHours();
  const currentMinute = est.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const schedule = [
    { hour: 13, minute: 0 },
    { hour: 17, minute: 30 },
  ];

  for (const slot of schedule) {
    const slotMinutes = slot.hour * 60 + slot.minute;
    if (slotMinutes > currentTimeMinutes) {
      const next = new Date(est);
      next.setHours(slot.hour, slot.minute, 0, 0);
      return new Date(next.getTime() - estOffset * 60000 + now.getTimezoneOffset() * 60000);
    }
  }

  const tomorrow = new Date(est);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(schedule[0].hour, schedule[0].minute, 0, 0);
  return new Date(tomorrow.getTime() - estOffset * 60000 + now.getTimezoneOffset() * 60000);
}

async function main() {
  console.log(`[${new Date().toISOString()}] RingCentral KPI scheduler started`);
  console.log("Schedule: 1:00 PM EST and 5:30 PM EST daily");

  // Initial 60-day historical sync on first run
  console.log(`[${new Date().toISOString()}] Running initial 60-day historical sync...`);
  await runKpiSync(60);

  while (true) {
    const nextRun = getNextScheduledTime();
    const waitMs = nextRun.getTime() - Date.now();

    console.log(`[${new Date().toISOString()}] Next sync scheduled for: ${nextRun.toISOString()} (in ${Math.round(waitMs / 60000)} minutes)`);

    await new Promise((resolve) => setTimeout(resolve, waitMs));
    await runKpiSync(2); // Regular 2-day sync
  }
}

main().catch(console.error);
