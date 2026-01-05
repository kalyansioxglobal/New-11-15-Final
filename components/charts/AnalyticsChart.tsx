"use client";

import React from "react";
import { ChartContainer } from "./ChartContainer";
import { BaseTimeSeriesChart } from "./BaseTimeSeriesChart";
import type { DateRangeKey, MetricFilterState } from "@/hooks/useMetricSeries";
import { useMetricSeries } from "@/hooks/useMetricSeries";
import { getMetricConfig } from "@/lib/analytics/metrics";
import type { MetricKey } from "@/lib/analytics/metrics";
import { Skeleton } from "../ui/Skeleton";

type AnalyticsChartProps = {
  metric: MetricKey;
  chartType?: "line" | "area" | "bar";
  defaultDateRange?: DateRangeKey;
  filters?: Partial<MetricFilterState>;
  height?: number;
};

const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  MTD: "MTD",
  YTD: "YTD",
  LAST_7_DAYS: "Last 7 days",
  LAST_30_DAYS: "Last 30 days",
};

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  metric,
  chartType = "area",
  defaultDateRange = "LAST_30_DAYS",
  filters = {},
  height,
}) => {
  const [dateRange, setDateRange] = React.useState<DateRangeKey>(
    filters.dateRange ?? defaultDateRange
  );

  const mergedFilters: MetricFilterState = {
    dateRange,
    ventureId: filters.ventureId,
    officeId: filters.officeId,
    propertyId: filters.propertyId,
    userId: filters.userId,
  };

  const { loading, error, data } = useMetricSeries({
    metric,
    filters: mergedFilters,
  });

  const config = getMetricConfig(metric);

  const rightSlot = (
    <div className="flex items-center gap-1">
      {(Object.keys(DATE_RANGE_LABELS) as DateRangeKey[]).map((dr) => (
        <button
          key={dr}
          onClick={() => setDateRange(dr)}
          className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
            dateRange === dr
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-gray-100 dark:bg-slate-900/60 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-900"
          }`}
        >
          {DATE_RANGE_LABELS[dr]}
        </button>
      ))}
    </div>
  );

  return (
    <ChartContainer
      title={config.label}
      description={config.description}
      rightSlot={rightSlot}
      height={height}
    >
      {loading && (
        <div className="flex items-center justify-center h-full text-xs text-gray-500 dark:text-slate-400">
          <Skeleton className="w-full h-auto" />
        </div>
      )}
      {!loading && error && (
        <div className="flex items-center justify-center h-full text-xs text-red-600 dark:text-red-400">
          Failed to load: {error}
        </div>
      )}
      {!loading && !error && data.length === 0 && (
        <div className="flex items-center justify-center h-full text-xs text-gray-500 dark:text-slate-500">
          No data for this range.
        </div>
      )}
      {!loading && !error && data.length > 0 && (
        <div className="w-full h-full" style={{ minHeight: 200 }}>
          <BaseTimeSeriesChart
            data={data}
            format={config.format}
            chartType={chartType}
            showComparison={!!config.supportsComparison}
            yAxisLabel={config.unitLabel}
          />
        </div>
      )}
    </ChartContainer>
  );
};
