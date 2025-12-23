export type VentureModule = "FREIGHT" | "HOTEL" | "BPO" | "GLOBAL";

export type MetricKey =
  | "freight_margin_pct"
  | "freight_rpm"
  | "freight_gross_revenue"
  | "freight_loads_count"
  | "freight_lost_load_pct"
  | "freight_at_risk_loads"
  | "hotel_revpar"
  | "hotel_adr"
  | "hotel_occupancy_pct"
  | "hotel_loss_nights"
  | "hotel_housekeeping_cost_per_occ_room"
  | "bpo_calls_per_hour"
  | "bpo_connected_calls"
  | "bpo_qa_score_pct"
  | "bpo_attendance_pct"
  | "venture_revenue"
  | "venture_ebitda"
  | "venture_headcount";

export type MetricFormat = "currency" | "percentage" | "number" | "rpm";

export type MetricConfig = {
  key: MetricKey;
  label: string;
  description?: string;
  module: VentureModule;
  format: MetricFormat;
  unitLabel?: string;
  suggestedMin?: number;
  suggestedMax?: number;
  supportsComparison?: boolean;
};

export const METRIC_CONFIG: Record<MetricKey, MetricConfig> = {
  freight_margin_pct: {
    key: "freight_margin_pct",
    label: "Freight Margin %",
    description: "Net margin % across all loads in the selected period.",
    module: "FREIGHT",
    format: "percentage",
    suggestedMin: 0,
    suggestedMax: 0.5,
    supportsComparison: true,
  },
  freight_rpm: {
    key: "freight_rpm",
    label: "Revenue Per Mile (RPM)",
    description: "Average revenue per mile on completed loads.",
    module: "FREIGHT",
    format: "rpm",
    suggestedMin: 1,
    suggestedMax: 5,
    supportsComparison: true,
  },
  freight_gross_revenue: {
    key: "freight_gross_revenue",
    label: "Freight Gross Revenue",
    description: "Total billed revenue for loads in the period.",
    module: "FREIGHT",
    format: "currency",
    supportsComparison: true,
  },
  freight_loads_count: {
    key: "freight_loads_count",
    label: "# of Loads",
    description: "Total number of loads completed in the period.",
    module: "FREIGHT",
    format: "number",
    supportsComparison: true,
  },
  freight_lost_load_pct: {
    key: "freight_lost_load_pct",
    label: "Lost Load %",
    description: "Percentage of quoted loads that were lost.",
    module: "FREIGHT",
    format: "percentage",
    suggestedMin: 0,
    suggestedMax: 0.5,
    supportsComparison: true,
  },
  freight_at_risk_loads: {
    key: "freight_at_risk_loads",
    label: "At-Risk Loads",
    description: "Loads currently flagged as at-risk.",
    module: "FREIGHT",
    format: "number",
  },
  hotel_revpar: {
    key: "hotel_revpar",
    label: "RevPAR",
    description: "Revenue per available room for the period.",
    module: "HOTEL",
    format: "currency",
    supportsComparison: true,
  },
  hotel_adr: {
    key: "hotel_adr",
    label: "ADR",
    description: "Average Daily Rate for sold rooms.",
    module: "HOTEL",
    format: "currency",
    supportsComparison: true,
  },
  hotel_occupancy_pct: {
    key: "hotel_occupancy_pct",
    label: "Occupancy %",
    description: "Occupancy percentage for the property.",
    module: "HOTEL",
    format: "percentage",
    suggestedMin: 0,
    suggestedMax: 1,
    supportsComparison: true,
  },
  hotel_loss_nights: {
    key: "hotel_loss_nights",
    label: "Loss Nights",
    description: "Number of nights with high loss or comped rooms.",
    module: "HOTEL",
    format: "number",
  },
  hotel_housekeeping_cost_per_occ_room: {
    key: "hotel_housekeeping_cost_per_occ_room",
    label: "HK Cost / Occupied Room",
    description: "Housekeeping payroll cost per occupied room.",
    module: "HOTEL",
    format: "currency",
    supportsComparison: true,
  },
  bpo_calls_per_hour: {
    key: "bpo_calls_per_hour",
    label: "Calls per Hour",
    description: "Average outbound calls per agent-hour.",
    module: "BPO",
    format: "number",
    supportsComparison: true,
  },
  bpo_connected_calls: {
    key: "bpo_connected_calls",
    label: "Connected Calls",
    description: "Number of connected calls in the period.",
    module: "BPO",
    format: "number",
    supportsComparison: true,
  },
  bpo_qa_score_pct: {
    key: "bpo_qa_score_pct",
    label: "QA Score %",
    description: "Quality assurance scores averaged across evaluations.",
    module: "BPO",
    format: "percentage",
    suggestedMin: 0.6,
    suggestedMax: 1,
    supportsComparison: true,
  },
  bpo_attendance_pct: {
    key: "bpo_attendance_pct",
    label: "Attendance %",
    description: "Attendance reliability across agents.",
    module: "BPO",
    format: "percentage",
    supportsComparison: true,
  },
  venture_revenue: {
    key: "venture_revenue",
    label: "Venture Revenue",
    description: "Total revenue for the venture in the period.",
    module: "GLOBAL",
    format: "currency",
    supportsComparison: true,
  },
  venture_ebitda: {
    key: "venture_ebitda",
    label: "Venture EBITDA",
    description: "EBITDA-level profitability per venture.",
    module: "GLOBAL",
    format: "currency",
    supportsComparison: true,
  },
  venture_headcount: {
    key: "venture_headcount",
    label: "Headcount",
    description: "Total employees/headcount for the venture.",
    module: "GLOBAL",
    format: "number",
  },
};

export function getMetricConfig(metric: MetricKey): MetricConfig {
  return METRIC_CONFIG[metric];
}
