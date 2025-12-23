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
  if (value === null || value === undefined) return "text-gray-400";
  if (value >= 0) return "text-green-600";
  return "text-red-600";
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
    <div className="rounded-lg border p-4 shadow-sm bg-white hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="font-semibold text-lg">{hotel.name}</h2>
          {hotel.city && hotel.state && (
            <p className="text-sm text-gray-500">
              {hotel.city}, {hotel.state}
              {hotel.rooms && <span className="ml-2 text-xs">({hotel.rooms} rooms)</span>}
            </p>
          )}
        </div>
        <Link
          href={`/hotels/${hotel.hotelId}`}
          className="text-xs text-blue-600 hover:underline"
        >
          Details
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded p-2">
          <p className="text-gray-500 text-xs">Room Rev MTD</p>
          <p className="font-semibold">{formatCurrency(hotel.MTD)}</p>
          <p className={`text-xs ${pctClass(hotel.MTD_DropPct)}`}>
            {hotel.MTD_DropPct !== null ? `${formatPct(hotel.MTD_DropPct)} vs LY` : "-"}
          </p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-gray-500 text-xs">Room Rev YTD</p>
          <p className="font-semibold">{formatCurrency(hotel.YTD)}</p>
          <p className={`text-xs ${pctClass(hotel.YTD_DropPct)}`}>
            {hotel.YTD_DropPct !== null ? `${formatPct(hotel.YTD_DropPct)} vs LY` : "-"}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm border-t pt-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs">ADR MTD / YTD</p>
            <p className="font-medium">
              {formatCurrency(hotel.ADR_MTD)}
              <span className="text-xs text-gray-400 ml-1">
                (YTD: {formatCurrency(hotel.ADR_YTD)})
              </span>
            </p>
          </div>
          <div className="text-right text-xs">
            <p className={pctClass(hotel.ADR_MTD_ChangePct)}>
              {hotel.ADR_MTD_ChangePct !== null ? `${formatPct(hotel.ADR_MTD_ChangePct)} MTD` : "-"}
            </p>
            <p className={pctClass(hotel.ADR_YTD_ChangePct)}>
              {hotel.ADR_YTD_ChangePct !== null ? `${formatPct(hotel.ADR_YTD_ChangePct)} YTD` : "-"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs">Occ% MTD / YTD</p>
            <p className="font-medium">
              {hotel.OCC_MTD !== null ? `${formatNumber(hotel.OCC_MTD)}%` : "-"}
              <span className="text-xs text-gray-400 ml-1">
                (YTD: {hotel.OCC_YTD !== null ? `${formatNumber(hotel.OCC_YTD)}%` : "-"})
              </span>
            </p>
          </div>
          <div className="text-right text-xs">
            <p className={pctClass(hotel.OCC_MTD_ChangePct)}>
              {hotel.OCC_MTD_ChangePct !== null ? `${formatPct(hotel.OCC_MTD_ChangePct)} MTD` : "-"}
            </p>
            <p className={pctClass(hotel.OCC_YTD_ChangePct)}>
              {hotel.OCC_YTD_ChangePct !== null ? `${formatPct(hotel.OCC_YTD_ChangePct)} YTD` : "-"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs">RevPAR MTD / YTD</p>
            <p className="font-medium">
              {formatCurrency(hotel.REVPAR_MTD)}
              <span className="text-xs text-gray-400 ml-1">
                (YTD: {formatCurrency(hotel.REVPAR_YTD)})
              </span>
            </p>
          </div>
          <div className="text-right text-xs">
            <p className={pctClass(hotel.REVPAR_MTD_ChangePct)}>
              {hotel.REVPAR_MTD_ChangePct !== null ? `${formatPct(hotel.REVPAR_MTD_ChangePct)} MTD` : "-"}
            </p>
            <p className={pctClass(hotel.REVPAR_YTD_ChangePct)}>
              {hotel.REVPAR_YTD_ChangePct !== null ? `${formatPct(hotel.REVPAR_YTD_ChangePct)} YTD` : "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
