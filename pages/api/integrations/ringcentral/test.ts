import type { NextApiRequest, NextApiResponse } from "next";
import { SDK } from "@ringcentral/sdk";
import { requireAdminUser } from "@/lib/apiAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireAdminUser(req, res);
  if (!user) return;

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    const errorObj = {
      message: "RingCentral login failed",
      status: loginErr.response?.status || loginErr.code || "unknown",
      details: details || loginErr.message,
    };
    console.error("RingCentral login error:", errorObj);
    return res.status(500).json(errorObj);
  }

  try {
    const now = new Date();
    const from = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const body = {
      grouping: { groupBy: "Users", keys: [] },
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

    const resp = await platform.post(
      "/analytics/calls/v1/accounts/~/timeline/fetch?interval=Day&page=1&perPage=20",
      body
    );

    const data = await resp.json();

    await platform.logout();

    return res.status(200).json({ ok: true, data });
  } catch (apiErr: any) {
    let details = null;
    try {
      if (apiErr.response) {
        details = await apiErr.response.json();
      }
    } catch {}

    const errorObj = {
      message: "RingCentral API call failed",
      status: apiErr.response?.status || apiErr.code || "unknown",
      details: details || apiErr.message,
    };
    console.error("RingCentral API error:", errorObj);

    try {
      await platform.logout();
    } catch {}

    return res.status(500).json(errorObj);
  }
}
