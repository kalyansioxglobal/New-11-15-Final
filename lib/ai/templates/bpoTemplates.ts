import type { AiDraftTemplate } from "./freightTemplates";

export const bpoTemplates: AiDraftTemplate[] = [
  {
    id: "bpo_consultative_warm_followup",
    label: "Consultative Warm Follow-up",
    description: "Warm, consultative follow-up after prior contact.",
    hint: "Reference prior conversations at a high level and take a consultative tone, focusing on how you can help.",
    domain: "bpo",
  },
  {
    id: "bpo_monthly_kpi_recap",
    label: "Monthly KPI Recap",
    description: "Monthly KPI recap in qualitative terms.",
    hint: "Summarize KPI performance in qualitative language (above target, slightly below expectations) and highlight 1–2 focus areas.",
    domain: "bpo",
  },
  {
    id: "bpo_light_outreach_casual_professional",
    label: "Light Outreach (Casual-Professional)",
    description: "Light-touch outreach with a casual-professional balance.",
    hint: "Use a light-touch outreach style that feels approachable while remaining professional.",
    domain: "bpo",
  },
  {
    id: "bpo_sla_checkin",
    label: "SLA Check-In",
    description: "Friendly check-in around SLA expectations and performance.",
    hint: "Invite a conversation about SLA performance and expectations, without committing to specific SLA changes.",
    domain: "bpo",
  },
];
