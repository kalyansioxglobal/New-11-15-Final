"use client";

import { useEffect, useState } from "react";
import type { MetricKey } from "@/lib/analytics/metrics";
import type { TimeSeriesPoint } from "@/components/charts/BaseTimeSeriesChart";

export type DateRangeKey = "MTD" | "YTD" | "LAST_7_DAYS" | "LAST_30_DAYS";

export type MetricFilterState = {
  dateRange: DateRangeKey;
  ventureId?: string;
  officeId?: string;
  propertyId?: string;
  userId?: string;
};

type UseMetricSeriesArgs = {
  metric: MetricKey;
  filters: MetricFilterState;
};

type MetricSeriesResponse = {
  loading: boolean;
  error?: string;
  data: TimeSeriesPoint[];
};

export function useMetricSeries({
  metric,
  filters,
}: UseMetricSeriesArgs): MetricSeriesResponse {
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(undefined);
      try {
        const params = new URLSearchParams({
          metric,
          dateRange: filters.dateRange,
        });
        if (filters.ventureId) params.set("ventureId", filters.ventureId);
        if (filters.officeId) params.set("officeId", filters.officeId);
        if (filters.propertyId) params.set("propertyId", filters.propertyId);
        if (filters.userId) params.set("userId", filters.userId);

        const res = await fetch(`/api/analytics/series?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data: TimeSeriesPoint[] };
        if (!cancelled) {
          setData(json.data || []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [
    metric,
    filters.dateRange,
    filters.ventureId,
    filters.officeId,
    filters.propertyId,
    filters.userId,
  ]);

  return { loading, error, data };
}
