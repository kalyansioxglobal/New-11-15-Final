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
            const roomsSoldStr = row["rooms_sold"] || row["Rooms Sold"];
            const roomsAvailableStr = row["rooms_available"] || row["Rooms Available"];
            const revenueStr = row["room_revenue"] || row["Room Revenue"];

            if (!dateStr || !roomsSoldStr || !revenueStr) {
              continue;
            }

            const date = new Date(dateStr);
            if (Number.isNaN(date.getTime())) continue;

            const roomsSold = Number(roomsSoldStr);
            const roomsAvailable = roomsAvailableStr ? Number(roomsAvailableStr) : null;
            const roomRevenue = Number(revenueStr);

            if (Number.isNaN(roomsSold) || Number.isNaN(roomRevenue)) {
              continue;
            }

            const occ = roomsAvailable && roomsAvailable > 0 ? (roomsSold / roomsAvailable) * 100 : null;
            const adr = roomsSold > 0 ? roomRevenue / roomsSold : null;
            const revpar = roomsAvailable && roomsAvailable > 0 ? roomRevenue / roomsAvailable : null;

            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;

            await prisma.hotelKpiDaily.upsert({
              where: {
                hotelId_date: { hotelId: propertyId, date },
              },
              update: {
                roomsSold,
                roomsAvailable: roomsAvailable ?? 0,
                occupancyPct: occ ?? 0,
                roomRevenue,
                adr: adr ?? 0,
                revpar: revpar ?? 0,
                totalRevenue: roomRevenue,
                ventureId: property.ventureId,
              },
              create: {
                hotelId: propertyId,
                date,
                roomsSold,
                roomsAvailable: roomsAvailable ?? 0,
                occupancyPct: occ ?? 0,
                roomRevenue,
                adr: adr ?? 0,
                revpar: revpar ?? 0,
                totalRevenue: roomRevenue,
                otherRevenue: 0,
                ventureId: property.ventureId,
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
              detail: "No valid Night Audit rows found (expected date, rooms_sold, room_revenue)",
            });
          }

          await logAuditEvent(req, user, {
            domain: "hotels",
            action: "NIGHT_AUDIT_UPLOAD",
            entityType: "hotelKpiBatch",
            entityId: String(propertyId),
            metadata: {
              propertyId,
              source: "NIGHT_AUDIT",
              rowsImported,
              dateRange: {
                from: minDate?.toISOString() ?? null,
                to: maxDate?.toISOString() ?? null,
              },
              changedFields: ["roomsSold", "roomsAvailable", "occupancyPct", "adr", "revpar", "roomRevenue"],
            },
          });

          return res.status(200).json({
            success: true,
            rowsImported,
            propertyId,
            source: "NIGHT_AUDIT",
          });
        } catch (e: any) {
          console.error("Night Audit upload failed", e);
          return res.status(500).json({ error: "Upload failed", detail: e?.message });
        }
      });
  });
}
