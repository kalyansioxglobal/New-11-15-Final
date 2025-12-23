import type { NextApiRequest, NextApiResponse } from "next";
import {
  withAiGuardrails,
  type AiHandlerContext,
  type AiHandlerResult,
  estimateTokens,
} from "@/lib/ai/withAiGuardrails";
import { AiDisabledError } from "@/lib/ai/aiClient";
import {
  generateCarrierOutreachDraft,
  type CarrierOutreachDraftType,
} from "@/lib/ai/freightCarrierOutreachAssistant";
import prisma from "@/lib/prisma";

async function handleCarrierDraft(
  req: NextApiRequest,
  res: NextApiResponse,
  context: AiHandlerContext
): Promise<AiHandlerResult> {
  const { requestId, sanitizedBody: body } = context;

  const {
    carrierName,
    lane,
    load,
    contextNotes,
    draftType,
    templateId,
    toneId,
    contactRole,
    dispatcherName,
    dispatcherEmail,
    dispatcherId,
  } = body as Record<string, unknown>;

  if (!carrierName || typeof carrierName !== "string") {
    return { success: false, error: "carrierName is required" };
  }

  if (!lane || typeof lane !== "object") {
    return { success: false, error: "lane is required" };
  }

  const laneObj = lane as Record<string, unknown>;
  if (!laneObj.origin || typeof laneObj.origin !== "string") {
    return { success: false, error: "lane.origin is required" };
  }

  if (!laneObj.destination || typeof laneObj.destination !== "string") {
    return { success: false, error: "lane.destination is required" };
  }

  if (!load || typeof load !== "object") {
    return { success: false, error: "load is required" };
  }

  const loadObj = load as Record<string, unknown>;

  const allowedDraftTypes: CarrierOutreachDraftType[] = [
    "inquiry",
    "coverage_request",
    "relationship",
  ];

  if (
    contactRole &&
    contactRole !== "carrier_owner" &&
    contactRole !== "dispatcher"
  ) {
    return { success: false, error: "INVALID_CONTACT_ROLE" };
  }

  const effectiveContactRole = (contactRole || "carrier_owner") as
    | "carrier_owner"
    | "dispatcher";

  if (!allowedDraftTypes.includes(draftType as CarrierOutreachDraftType)) {
    return { success: false, error: "Invalid draftType" };
  }

  if (templateId && typeof templateId !== "string") {
    return { success: false, error: "INVALID_TEMPLATE" };
  }

  if (toneId && typeof toneId !== "string") {
    return { success: false, error: "INVALID_TONE" };
  }

  let resolvedDispatcherName: string | undefined;
  let resolvedDispatcherEmail: string | undefined;

  if (effectiveContactRole === "dispatcher") {
    if (dispatcherId) {
      const dispatcherIdStr = String(dispatcherId);

      const dispatcher = await prisma.carrierDispatcher.findUnique({
        where: { id: dispatcherIdStr },
        include: { carrier: true },
      });

      if (!dispatcher) {
        return { success: false, error: "DISPATCHER_NOT_FOUND" };
      }

      if (
        carrierName &&
        dispatcher.carrier?.name &&
        dispatcher.carrier.name.toLowerCase().trim() !==
          String(carrierName).toLowerCase().trim()
      ) {
        return { success: false, error: "DISPATCHER_NOT_FOUND" };
      }

      resolvedDispatcherName = dispatcher.name;
      resolvedDispatcherEmail = dispatcher.email || undefined;
    } else {
      if (!dispatcherName) {
        return {
          success: false,
          error: "DISPATCHER_NAME_REQUIRED",
        };
      }
      resolvedDispatcherName = dispatcherName as string;
      resolvedDispatcherEmail = (dispatcherEmail as string) || undefined;
    }
  }

  try {
    const draft = await generateCarrierOutreachDraft({
      draftType: draftType as CarrierOutreachDraftType,
      carrierName,
      lane: { origin: laneObj.origin as string, destination: laneObj.destination as string },
      load: {
        pickupDate: loadObj.pickupDate as string | undefined,
        weight: loadObj.weight as number | undefined,
        equipment: loadObj.equipment as string | undefined,
        commodity: loadObj.commodity as string | undefined,
      },
      contextNotes: (contextNotes as string) || undefined,
      templateId: (templateId as string) || undefined,
      toneId: (toneId as string) || undefined,
      contactRole: effectiveContactRole,
      dispatcherName: resolvedDispatcherName,
      dispatcherEmail: resolvedDispatcherEmail,
      userId: context.user.id,
      requestId,
    });

    const tokensEstimated = estimateTokens(draft);

    return {
      success: true,
      data: { draft, tokensEstimated },
      tokensEstimated,
      inputLength: JSON.stringify(body).length,
      outputLength: draft.length,
    };
  } catch (err: unknown) {
    if (err instanceof AiDisabledError) {
      return { success: false, error: "AI_ASSISTANT_DISABLED" };
    }
    throw err;
  }
}

export default withAiGuardrails(handleCarrierDraft, {
  feature: "freightAssistant",
  extractInputForValidation: (body) => {
    const parts = [
      body.carrierName,
      body.contextNotes,
      body.dispatcherName,
      JSON.stringify(body.lane),
      JSON.stringify(body.load),
    ].filter(Boolean);
    return parts.join(" ");
  },
});
