import type { NextApiRequest, NextApiResponse } from "next";
import { handleInboundEmail } from "@/lib/outreach/inboundHandler";

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
    const emails = Array.isArray(req.body) ? req.body : [req.body];

    for (const email of emails) {
      const from = email.from || email.sender || "";
      const to = email.to || email.recipient || "";
      const subject = email.subject || "";
      const body = email.text || email.html || email.body || "";

      if (!from || !to) {
        console.warn("[SENDGRID WEBHOOK] Missing from or to:", email);
        continue;
      }

      const result = await handleInboundEmail({
        from,
        to,
        subject,
        body,
        rawPayload: email,
      });

      console.log("[SENDGRID WEBHOOK] Processed inbound email:", result);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[SENDGRID WEBHOOK] Error processing inbound email:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
