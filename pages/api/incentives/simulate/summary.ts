import type { NextApiRequest, NextApiResponse } from "next";
import { withUser } from "@/lib/api";
import { summarizeIncentiveSimulation } from "@/lib/ai/summarize";

interface SimulationSummaryRequest {
  mode: "current_plan" | "custom_rules" | "compare";
  baseline?: any;
  simulated?: any;
  diff?: any;
}

export default withUser(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mode, baseline, simulated, diff } = req.body as SimulationSummaryRequest;

    if (!mode || !["current_plan", "custom_rules", "compare"].includes(mode)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        detail: "mode must be one of 'current_plan', 'custom_rules', or 'compare'",
      });
    }

    // Basic shape checks - we deliberately only pass summaries/perRole down to AI layer
    if (mode === "current_plan" && !baseline) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        detail: "baseline result is required for current_plan mode",
      });
    }

    if (mode === "custom_rules" && !simulated) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        detail: "simulated result is required for custom_rules mode",
      });
    }

    if (mode === "compare" && (!baseline || !simulated)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        detail: "baseline and simulated results are required for compare mode",
      });
    }

    const summary = await summarizeIncentiveSimulation({
      mode,
      baseline: baseline ?? null,
      simulated: simulated ?? null,
      diff: diff ?? null,
    });

    return res.status(200).json({ summary: summary ?? null });
  } catch (err: any) {
    console.error("Incentives AI summary error", err);
    return res
      .status(500)
      .json({ error: "Internal server error", detail: err.message || String(err) });
  }
});
