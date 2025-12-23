import prisma from "@/lib/prisma";

export type CarrierCandidate = {
  id: number;
  mcNumber?: string | null;
  dotNumber?: string | null;
  tmsCarrierCode?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  equipmentTypes?: string | null;
  serviceAreas?: string | null;
  
  // Carrier home base
  homeCity?: string | null;
  homeState?: string | null;
  homeZip?: string | null;
  
  // Scoring (weighted, used for sorting)
  totalScore: number;
  
  // Raw scores (0-100 scale for display)
  laneScoreRaw: number;
  onTimeScoreRaw: number;
  equipmentMatchPercent: number;
  profileCompletenessPercent: number;
  serviceAreaMatchPercent: number;
  originProximityPercent: number;
  
  // History stats
  laneRunCount: number;
  onTimeRate: number | null;
  lastLoadDate: Date | null;
  regionRunCount: number;
  originPickupCount: number;
  isRecentlyActive: boolean;
  
  // Classification
  isNewCarrier: boolean;
  hasLaneHistory: boolean;
  isNearOrigin: boolean;
};

export type CarrierSearchInput = {
  originCity?: string | null;
  originState?: string | null;
  originZip?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  destinationZip?: string | null;
  equipmentType?: string | null;
  pickupDate?: Date;
  weight?: number | null;
  ventureId?: number;
};

export type CarrierSearchResult = {
  recommendedCarriers: CarrierCandidate[];
  newCarriers: CarrierCandidate[];
  meta: {
    query: {
      origin: string;
      destination: string;
      equipmentType: string | null;
    };
    totalRecommended: number;
    totalNew: number;
  };
};

function zip3(zip?: string | null): string | null {
  return zip && zip.length >= 3 ? zip.slice(0, 3) : null;
}

