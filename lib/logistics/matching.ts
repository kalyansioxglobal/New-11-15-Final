import prisma from "@/lib/prisma";

type MatchComponentBreakdown = {
  distanceScore?: number;
  equipmentScore?: number;
  preferredLaneScore?: number;
  laneHistoryScore?: number;
  bonusScore?: number;
  onTimeScore?: number;
  capacityScore?: number;
  penaltyScore?: number;
};

// Simple helper to clamp a numeric value within bounds.
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Distance scoring: closer is better. We only have load.miles and carrier location hints,
// so we apply a monotonic decay on miles. For very short hauls (<100 mi) we give near-max,
// and we taper down so 1,000 mi ~ 50 and anything above 2,000 bottoms at 10.
function scoreDistance(miles: number | null | undefined) {
  if (!miles || miles <= 0) return 70; // neutral-ish if miles missing
  const raw = 100 - miles * 0.03; // linear decay
  return clamp(Math.round(raw), 10, 100);
}

// Equipment scoring: full score for direct match, partial for overlap, else 0.
function scoreEquipment(loadEquip?: string | null, carrierEquip?: string | null) {
  if (!loadEquip || !carrierEquip) return 0;
  const loadLower = loadEquip.toLowerCase();
  const carrierLower = carrierEquip.toLowerCase();
  if (carrierLower.split(",").map((e) => e.trim()).some((e) => e === loadLower)) return 100;
  if (carrierLower.includes(loadLower)) return 80; // partial/compatibility overlap
  return 0;
}

// Preferred lane scoring: tiered bonus based on exact vs partial overlap.
function scorePreferredLane(params: {
  carrierLaneMatch: boolean;
  carrierLaneLooseMatch: boolean;
  shipperLaneBonus?: number | null;
}) {
  let score = 0;
  if (params.carrierLaneMatch) score += 40;
  else if (params.carrierLaneLooseMatch) score += 20;
  if (typeof params.shipperLaneBonus === "number") score += params.shipperLaneBonus;
  return score;
}

// Bonus scoring from load/shipper configured bonuses.
function scoreBonus(params: { shipperBonus?: number | null; loadBonus?: number | null }) {
  let score = 0;
  if (typeof params.shipperBonus === "number") score += params.shipperBonus;
  if (typeof params.loadBonus === "number") score += params.loadBonus;
  return score;
}

// On-time scoring: neutral when missing; scaled around 80-100.
function scoreOnTime(onTimePercentage?: number | null) {
  if (onTimePercentage == null) return 0;
  return clamp(Math.round(onTimePercentage), 0, 100);
}

// Capacity scoring based on power units and recent delivered loads.
function scoreCapacity(params: { powerUnits?: number | null; recentLoadsDelivered?: number | null }) {
  const puScore = clamp((params.powerUnits || 0) * 3, 0, 60);
  const recentScore = clamp((params.recentLoadsDelivered || 0) * 2, 0, 40);
  return clamp(puScore + recentScore, 0, 100);
}

// Lane history scoring: carriers who have successfully delivered similar lanes score higher.
// Considers exact city match (100), state match (60), and regional proximity.
function scoreLaneHistory(params: {
  exactCityMatches: number;
  stateMatches: number;
  totalDelivered: number;
  avgDaysAgo: number;
}): number {
  const { exactCityMatches, stateMatches, totalDelivered, avgDaysAgo } = params;
  
  if (totalDelivered === 0) return 0;
  
  // Base score from lane match type
  let score = 0;
  score += Math.min(exactCityMatches * 25, 75); // Up to 75 pts for exact city matches
  score += Math.min(stateMatches * 10, 30); // Up to 30 pts for state matches
  
  // Volume bonus: more deliveries = more reliable
  score += Math.min(totalDelivered * 3, 20);
  
  // Recency factor: recent deliveries are more relevant
  // Decay over 180 days (6 months)
  const recencyMultiplier = avgDaysAgo <= 30 ? 1.0 : 
                            avgDaysAgo <= 90 ? 0.85 :
                            avgDaysAgo <= 180 ? 0.7 : 0.5;
  
  return clamp(Math.round(score * recencyMultiplier), 0, 100);
}

type MatchingOptions = {
  maxResults?: number;
  includeFmcsaHealth?: boolean;
  /**
   * When true, only carriers that are explicitly FMCSA authorized (fmcsaAuthorized === true)
   * are included. When false, we still exclude carriers where fmcsaAuthorized === false but
   * allow null/unknown statuses.
   */
  onlyAuthorizedCarriers?: boolean;
  minOnTimePercentage?: number;
  maxDistance?: number;
  requireEquipmentMatch?: boolean;
  /**
   * When provided, uses venture-scoped carrier intelligence from CarrierVentureStats.
   * Falls back to global carrier stats if no venture stats exist for a carrier.
   */
  ventureId?: number;
};

