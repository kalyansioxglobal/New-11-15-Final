import React, { useState } from "react";
import useSWR from "swr";
import { AnalyticsChart } from "@/components/charts/AnalyticsChart";
import { useTestMode } from "@/contexts/TestModeContext";

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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ChartsTab() {
  const { testMode } = useTestMode();
  const [selectedVentureId, setSelectedVentureId] = useState<string>("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const { data: venturesData = [] } = useSWR<Venture[]>(
    `/api/ventures?types=HOSPITALITY&includeTest=${testMode}`,
    fetcher
  );

  const { data: propertiesData } = useSWR<HotelProperty[]>(
    `/api/hospitality/hotels?includeTest=${testMode}`,
    fetcher
  );

  const hospitalityVentures = venturesData;

  const properties = (propertiesData ?? []).filter(
    (p) => !selectedVentureId || p.ventureId === parseInt(selectedVentureId, 10)
  );

  const filters: { ventureId?: string; propertyId?: string } = {};
  if (selectedVentureId) filters.ventureId = selectedVentureId;
  if (selectedPropertyId) filters.propertyId = selectedPropertyId;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">
          Performance Charts
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedVentureId}
            onChange={(e) => {
              setSelectedVentureId(e.target.value);
              setSelectedPropertyId("");
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Hospitality Ventures</option>
            {hospitalityVentures.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name}
              </option>
            ))}
          </select>

          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
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
