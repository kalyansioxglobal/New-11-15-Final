import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import csv from "csv-parser";
import prisma from "@/lib/prisma";
import { requireUploadPermission } from "@/lib/apiAuth";
import { logAuditEvent } from "@/lib/audit";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUploadPermission(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Upload failed", detail: err.message });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: "Invalid file", detail: "file is required" });
    }

    const propertyField = Array.isArray(fields.propertyId) ? fields.propertyId[0] : fields.propertyId;
    const propertyId = Number(propertyField);

    if (!propertyId || Number.isNaN(propertyId)) {
      return res.status(400).json({ error: "Invalid propertyId", detail: "propertyId is required" });
    }

    const property = await prisma.hotelProperty.findUnique({
      where: { id: propertyId },
      select: { id: true, ventureId: true },
    });

    if (!property) {
      return res.status(400).json({ error: "Invalid propertyId", detail: "Hotel property not found" });
    }

    const rows: any[] = [];

    fs.createReadStream(file.filepath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        if (rows.length === 0) {
          return res.status(400).json({ error: "Invalid file", detail: "CSV is empty" });
        }

        let rowsImported = 0;
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        try {
          for (const row of rows) {
            const dateStr = row["date"] || row["Date"];
            const occStr = row["occ"];
            const adrStr = row["adr"];
            const revparStr = row["revpar"];

            if (!dateStr || !occStr || !adrStr || !revparStr) {
              continue; // skip invalid rows; we can tighten later
            }

            const date = new Date(dateStr);
            if (Number.isNaN(date.getTime())) continue;

            const occ = Number(occStr);
            const adr = Number(adrStr);
            const revpar = Number(revparStr);

            if (Number.isNaN(occ) || Number.isNaN(adr) || Number.isNaN(revpar)) {
              continue;
            }

            const compOcc = row["comp_occ"] ? Number(row["comp_occ"]) : null;
            const compAdr = row["comp_adr"] ? Number(row["comp_adr"]) : null;
            const compRevpar = row["comp_revpar"] ? Number(row["comp_revpar"]) : null;

            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;

            await prisma.hotelKpiDaily.upsert({
              where: {
                hotelId_date: { hotelId: propertyId, date },
              },
              update: {
                occupancyPct: occ,
                adr,
                revpar,
                ventureId: property.ventureId,
              },
              create: {
                hotelId: propertyId,
                date,
                occupancyPct: occ,
                adr,
                revpar,
                ventureId: property.ventureId,
                roomsSold: 0,
                roomsAvailable: 0,
                roomRevenue: 0,
                otherRevenue: 0,
                totalRevenue: 0,
                grossOperatingProfit: 0,
                goppar: 0,
                cancellations: 0,
                noShows: 0,
                walkins: 0,
                complaints: 0,
                roomsOutOfOrder: 0,
              },
            });

            rowsImported++;
          }

          if (rowsImported === 0) {
            return res.status(400).json({
              error: "Invalid file",
              detail: "No valid STR rows found (expected date, occ, adr, revpar)",
            });
          }

          await logAuditEvent(req, user, {
            domain: "hotels",
            action: "STR_UPLOAD",
            entityType: "hotelKpiBatch",
            entityId: String(propertyId),
            metadata: {
              propertyId,
              source: "STR",
              rowsImported,
              dateRange: {
                from: minDate?.toISOString() ?? null,
                to: maxDate?.toISOString() ?? null,
              },
              changedFields: ["occupancyPct", "adr", "revpar"]
            },
          });

          return res.status(200).json({
            success: true,
            rowsImported,
            propertyId,
            source: "STR",
          });
        } catch (e: any) {
          console.error("STR upload failed", e);
          return res.status(500).json({ error: "Upload failed", detail: e?.message });
        }
      });
  });
}
