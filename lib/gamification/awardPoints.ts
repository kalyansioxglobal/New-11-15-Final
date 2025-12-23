import { prisma } from '@/lib/prisma';

export interface AwardPointsInput {
  userId: number;
  ventureId: number;
  officeId?: number | null;
  eventType: string;
  points: number;
  metadata?: Record<string, any> | null;
  idempotencyKey?: string;
}

export interface AwardPointsResult {
  success: boolean;
  eventId?: number;
  skipped?: boolean;
  error?: string;
}

const DEFAULT_POINTS: Record<string, number> = {
  EOD_REPORT_SUBMITTED: 10,
  LOAD_COMPLETED: 25,
  CARRIER_OUTREACH_SENT: 5,
  OUTREACH_AWARDED: 15,
  TASK_COMPLETED: 10,
  QUOTE_CONVERTED: 50,
  HOTEL_REVIEW_RESPONDED: 8,
  BPO_CALL_COMPLETED: 3,
  HOTEL_DISPUTE_RESOLVED: 15,
  PERFECT_WEEK_EOD: 25,
  FIRST_DAILY_LOGIN: 1,
};

export async function getPointsForEvent(
  ventureId: number,
  eventType: string
): Promise<number> {
  try {
    const config = await prisma.gamificationConfig.findUnique({
      where: { ventureId },
    });

    if (config?.config && typeof config.config === 'object') {
      const configObj = config.config as Record<string, any>;
      if (typeof configObj[eventType] === 'number') {
        return configObj[eventType];
      }
    }
  } catch (err) {
    console.error('[awardPoints] Error reading config:', err);
  }

  return DEFAULT_POINTS[eventType] ?? 10;
}

export async function awardPoints(
  input: AwardPointsInput
): Promise<AwardPointsResult> {
  const { userId, ventureId, officeId, eventType, points, metadata, idempotencyKey } = input;

  try {
    if (idempotencyKey) {
      const existing = await prisma.gamificationEvent.findFirst({
        where: {
          userId,
          ventureId,
          type: eventType,
          metadata: {
            path: ['idempotencyKey'],
            equals: idempotencyKey,
          },
        },
      });

      if (existing) {
        return { success: true, eventId: existing.id, skipped: true };
      }
    }

    const baseMetadata = metadata ?? {};
    const eventMetadata = idempotencyKey
      ? { ...baseMetadata, idempotencyKey }
      : (metadata || null);

    const event = await prisma.gamificationEvent.create({
      data: {
        userId,
        ventureId,
        officeId: officeId ?? null,
        type: eventType,
        points,
        metadata: eventMetadata ?? null,
      },
    });

    await prisma.gamificationPointsBalance.upsert({
      where: { userId },
      update: {
        points: { increment: points },
      },
      create: {
        userId,
        points,
      },
    });

    return { success: true, eventId: event.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[awardPoints] Error awarding points:', {
      userId,
      ventureId,
      eventType,
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}

export async function awardPointsForEvent(
  userId: number,
  ventureId: number,
  eventType: string,
  options?: {
    officeId?: number | null;
    metadata?: Record<string, any> | null;
    idempotencyKey?: string;
  }
): Promise<AwardPointsResult> {
  const points = await getPointsForEvent(ventureId, eventType);
  return awardPoints({
    userId,
    ventureId,
    officeId: options?.officeId,
    eventType,
    points,
    metadata: options?.metadata,
    idempotencyKey: options?.idempotencyKey,
  });
}
