import prisma from "@/lib/prisma";
import { LoadEventType } from "@prisma/client";

export async function logLoadEvent(params: {
  loadId: number;
  userId?: number | null;
  eventType: string;
  message?: string;
  data?: any;
}) {
  const { loadId, userId, eventType, message, data } = params;
  await prisma.logisticsLoadEvent.create({
    data: {
      loadId,
      createdById: userId ?? null,
      type: eventType as LoadEventType,
      message,
      data: data ?? undefined,
    },
  });
}
