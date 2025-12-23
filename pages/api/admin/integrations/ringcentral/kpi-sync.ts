import type { NextApiRequest, NextApiResponse } from "next";
import { SDK } from "@ringcentral/sdk";
import { requireUser } from "@/lib/apiAuth";
import { isGlobalAdmin } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!isGlobalAdmin(user)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { dryRun = false, daysBack = 2 } = req.body || {};

  const serverUrl = process.env.RC_SERVER_URL || "https://platform.ringcentral.com";
  const clientId = process.env.RC_APP_CLIENT_ID;
  const clientSecret = process.env.RC_APP_CLIENT_SECRET;
  const jwtToken = process.env.RC_USER_JWT;

  const missing: string[] = [];
  if (!clientId) missing.push("RC_APP_CLIENT_ID");
  if (!clientSecret) missing.push("RC_APP_CLIENT_SECRET");
  if (!jwtToken) missing.push("RC_USER_JWT");

  if (missing.length > 0) {
    return res.status(400).json({
      ok: false,
      error: "Missing required environment variables",
      missing,
    });
  }

  const rcsdk = new SDK({
    server: serverUrl,
    clientId: clientId!,
    clientSecret: clientSecret!,
  });

  const platform = rcsdk.platform();

  try {
    await platform.login({ jwt: jwtToken! });
  } catch (loginErr: any) {
    let details = null;
    try {
      if (loginErr.response) {
        details = await loginErr.response.json();
      }
    } catch {}
    console.error("RingCentral login error:", { details, msg: loginErr.message });
    return res.status(500).json({ error: "RingCentral login failed", details });
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
    const unmapped: string[] = [];
    const daysTouched = new Set<string>();
    const upsertOps: Array<{
      userId: number;
      ventureId: number;
      officeId: number | null;
      date: Date;
      callsMade: number;
      totalCallMinutes: number;
      avgCallMinutes: number;
    }> = [];

    for (const record of allRecords) {
      const ext = record.info?.extensionNumber;
      if (!ext) continue;

      const mapping = extToMapping.get(ext);
      if (!mapping) {
        if (!unmapped.includes(ext)) {
          unmapped.push(ext);
        }
        continue;
      }

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
        daysTouched.add(dateStr);
        recordsProcessed++;

        upsertOps.push({
          userId,
          ventureId,
          officeId,
          date,
          callsMade,
          totalCallMinutes,
          avgCallMinutes,
        });
      }
    }

    if (!dryRun) {
      for (const op of upsertOps) {
        const existing = await prisma.employeeKpiDaily.findFirst({
          where: {
            userId: op.userId,
            date: op.date,
            ventureId: op.ventureId,
            officeId: op.officeId,
          },
        });

        if (existing) {
          await prisma.employeeKpiDaily.update({
            where: { id: existing.id },
            data: {
              callsMade: op.callsMade,
              totalCallMinutes: op.totalCallMinutes,
              avgCallMinutes: op.avgCallMinutes,
            },
          });
        } else {
          await prisma.employeeKpiDaily.create({
            data: {
              userId: op.userId,
              ventureId: op.ventureId,
              officeId: op.officeId,
              date: op.date,
              callsMade: op.callsMade,
              totalCallMinutes: op.totalCallMinutes,
              avgCallMinutes: op.avgCallMinutes,
            },
          });
        }
        mappedUsersUpdated++;
      }
    } else {
      mappedUsersUpdated = upsertOps.length;
    }

    return res.status(200).json({
      ok: true,
      dryRun,
      pagesFetched: page - 1,
      recordsProcessed,
      mappedUsersUpdated,
      unmapped,
      daysTouched: Array.from(daysTouched).sort(),
    });
  } catch (apiErr: any) {
    let details = null;
    try {
      if (apiErr.response) {
        details = await apiErr.response.json();
      }
    } catch {}
    console.error("RingCentral API error:", { details, msg: apiErr.message });

    try {
      await platform.logout();
    } catch {}

    return res.status(500).json({ error: "RingCentral API call failed", details });
  }
}
