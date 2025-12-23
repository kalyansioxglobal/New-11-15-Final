import React, { useEffect, useState } from "react";
import HotelSnapshotCard from "../../components/HotelSnapshotCard";
import { useTestMode } from "@/contexts/TestModeContext";

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

function HotelSnapshotPage() {
  const [hotels, setHotels] = useState<HotelSnapshot[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const { testMode } = useTestMode();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("includeTest", testMode ? "true" : "false");
    fetch(`/api/hotels/snapshot?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setHotels(data.snapshot || []);
        setTotals(data.totals || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [testMode]);

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
    if (pct === null) return "text-gray-400";
    return pct >= 0 ? "text-green-600" : "text-red-600";
  };

  const formatPct = (pct: number | null) => {
    if (pct === null) return "-";
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Hotel Revenue Snapshot</h1>
        <p className="text-sm text-gray-500 mt-1">
          MTD and YTD revenue, ADR, Occupancy, and RevPAR comparisons vs last year
        </p>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading snapshot...</div>
      ) : (
        <>
          {totals && (
            <div className="bg-white border rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-lg mb-3">Portfolio Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">MTD Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.MTD)}</p>
                  <p className={`text-xs ${pctClass(totals.MTD_DropPct)}`}>
                    {formatPct(totals.MTD_DropPct)} vs LY
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">LY MTD</p>
                  <p className="text-xl font-bold text-gray-600">
                    {formatCurrency(totals.LYMTD)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">YTD Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.YTD)}</p>
                  <p className={`text-xs ${pctClass(totals.YTD_DropPct)}`}>
                    {formatPct(totals.YTD_DropPct)} vs LY
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">LY YTD</p>
                  <p className="text-xl font-bold text-gray-600">
                    {formatCurrency(totals.LYYTD)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Portfolio ADR (MTD)</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.ADR_MTD)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Portfolio ADR (YTD)</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.ADR_YTD)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t text-sm">
                <div>
                  <p className="text-xs text-gray-500">Rooms Sold (MTD)</p>
                  <p className="text-lg font-semibold">{totals.totalRoomsSold_MTD.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rooms Sold (YTD)</p>
                  <p className="text-lg font-semibold">{totals.totalRoomsSold_YTD.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Properties</p>
                  <p className="text-lg font-semibold">{hotels.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Rooms</p>
                  <p className="text-lg font-semibold">
                    {hotels.reduce((sum, h) => sum + (h.rooms || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {hotels.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-gray-50">
              <div className="text-gray-400 text-3xl mb-3">🏨</div>
              <h3 className="text-gray-700 font-medium mb-1">No Hotels Found</h3>
              <p className="text-sm text-gray-500">
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
