import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { NormalizedCarrierStatus } from "@/lib/fmcsa";
import { requireUser } from "@/lib/apiAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    switch (req.method) {
      case "GET":
        return listCarriers(req, res);
      case "POST":
        return createCarrier(req, res);
      default: {
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ error: "Method not allowed" });
      }
    }
  } catch (error: any) {
    console.error("Carriers API error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", detail: error.message || String(error) });
  }
}

async function listCarriers(req: NextApiRequest, res: NextApiResponse) {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 50);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200 ? pageSize : 50;

  const skip = (safePage - 1) * safePageSize;
  const take = safePageSize;

  const [total, carriers] = await Promise.all([
    prisma.carrier.count(),
    prisma.carrier.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { loads: true, contacts: true } } },
      skip,
      take,
    }),
  ]);

  return res.status(200).json({
    items: carriers,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: Math.ceil(total / safePageSize) || 1,
  });
}

async function createCarrier(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      legalName,
      dbaName,
      dotNumber,
      mcNumber,
      ein,
      phone,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      powerUnits,
      drivers,
      operatingStatus,
      entityType,
      isPassengerCarrier,
      safetyRating,
      safetyRatingDate,
      mcs150Outdated,
      oosDate,
      issScore,
      bipdInsuranceOnFile,
      bipdInsuranceRequired,
      bipdRequiredAmount,
      cargoInsuranceOnFile,
      cargoInsuranceRequired,
      bondInsuranceOnFile,
      bondInsuranceRequired,
      crashTotal,
      fatalCrash,
      injCrash,
      towawayCrash,
      driverInsp,
      driverOosInsp,
      driverOosRate,
      driverOosRateNationalAverage,
      vehicleInsp,
      vehicleOosInsp,
      vehicleOosRate,
      vehicleOosRateNationalAverage,
      hazmatInsp,
      hazmatOosInsp,
      hazmatOosRate,
      hazmatOosRateNationalAverage,
      statusText,
      normalizedStatus,
      equipmentTypes,
      notes,
    } = req.body as {
      name: string;
      legalName?: string | null;
      dbaName?: string | null;
      dotNumber?: string | null;
      mcNumber?: string | null;
      ein?: string | null;
      phone?: string | null;
      email?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
      powerUnits?: number | null;
      drivers?: number | null;
      operatingStatus?: string | null;
      entityType?: string | null;
      isPassengerCarrier?: boolean | null;
      safetyRating?: string | null;
      safetyRatingDate?: string | null;
      mcs150Outdated?: boolean | null;
      oosDate?: string | null;
      issScore?: number | null;
      bipdInsuranceOnFile?: number | null;
      bipdInsuranceRequired?: boolean | null;
      bipdRequiredAmount?: number | null;
      cargoInsuranceOnFile?: number | null;
      cargoInsuranceRequired?: boolean | null;
      bondInsuranceOnFile?: number | null;
      bondInsuranceRequired?: boolean | null;
      crashTotal?: number | null;
      fatalCrash?: number | null;
      injCrash?: number | null;
      towawayCrash?: number | null;
      driverInsp?: number | null;
      driverOosInsp?: number | null;
      driverOosRate?: number | null;
      driverOosRateNationalAverage?: number | null;
      vehicleInsp?: number | null;
      vehicleOosInsp?: number | null;
      vehicleOosRate?: number | null;
      vehicleOosRateNationalAverage?: number | null;
      hazmatInsp?: number | null;
      hazmatOosInsp?: number | null;
      hazmatOosRate?: number | null;
      hazmatOosRateNationalAverage?: number | null;
      statusText?: string | null;
      normalizedStatus?: NormalizedCarrierStatus;
      equipmentTypes?: string | null;
      notes?: string | null;
    };

    if (!name) {
      return res.status(400).json({ error: "Carrier name is required." });
    }

    if (normalizedStatus === "OUT_OF_SERVICE") {
      return res.status(400).json({
        error:
          "This carrier is marked as OUT OF SERVICE in FMCSA and cannot be onboarded into the system.",
      });
    }

    if (normalizedStatus === "NOT_AUTHORIZED") {
      return res.status(400).json({
        error:
          "This carrier is NOT AUTHORIZED to operate in FMCSA and cannot be onboarded into the system.",
      });
    }

    const existingByDot = dotNumber
      ? await prisma.carrier.findUnique({ where: { dotNumber } })
      : null;
    const existingByMc = mcNumber
      ? await prisma.carrier.findUnique({ where: { mcNumber } })
      : null;

    if (existingByDot) {
      return res.status(409).json({
        error: `Carrier with DOT# ${dotNumber} already exists: ${existingByDot.name}`,
        detail: "Duplicate DOT number",
      });
    }

    if (existingByMc) {
      return res.status(409).json({
        error: `Carrier with MC# ${mcNumber} already exists: ${existingByMc.name}`,
        detail: "Duplicate MC number",
      });
    }

    const carrier = await prisma.carrier.create({
      data: {
        name,
        legalName: legalName || null,
        dbaName: dbaName || null,
        dotNumber: dotNumber || null,
        mcNumber: mcNumber || null,
        ein: ein || null,
        phone: phone || null,
        email: email || null,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || null,
        powerUnits: powerUnits ?? null,
        drivers: drivers ?? null,
        operatingStatus: operatingStatus || null,
        entityType: entityType || null,
        isPassengerCarrier: isPassengerCarrier ?? null,
        safetyRating: safetyRating || null,
        safetyRatingDate: safetyRatingDate ? new Date(safetyRatingDate) : null,
        mcs150Outdated: mcs150Outdated ?? null,
        oosDate: oosDate ? new Date(oosDate) : null,
        issScore: issScore ?? null,
        bipdInsuranceOnFile: bipdInsuranceOnFile ?? null,
        bipdInsuranceRequired: bipdInsuranceRequired ?? null,
        bipdRequiredAmount: bipdRequiredAmount ?? null,
        cargoInsuranceOnFile: cargoInsuranceOnFile ?? null,
        cargoInsuranceRequired: cargoInsuranceRequired ?? null,
        bondInsuranceOnFile: bondInsuranceOnFile ?? null,
        bondInsuranceRequired: bondInsuranceRequired ?? null,
        crashTotal: crashTotal ?? null,
        fatalCrash: fatalCrash ?? null,
        injCrash: injCrash ?? null,
        towawayCrash: towawayCrash ?? null,
        driverInsp: driverInsp ?? null,
        driverOosInsp: driverOosInsp ?? null,
        driverOosRate: driverOosRate ?? null,
        driverOosRateNationalAverage: driverOosRateNationalAverage ?? null,
        vehicleInsp: vehicleInsp ?? null,
        vehicleOosInsp: vehicleOosInsp ?? null,
        vehicleOosRate: vehicleOosRate ?? null,
        vehicleOosRateNationalAverage:
          vehicleOosRateNationalAverage ?? null,
        hazmatInsp: hazmatInsp ?? null,
        hazmatOosInsp: hazmatOosInsp ?? null,
        hazmatOosRate: hazmatOosRate ?? null,
        hazmatOosRateNationalAverage: hazmatOosRateNationalAverage ?? null,
        fmcsaStatus: statusText || normalizedStatus || null,
        fmcsaLastUpdated: new Date(),
        equipmentTypes: equipmentTypes || null,
        notes: notes || null,
        active: true,
      },
    });

    return res.status(201).json({ carrier });
  } catch (error: any) {
    console.error("Create carrier error:", error);
    return res.status(500).json({
      error: "Failed to create carrier.",
      detail: error.message || String(error),
    });
  }
}
