import type { NextApiRequest, NextApiResponse } from "next";
import { handleInboundSms } from "@/lib/outreach/inboundHandler";
import twilio from "twilio";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const twilioSignature = req.headers["x-twilio-signature"] as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (authToken && twilioSignature) {
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["host"];
      const url = `${protocol}://${host}${req.url}`;

      const isValid = twilio.validateRequest(
        authToken,
        twilioSignature,
        url,
        req.body
      );

      if (!isValid) {
        console.error("[TWILIO WEBHOOK] Invalid signature");
        return res.status(403).json({ error: "Invalid signature" });
      }
    }

    const { From, To, Body, MessageSid, ...rest } = req.body;

    if (!From || !To || Body === undefined) {
      console.error("[TWILIO WEBHOOK] Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await handleInboundSms({
      from: From,
      to: To,
      body: Body,
      messageSid: MessageSid,
      rawPayload: req.body,
    });

    console.log("[TWILIO WEBHOOK] Processed inbound SMS:", result);

    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send("<Response></Response>");
  } catch (error: any) {
    console.error("[TWILIO WEBHOOK] Error processing inbound SMS:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
