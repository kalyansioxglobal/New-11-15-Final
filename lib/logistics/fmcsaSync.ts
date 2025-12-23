import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { fetchCarrierFromFMCSA } from "@/lib/integrations/fmcsaClient";

export type FmcsaBulkSyncOptions = {
  limit?: number;
  offset?: number;
};

export type FmcsaBulkSyncResult = {
  fetched: number;
  imported: number;
  updated: number;
  skipped: number;
  nextOffset: number | null;
};

interface FmcsaCensusRow {
  dot_number?: string;
  mc_mx_ff_number?: string;
  legal_name?: string;
  dba_name?: string;
  telephone?: string;
  email_address?: string;
  phy_city?: string;
  phy_state?: string;
  phy_zip?: string;
  phy_country?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
  operating_status?: string;
  carrier_operation?: string;
  cargo_carried?: string;
  power_units?: string | number;
  drivers?: string | number;
}

function parseIntSafe(val: string | number | undefined | null): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseInt(String(val), 10);
  return isNaN(num) ? null : num;
}

function normalizeFmcsaStatusLabel(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("authorized") && s.includes("property")) return "Authorized for Property";
  if (s.includes("out of service")) return "Out of Service";
  if (s.includes("not authorized")) return "Not Authorized";
  if (s.includes("authorized")) return "Authorized";
  return raw;
}

function isActivePropertyCarrier(row: FmcsaCensusRow): boolean {
  const status = (row.operating_status || "").toLowerCase();
  const operation = (row.carrier_operation || "").toLowerCase();
  
  if (status.includes("out of service")) return false;
  if (status.includes("not authorized")) return false;
  
  if (operation.includes("property") || operation.includes("freight")) return true;
  if (status.includes("authorized") && status.includes("property")) return true;
  
  return status.includes("authorized");
}

export async function syncFmcsaCarriersBulk(
  options: FmcsaBulkSyncOptions = {}
): Promise<FmcsaBulkSyncResult> {
  const baseUrl = process.env.FMCSA_FULL_FILE;
  
  if (!baseUrl) {
    throw new Error("FMCSA_FULL_FILE env variable is not set");
  }
  
  const limit = Math.min(options.limit ?? 2000, 2000);
  const offset = options.offset ?? 0;
  
  const separator = baseUrl.includes("?") ? "&" : "?";
  const url = `${baseUrl}${separator}$limit=${limit}&$offset=${offset}`;
  
  logger.info("fmcsa_bulk_sync_start", {
    meta: { limit, offset, url: url.substring(0, 100) },
  });
  
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  
  if (!response.ok) {
    throw new Error(`FMCSA API returned ${response.status}: ${response.statusText}`);
  }
  
  const rows: FmcsaCensusRow[] = await response.json();
  const fetched = rows.length;
  
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  
  const normalizedRecords: Array<{
    dotNumber: string | null;
    mcNumber: string | null;
    name: string;
    legalName: string | null;
    dbaName: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    fmcsaStatus: string | null;
    fmcsaStatusRaw: string | null;
    fmcsaCargoTypesRaw: string | null;
    powerUnits: number | null;
    drivers: number | null;
  }> = [];
  
  for (const row of rows) {
    const dotNumber = row.dot_number?.trim() || null;
    const mcNumber = row.mc_mx_ff_number?.trim() || null;
    
    if (!dotNumber && !mcNumber) {
      skipped++;
      continue;
    }
    
    if (!isActivePropertyCarrier(row)) {
      skipped++;
      continue;
    }
    
    const legalName = row.legal_name?.trim() || null;
    const dbaName = row.dba_name?.trim() || null;
    const name = legalName || dbaName || "Unknown";
    
    normalizedRecords.push({
      dotNumber,
      mcNumber,
      name,
      legalName,
      dbaName,
      phone: row.telephone?.trim() || null,
      email: row.email_address?.trim() || null,
      city: row.phy_city?.trim() || row.mailing_city?.trim() || null,
      state: row.phy_state?.trim() || row.mailing_state?.trim() || null,
      postalCode: row.phy_zip?.trim() || row.mailing_zip?.trim() || null,
      country: row.phy_country?.trim() || "US",
      fmcsaStatus: normalizeFmcsaStatusLabel(row.operating_status),
      fmcsaStatusRaw: row.operating_status || null,
      fmcsaCargoTypesRaw: row.cargo_carried || null,
      powerUnits: parseIntSafe(row.power_units),
      drivers: parseIntSafe(row.drivers),
    });
  }
  
  const BATCH_SIZE = 100;
  for (let i = 0; i < normalizedRecords.length; i += BATCH_SIZE) {
    const batch = normalizedRecords.slice(i, i + BATCH_SIZE);
    
    for (const record of batch) {
      try {
        let whereClause: { dotNumber: string } | { mcNumber: string };
        
        if (record.dotNumber) {
          whereClause = { dotNumber: record.dotNumber };
        } else if (record.mcNumber) {
          whereClause = { mcNumber: record.mcNumber };
        } else {
          skipped++;
          continue;
        }
        
        const data = {
          name: record.name,
          legalName: record.legalName,
          dbaName: record.dbaName,
          dotNumber: record.dotNumber,
          mcNumber: record.mcNumber,
          phone: record.phone,
          email: record.email,
          city: record.city,
          state: record.state,
          postalCode: record.postalCode,
          country: record.country,
          fmcsaStatus: record.fmcsaStatus,
          fmcsaStatusRaw: record.fmcsaStatusRaw,
          fmcsaCargoTypesRaw: record.fmcsaCargoTypesRaw,
          powerUnits: record.powerUnits,
          drivers: record.drivers,
          fmcsaLastSyncAt: new Date(),
          fmcsaAuthorized: true,
          active: true,
        };
        
        const existing = await prisma.carrier.findFirst({
          where: whereClause,
          select: { id: true },
        });
        
        if (existing) {
          await prisma.carrier.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        } else {
          await prisma.carrier.create({ data });
          imported++;
        }
      } catch (err: any) {
        if (err.code === "P2002") {
          updated++;
        } else {
          logger.error("fmcsa_bulk_sync_record_error", {
            meta: { dotNumber: record.dotNumber, mcNumber: record.mcNumber, error: err.message },
          });
          skipped++;
        }
      }
    }
  }
  
  const nextOffset = fetched < limit ? null : offset + fetched;
  
  logger.info("fmcsa_bulk_sync_complete", {
    meta: { fetched, imported, updated, skipped, nextOffset },
  });
  
  return {
    fetched,
    imported,
    updated,
    skipped,
    nextOffset,
  };
}

