import type { AiDraftTemplate } from "./freightTemplates";

export const opsDiagnosticsTemplates: AiDraftTemplate[] = [
  {
    id: "ops_sre_bullet_summary",
    label: "SRE Bullet Summary",
    description: "High-level SRE-style bullet summary for logs.",
    hint: "Focus on the 3–5 most important reliability findings from the logs, phrased as clear bullet points.",
    domain: "ops",
  },
  {
    id: "ops_error_cluster_breakdown",
    label: "Error Cluster Breakdown",
    description: "Break down recurring error clusters and impacted endpoints.",
    hint: "Emphasize recurring errors, their endpoints, and likely areas to investigate.",
    domain: "ops",
  },
  {
    id: "ops_perf_degradation_outline",
    label: "Performance Degradation Outline",
    description: "Outline where performance degradation appears in logs.",
    hint: "Call out endpoints or flows that appear slow or degraded, and suggest where deeper investigation might be useful.",
    domain: "ops",
  },
];
