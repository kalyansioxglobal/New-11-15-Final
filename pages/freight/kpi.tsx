import React, { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { AnalyticsChart } from "@/components/charts/AnalyticsChart";
import { useTestMode } from "@/contexts/TestModeContext";
import { useRoleGuard } from "@/hooks/useRoleGuard";

type Venture = {
  id: number;
  name: string;
  type: string;
};

type Office = {
  id: number;
  name: string;
  ventureId: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function FreightKpiPage() {
  const { loading: roleLoading, authorized } = useRoleGuard();
  const { data: session } = useSession();
  const { testMode } = useTestMode();
  const [selectedVentureId, setSelectedVentureId] = useState<string>("");
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");

  const { data: venturesData = [] } = useSWR<Venture[]>(
    `/api/ventures?includeTest=${testMode}`,
    fetcher
  );

  const { data: offices = [] } = useSWR<Office[]>(
    selectedVentureId ? `/api/offices?ventureId=${selectedVentureId}&includeTest=${testMode}` : null,
    fetcher
  );

  const logisticsVentures = venturesData.filter(
    (v) => v.type === "LOGISTICS"
  );

  const handleVentureChange = (ventureId: string) => {
    setSelectedVentureId(ventureId);
    setSelectedOfficeId("");
  };

  const filters: Record<string, string> = {};
  if (selectedVentureId) filters.ventureId = selectedVentureId;
  if (selectedOfficeId) filters.officeId = selectedOfficeId;

  if (roleLoading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }
  if (!authorized) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-100">
          Freight Sales & Margin KPIs
        </h1>

        <div className="flex gap-3">
          <select
            value={selectedVentureId}
            onChange={(e) => handleVentureChange(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Logistics Ventures</option>
            {logisticsVentures.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name}
              </option>
            ))}
          </select>

          {selectedVentureId && offices.length > 0 && (
            <select
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Offices</option>
              {offices.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnalyticsChart
          metric="freight_margin_pct"
          chartType="line"
          filters={filters}
        />
        <AnalyticsChart
          metric="freight_rpm"
          chartType="area"
          filters={filters}
        />
        <AnalyticsChart
          metric="freight_gross_revenue"
          chartType="bar"
          filters={filters}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnalyticsChart
          metric="freight_loads_count"
          chartType="bar"
          filters={filters}
        />
        <AnalyticsChart
          metric="freight_lost_load_pct"
          chartType="line"
          filters={filters}
        />
      </div>
    </div>
  );
}

FreightKpiPage.title = "Freight KPIs";

export default FreightKpiPage;
