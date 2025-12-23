import type { MetricFormat } from "./metrics";

export function formatCurrency(value: number, currency = "USD"): string {
  if (value == null || isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentage(value: number): string {
  if (value == null || isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  if (value == null || isNaN(value)) return "-";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

export function formatRpm(value: number): string {
  if (value == null || isNaN(value)) return "-";
  return `$${value.toFixed(2)}/mi`;
}

export function formatMetricValue(value: number, format: MetricFormat): string {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percentage":
      return formatPercentage(value);
    case "rpm":
      return formatRpm(value);
    case "number":
    default:
      return formatNumber(value);
  }
}
