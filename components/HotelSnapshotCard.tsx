import React from "react";
import Link from "next/link";

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

interface Props {
  hotel: HotelSnapshot;
}

function pctClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-gray-400 dark:text-gray-500";
  if (value >= 0) return "text-green-600 dark:text-green-400";
  return "text-red-600 dark:text-red-400";
}

function pctBgClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return "bg-gray-50 dark:bg-slate-700/30";
  if (value >= 0) return "bg-green-50 dark:bg-green-900/20";
  return "bg-red-50 dark:bg-red-900/20";
}

function TrendArrow({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-gray-400 dark:text-gray-500">–</span>;
  if (value > 0) return <span className="text-green-600 dark:text-green-400">▲</span>;
  if (value < 0) return <span className="text-red-600 dark:text-red-400">▼</span>;
  return <span className="text-gray-400 dark:text-gray-500">–</span>;
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(decimals);
}

export default function HotelSnapshotCard({ hotel }: Props) {
  return (
    <div className="group relative rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 overflow-hidden">
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 dark:from-blue-600 dark:via-blue-500 dark:to-blue-600"></div>
      
      <div className="p-5">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white truncate">{hotel.name}</h2>
              {hotel.venture && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 whitespace-nowrap">
                  {hotel.venture.name}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {hotel.city && hotel.state && (
                <p className="text-gray-500 dark:text-gray-400">
                  📍 {hotel.city}, {hotel.state}
                </p>
              )}
              {hotel.rooms && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                  {hotel.rooms} rooms
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/hospitality/hotels/${hotel.hotelId}`}
            className="ml-2 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors whitespace-nowrap"
          >
            View Details →
          </Link>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`${pctBgClass(hotel.MTD_DropPct)} rounded-lg p-3 border border-gray-200 dark:border-slate-700 transition-colors`}>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Room Revenue MTD</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white mb-1.5">{formatCurrency(hotel.MTD)}</p>
            {hotel.MTD_DropPct !== null ? (
              <div className="flex items-center gap-1">
                <TrendArrow value={hotel.MTD_DropPct} />
                <p className={`text-xs font-semibold ${pctClass(hotel.MTD_DropPct)}`}>
                  {formatPct(hotel.MTD_DropPct)} vs LY
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500">No comparison data</p>
            )}
          </div>
          <div className={`${pctBgClass(hotel.YTD_DropPct)} rounded-lg p-3 border border-gray-200 dark:border-slate-700 transition-colors`}>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">Room Revenue YTD</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white mb-1.5">{formatCurrency(hotel.YTD)}</p>
            {hotel.YTD_DropPct !== null ? (
              <div className="flex items-center gap-1">
                <TrendArrow value={hotel.YTD_DropPct} />
                <p className={`text-xs font-semibold ${pctClass(hotel.YTD_DropPct)}`}>
                  {formatPct(hotel.YTD_DropPct)} vs LY
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500">No comparison data</p>
            )}
          </div>
        </div>

        {/* KPI Metrics Section */}
        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          {/* ADR */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Average Daily Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {formatCurrency(hotel.ADR_MTD)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">MTD</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formatCurrency(hotel.ADR_YTD)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">YTD</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 ml-3">
              {hotel.ADR_MTD_ChangePct !== null && (
                <div className="flex items-center gap-1">
                  <TrendArrow value={hotel.ADR_MTD_ChangePct} />
                  <span className={`text-xs font-semibold ${pctClass(hotel.ADR_MTD_ChangePct)}`}>
                    {formatPct(hotel.ADR_MTD_ChangePct)}
                  </span>
                </div>
              )}
              {hotel.ADR_YTD_ChangePct !== null && (
                <div className="flex items-center gap-1">
                  <TrendArrow value={hotel.ADR_YTD_ChangePct} />
                  <span className={`text-xs font-semibold ${pctClass(hotel.ADR_YTD_ChangePct)}`}>
                    {formatPct(hotel.ADR_YTD_ChangePct)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Occupancy */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Occupancy Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {hotel.OCC_MTD !== null ? `${formatNumber(hotel.OCC_MTD)}%` : "-"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">MTD</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {hotel.OCC_YTD !== null ? `${formatNumber(hotel.OCC_YTD)}%` : "-"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">YTD</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 ml-3">
              {hotel.OCC_MTD_ChangePct !== null && (
                <div className="flex items-center gap-1">
                  <TrendArrow value={hotel.OCC_MTD_ChangePct} />
                  <span className={`text-xs font-semibold ${pctClass(hotel.OCC_MTD_ChangePct)}`}>
                    {formatPct(hotel.OCC_MTD_ChangePct)}
                  </span>
                </div>
              )}
              {hotel.OCC_YTD_ChangePct !== null && (
                <div className="flex items-center gap-1">
                  <TrendArrow value={hotel.OCC_YTD_ChangePct} />
                  <span className={`text-xs font-semibold ${pctClass(hotel.OCC_YTD_ChangePct)}`}>
                    {formatPct(hotel.OCC_YTD_ChangePct)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RevPAR */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Revenue Per Available Room</p>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {formatCurrency(hotel.REVPAR_MTD)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">MTD</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formatCurrency(hotel.REVPAR_YTD)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">YTD</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 ml-3">
              {hotel.REVPAR_MTD_ChangePct !== null && (
                <div className="flex items-center gap-1">
                  <TrendArrow value={hotel.REVPAR_MTD_ChangePct} />
                  <span className={`text-xs font-semibold ${pctClass(hotel.REVPAR_MTD_ChangePct)}`}>
                    {formatPct(hotel.REVPAR_MTD_ChangePct)}
                  </span>
                </div>
              )}
              {hotel.REVPAR_YTD_ChangePct !== null && (
                <div className="flex items-center gap-1">
                  <TrendArrow value={hotel.REVPAR_YTD_ChangePct} />
                  <span className={`text-xs font-semibold ${pctClass(hotel.REVPAR_YTD_ChangePct)}`}>
                    {formatPct(hotel.REVPAR_YTD_ChangePct)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
