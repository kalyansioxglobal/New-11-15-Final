export type VentureHealth = "HEALTHY" | "ATTENTION" | "CRITICAL";

export type VentureStatusReason = {
  code: string;
  message: string;
};

export type VentureSummaryWithAggregates = {
  id: number;
  name: string;

  category: string;
  typeCode: string | null;
  roleLabel: string;

  officesCount: number;
  health: VentureHealth;
  reasons: VentureStatusReason[];

  freight?: {
    totalLoadsInbound7d: number | null;
    totalLoadsCovered7d: number | null;
    coverageRate7d: number | null;
    marginPct7d: number | null;
  };

  hotels?: {
    roomsSold7d: number | null;
    occupancy7d: number | null;
    revpar7d: number | null;
  };
};
