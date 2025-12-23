import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function learnLaneFromLoad(loadId: number): Promise<boolean> {
  try {
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      select: {
        id: true,
        carrierId: true,
        pickupCity: true,
        pickupState: true,
        dropCity: true,
        dropState: true,
        loadStatus: true,
      },
    });

    if (!load || !load.carrierId) {
      return false;
    }

    if (!["COVERED", "DELIVERED", "IN_TRANSIT"].includes(load.loadStatus || "")) {
      return false;
    }

    const origin = load.pickupState?.toUpperCase() || load.pickupCity?.toUpperCase();
    const destination = load.dropState?.toUpperCase() || load.dropCity?.toUpperCase();

    if (!origin || !destination) {
      return false;
    }

    await prisma.carrierPreferredLane.upsert({
      where: {
        carrierId_origin_destination: {
          carrierId: load.carrierId,
          origin,
          destination,
        },
      },
      update: {},
      create: {
        carrierId: load.carrierId,
        origin,
        destination,
        radius: 200,
      },
    });

    logger.info("carrier_lane_learned", {
      meta: {
        carrierId: load.carrierId,
        loadId: load.id,
        lane: `${origin} → ${destination}`,
      },
    });

    return true;
  } catch (err: any) {
    logger.error("carrier_lane_learn_error", {
      meta: { loadId, error: err.message },
    });
    return false;
  }
}

export async function learnLanesFromContactOutcome(
  carrierId: number,
  outcome: string,
  loadId?: number
): Promise<boolean> {
  if (!loadId) return false;
  
  const positiveOutcomes = ["accepted", "booked", "confirmed", "interested", "will call back"];
  const isPositive = positiveOutcomes.some(o => outcome.toLowerCase().includes(o));
  
  if (!isPositive) return false;

  try {
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      select: {
        pickupCity: true,
        pickupState: true,
        dropCity: true,
        dropState: true,
      },
    });

    if (!load) return false;

    const origin = load.pickupState?.toUpperCase() || load.pickupCity?.toUpperCase();
    const destination = load.dropState?.toUpperCase() || load.dropCity?.toUpperCase();

    if (!origin || !destination) return false;

    await prisma.carrierPreferredLane.upsert({
      where: {
        carrierId_origin_destination: {
          carrierId,
          origin,
          destination,
        },
      },
      update: {},
      create: {
        carrierId,
        origin,
        destination,
        radius: 200,
      },
    });

    logger.info("carrier_lane_learned_from_contact", {
      meta: { carrierId, loadId, lane: `${origin} → ${destination}`, outcome },
    });

    return true;
  } catch (err: any) {
    logger.error("carrier_lane_learn_from_contact_error", {
      meta: { carrierId, loadId, error: err.message },
    });
    return false;
  }
}
