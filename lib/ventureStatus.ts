export type VentureHealth = "Healthy" | "Attention" | "Critical";

export interface VentureStatusReason {
  code: string;
  message: string;
}

export interface VentureStatusResult {
  health: VentureHealth;
  reasons: VentureStatusReason[];
}

const FREIGHT_COVERAGE_ATTENTION = 30;
const FREIGHT_COVERAGE_CRITICAL = 15;
const FREIGHT_MARGIN_ATTENTION = 8;
const FREIGHT_MARGIN_CRITICAL = 5;

const HOTEL_OCC_ATTENTION = 55;
const HOTEL_OCC_CRITICAL = 40;
const HOTEL_REVPAR_ATTENTION = 60;
const HOTEL_REVPAR_CRITICAL = 40;

interface BaseSignals {
  hasExpiredPolicy: boolean;
  expiringPolicyCount: number;
  overdueTaskCount: number;
}

interface FreightSignals {
  coverageRate?: number;
  marginPct?: number;
}

interface HotelSignals {
  occupancyPct?: number;
  revpar?: number;
}

export function computeVentureStatus(
  ventureType: string,
  base: BaseSignals,
  freight?: FreightSignals,
  hotel?: HotelSignals
): VentureStatusResult {
  let health: VentureHealth = "Healthy";
  const reasons: VentureStatusReason[] = [];

  if (base.hasExpiredPolicy) {
    health = "Critical";
    reasons.push({
      code: "POLICY_EXPIRED",
      message: "One or more policies are expired.",
    });
  }

  if (base.expiringPolicyCount > 0) {
    if (health === "Healthy") health = "Attention";
    reasons.push({
      code: "POLICY_EXPIRING",
      message: `${base.expiringPolicyCount} policy(s) expiring in the next 30 days.`,
    });
  }

  if (base.overdueTaskCount > 0) {
    if (health === "Healthy") health = "Attention";
    reasons.push({
      code: "TASK_OVERDUE",
      message: `${base.overdueTaskCount} overdue task(s).`,
    });
  }

  if (ventureType === "LOGISTICS" || ventureType === "TRANSPORT") {
    if (freight?.coverageRate != null) {
      const cov = freight.coverageRate;

      if (cov < FREIGHT_COVERAGE_CRITICAL) {
        health = "Critical";
        reasons.push({
          code: "FREIGHT_COVERAGE_CRITICAL",
          message: `Freight coverage very low at ${cov.toFixed(1)}% (last 7 days).`,
        });
      } else if (cov < FREIGHT_COVERAGE_ATTENTION && health !== "Critical") {
        if (health === "Healthy") health = "Attention";
        reasons.push({
          code: "FREIGHT_COVERAGE_LOW",
          message: `Freight coverage below target at ${cov.toFixed(1)}% (last 7 days).`,
        });
      }
    }

    if (freight?.marginPct != null) {
      const m = freight.marginPct;
      if (m < FREIGHT_MARGIN_CRITICAL) {
        health = "Critical";
        reasons.push({
          code: "FREIGHT_MARGIN_CRITICAL",
          message: `Freight margin extremely low at ${m.toFixed(1)}%.`,
        });
      } else if (m < FREIGHT_MARGIN_ATTENTION && health !== "Critical") {
        if (health === "Healthy") health = "Attention";
        reasons.push({
          code: "FREIGHT_MARGIN_LOW",
          message: `Freight margin below target at ${m.toFixed(1)}%.`,
        });
      }
    }
  }

  if (ventureType === "HOSPITALITY") {
    if (hotel?.occupancyPct != null) {
      const occ = hotel.occupancyPct;

      if (occ < HOTEL_OCC_CRITICAL) {
        health = "Critical";
        reasons.push({
          code: "HOTEL_OCC_CRITICAL",
          message: `Occupancy very low at ${occ.toFixed(1)}% (last 7 days).`,
        });
      } else if (occ < HOTEL_OCC_ATTENTION && health !== "Critical") {
        if (health === "Healthy") health = "Attention";
        reasons.push({
          code: "HOTEL_OCC_LOW",
          message: `Occupancy below target at ${occ.toFixed(1)}% (last 7 days).`,
        });
      }
    }

    if (hotel?.revpar != null) {
      const rp = hotel.revpar;

      if (rp < HOTEL_REVPAR_CRITICAL) {
        health = "Critical";
        reasons.push({
          code: "HOTEL_REVPAR_CRITICAL",
          message: `RevPAR very low at $${rp.toFixed(0)} (last 7 days).`,
        });
      } else if (rp < HOTEL_REVPAR_ATTENTION && health !== "Critical") {
        if (health === "Healthy") health = "Attention";
        reasons.push({
          code: "HOTEL_REVPAR_LOW",
          message: `RevPAR below target at $${rp.toFixed(0)} (last 7 days).`,
        });
      }
    }
  }

  if (reasons.length === 0) {
    health = "Healthy";
  }

  return { health, reasons };
}
