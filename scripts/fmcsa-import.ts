import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as readline from "readline";

const prisma = new PrismaClient();

const BATCH_SIZE = 500;

interface FMCSARow {
  DOT_NUMBER?: string;
  LEGAL_NAME?: string;
  DBA_NAME?: string;
  CARRIER_OPERATION?: string;
  HM_FLAG?: string;
  PC_FLAG?: string;
  PHY_STREET?: string;
  PHY_CITY?: string;
  PHY_STATE?: string;
  PHY_ZIP?: string;
  PHY_COUNTRY?: string;
  MAILING_STREET?: string;
  MAILING_CITY?: string;
  MAILING_STATE?: string;
  MAILING_ZIP?: string;
  MAILING_COUNTRY?: string;
  TELEPHONE?: string;
  FAX?: string;
  EMAIL_ADDRESS?: string;
  MCS150_DATE?: string;
  MCS150_MILEAGE?: string;
  MCS150_MILEAGE_YEAR?: string;
  ADD_DATE?: string;
  OIC_STATE?: string;
  NBR_POWER_UNIT?: string;
  DRIVER_TOTAL?: string;
  RECENT_MILEAGE?: string;
  RECENT_MILEAGE_YEAR?: string;
  VMT_SOURCE_ID?: string;
  OP_STATUS?: string;
  OP_STATUS_DESC?: string;
  MC_MX_FF_NUMBER?: string;
  [key: string]: string | undefined;
}

function parseCSVLine(line: string, headers: string[]): FMCSARow {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  const row: FMCSARow = {};
  headers.forEach((header, index) => {
    row[header] = values[index] || "";
  });
  return row;
}

function formatMCNumber(mcMxFfNumber: string | undefined): string | null {
  if (!mcMxFfNumber) return null;
  const cleaned = mcMxFfNumber.replace(/\D/g, "");
  return cleaned ? `MC${cleaned}` : null;
}

function formatDOTNumber(dotNumber: string | undefined): string | null {
  if (!dotNumber) return null;
  const cleaned = dotNumber.replace(/\D/g, "");
  return cleaned || null;
}

function formatPhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone.trim() || null;
}

async function importFMCSA(csvPath: string) {
  console.log(`Starting FMCSA import from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let isFirstLine = true;
  let batch: FMCSARow[] = [];
  let totalProcessed = 0;
  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      headers = line.split(",").map((h) => h.trim().replace(/"/g, ""));
      isFirstLine = false;
      continue;
    }

    const row = parseCSVLine(line, headers);
    totalProcessed++;

    const opStatus = row.OP_STATUS || "";
    const opStatusDesc = row.OP_STATUS_DESC || "";
    const carrierOp = row.CARRIER_OPERATION || "";
    const dotNumber = formatDOTNumber(row.DOT_NUMBER);
    const mcNumber = formatMCNumber(row.MC_MX_FF_NUMBER);

    const isActive = opStatus.toUpperCase() === "A" || 
                     opStatus.toUpperCase() === "ACTIVE" || 
                     opStatusDesc.toUpperCase() === "ACTIVE";

    if (!isActive) {
      totalSkipped++;
      continue;
    }

    if (!carrierOp.toUpperCase().includes("PROPERTY") && carrierOp !== "") {
      totalSkipped++;
      continue;
    }

    if (!dotNumber && !mcNumber) {
      totalSkipped++;
      continue;
    }

    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      const result = await processBatch(batch);
      totalImported += result.imported;
      totalErrors += result.errors;
      batch = [];
      console.log(
        `Processed ${totalProcessed} rows, imported ${totalImported}, skipped ${totalSkipped}, errors ${totalErrors}`
      );
    }
  }

  if (batch.length > 0) {
    const result = await processBatch(batch);
    totalImported += result.imported;
    totalErrors += result.errors;
  }

  console.log("\n=== FMCSA Import Complete ===");
  console.log(`Total rows processed: ${totalProcessed}`);
  console.log(`Total carriers imported/updated: ${totalImported}`);
  console.log(`Total rows skipped: ${totalSkipped}`);
  console.log(`Total errors: ${totalErrors}`);
}

async function processBatch(
  batch: FMCSARow[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0;
  let errors = 0;

  for (const row of batch) {
    try {
      const dotNumber = formatDOTNumber(row.DOT_NUMBER);
      const mcNumber = formatMCNumber(row.MC_MX_FF_NUMBER);

      const carrierData = {
        name: row.LEGAL_NAME || row.DBA_NAME || "Unknown",
        legalName: row.LEGAL_NAME || null,
        dbaName: row.DBA_NAME || null,
        dotNumber,
        mcNumber,
        phone: formatPhone(row.TELEPHONE),
        email: row.EMAIL_ADDRESS || null,
        city: row.PHY_CITY || null,
        state: row.PHY_STATE || null,
        postalCode: row.PHY_ZIP || null,
        country: row.PHY_COUNTRY || "US",
        addressLine1: row.PHY_STREET || null,
        powerUnits: row.NBR_POWER_UNIT ? parseInt(row.NBR_POWER_UNIT, 10) || null : null,
        drivers: row.DRIVER_TOTAL ? parseInt(row.DRIVER_TOTAL, 10) || null : null,
        fmcsaStatus: row.OP_STATUS || null,
        fmcsaStatusRaw: row.OP_STATUS_DESC || null,
        fmcsaCargoTypesRaw: row.CARRIER_OPERATION || null,
        fmcsaLastSyncAt: new Date(),
        fmcsaAuthorized: true,
        active: true,
      };

      if (dotNumber) {
        await prisma.carrier.upsert({
          where: { dotNumber },
          create: carrierData,
          update: {
            ...carrierData,
            dotNumber: undefined,
          },
        });
        imported++;
      } else if (mcNumber) {
        await prisma.carrier.upsert({
          where: { mcNumber },
          create: carrierData,
          update: {
            ...carrierData,
            mcNumber: undefined,
          },
        });
        imported++;
      }
    } catch (err: any) {
      if (err.code === "P2002") {
        errors++;
      } else {
        console.error(`Error importing carrier: ${err.message}`);
        errors++;
      }
    }
  }

  return { imported, errors };
}

const csvPath = process.argv[2] || "data/fmcsa_census.csv";
importFMCSA(csvPath)
  .then(() => {
    console.log("Import finished.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
