import React, { useEffect } from "react";
import HotelSnapshotCard from "../../components/HotelSnapshotCard";
import { useTestMode } from "@/contexts/TestModeContext";
import { Skeleton } from "@/components/ui/Skeleton";
import useSWR from "swr";
import toast from "react-hot-toast";

interface HotelSnapshot {
  hotelId: number;
  name: string;
  code?: string;
  city?: string;
  state?: string;
  rooms?: number;
  venture?: { id: number; name: string };
  MTD: number;
  YTD: number;
  LYMTD: number;
  LYYTD: number;
  MTD_DropPct: number | null;
  YTD_DropPct: number | null;
  ADR_MTD: number | null;
  ADR_YTD: number | null;
  ADR_LYMTD: number | null;
  ADR_LYYTD: number | null;
  ADR_MTD_ChangePct: number | null;
  ADR_YTD_ChangePct: number | null;
  OCC_MTD: number | null;
  OCC_YTD: number | null;
  OCC_LYMTD: number | null;
  OCC_LYYTD: number | null;
  OCC_MTD_ChangePct: number | null;
  OCC_YTD_ChangePct: number | null;
  REVPAR_MTD: number | null;
  REVPAR_YTD: number | null;
  REVPAR_LYMTD: number | null;
  REVPAR_LYYTD: number | null;
  REVPAR_MTD_ChangePct: number | null;
  REVPAR_YTD_ChangePct: number | null;
}

interface Totals {
  MTD: number;
  YTD: number;
  LYMTD: number;
  LYYTD: number;
  MTD_DropPct: number | null;
  YTD_DropPct: number | null;
  ADR_MTD: number | null;
  ADR_YTD: number | null;
  totalRoomsSold_MTD: number;
  totalRoomsSold_YTD: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }
  return res.json();
};

function HotelSnapshotPage() {
  const { testMode } = useTestMode();

  const { data, error, isLoading } = useSWR<{
    snapshot: HotelSnapshot[];
    totals: Totals | null;
  }>(
    `/api/hotels/snapshot?includeTest=${testMode ? "true" : "false"}`,
    fetcher
  );

  const hotels = data?.snapshot || [];
  const totals = data?.totals || null;

  useEffect(() => {
    if (error) {
      toast.error("Failed to load hotel snapshot data. Please try again.");
    }
  }, [error]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const pctClass = (pct: number | null) => {
    if (pct === null) return "text-gray-400 dark:text-gray-500";
    return pct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  const formatPct = (pct: number | null) => {
    if (pct === null) return "-";
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Hotel Revenue Snapshot</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          MTD and YTD revenue, ADR, Occupancy, and RevPAR comparisons vs last year
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-red-200 dark:border-red-800 rounded-xl bg-red-50 dark:bg-red-900/20">
          <div className="text-red-400 text-3xl mb-3">⚠️</div>
          <h3 className="text-red-700 dark:text-red-400 font-medium mb-1">Error Loading Data</h3>
          <p className="text-sm text-red-600 dark:text-red-500">
            Failed to load hotel snapshot data. Please try again later.
          </p>
        </div>
      ) : (
        <>
          {totals && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 md:p-6 mb-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Portfolio Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">MTD Revenue</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.MTD)}</p>
                  <p className={`text-xs mt-1 ${pctClass(totals.MTD_DropPct)}`}>
                    {formatPct(totals.MTD_DropPct)} vs LY
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">LY MTD</p>
                  <p className="text-xl font-bold text-gray-600 dark:text-gray-300">
                    {formatCurrency(totals.LYMTD)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">YTD Revenue</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.YTD)}</p>
                  <p className={`text-xs mt-1 ${pctClass(totals.YTD_DropPct)}`}>
                    {formatPct(totals.YTD_DropPct)} vs LY
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">LY YTD</p>
                  <p className="text-xl font-bold text-gray-600 dark:text-gray-300">
                    {formatCurrency(totals.LYYTD)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Portfolio ADR (MTD)</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.ADR_MTD)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Portfolio ADR (YTD)</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.ADR_YTD)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rooms Sold (MTD)</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{totals.totalRoomsSold_MTD.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rooms Sold (YTD)</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{totals.totalRoomsSold_YTD.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Properties</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{hotels.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Rooms</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {hotels.reduce((sum, h) => sum + (h.rooms || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {hotels.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <div className="text-gray-400 dark:text-gray-500 text-3xl mb-3">🏨</div>
              <h3 className="text-gray-700 dark:text-gray-300 font-medium mb-1">No Hotels Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No active hotel properties with KPI data available.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hotels.map((hotel) => (
                <HotelSnapshotCard key={hotel.hotelId} hotel={hotel} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

HotelSnapshotPage.title = "Hotel Snapshot";

export default HotelSnapshotPage;
