import type { NextApiRequest, NextApiResponse } from "next";
import { lookupCarrierFromFmcsa, FmcsaLookupType } from "@/lib/fmcsa";
import { requireUser } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const allowed = await rateLimit(req, res, "fmcsa-lookup");
  if (!allowed) return;

  try {
    const { type, value } = req.body as {
      type?: FmcsaLookupType;
      value?: string;
    };

    if (!type || (type !== "MC" && type !== "DOT")) {
      return res.status(400).json({ error: "Invalid type. Use MC or DOT." });
    }

    if (!value || typeof value !== "string") {
      return res.status(400).json({ error: "MC/DOT value is required." });
    }

    const normalized = await lookupCarrierFromFmcsa(type, value);

    if (!normalized) {
      return res.status(404).json({ error: "Carrier not found in FMCSA." });
    }

    return res.status(200).json({ carrier: normalized });
  } catch (error: any) {
    console.error("FMCSA lookup error:", error);
    
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes("FMCSA_WEBKEY is not configured")) {
      return res.status(500).json({
        error: "FMCSA API key is not configured. Please contact support.",
      });
    }
    
    if (errorMessage.includes("FMCSA API returned")) {
      return res.status(502).json({
        error: `FMCSA service error: ${errorMessage}`,
      });
    }
    
    return res.status(500).json({
      error: "Failed to fetch carrier from FMCSA. Please try again or check the MC/DOT number.",
      details: errorMessage,
    });
  }
}
