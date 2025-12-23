import type { AiDraftTemplate } from "./freightTemplates";

export const hotelTemplates: AiDraftTemplate[] = [
  {
    id: "hotel_parity_soft_escalation",
    label: "Parity Issue Escalation (Soft)",
    description: "Soft but clear escalation about an OTA parity discrepancy.",
    hint: "Describe the parity issue factually and politely request a review, keeping the tone collaborative rather than confrontational.",
    domain: "hotel",
  },
  {
    id: "hotel_ota_followup_neutral",
    label: "OTA Follow-up (Neutral)",
    description: "Neutral follow-up after OTA configuration or rate changes.",
    hint: "Use a neutral, factual tone to follow up on recent OTA changes and ask if they see the expected impact.",
    domain: "hotel",
  },
  {
    id: "hotel_partner_appreciation_warm",
    label: "Partner Appreciation (Warm)",
    description: "Warm relationship message thanking the partner.",
    hint: "Express appreciation and partnership, keeping the message warm but still professional.",
    domain: "hotel",
  },
  {
    id: "hotel_performance_checkin",
    label: "Performance Check-In",
    description: "Qualitative check-in on property performance.",
    hint: "Discuss performance trends in qualitative terms (e.g. softer weekends, stronger weekdays) and invite discussion.",
    domain: "hotel",
  },
];