export type FmcsaSnapshot = {
  carrierId: number;
  mcNumber: string | null;
  dotNumber: string | null;
  status: string | null;
  authorized: boolean | null;
  safetyRating?: string | null;
  lastSyncedAt: Date | null;
};

/**
 * Sync a single carrier from the FMCSA mock client and persist the latest
 * snapshot fields onto the Carrier record.
 */
export async function syncCarrierFromFMCSAById(carrierId: number): Promise<FmcsaSnapshot | null> {
  const carrier = await prisma.carrier.findUnique({
    where: { id: carrierId },
    select: { id: true, mcNumber: true, dotNumber: true, name: true },
  });

  if (!carrier || !carrier.mcNumber) {
    return null;
  }

  const fmcsaData = await fetchCarrierFromFMCSA(carrier.mcNumber);

  if (!fmcsaData) {
    await prisma.carrier.update({
      where: { id: carrier.id },
      data: { fmcsaSyncError: "Failed to fetch from FMCSA API" },
    });

    logger.error("fmcsa_single_sync_failed", {
      meta: { carrierId: carrier.id, mcNumber: carrier.mcNumber },
    });

    return null;
  }

  const updated = await prisma.carrier.update({
    where: { id: carrier.id },
    data: {
      fmcsaStatus: fmcsaData.status,
      fmcsaAuthorized: fmcsaData.authorized,
      fmcsaLastSyncAt: new Date(),
      fmcsaLastUpdated: fmcsaData.lastUpdated,
      fmcsaSyncError: null,
      safetyRating: fmcsaData.safetyRating || undefined,
    },
  });

  logger.info("fmcsa_single_sync_success", {
    meta: { carrierId: updated.id, mcNumber: updated.mcNumber, status: updated.fmcsaStatus },
  });

  return {
    carrierId: updated.id,
    mcNumber: updated.mcNumber,
    dotNumber: updated.dotNumber,
    status: updated.fmcsaStatus,
    authorized: updated.fmcsaAuthorized ?? null,
    safetyRating: updated.safetyRating ?? null,
    lastSyncedAt: updated.fmcsaLastSyncAt ?? null,
  };
}
