export type AiDraftTemplate = {
  id: string;
  label: string;
  description: string;
  hint: string;
  domain: "freight" | "hotel" | "bpo" | "ops";
};

export const freightTemplates: AiDraftTemplate[] = [
  {
    id: "freight_coverage_professional",
    label: "Professional Coverage Request",
    description: "Clear, concise coverage request for a specific load.",
    hint: "Use a clear, professional coverage request style that focuses on key load details and availability without mentioning price.",
    domain: "freight",
  },
  {
    id: "freight_lane_inquiry_polite",
    label: "Polite Lane Inquiry",
    description: "Soft inquiry about a carrier's interest and capacity on a lane.",
    hint: "Use a polite, exploratory tone that checks interest and capacity on the lane without pressure.",
    domain: "freight",
  },
  {
    id: "freight_operational_clarity",
    label: "Operational Clarity",
    description: "Operationally-focused message clarifying dates, equipment, and constraints.",
    hint: "Emphasize clarity around dates, equipment, and any special requirements so the carrier can quickly assess fit.",
    domain: "freight",
  },
  {
    id: "freight_leadership_snapshot",
    label: "Leadership Performance Snapshot",
    description: "High-level freight summary suitable for CEO/COO.",
    hint: "Summarize key freight performance and risks at a high level suitable for senior leadership, avoiding low-level operational noise.",
    domain: "freight",
  },
  {
    id: "freight_risk_focus",
    label: "Risk-Focused Overview",
    description: "Emphasize lanes, shippers, or carriers that may require attention.",
    hint: "Highlight emerging risks and areas that may require attention, without overstating severity.",
    domain: "freight",
  },
];
