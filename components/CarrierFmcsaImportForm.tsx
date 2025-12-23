import React, { useState } from "react";

type FmcsaType = "MC" | "DOT";

type NormalizedCarrierStatus =
  | "ACTIVE"
  | "OUT_OF_SERVICE"
  | "NOT_AUTHORIZED"
  | "INACTIVE"
  | "UNKNOWN";

interface FetchedCarrier {
  name: string;
  legalName: string | null;
  dbaName: string | null;
  dotNumber: string | null;
  mcNumber: string | null;
  ein: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  powerUnits: number | null;
  drivers: number | null;
  operatingStatus: string | null;
  entityType: string | null;
  isPassengerCarrier: boolean | null;
  safetyRating: string | null;
  safetyRatingDate: string | null;
  mcs150Outdated: boolean | null;
  oosDate: string | null;
  issScore: number | null;
  bipdInsuranceOnFile: number | null;
  bipdInsuranceRequired: boolean | null;
  bipdRequiredAmount: number | null;
  cargoInsuranceOnFile: number | null;
  cargoInsuranceRequired: boolean | null;
  bondInsuranceOnFile: number | null;
  bondInsuranceRequired: boolean | null;
  crashTotal: number | null;
  fatalCrash: number | null;
  injCrash: number | null;
  towawayCrash: number | null;
  driverInsp: number | null;
  driverOosInsp: number | null;
  driverOosRate: number | null;
  driverOosRateNationalAverage: number | null;
  vehicleInsp: number | null;
  vehicleOosInsp: number | null;
  vehicleOosRate: number | null;
  vehicleOosRateNationalAverage: number | null;
  hazmatInsp: number | null;
  hazmatOosInsp: number | null;
  hazmatOosRate: number | null;
  hazmatOosRateNationalAverage: number | null;
  statusText: string | null;
  normalizedStatus: NormalizedCarrierStatus;
}

interface Props {
  onCarrierSaved?: (carrier: any) => void;
}