export async function getMatchesForLoad(loadId: number, options: MatchingOptions = {}) {
  const {
    maxResults = 50,
    includeFmcsaHealth = true,
    onlyAuthorizedCarriers = false,
    minOnTimePercentage,
    maxDistance,
    requireEquipmentMatch = false,
    ventureId: explicitVentureId,
  } = options;

  const load = await prisma.load.findUnique({ where: { id: loadId } });
  if (!load) throw new Error("Load not found");

  // Use explicit ventureId if provided, otherwise use the load's ventureId
  const ventureId = explicitVentureId ?? load.ventureId;

  // Build carrier filter conditions
  const carrierWhere: any = {
    active: true,
    blocked: false,
    complianceStatus: "PASS",
    disqualified: { not: true },
  };

  // FMCSA health check - control how strictly we filter by authorization flag
  if (onlyAuthorizedCarriers) {
    carrierWhere.fmcsaAuthorized = true;
  } else if (includeFmcsaHealth) {
    // Default behavior: exclude explicit false, but allow null/unknown
    carrierWhere.fmcsaAuthorized = { not: false };
  }

  // Note: minOnTimePercentage will be applied using venture-scoped stats when available
  // Global carrier.onTimePercentage filter is removed in favor of venture-scoped filtering

  // base carrier pool: active, not blocked, compliance PASS, not disqualified
  // AND authorized by FMCSA + not set to fmcsaAuthorized: false
  const carriers = await prisma.carrier.findMany({
    where: carrierWhere,
  });

  // Fetch venture-scoped carrier stats if ventureId is available
  const carrierIds = carriers.map((c) => c.id);
  let ventureStatsMap = new Map<number, {
    onTimePct: number;
    recentLoadsDelivered: number;
    laneAffinityScore: number;
  }>();

  if (ventureId && carrierIds.length > 0) {
    const ventureStats = await prisma.carrierVentureStats.findMany({
      where: {
        ventureId,
        carrierId: { in: carrierIds },
      },
    });

    for (const vs of ventureStats) {
      ventureStatsMap.set(vs.carrierId, {
        onTimePct: vs.onTimePct,
        recentLoadsDelivered: vs.recentLoadsDelivered,
        laneAffinityScore: vs.laneAffinityScore,
      });
    }
  }

  // Pre-fetch lane history for all carriers in one query (delivered loads in last 12 months)
  // Note: carrierIds already declared above when fetching venture stats
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Scope lane history to the venture if available
  const laneHistoryWhere: any = {
    carrierId: { in: carrierIds },
    loadStatus: { in: ["DELIVERED", "COVERED"] },
    actualDeliveryAt: { gte: twelveMonthsAgo },
  };
  if (ventureId) {
    laneHistoryWhere.ventureId = ventureId;
  }

  const laneHistoryData = await prisma.load.groupBy({
    by: ["carrierId", "pickupCity", "pickupState", "dropCity", "dropState"],
    where: laneHistoryWhere,
    _count: { id: true },
    _max: { actualDeliveryAt: true },
  });

  // Build lane history map: carrierId -> { exactCityMatches, stateMatches, totalDelivered, recentDeliveryDate }
  const laneHistoryMap = new Map<number, {
    exactCityMatches: number;
    stateMatches: number;
    totalDelivered: number;
    mostRecentDelivery: Date | null;
  }>();

  for (const row of laneHistoryData) {
    if (!row.carrierId) continue;
    
    // Check for exact city match
    const exactMatch = 
      row.pickupCity?.toLowerCase() === load.pickupCity?.toLowerCase() &&
      row.dropCity?.toLowerCase() === load.dropCity?.toLowerCase();
    
    // Check for state match (only if not exact match)
    const stateMatch = !exactMatch &&
      row.pickupState?.toLowerCase() === load.pickupState?.toLowerCase() &&
      row.dropState?.toLowerCase() === load.dropState?.toLowerCase();

    // Only count deliveries that match the load's lane (exact city or state)
    if (!exactMatch && !stateMatch) continue;

    const existing = laneHistoryMap.get(row.carrierId) || {
      exactCityMatches: 0,
      stateMatches: 0,
      totalDelivered: 0,
      mostRecentDelivery: null,
    };

    if (exactMatch) {
      existing.exactCityMatches += row._count.id;
    } else {
      existing.stateMatches += row._count.id;
    }
    
    // Only count matching lane deliveries toward totalDelivered
    existing.totalDelivered += row._count.id;
    
    if (row._max.actualDeliveryAt) {
      if (!existing.mostRecentDelivery || row._max.actualDeliveryAt > existing.mostRecentDelivery) {
        existing.mostRecentDelivery = row._max.actualDeliveryAt;
      }
    }

    laneHistoryMap.set(row.carrierId, existing);
  }

  const results = [] as any[];

  for (const c of carriers) {
    // exclude carriers missing essential info
    if (!c) continue;

    const reasons: string[] = [];
    let penaltyScore = 0;

    // basic exclusion: disqualified
    if (c.disqualified) {
      reasons.push("Penalty: disqualified flag");
      continue;
    }

    // distance filtering and scoring
    const loadMiles = (load.miles as number) || null;
    const distanceScore = scoreDistance(loadMiles);
    
    // Apply maxDistance filter if specified
    if (maxDistance && loadMiles && loadMiles > maxDistance) {
      continue; // Skip this carrier if distance exceeds maximum
    }
    
    if (distanceScore >= 90) reasons.push("Close to lane");

    // equipment
    const equipmentScore = scoreEquipment(load.equipmentType, c.equipmentTypes);
    
    // Apply equipment requirement filter if specified
    if (requireEquipmentMatch && equipmentScore === 0) {
      continue; // Skip this carrier if equipment doesn't match and match is required
    }
    
    if (equipmentScore >= 90) reasons.push("Equipment match");
    else if (equipmentScore > 0) reasons.push("Equipment partially compatible");

    // Get venture-scoped stats if available, otherwise fall back to global carrier stats
    const ventureStats = ventureStatsMap.get(c.id);
    const effectiveOnTimePct = ventureStats?.onTimePct ?? c.onTimePercentage ?? null;
    const effectiveRecentLoads = ventureStats?.recentLoadsDelivered ?? c.recentLoadsDelivered ?? null;

    // Apply minOnTimePercentage filter using venture-scoped stats
    // Carriers with no on-time data are excluded when a minimum is specified
    if (minOnTimePercentage !== undefined) {
      if (effectiveOnTimePct === null || effectiveOnTimePct < minOnTimePercentage) {
        continue; // Skip carriers below minimum on-time threshold or without stats
      }
    }

    // on-time - use venture-scoped stats
    const onTimeScore = scoreOnTime(effectiveOnTimePct);
    if (onTimeScore >= 95) reasons.push("High on-time performance");
    if (ventureStats) reasons.push("Venture-scoped intelligence");

    // capacity - use venture-scoped recentLoadsDelivered
    const capacityScore = scoreCapacity({ powerUnits: c.powerUnits, recentLoadsDelivered: effectiveRecentLoads });
    if (capacityScore >= 40) reasons.push("Capacity suitable");

    // Preferred lanes (carrier + shipper)
    let carrierLaneMatch = false;
    let carrierLaneLooseMatch = false;
    let shipperLaneBonus: number | null | undefined = null;

    try {
      const laneMatch = await prisma.carrierPreferredLane.findFirst({
        where: {
          carrierId: c.id,
          origin: load.pickupCity || undefined,
          destination: load.dropCity || undefined,
        },
      });

      if (laneMatch) {
        carrierLaneMatch = true;
      } else if (load.pickupState || load.dropState) {
        const looseLane = await prisma.carrierPreferredLane.findFirst({
          where: {
            carrierId: c.id,
            origin: load.pickupState || undefined,
            destination: load.dropState || undefined,
          },
        });
        carrierLaneLooseMatch = Boolean(looseLane);
      }
    } catch (e) {
      // ignore
    }

    try {
      if (load.shipperId) {
        const shipperLane = await prisma.shipperPreferredLane.findFirst({
          where: {
            shipperId: load.shipperId,
            origin: load.pickupCity || undefined,
            destination: load.dropCity || undefined,
          },
        });
        if (shipperLane) {
          shipperLaneBonus = shipperLane.bonus ?? 0;
          reasons.push("Preferred lane match (shipper)");
        }
      }
    } catch (e) {
      // ignore
    }

    const preferredLaneScore = scorePreferredLane({
      carrierLaneMatch,
      carrierLaneLooseMatch,
      shipperLaneBonus,
    });
    if (carrierLaneMatch) reasons.push("Preferred lane match (carrier)");
    else if (carrierLaneLooseMatch) reasons.push("Preferred lane proximity (carrier)");

    // Shipper/load bonus
    let loadBonus: number | null = null;
    if (load.preferredBonusesJson) {
      try {
        const parsed = JSON.parse((load.preferredBonusesJson as string) || "{}");
        if (parsed && typeof parsed === "object" && typeof parsed.defaultBonus === "number") {
          loadBonus = parsed.defaultBonus;
        }
      } catch (e) {
        // ignore
      }
    }

    const bonusScore = scoreBonus({ shipperBonus: shipperLaneBonus, loadBonus });
    if (bonusScore > 0) reasons.push("Shipper bonus applied");

    // Lane history scoring from delivered loads
    const carrierLaneHistory = laneHistoryMap.get(c.id);
    let laneHistoryScore = 0;
    if (carrierLaneHistory) {
      const avgDaysAgo = carrierLaneHistory.mostRecentDelivery
        ? Math.round((Date.now() - carrierLaneHistory.mostRecentDelivery.getTime()) / (1000 * 60 * 60 * 24))
        : 365;
      
      laneHistoryScore = scoreLaneHistory({
        exactCityMatches: carrierLaneHistory.exactCityMatches,
        stateMatches: carrierLaneHistory.stateMatches,
        totalDelivered: carrierLaneHistory.totalDelivered,
        avgDaysAgo,
      });

      if (carrierLaneHistory.exactCityMatches > 0) {
        reasons.push(`Lane history: ${carrierLaneHistory.exactCityMatches} exact lane match(es)`);
      } else if (carrierLaneHistory.stateMatches > 0) {
        reasons.push(`Lane history: ${carrierLaneHistory.stateMatches} state match(es)`);
      }
    }

    // Penalties
    if (c.blocked) {
      penaltyScore += 100;
      reasons.push("Penalty: blocked");
    }
    // Use venture-scoped on-time for penalty evaluation
    if (effectiveOnTimePct != null && effectiveOnTimePct < 70) {
      penaltyScore += 10;
      reasons.push("Penalty: low on-time");
    }

    const components: MatchComponentBreakdown = {
      distanceScore,
      equipmentScore,
      preferredLaneScore,
      laneHistoryScore,
      bonusScore,
      onTimeScore,
      capacityScore,
      penaltyScore,
    };

    // Weighted blend; weights are simple and documented for readability.
    // Lane history gets 15% weight as it's a strong signal for carrier reliability on this lane.
    const totalScore = Math.max(
      0,
      Math.round(
        (distanceScore || 0) * 0.15 +
          (equipmentScore || 0) * 0.20 +
          (preferredLaneScore || 0) * 0.15 +
          (laneHistoryScore || 0) * 0.15 +
          (bonusScore || 0) * 0.10 +
          (onTimeScore || 0) * 0.15 +
          (capacityScore || 0) * 0.10 -
          (penaltyScore || 0),
      ),
    );

    // FMCSA health information
    const fmcsaHealth = {
      authorized: c.fmcsaAuthorized,
      complianceStatus: c.complianceStatus,
      mcNumber: c.mcNumber,
      dotNumber: c.dotNumber,
      lastSyncedAt: c.fmcsaLastSyncAt,
    };

    results.push({
      carrierId: c.id,
      carrierName: c.name,
      totalScore,
      components,
      reasons,
      fmcsaHealth: includeFmcsaHealth ? fmcsaHealth : undefined,
      powerUnits: c.powerUnits,
      equipmentTypes: c.equipmentTypes,
      onTimePercentage: effectiveOnTimePct,
      globalOnTimePercentage: c.onTimePercentage,
      ventureScoped: !!ventureStats,
      contact: {
        phone: c.phone,
        email: c.email,
        city: c.city,
        state: c.state,
      },
      primaryDispatcher: null as {
        id: string;
        name: string;
        role: string | null;
        phone: string | null;
        mobile: string | null;
        email: string | null;
        preferredContactMethod: string | null;
      } | null,
    });
  }

  // Fetch primary dispatchers for all matched carriers
  const matchedCarrierIds = results.map((r) => r.carrierId);
  if (matchedCarrierIds.length > 0) {
    const dispatchers = await prisma.carrierDispatcher.findMany({
      where: {
        carrierId: { in: matchedCarrierIds },
        isPrimary: true,
      },
      select: {
        id: true,
        carrierId: true,
        name: true,
        role: true,
        phone: true,
        mobile: true,
        email: true,
        preferredContactMethod: true,
      },
    });

    const dispatcherMap = new Map(dispatchers.map((d) => [d.carrierId, d]));

    for (const result of results) {
      const dispatcher = dispatcherMap.get(result.carrierId);
      if (dispatcher) {
        result.primaryDispatcher = {
          id: dispatcher.id,
          name: dispatcher.name,
          role: dispatcher.role,
          phone: dispatcher.phone,
          mobile: dispatcher.mobile,
          email: dispatcher.email,
          preferredContactMethod: dispatcher.preferredContactMethod,
        };
      }
    }
  }

  // sort descending
  results.sort((a, b) => b.totalScore - a.totalScore);

  // Apply maxResults limit
  const limitedResults = maxResults > 0 ? results.slice(0, maxResults) : results;

  return { 
    loadId,
    ventureId,
    matches: limitedResults,
    totalCandidates: results.length,
    options: {
      maxResults,
      includeFmcsaHealth,
      onlyAuthorizedCarriers,
      minOnTimePercentage,
      maxDistance,
      requireEquipmentMatch,
      ventureId,
    },
  };
}
