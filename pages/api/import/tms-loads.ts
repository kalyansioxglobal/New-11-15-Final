import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "csv-parse/sync";
import { normalizeTmsLoadRow } from "../../../lib/import/normalizers";
import { upsertLoadFromTms } from "../../../lib/import/mappingEngine";
import type { RawCsvRow } from "../../../lib/import/types";
import { requireUploadPermission } from '@/lib/apiAuth';
import { logActivity, ACTIVITY_ACTIONS, ACTIVITY_MODULES } from '@/lib/activityLog';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireUploadPermission(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
    }) as RawCsvRow[];

    let processed = 0;
    let upserts = 0;

    for (const row of records) {
      processed++;
      const normalized = normalizeTmsLoadRow(row);
      if (!normalized.tmsLoadId) continue;
      await upsertLoadFromTms(normalized);
      upserts++;
    }

    await logActivity({
      userId: user.id,
      action: ACTIVITY_ACTIONS.IMPORT,
      module: ACTIVITY_MODULES.IMPORT,
      entityType: 'Load',
      description: `TMS loads import: ${upserts} upserts from ${processed} rows`,
      metadata: { processed, upserts },
      req,
    });

    return res.status(200).json({
      message: "TMS loads import complete",
      processed,
      upserts,
    });
  } catch (err: any) {
    console.error("TMS loads import error:", err);
    return res.status(500).json({
      error: "Failed to import TMS loads CSV",
      detail: err?.message ?? "Unknown error",
    });
  }
}
