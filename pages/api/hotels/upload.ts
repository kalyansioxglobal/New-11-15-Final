import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import csv from "csv-parser";
import formidable from "formidable";
import fs from "fs";
import { requireUploadPermission } from '@/lib/apiAuth';

export const config = { api: { bodyParser: false } };

const LOST_DUES_ABS_THRESHOLD = 100;
const LOST_DUES_RATIO_THRESHOLD = 0.05;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUploadPermission(req, res);
  if (!user) return;

  if (req.method !== "POST")
    return res.status(405).json({ error: "Invalid method" });

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: "File missing" });

    const hotelIdField = Array.isArray(fields.hotelId) ? fields.hotelId[0] : fields.hotelId;
    const hotelId = Number(hotelIdField);

    if (!hotelId || isNaN(hotelId)) {
      return res.status(400).json({ error: "hotelId is required" });
    }

    const hotel = await prisma.hotelProperty.findUnique({
      where: { id: hotelId },
      select: { id: true, ventureId: true },
    });

    if (!hotel) {
      return res.status(400).json({ error: "Invalid hotelId" });
    }

    const rows: any[] = [];
    fs.createReadStream(file.filepath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        try {
          let count = 0;
          const errors: string[] = [];
          
          for (const row of rows) {
            const date = new Date(row["Date"]);
            if (isNaN(date.getTime())) continue;

            const total = Number(row["Total"] || 0);
            const roomSold = Number(row["Room Sold"] || 0);
            const lostDues = Number(row["Lost Dues"] || 0);

            if (lostDues > total) {
              errors.push(`Row ${count + 1} (${row["Date"]}): Lost Dues (${lostDues}) cannot exceed Total (${total}).`);
              continue;
            }

            const adrNet = roomSold > 0 ? (total - lostDues) / roomSold : 0;

            let highLossFlag = false;
            if (lostDues > 0 && total > 0) {
              const ratio = lostDues / total;
              if (lostDues >= LOST_DUES_ABS_THRESHOLD || ratio >= LOST_DUES_RATIO_THRESHOLD) {
                highLossFlag = true;
              }
            }

            await prisma.hotelDailyReport.upsert({
              where: {
                hotelId_date: { hotelId, date },
              },
              update: {
                totalRoom: Number(row["Total Room"] || 0),
                roomSold,
                cash: Number(row["Cash"] || 0),
                credit: Number(row["Credit"] || 0),
                online: Number(row["Online"] || 0),
                refund: Number(row["Refund"] || 0),
                total,
                dues: Number(row["Dues"] || 0),
                lostDues,
                occupancy: Number(row["Occupancy"] || 0),
                adr: adrNet,
                revpar: Number(row["RevPar"] || 0),
                highLossFlag,
              },
              create: {
                hotelId,
                date,
                totalRoom: Number(row["Total Room"] || 0),
                roomSold,
                cash: Number(row["Cash"] || 0),
                credit: Number(row["Credit"] || 0),
                online: Number(row["Online"] || 0),
                refund: Number(row["Refund"] || 0),
                total,
                dues: Number(row["Dues"] || 0),
                lostDues,
                occupancy: Number(row["Occupancy"] || 0),
                adr: adrNet,
                revpar: Number(row["RevPar"] || 0),
                highLossFlag,
              },
            });

            const roomsAvailable = Number(row["Total Room"] || 0);
            const roomsSold = roomSold;
            const roomRevenue = total;
            const totalRevenue = total;
            const occPct =
              roomsAvailable > 0 ? (roomsSold / roomsAvailable) * 100 : 0;
            const adrValue = roomsSold > 0 ? (total - lostDues) / roomsSold : 0;
            const revparValue =
              roomsAvailable > 0 ? (total - lostDues) / roomsAvailable : 0;

            await prisma.hotelKpiDaily.upsert({
              where: {
                hotelId_date: { hotelId, date },
              },
              update: {
                roomsSold,
                roomsAvailable,
                occupancyPct: occPct,
                roomRevenue,
                adr: adrValue,
                revpar: revparValue,
                totalRevenue,
                otherRevenue: 0,
                ventureId: hotel.ventureId,
              },
              create: {
                hotelId,
                date,
                roomsSold,
                roomsAvailable,
                occupancyPct: occPct,
                roomRevenue,
                adr: adrValue,
                revpar: revparValue,
                totalRevenue,
                otherRevenue: 0,
                ventureId: hotel.ventureId,
              },
            });

            count++;
          }

          return res.json({ 
            success: true, 
            count,
            skipped: errors.length,
            errors: errors.length > 0 ? errors : undefined
          });
        } catch (e: any) {
          console.error(e);
          return res.status(500).json({ error: "Insert failed", detail: e?.message });
        }
      });
  });
}
