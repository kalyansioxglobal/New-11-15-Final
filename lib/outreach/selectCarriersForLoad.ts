import prisma from "@/lib/prisma";

export interface CarrierForOutreach {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  equipmentTypes: string | null;
  operatingStatus: string | null;
  fmcsaAuthorized: boolean | null;
  matchScore: number;
  matchReasons: string[];
}

export interface SelectCarriersParams {
  loadId: number;
  channel: "sms" | "email";
  limit: number;
  specificCarrierIds?: number[];
}

export async function selectCarriersForLoad(
  params: SelectCarriersParams
): Promise<CarrierForOutreach[]> {
  const { loadId, channel, limit, specificCarrierIds } = params;

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      equipmentType: true,
      pickupCity: true,
      pickupState: true,
      dropCity: true,
      dropState: true,
    },
  });

  if (!load) {
    return [];
  }

  const whereClause: any = {
    active: true,
    blocked: false,
    fmcsaAuthorized: true,
  };

  if (channel === "sms") {
    whereClause.phone = { not: null };
  } else {
    whereClause.email = { not: null };
  }

  if (specificCarrierIds && specificCarrierIds.length > 0) {
    whereClause.id = { in: specificCarrierIds };
  }

  const carriers = await prisma.carrier.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      equipmentTypes: true,
      operatingStatus: true,
      fmcsaAuthorized: true,
      lanesJson: true,
    },
    take: limit,
    orderBy: { id: "asc" },
  });

  const results: CarrierForOutreach[] = carriers.map((carrier) => {
    const matchReasons: string[] = [];
    let matchScore = 0;

    if (carrier.fmcsaAuthorized) {
      matchReasons.push("Active Authority");
      matchScore += 10;
    }

    if (
      load.equipmentType &&
      carrier.equipmentTypes?.toLowerCase().includes(load.equipmentType.toLowerCase())
    ) {
      matchReasons.push("Equipment Match");
      matchScore += 20;
    }

    if (carrier.lanesJson && load.pickupState && load.dropState) {
      try {
        const lanes = JSON.parse(carrier.lanesJson);
        if (Array.isArray(lanes)) {
          const hasLaneMatch = lanes.some(
            (lane: any) =>
              lane.origin?.includes(load.pickupState) ||
              lane.destination?.includes(load.dropState)
          );
          if (hasLaneMatch) {
            matchReasons.push("Lane Match");
            matchScore += 30;
          }
        }
      } catch {
      }
    }

    if (matchReasons.length === 0) {
      matchReasons.push("Available");
    }

    return {
      id: carrier.id,
      name: carrier.name,
      email: carrier.email,
      phone: carrier.phone,
      equipmentTypes: carrier.equipmentTypes,
      operatingStatus: carrier.operatingStatus,
      fmcsaAuthorized: carrier.fmcsaAuthorized,
      matchScore,
      matchReasons,
    };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);

  return results;
}