export default function CarrierFmcsaImportForm({ onCarrierSaved }: Props) {
  const [type, setType] = useState<FmcsaType>("DOT");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState<FetchedCarrier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFetched(null);
    setSaveMessage(null);

    if (!value.trim()) {
      setError("Please enter a valid MC or DOT number.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/logistics/fmcsa-carrier-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || "Failed to lookup carrier.";
        const details = data.details ? ` (${data.details})` : "";
        throw new Error(errorMsg + details);
      }

      setFetched(data.carrier);
    } catch (err: any) {
      setError(err.message || "Failed to lookup carrier.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fetched) return;
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/logistics/carriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fetched),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save carrier.");
      }

      setSaveMessage(`Carrier saved: ${data.carrier.name}`);
      setFetched(null);
      setValue("");
      onCarrierSaved?.(data.carrier);
    } catch (err: any) {
      setError(err.message || "Failed to save carrier.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFetched(null);
    setValue("");
    setError(null);
    setSaveMessage(null);
  };

  const isOutOfService =
    fetched?.normalizedStatus === "OUT_OF_SERVICE" ||
    (fetched?.statusText || "").toLowerCase().includes("out of service");

  const isActive = fetched?.normalizedStatus === "ACTIVE";

  const getStatusBadgeClass = () => {
    if (isOutOfService) return "bg-red-100 text-red-700";
    if (isActive) return "bg-green-100 text-green-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const getSafetyRatingBadge = (rating: string | null) => {
    if (!rating) return null;
    const r = rating.toLowerCase();
    if (r === "satisfactory") return "bg-green-100 text-green-700";
    if (r === "conditional") return "bg-yellow-100 text-yellow-700";
    if (r === "unsatisfactory") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const getOosRateBadge = (rate: number | null, avg: number | null) => {
    if (rate === null) return "bg-gray-100 text-gray-600";
    if (avg === null) return "bg-gray-100 text-gray-600";
    if (rate <= avg * 0.5) return "bg-green-100 text-green-700";
    if (rate <= avg) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const formatCurrency = (val: number | null) => {
    if (val === null) return "—";
    return `$${val.toLocaleString()}k`;
  };

  const formatPercent = (val: number | null) => {
    if (val === null) return "—";
    return `${val.toFixed(2)}%`;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-lg text-gray-900 mb-4">
        Import Carrier from FMCSA
      </h3>

      <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-28">
          <label className="block text-xs text-gray-600 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FmcsaType)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
          >
            <option value="DOT">DOT</option>
            <option value="MC">MC</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">
            {type} Number
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400"
            placeholder={type === "DOT" ? "e.g. 1234567" : "e.g. 987654"}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {loading ? "Looking up..." : "Fetch from FMCSA"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {saveMessage && (
        <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">
          {saveMessage}
        </div>
      )}

      {fetched && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-gray-900">
              FMCSA Carrier Preview
            </h4>
            <div className="flex items-center gap-2">
              {fetched.safetyRating && (
                <span className={`text-xs px-2 py-1 rounded font-medium ${getSafetyRatingBadge(fetched.safetyRating)}`}>
                  Safety: {fetched.safetyRating}
                </span>
              )}
              {fetched.statusText && (
                <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusBadgeClass()}`}>
                  {fetched.statusText}
                </span>
              )}
            </div>
          </div>

          {isOutOfService && (
            <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-700 font-medium">
                This carrier is marked as OUT OF SERVICE in FMCSA. System policy: this carrier cannot be onboarded.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Info</h5>
                <div>
                  <span className="text-gray-500">Legal Name:</span>{" "}
                  <span className="text-gray-900 font-medium">{fetched.legalName || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">DBA:</span>{" "}
                  <span className="text-gray-900">{fetched.dbaName || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Entity Type:</span>{" "}
                  <span className="text-gray-900">{fetched.entityType || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Passenger Carrier:</span>{" "}
                  <span className="text-gray-900">{fetched.isPassengerCarrier === true ? "Yes" : fetched.isPassengerCarrier === false ? "No" : "—"}</span>
                </div>
              </div>

              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Identifiers</h5>
                <div>
                  <span className="text-gray-500">DOT#:</span>{" "}
                  <span className="text-gray-900 font-medium">{fetched.dotNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">MC#:</span>{" "}
                  <span className="text-gray-900">{fetched.mcNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">EIN:</span>{" "}
                  <span className="text-gray-900">{fetched.ein || "—"}</span>
                </div>
              </div>

              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fleet Size</h5>
                <div>
                  <span className="text-gray-500">Power Units:</span>{" "}
                  <span className="text-gray-900 font-medium">{fetched.powerUnits ?? "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Drivers:</span>{" "}
                  <span className="text-gray-900">{fetched.drivers ?? "—"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</h5>
                <div>
                  <span className="text-gray-500">Phone:</span>{" "}
                  <span className="text-gray-900">{fetched.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{" "}
                  <span className="text-gray-900">{fetched.email || "—"}</span>
                </div>
              </div>

              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</h5>
                <div className="text-gray-900">
                  {[
                    fetched.addressLine1,
                    fetched.city,
                    fetched.state,
                    fetched.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2 bg-blue-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">BIPD Insurance</h5>
                <div>
                  <span className="text-gray-500">On File:</span>{" "}
                  <span className="text-gray-900 font-medium">{formatCurrency(fetched.bipdInsuranceOnFile)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Required:</span>{" "}
                  <span className="text-gray-900">{formatCurrency(fetched.bipdRequiredAmount)}</span>
                </div>
              </div>

              <div className="space-y-2 bg-blue-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Cargo Insurance</h5>
                <div>
                  <span className="text-gray-500">On File:</span>{" "}
                  <span className="text-gray-900 font-medium">{formatCurrency(fetched.cargoInsuranceOnFile)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Required:</span>{" "}
                  <span className="text-gray-900">{fetched.cargoInsuranceRequired === true ? "Yes" : fetched.cargoInsuranceRequired === false ? "No" : "—"}</span>
                </div>
              </div>

              <div className="space-y-2 bg-blue-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Bond Insurance</h5>
                <div>
                  <span className="text-gray-500">On File:</span>{" "}
                  <span className="text-gray-900 font-medium">{formatCurrency(fetched.bondInsuranceOnFile)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Required:</span>{" "}
                  <span className="text-gray-900">{fetched.bondInsuranceRequired === true ? "Yes" : fetched.bondInsuranceRequired === false ? "No" : "—"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2 bg-orange-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Crash History (24 mo)</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Total:</span>{" "}
                    <span className="text-gray-900 font-medium">{fetched.crashTotal ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fatal:</span>{" "}
                    <span className={`font-medium ${(fetched.fatalCrash ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}>
                      {fetched.fatalCrash ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Injury:</span>{" "}
                    <span className={`font-medium ${(fetched.injCrash ?? 0) > 0 ? "text-orange-600" : "text-gray-900"}`}>
                      {fetched.injCrash ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Towaway:</span>{" "}
                    <span className="text-gray-900">{fetched.towawayCrash ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-purple-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Safety & Compliance</h5>
                <div>
                  <span className="text-gray-500">Safety Rating:</span>{" "}
                  {fetched.safetyRating ? (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${getSafetyRatingBadge(fetched.safetyRating)}`}>
                      {fetched.safetyRating}
                    </span>
                  ) : (
                    <span className="text-gray-900">Not Rated</span>
                  )}
                  {fetched.safetyRatingDate && (
                    <span className="text-gray-500 text-xs ml-1">({fetched.safetyRatingDate})</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">MCS-150:</span>{" "}
                  <span className={fetched.mcs150Outdated === true ? "text-red-600 font-medium" : "text-gray-900"}>
                    {fetched.mcs150Outdated === true ? "Outdated" : fetched.mcs150Outdated === false ? "Current" : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">ISS Score:</span>{" "}
                  <span className="text-gray-900">{fetched.issScore ?? "—"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2 bg-slate-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Driver Inspections</h5>
                <div>
                  <span className="text-gray-500">Total:</span>{" "}
                  <span className="text-gray-900">{fetched.driverInsp ?? "—"}</span>
                  <span className="text-gray-400 mx-1">|</span>
                  <span className="text-gray-500">OOS:</span>{" "}
                  <span className="text-gray-900">{fetched.driverOosInsp ?? "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">OOS Rate:</span>{" "}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${getOosRateBadge(fetched.driverOosRate, fetched.driverOosRateNationalAverage)}`}>
                    {formatPercent(fetched.driverOosRate)}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  Nat&apos;l Avg: {formatPercent(fetched.driverOosRateNationalAverage)}
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Vehicle Inspections</h5>
                <div>
                  <span className="text-gray-500">Total:</span>{" "}
                  <span className="text-gray-900">{fetched.vehicleInsp ?? "—"}</span>
                  <span className="text-gray-400 mx-1">|</span>
                  <span className="text-gray-500">OOS:</span>{" "}
                  <span className="text-gray-900">{fetched.vehicleOosInsp ?? "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">OOS Rate:</span>{" "}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${getOosRateBadge(fetched.vehicleOosRate, fetched.vehicleOosRateNationalAverage)}`}>
                    {formatPercent(fetched.vehicleOosRate)}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  Nat&apos;l Avg: {formatPercent(fetched.vehicleOosRateNationalAverage)}
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Hazmat Inspections</h5>
                <div>
                  <span className="text-gray-500">Total:</span>{" "}
                  <span className="text-gray-900">{fetched.hazmatInsp ?? "—"}</span>
                  <span className="text-gray-400 mx-1">|</span>
                  <span className="text-gray-500">OOS:</span>{" "}
                  <span className="text-gray-900">{fetched.hazmatOosInsp ?? "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">OOS Rate:</span>{" "}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${getOosRateBadge(fetched.hazmatOosRate, fetched.hazmatOosRateNationalAverage)}`}>
                    {formatPercent(fetched.hazmatOosRate)}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  Nat&apos;l Avg: {formatPercent(fetched.hazmatOosRateNationalAverage)}
                </div>
              </div>
            </div>

            {fetched.operatingStatus && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Operating Authority</h5>
                <div className="text-sm text-gray-900">{fetched.operatingStatus}</div>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || isOutOfService}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
                isOutOfService
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {saving ? "Saving..." : isOutOfService ? "Cannot Save" : "Save Carrier"}
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
