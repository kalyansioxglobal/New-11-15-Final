import { prisma } from "@/lib/prisma";
import {
  CarrierCandidate,
  searchCarriersForLoad,
} from "@/lib/freight/carrierSearch";
import { sendAndLogEmail } from "@/lib/comms/email";
import { openai, isOpenAIConfigured } from "@/lib/openai";

type LostLoadAgentOptions = {
  autoSend?: boolean;
  maxEmails?: number;
  venture?: string;
  userId?: number;
};

export async function runLostLoadRescueAgent(
  loadId: number,
  options: LostLoadAgentOptions = {}
) {
  const { autoSend = false, maxEmails = 10, venture, userId } = options;

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: {
      shipper: true,
    },
  });

  if (!load) throw new Error("Load not found");

  const input = {
    originZip: load.pickupZip ?? "",
    destinationZip: load.dropZip ?? "",
    equipmentType: load.equipmentType ?? null,
    pickupDate: load.pickupDate ?? new Date(),
    weight: load.weightLbs ?? null,
    ventureId: load.ventureId ?? undefined,
  };

  const searchResult = await searchCarriersForLoad(input);
  const allCandidates = [...searchResult.recommendedCarriers, ...searchResult.newCarriers];
  const topCandidates: CarrierCandidate[] = allCandidates
    .filter((c) => c.email)
    .slice(0, maxEmails);

  const baseContext = {
    shipment: {
      originCity: load.pickupCity ?? "",
      originState: load.pickupState ?? "",
      destinationCity: load.dropCity ?? "",
      destinationState: load.dropState ?? "",
      origin: `${load.pickupCity ?? ""} ${load.pickupState ?? ""}`.trim(),
      destination: `${load.dropCity ?? ""} ${load.dropState ?? ""}`.trim(),
      pickupDate: load.pickupDate,
      weight: load.weightLbs,
      equipmentType: load.equipmentType,
      reference: load.tmsLoadId || load.reference || load.id,
    },
    shipper: {
      name: load.shipper?.name ?? load.shipperName ?? "",
    },
    venture: venture ?? "SIOX Logistics",
  };

  const drafts: {
    carrier: CarrierCandidate;
    to: string;
    subject: string;
    html: string;
  }[] = [];

  for (const carrier of topCandidates) {
    const to = carrier.email!;
    const subject = buildSubjectLine(baseContext);

    const html = await generateCarrierEmailUsingAI({
      carrier,
      context: baseContext,
      subject,
    });

    drafts.push({ carrier, to, subject, html });
  }

  if (!autoSend) {
    return {
      mode: "DRAFT" as const,
      loadId,
      count: drafts.length,
      drafts: drafts.map((d) => ({
        carrier: d.carrier,
        to: d.to,
        subject: d.subject,
        html: d.html,
      })),
    };
  }

  const results = [];
  for (const draft of drafts) {
    const result = await sendAndLogEmail({
      to: draft.to,
      subject: draft.subject,
      html: draft.html,
      venture,
      relatedLoadId: loadId,
      sentByUserId: userId,
      sentByAgent: true,
    });
    results.push({
      carrier: draft.carrier,
      to: draft.to,
      status: result.status,
      errorMessage: result.errorMessage,
    });
  }

  await prisma.logisticsLoadEvent.create({
    data: {
      loadId: loadId,
      type: "NOTE",
      message: `AI Lost Load Agent ran in autoSend=${autoSend} mode, attempted ${results.length} emails.`,
      createdById: userId ?? null,
      data: results as any,
    },
  });

  return {
    mode: "SENT" as const,
    loadId,
    results,
  };
}

function buildSubjectLine(ctx: any): string {
  const pickupDateStr = formatDate(ctx.shipment.pickupDate);
  return `Load ${ctx.shipment.reference}: ${ctx.shipment.origin} → ${ctx.shipment.destination} on ${pickupDateStr}`;
}

async function generateCarrierEmailUsingAI(params: {
  carrier: CarrierCandidate;
  context: any;
  subject: string;
}): Promise<string> {
  const { carrier, context, subject } = params;

  if (!isOpenAIConfigured()) {
    return buildSimpleCarrierEmailTemplate(carrier, context, { subject }, context.venture);
  }

  try {
    const prompt = `
You are a freight broker writing a professional, concise email to a carrier to offer them a load.

Carrier Name: ${carrier.name || "Carrier"}
Carrier MC#: ${carrier.mcNumber || "N/A"}

Shipment Details:
- Lane: ${context.shipment.origin} → ${context.shipment.destination}
- Pickup Date: ${formatDate(context.shipment.pickupDate)}
- Weight: ${context.shipment.weight ? `${context.shipment.weight} lbs` : "TBD"}
- Equipment: ${context.shipment.equipmentType || "Dry Van"}
- Reference: Load #${context.shipment.reference}

Company: ${context.venture}

Write a brief, professional email (3-4 short paragraphs) asking if they can take this load.
Be friendly but efficient. Ask for their best all-in rate and to confirm availability.
Do not include a subject line - just the email body.
Output the email in HTML format using <p> tags for paragraphs and <ul>/<li> for any lists.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that writes professional freight broker emails.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiContent = response.choices[0]?.message?.content;
    if (aiContent) {
      return aiContent;
    }
  } catch (error) {
    console.error("OpenAI email generation failed, using template:", error);
  }

  return buildSimpleCarrierEmailTemplate(carrier, context, { subject }, context.venture);
}

function buildSimpleCarrierEmailTemplate(
  carrier: CarrierCandidate,
  ctx: any,
  meta: { subject: string },
  venture?: string
): string {
  const pickupDateStr = formatDate(ctx.shipment.pickupDate);

  return `
    <p>Hi ${carrier.name || "there"},</p>

    <p>We have an available load we'd like to offer you:</p>

    <ul>
      <li><strong>Lane:</strong> ${ctx.shipment.origin} → ${ctx.shipment.destination}</li>
      <li><strong>Pickup:</strong> ${pickupDateStr}</li>
      ${
        ctx.shipment.weight
          ? `<li><strong>Weight:</strong> ${ctx.shipment.weight} lbs</li>`
          : ""
      }
      ${
        ctx.shipment.equipmentType
          ? `<li><strong>Equipment:</strong> ${ctx.shipment.equipmentType}</li>`
          : ""
      }
      <li><strong>Reference:</strong> Load #${ctx.shipment.reference}</li>
    </ul>

    <p>Please reply with your best all-in rate and confirm equipment and availability.</p>

    <p>Thank you,<br/>
    ${venture ?? "SIOX Logistics"}</p>
  `;
}

function formatDate(d: any): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