async function getCarrierLaneHistory(
  carrierId: number,
  originZip3: string | null,
  destZip3: string | null
): Promise<{ runCount: number; onTimeRate: number | null; lastLoadDate: Date | null }> {
  if (!originZip3 || !destZip3) {
    return { runCount: 0, onTimeRate: null, lastLoadDate: null };
  }

  const loads = await prisma.load.findMany({
    where: {
      carrierId,
      pickupZip: { startsWith: originZip3 },
      dropZip: { startsWith: destZip3 },
      loadStatus: "DELIVERED",
    },
    select: {
      id: true,
      dropDate: true,
      actualDeliveryAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (loads.length === 0) {
    return { runCount: 0, onTimeRate: null, lastLoadDate: null };
  }

  let onTimeCount = 0;
  for (const load of loads) {
    if (load.dropDate && load.actualDeliveryAt) {
      if (load.actualDeliveryAt <= load.dropDate) {
        onTimeCount++;
      }
    } else {
      onTimeCount++;
    }
  }

  return {
    runCount: loads.length,
    onTimeRate: Math.round((onTimeCount / loads.length) * 100),
    lastLoadDate: loads[0]?.createdAt || null,
  };
}

async function getCarrierRegionHistory(
  carrierId: number,
  originZip3: string | null,
  destZip3: string | null
): Promise<number> {
  if (!originZip3 && !destZip3) return 0;

  const conditions: any[] = [];
  if (originZip3) conditions.push({ pickupZip: { startsWith: originZip3 } });
  if (destZip3) conditions.push({ dropZip: { startsWith: destZip3 } });
  
  if (conditions.length === 0) return 0;

  const count = await prisma.load.count({
    where: {
      carrierId,
      loadStatus: "DELIVERED",
      OR: conditions,
    },
  });

  return count;
}

async function getCarrierRecentActivity(carrierId: number): Promise<{ isActive: boolean; lastLoadDate: Date | null }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentLoad = await prisma.load.findFirst({
    where: {
      carrierId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    isActive: !!recentLoad,
    lastLoadDate: recentLoad?.createdAt || null,
  };
}

function calculateProfileScore(carrier: any): number {
  let score = 0;
  
  if (carrier.mcNumber) score += 15;
  if (carrier.dotNumber) score += 15;
  if (carrier.email) score += 10;
  if (carrier.phone) score += 10;
  if (carrier.equipmentTypes) score += 10;
  if (carrier.serviceAreas) score += 10;
  if (carrier.insuranceExpiry && new Date(carrier.insuranceExpiry) > new Date()) score += 15;
  if (carrier.active) score += 15;
  
  return Math.min(score, 100);
}

function calculateEquipmentScore(carrier: any, requestedEquipment: string | null): number {
  if (!requestedEquipment) return 50;
  if (!carrier.equipmentTypes) return 0;
  
  const carrierEquipment = carrier.equipmentTypes.toUpperCase();
  const requested = requestedEquipment.toUpperCase();
  
  if (carrierEquipment.includes(requested)) return 100;
  
  const similarEquipment: Record<string, string[]> = {
    "DRY_VAN": ["VAN", "DRY"],
    "REEFER": ["REFRIGERATED", "COLD"],
    "FLATBED": ["FLAT", "STEP_DECK"],
    "STEP_DECK": ["FLATBED", "FLAT"],
  };
  
  const similar = similarEquipment[requested] || [];
  for (const s of similar) {
    if (carrierEquipment.includes(s)) return 70;
  }
  
  return 20;
}

function calculateServiceAreaScore(carrier: any, originState: string | null, destState: string | null): number {
  if (!carrier.serviceAreas) return 30;
  
  const areas = carrier.serviceAreas.toUpperCase();
  let score = 30;
  
  if (areas.includes("NATIONWIDE") || areas.includes("ALL")) return 80;
  
  if (originState && areas.includes(originState.toUpperCase())) score += 35;
  if (destState && areas.includes(destState.toUpperCase())) score += 35;
  
  return Math.min(score, 100);
}

function calculateOriginProximityScore(
  carrier: any,
  originCity: string | null,
  originState: string | null,
  originZip: string | null
): number {
  let score = 0;
  
  const carrierZip = carrier.postalCode;
  const carrierCity = carrier.city?.toUpperCase();
  const carrierState = carrier.state?.toUpperCase();
  const searchCity = originCity?.toUpperCase();
  const searchState = originState?.toUpperCase();
  const searchZip3 = originZip?.slice(0, 3);
  const carrierZip3 = carrierZip?.slice(0, 3);
  
  if (carrierZip && originZip && carrierZip === originZip) {
    score = 100;
  } else if (carrierZip3 && searchZip3 && carrierZip3 === searchZip3) {
    score = 85;
  } else if (carrierCity && searchCity && carrierCity === searchCity && carrierState === searchState) {
    score = 80;
  } else if (carrierState && searchState && carrierState === searchState) {
    score = 60;
  } else if (carrier.serviceAreas) {
    const areas = carrier.serviceAreas.toUpperCase();
    if (searchState && areas.includes(searchState)) {
      score = 50;
    }
  }
  
  return score;
}

async function getCarrierOriginPickupHistory(
  carrierId: number,
  originZip3: string | null,
  originState: string | null
): Promise<number> {
  if (!originZip3 && !originState) return 0;

  const conditions: any[] = [];
  if (originZip3) conditions.push({ pickupZip: { startsWith: originZip3 } });
  if (originState) conditions.push({ pickupState: originState });
  
  if (conditions.length === 0) return 0;

  const count = await prisma.load.count({
    where: {
      carrierId,
      loadStatus: "DELIVERED",
      OR: conditions,
    },
  });

  return count;
}

export async function searchCarriersForLoad(input: CarrierSearchInput): Promise<CarrierSearchResult> {
  const {
    originCity,
    originState,
    originZip,
    destinationCity,
    destinationState,
    destinationZip,
    equipmentType,
  } = input;

  const originZip3 = zip3(originZip);
  const destZip3 = zip3(destinationZip);

  const carriers = await prisma.carrier.findMany({
    where: {
      active: true,
    },
    take: 100,
  });

  const scoredCarriers: CarrierCandidate[] = [];

  for (const carrier of carriers) {
    const [laneHistory, regionCount, recentActivity, originPickupCount] = await Promise.all([
      getCarrierLaneHistory(carrier.id, originZip3, destZip3),
      getCarrierRegionHistory(carrier.id, originZip3, destZip3),
      getCarrierRecentActivity(carrier.id),
      getCarrierOriginPickupHistory(carrier.id, originZip3, originState),
    ]);

    const hasLaneHistory = laneHistory.runCount > 0;
    
    // Calculate origin proximity based on carrier's home base location
    const originProximityPercent = calculateOriginProximityScore(carrier, originCity, originState, originZip);
    
    // Carrier is "near origin" if they're in same ZIP-3, same city, or same state
    const isNearOrigin = originProximityPercent >= 60 || originPickupCount >= 3;
    
    // New carrier = no lane history AND not near origin AND no pickup history
    const isNewCarrier = !hasLaneHistory && !isNearOrigin && originPickupCount === 0;

    // Raw scores (0-100 scale for display)
    const equipmentMatchPercent = calculateEquipmentScore(carrier, equipmentType);
    const profileCompletenessPercent = calculateProfileScore(carrier);
    const serviceAreaMatchPercent = calculateServiceAreaScore(carrier, originState, destinationState);

    // Lane score for sorting (0-30)
    let laneScoreWeighted = 0;
    if (laneHistory.runCount >= 10) laneScoreWeighted = 30;
    else if (laneHistory.runCount >= 5) laneScoreWeighted = 25;
    else if (laneHistory.runCount >= 2) laneScoreWeighted = 20;
    else if (laneHistory.runCount >= 1) laneScoreWeighted = 15;
    else if (regionCount >= 5) laneScoreWeighted = 10;
    else if (regionCount >= 1) laneScoreWeighted = 5;

    // Proximity score for sorting (0-20)
    const proximityScoreWeighted = Math.round(originProximityPercent * 0.20);

    // Weighted scores for total (simplified - no on-time rate scoring for now)
    const equipmentScoreWeighted = Math.round(equipmentMatchPercent * 0.15);
    const profileScoreWeighted = Math.round(profileCompletenessPercent * 0.20);
    const recentActivityScoreWeighted = recentActivity.isActive ? 15 : 0;

    const totalScore = laneScoreWeighted + proximityScoreWeighted + equipmentScoreWeighted + profileScoreWeighted + recentActivityScoreWeighted;

    // Raw lane score for display (0-100)
    let laneScoreRaw = 0;
    if (laneHistory.runCount >= 10) laneScoreRaw = 100;
    else if (laneHistory.runCount >= 5) laneScoreRaw = 80;
    else if (laneHistory.runCount >= 2) laneScoreRaw = 60;
    else if (laneHistory.runCount >= 1) laneScoreRaw = 40;
    else if (regionCount >= 5) laneScoreRaw = 30;
    else if (regionCount >= 1) laneScoreRaw = 15;

    scoredCarriers.push({
      id: carrier.id,
      mcNumber: (carrier as any).mcNumber ?? null,
      dotNumber: (carrier as any).dotNumber ?? null,
      tmsCarrierCode: (carrier as any).tmsCarrierCode ?? null,
      name: carrier.name,
      email: (carrier as any).email ?? null,
      phone: (carrier as any).phone ?? null,
      equipmentTypes: (carrier as any).equipmentTypes ?? null,
      serviceAreas: (carrier as any).serviceAreas ?? null,
      
      // Carrier home base
      homeCity: carrier.city ?? null,
      homeState: carrier.state ?? null,
      homeZip: carrier.postalCode ?? null,
      
      totalScore,
      
      // Raw scores for display (0-100)
      laneScoreRaw,
      onTimeScoreRaw: laneHistory.onTimeRate ?? 0,
      equipmentMatchPercent,
      profileCompletenessPercent,
      serviceAreaMatchPercent,
      originProximityPercent,
      
      laneRunCount: laneHistory.runCount,
      onTimeRate: laneHistory.onTimeRate,
      lastLoadDate: recentActivity.lastLoadDate || laneHistory.lastLoadDate,
      regionRunCount: regionCount,
      originPickupCount,
      isRecentlyActive: recentActivity.isActive,
      
      isNewCarrier,
      hasLaneHistory,
      isNearOrigin,
    });
  }

  // Recommended = has lane history OR is near origin (based in same area or picks up there regularly)
  const recommendedCarriers = scoredCarriers
    .filter(c => c.hasLaneHistory || c.isNearOrigin)
    .sort((a, b) => b.totalScore - a.totalScore);

  // New = no lane history AND not near origin
  const newCarriers = scoredCarriers
    .filter(c => !c.hasLaneHistory && !c.isNearOrigin)
    .sort((a, b) => b.totalScore - a.totalScore);

  const originStr = originCity && originState 
    ? `${originCity}, ${originState}` 
    : originZip || "Unknown";
  const destStr = destinationCity && destinationState 
    ? `${destinationCity}, ${destinationState}` 
    : destinationZip || "Unknown";

  return {
    recommendedCarriers: recommendedCarriers.slice(0, 25),
    newCarriers: newCarriers.slice(0, 25),
    meta: {
      query: {
        origin: originStr,
        destination: destStr,
        equipmentType: equipmentType || null,
      },
      totalRecommended: recommendedCarriers.length,
      totalNew: newCarriers.length,
    },
  };
}
