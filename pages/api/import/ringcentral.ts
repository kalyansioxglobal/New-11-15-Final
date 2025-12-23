import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { normalizeRingCentralRow } from "../../../lib/import/normalizers";
import { mapRingCentralAndRecordKpi } from "../../../lib/import/mappingEngine";
import type { RawCsvRow } from "../../../lib/import/types";
import { requireUploadPermission } from '@/lib/apiAuth';

export const config = {
  api: { bodyParser: false },
};

async function parseXlsx(buffer: Buffer): Promise<RawCsvRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheet found in Excel file");
  }

  const rows: RawCsvRow[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as (string | number | null)[];
    const cleanValues = values.slice(1);

    if (rowNumber === 1) {
      cleanValues.forEach((cell) => {
        headers.push(String(cell ?? "").trim());
      });
    } else {
      const rowObj: RawCsvRow = {};
      cleanValues.forEach((cell, idx) => {
        if (headers[idx]) {
          rowObj[headers[idx]] = cell != null ? String(cell) : "";
        }
      });
      if (Object.keys(rowObj).length > 0) {
        rows.push(rowObj);
      }
    }
  });

  return rows;
}

function isXlsxBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && 
    buffer[0] === 0x50 && buffer[1] === 0x4B && 
    buffer[2] === 0x03 && buffer[3] === 0x04;
}

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

    let records: RawCsvRow[];
    
    if (isXlsxBuffer(buffer)) {
      records = await parseXlsx(buffer);
    } else {
      records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
      }) as RawCsvRow[];
    }

    const dateParam = req.query.date as string | undefined;
    const importDate = dateParam ? new Date(dateParam) : new Date();

    let processed = 0;
    let mapped = 0;
    let kpiUpdated = 0;

    for (const row of records) {
      processed++;
      const normalized = normalizeRingCentralRow(row);
      const result = await mapRingCentralAndRecordKpi(normalized, {
        date: importDate,
        autoCreateUser: false,
      });
      if (result.userId) mapped++;
      if (result.kpiUpdated) kpiUpdated++;
    }

    return res.status(200).json({
      message: "RingCentral import complete",
      processed,
      mapped,
      kpiUpdated,
    });
  } catch (err: any) {
    console.error("RingCentral import error:", err);
    return res.status(500).json({
      error: "Failed to import RingCentral file",
      detail: err?.message ?? "Unknown error",
    });
  }
}
