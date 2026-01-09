import React, { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { AnalyticsChart } from "@/components/charts/AnalyticsChart";
import { useTestMode } from "@/contexts/TestModeContext";
import { Skeleton } from "@/components/ui/Skeleton";

type Venture = {
  id: number;
  name: string;
  type: string;
};

type HotelProperty = {
  id: number;
  name: string;
  ventureId: number;
};

type HotelsResponse = {
  items: HotelProperty[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) {
    throw new Error(`Failed to fetch: ${r.statusText}`);
  }
  return r.json();
});

export default function ChartsTab() {
  const { testMode } = useTestMode();
  const [selectedVentureId, setSelectedVentureId] = useState<string>("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const { data: venturesData, error: venturesError, isLoading: venturesLoading } = useSWR<Venture[]>(
    `/api/ventures?types=HOSPITALITY&includeTest=${testMode}`,
    fetcher
  );

  const { data: propertiesData, error: propertiesError, isLoading: propertiesLoading } = useSWR<HotelsResponse>(
    `/api/hospitality/hotels?includeTest=${testMode}&pageSize=200`,
    fetcher
  );

  // Show toast on errors
  useEffect(() => {
    if (venturesError) {
      toast.error('Failed to load ventures. Please try again.');
    }
  }, [venturesError]);

  useEffect(() => {
    if (propertiesError) {
      toast.error('Failed to load hotels. Please try again.');
    }
  }, [propertiesError]);

  // Extract arrays from API responses
  const hospitalityVentures = venturesData || [];

  // Handle paginated response with items property
  const propertiesArray = propertiesData?.items || [];

  const properties = propertiesArray.filter(
    (p) => !selectedVentureId || p.ventureId === parseInt(selectedVentureId, 10)
  );

  const filters: { ventureId?: string; propertyId?: string } = {};
  if (selectedVentureId) filters.ventureId = selectedVentureId;
  if (selectedPropertyId) filters.propertyId = selectedPropertyId;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Charts
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visualize hotel performance metrics over time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {venturesLoading ? (
            <Skeleton className="h-10 w-56" />
          ) : (
            <select
              value={selectedVentureId}
              onChange={(e) => {
                setSelectedVentureId(e.target.value);
                setSelectedPropertyId("");
              }}
              disabled={venturesError || hospitalityVentures.length === 0}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Hospitality Ventures</option>
              {hospitalityVentures.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.name}
                </option>
              ))}
            </select>
          )}

          {propertiesLoading ? (
            <Skeleton className="h-10 w-56" />
          ) : (
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              disabled={propertiesError || properties.length === 0}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnalyticsChart
          metric="hotel_revpar"
          chartType="area"
          filters={filters}
        />
        <AnalyticsChart
          metric="hotel_adr"
          chartType="area"
          filters={filters}
        />
        <AnalyticsChart
          metric="hotel_occupancy_pct"
          chartType="line"
          filters={filters}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalyticsChart
          metric="hotel_housekeeping_cost_per_occ_room"
          chartType="bar"
          filters={filters}
        />
        <AnalyticsChart
          metric="hotel_loss_nights"
          chartType="bar"
          filters={filters}
        />
      </div>
    </div>
  );
}
