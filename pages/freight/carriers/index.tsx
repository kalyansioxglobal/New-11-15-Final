import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CarrierFmcsaImportForm from "@/components/CarrierFmcsaImportForm";
import type { PageWithLayout } from "@/types/page";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

type CarrierDispatcher = {
  userId: number;
  name: string;
  email: string | null;
};

type Carrier = {
  id: number;
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  tmsCarrierCode: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  equipmentTypes: string | null;
  rating: number | null;
  active: boolean;
  complianceStatus: string;
  fmcsaStatus: string | null;
  dispatchers?: CarrierDispatcher[];
};

type CarrierCandidate = {
  id: number;
  mcNumber?: string | null;
  dotNumber?: string | null;
  tmsCarrierCode?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  equipmentTypes?: string | null;
  serviceAreas?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  homeZip?: string | null;
  totalScore: number;
  laneScoreRaw: number;
  onTimeScoreRaw: number;
  equipmentMatchPercent: number;
  profileCompletenessPercent: number;
  serviceAreaMatchPercent: number;
  originProximityPercent: number;
  laneRunCount: number;
  onTimeRate: number | null;
  lastLoadDate: string | null;
  regionRunCount: number;
  originPickupCount: number;
  isRecentlyActive: boolean;
  isNewCarrier: boolean;
  hasLaneHistory: boolean;
  isNearOrigin: boolean;
};

type CitySuggestion = {
  label: string;
  city: string;
  state: string;
  zip: string;
  loadCount: number;
};

type SearchResult = {
  recommendedCarriers: CarrierCandidate[];
  newCarriers: CarrierCandidate[];
  meta: {
    query: { origin: string; destination: string; equipmentType: string | null };
    totalRecommended: number;
    totalNew: number;
  };
};

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const EQUIPMENT_TYPES = [
  "DRY_VAN",
  "REEFER",
  "FLATBED",
  "STEP_DECK",
  "POWER_ONLY",
  "BOX_TRUCK",
  "SPRINTER",
  "HOTSHOT",
];

function CityAutocomplete({
  label,
  type,
  city,
  state,
  zip,
  onSelect,
  onZipChange,
}: {
  label: string;
  type: "origin" | "destination";
  city: string;
  state: string;
  zip: string;
  onSelect: (city: string, state: string, zip: string) => void;
  onZipChange: (zip: string) => void;
}) {
  const [cityInput, setCityInput] = useState(city ? `${city}, ${state}` : "");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (city && state) {
      setCityInput(`${city}, ${state}`);
    }
  }, [city, state]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/freight/city-suggestions?q=${encodeURIComponent(query)}&type=${type}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCityInputChange = (value: string) => {
    setCityInput(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchSuggestions(value), 300);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (s: CitySuggestion) => {
    setCityInput(s.label);
    onSelect(s.city, s.state, s.zip);
    setShowSuggestions(false);
  };

  const handleZipChange = async (value: string) => {
    onZipChange(value);
    if (value.length >= 5) {
      try {
        const res = await fetch(`/api/freight/zip-lookup?zip=${encodeURIComponent(value)}&type=${type}`);
        const data = await res.json();
        if (data.location) {
          setCityInput(`${data.location.city}, ${data.location.state}`);
          onSelect(data.location.city, data.location.state, value);
        }
      } catch {}
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <div ref={wrapperRef} className="relative">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label} City/State
        </label>
        <input
          type="text"
          value={cityInput}
          onChange={(e) => handleCityInputChange(e.target.value)}
          onFocus={() => cityInput.length >= 2 && setShowSuggestions(true)}
          placeholder="e.g. Los Angeles, CA"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        {showSuggestions && (suggestions.length > 0 || loading) && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {loading && <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Loading...</div>}
            {!loading && suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectSuggestion(s)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-gray-700 flex justify-between items-center text-gray-900 dark:text-white"
              >
                <span>{s.label}</span>
                <span className="text-xs text-gray-400">{s.loadCount} loads</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label} ZIP
        </label>
        <input
          type="text"
          value={zip}
          onChange={(e) => handleZipChange(e.target.value)}
          placeholder="e.g. 90210"
          maxLength={10}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  );
}

function CarrierListTab() {
  const { data: session } = useSession();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncStats, setSyncStats] = useState<{ syncedCount: number; totalWithMc: number; lastSyncAt: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingCarrierId, setSyncingCarrierId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "CEO";

  const [filters, setFilters] = useState<{
    q?: string;
    active?: "true" | "false" | "";
    state?: string;
    dispatcherId?: number | null;
  }>({ active: "true", dispatcherId: null });

  const [dispatcherQuery, setDispatcherQuery] = useState("");
  const [dispatcherOptions, setDispatcherOptions] = useState<CarrierDispatcher[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.active) params.set("active", filters.active);
      if (filters.state) params.set("state", filters.state);
      if (filters.dispatcherId) params.set("dispatcherId", String(filters.dispatcherId));
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      try {
        const res = await fetch(`/api/freight/carriers?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load carriers");
        }
        const data = await res.json();
        if (!cancelled) {
          setCarriers(data.carriers || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 0);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err.message || "Failed to load carriers");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filters, refreshKey, page, pageSize]);

  const handleCarrierSaved = () => {
    setShowImport(false);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    if (!isAdmin) return;
    async function fetchStats() {
      try {
        const res = await fetch("/api/jobs/fmcsa-sync-stats");
        if (res.ok) {
          const data = await res.json();
          setSyncStats(data);
        }
      } catch {}
    }
    fetchStats();
  }, [isAdmin, refreshKey]);

  const handleFmcsaSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/jobs/fmcsa-sync", { method: "POST" });
      if (res.ok) {
        toast.success("FMCSA sync started successfully");
        setRefreshKey((k) => k + 1);
      } else {
        toast.error("Failed to start FMCSA sync");
      }
    } catch (err: any) {
      toast.error("Failed to start FMCSA sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleCarrierFmcsaSync = async (carrierId: number) => {
    if (syncingCarrierId) return;
    setSyncingCarrierId(carrierId);
    try {
      const res = await fetch(`/api/carriers/${carrierId}/fmcsa-refresh`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCarriers((prev) =>
          prev.map((c) =>
            c.id === carrierId
              ? { ...c, fmcsaStatus: data.snapshot?.status || c.fmcsaStatus }
              : c
          )
        );
        toast.success("Carrier FMCSA status updated");
      } else {
        toast.error("Failed to sync carrier FMCSA status");
      }
    } catch (err) {
      console.error("FMCSA sync error:", err);
      toast.error("Failed to sync carrier FMCSA status");
    } finally {
      setSyncingCarrierId(null);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * pageSize + 1}</span> to{" "}
          <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * pageSize, totalCount)}</span> of{" "}
          <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> carriers
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
              page === 1
                ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of{" "}
            <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
              page === totalPages
                ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          {isAdmin && syncStats && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
              {syncStats.syncedCount} synced
            </span>
          )}
          {isAdmin && (
            <button
              onClick={handleFmcsaSync}
              disabled={syncing}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                syncing
                  ? "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-amber-500 dark:bg-amber-600 text-white border-amber-500 dark:border-amber-600 hover:bg-amber-600 dark:hover:bg-amber-700"
              }`}
            >
              {syncing ? "Syncing..." : "Sync FMCSA"}
            </button>
          )}
          <button
            onClick={() => setShowImport(!showImport)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
              showImport
                ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                : "bg-emerald-600 dark:bg-emerald-700 text-white border-emerald-600 dark:border-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-800"
            }`}
          >
            {showImport ? "Hide Import" : "Import from FMCSA"}
          </button>
          <Link
            href="/freight/carriers/new"
            className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            + New Carrier
          </Link>
        </div>
      </div>

      {showImport && (
        <CarrierFmcsaImportForm onCarrierSaved={handleCarrierSaved} />
      )}

      <div className="flex flex-wrap gap-3 text-sm items-center">
        <input
          placeholder="Search name / MC / DOT / email / phone..."
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 w-80 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={filters.q || ""}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <input
            placeholder="Filter by dispatcher..."
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={dispatcherQuery}
            onChange={async (e) => {
              const value = e.target.value;
              setDispatcherQuery(value);
              if (!value.trim()) {
                setDispatcherOptions([]);
                setFilters((prev) => ({ ...prev, dispatcherId: null }));
                return;
              }
              try {
                const params = new URLSearchParams({ query: value.trim() });
                const res = await fetch(`/api/users/dispatcher-search?${params.toString()}`);
                const data = await res.json();
                setDispatcherOptions(data || []);
              } catch {
                setDispatcherOptions([]);
              }
            }}
          />
          {filters.dispatcherId && (
            <button
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() => {
                setFilters((prev) => ({ ...prev, dispatcherId: null }));
                setDispatcherQuery("");
              }}
            >
              Clear dispatcher filter
            </button>
          )}
        </div>

        {dispatcherOptions.length > 0 && dispatcherQuery && (
          <div className="mt-1 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-sm w-64 max-h-48 overflow-y-auto text-sm">
            {dispatcherOptions.map((d) => (
              <button
                key={d.userId}
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, dispatcherId: d.userId }));
                  setDispatcherQuery(d.name);
                  setDispatcherOptions([]);
                }}
              >
                <div className="font-medium">{d.name}</div>
                {d.email && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.email}</div>
                )}
              </button>
            ))}
          </div>
        )}

        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={filters.active || ""}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, active: e.target.value as any }))
          }
        >
          <option value="">All carriers</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>

        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={filters.state || ""}
          onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value }))}
        >
          <option value="">All states</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <Skeleton className="w-full h-[85vh]" />}

      {!loading && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">MC / DOT</th>
                  <th className="px-4 py-3 text-left font-semibold">Location</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold">Dispatchers</th>
                  <th className="px-4 py-3 text-left font-semibold">Equipment</th>
                  <th className="px-4 py-3 text-left font-semibold">Rating</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">FMCSA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {carriers.map((carrier) => (
                  <tr key={carrier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/freight/carriers/${carrier.id}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {carrier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {carrier.mcNumber && <div>MC# {carrier.mcNumber}</div>}
                      {carrier.dotNumber && <div>DOT# {carrier.dotNumber}</div>}
                      {carrier.tmsCarrierCode && <div className="text-xs text-gray-400 dark:text-gray-500">TMS: {carrier.tmsCarrierCode}</div>}
                      {!carrier.mcNumber && !carrier.dotNumber && !carrier.tmsCarrierCode && "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {carrier.city && carrier.state
                        ? `${carrier.city}, ${carrier.state}`
                        : carrier.state || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {carrier.email && <div className="truncate max-w-[180px]">{carrier.email}</div>}
                      {carrier.phone && <div>{carrier.phone}</div>}
                      {!carrier.email && !carrier.phone && "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[180px] truncate">
                      {carrier.dispatchers && carrier.dispatchers.length > 0
                        ? carrier.dispatchers.map((d) => d.name).join(", ")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[150px] truncate">
                      {carrier.equipmentTypes || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {carrier.rating ? (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          {"★".repeat(Math.min(Math.max(Math.round(carrier.rating / 20), 1), 5))}{"☆".repeat(Math.max(5 - Math.min(Math.max(Math.round(carrier.rating / 20), 1), 5), 0))}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          carrier.active
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {carrier.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {carrier.fmcsaStatus ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              carrier.fmcsaStatus === "ACTIVE"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                                : carrier.fmcsaStatus === "INACTIVE" || carrier.fmcsaStatus === "NOT_AUTHORIZED"
                                ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                                : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
                            }`}
                          >
                            {carrier.fmcsaStatus}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">Not synced</span>
                        )}
                        {carrier.mcNumber && (
                          <button
                            onClick={() => handleCarrierFmcsaSync(carrier.id)}
                            disabled={syncingCarrierId === carrier.id}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition ${
                              syncingCarrierId === carrier.id
                                ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                            }`}
                            title="Sync with FMCSA to check carrier standing"
                          >
                            {syncingCarrierId === carrier.id ? "..." : "Sync"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {carriers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="text-gray-400 dark:text-gray-500 text-3xl mb-3">🚛</div>
                      <h3 className="text-gray-700 dark:text-gray-200 font-medium mb-1">No Carriers Found</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        {filters.q || filters.state
                          ? "No carriers match your current filters. Try adjusting your search criteria."
                          : "No carriers in your book yet. Add carriers to improve load matching."}
                      </p>
                      {!filters.q && !filters.state && (
                        <Link
                          href="/freight/carriers/new"
                          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          + New Carrier
                        </Link>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </div>
      )}
    </div>
  );
}

function FindCarriersTab() {
  const [originCity, setOriginCity] = useState("");
  const [originState, setOriginState] = useState("");
  const [originZip, setOriginZip] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destState, setDestState] = useState("");
  const [destZip, setDestZip] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");

  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showNewCarriers, setShowNewCarriers] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originZip && !originCity) {
      toast.error("Please enter origin city or ZIP code");
      return;
    }
    if (!destZip && !destCity) {
      toast.error("Please enter destination city or ZIP code");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch("/api/freight/carrier-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originCity: originCity || null,
          originState: originState || null,
          originZip: originZip || null,
          destinationCity: destCity || null,
          destinationState: destState || null,
          destinationZip: destZip || null,
          equipmentType: equipmentType || null,
          pickupDate,
          weight: weight ? Number(weight) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }

      const data = await res.json();
      setResult(data);
      toast.success(`Found ${data.recommendedCarriers.length + data.newCarriers.length} carriers`);
    } catch (err: any) {
      toast.error(err.message || "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 50) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-gray-100 dark:bg-gray-800";
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Find carriers for your lane. Enter city/state OR ZIP code for origin and destination.
      </p>

      <form onSubmit={handleSearch} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CityAutocomplete
            label="Origin"
            type="origin"
            city={originCity}
            state={originState}
            zip={originZip}
            onSelect={(c, s, z) => { setOriginCity(c); setOriginState(s); setOriginZip(z); }}
            onZipChange={setOriginZip}
          />
          <CityAutocomplete
            label="Destination"
            type="destination"
            city={destCity}
            state={destState}
            zip={destZip}
            onSelect={(c, s, z) => { setDestCity(c); setDestState(s); setDestZip(z); }}
            onZipChange={setDestZip}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Equipment</label>
            <select
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Any equipment</option>
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pickup Date</label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Weight (lbs)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Optional"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Searching..." : "Search Carriers"}
            </button>
          </div>
        </div>
      </form>

      {searched && !loading && result && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{result.meta.query.origin}</span>
              <span className="mx-2">→</span>
              <span className="font-medium">{result.meta.query.destination}</span>
              {result.meta.query.equipmentType && (
                <span className="ml-2 text-gray-400">({result.meta.query.equipmentType})</span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-green-800 dark:text-green-400">Recommended Carriers</h2>
                <p className="text-xs text-green-600 dark:text-green-500">Carriers with lane history or based near origin</p>
              </div>
              <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                {result.recommendedCarriers.length} found
              </span>
            </div>
            
            {result.recommendedCarriers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                No carriers with history on this lane or based nearby
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {result.recommendedCarriers.map((c) => (
                  <div key={c.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Link href={`/freight/carriers/${c.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{c.name}</Link>
                          {c.mcNumber && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">MC# {c.mcNumber}</span>
                          )}
                          {c.tmsCarrierCode && (
                            <span className="text-xs text-gray-400">TMS: {c.tmsCarrierCode}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {c.hasLaneHistory ? (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">
                              Ran lane {c.laneRunCount}x
                            </span>
                          ) : c.isNearOrigin && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                              Based near origin
                            </span>
                          )}
                          {c.homeCity && c.homeState && (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                              Home: {c.homeCity}, {c.homeState}
                            </span>
                          )}
                          {c.originPickupCount > 0 && !c.hasLaneHistory && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
                              {c.originPickupCount} pickups from this area
                            </span>
                          )}
                          {c.isRecentlyActive && (
                            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                              Recently Active
                            </span>
                          )}
                        </div>
                        {c.equipmentTypes && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Equipment: {c.equipmentTypes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(c.totalScore)} ${getScoreColor(c.totalScore)}`}>
                          Score: {c.totalScore}
                        </div>
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
                            {c.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowNewCarriers(!showNewCarriers)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="text-left">
                <h2 className="font-semibold text-gray-700 dark:text-gray-200">Explore New Carriers</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Carriers without lane history - try them out!</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">
                  NEW
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {result.newCarriers.length} available
                </span>
                <span className="text-gray-400 dark:text-gray-500">{showNewCarriers ? "▲" : "▼"}</span>
              </div>
            </button>
            
            {showNewCarriers && (
              result.newCarriers.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No new carriers match this criteria
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {result.newCarriers.map((c) => (
                    <div key={c.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Link href={`/freight/carriers/${c.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{c.name}</Link>
                            {c.mcNumber && <span className="text-xs text-gray-400 dark:text-gray-500">MC# {c.mcNumber}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              c.profileCompletenessPercent >= 80 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                              c.profileCompletenessPercent >= 50 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                              "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                            }`}>
                              Profile: {c.profileCompletenessPercent}%
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              c.equipmentMatchPercent >= 80 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                              c.equipmentMatchPercent >= 50 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                              "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                            }`}>
                              Equipment: {c.equipmentMatchPercent >= 80 ? "Match" : c.equipmentMatchPercent >= 50 ? "Partial" : "Unknown"}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              c.serviceAreaMatchPercent >= 80 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                              c.serviceAreaMatchPercent >= 50 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                              "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                            }`}>
                              Service Area: {c.serviceAreaMatchPercent >= 80 ? "Covers Lane" : c.serviceAreaMatchPercent >= 50 ? "Partial" : "Unknown"}
                            </span>
                            {c.isRecentlyActive && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
                                Recently Active
                              </span>
                            )}
                          </div>
                          {c.equipmentTypes && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Equipment: {c.equipmentTypes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(c.totalScore)} ${getScoreColor(c.totalScore)}`}>
                            Score: {c.totalScore}
                          </div>
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
                              {c.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}

      {searched && !loading && !result && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No results found. Try adjusting your search criteria.
        </div>
      )}
    </div>
  );
}

type TabId = "list" | "find";

function CarriersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("list");

  useEffect(() => {
    const tabFromQuery = router.query.tab as TabId | undefined;
    if (tabFromQuery && (tabFromQuery === "list" || tabFromQuery === "find")) {
      setActiveTab(tabFromQuery);
    }
  }, [router.query.tab]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    router.replace({ pathname: router.pathname, query: { tab: tabId } }, undefined, { shallow: true });
  };

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "list", label: "Carrier List", icon: "🚛" },
    { id: "find", label: "Find Carriers", icon: "🔍" },
  ];

  return (
    <div className="p-6 space-y-4 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Carriers</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your carrier book and find carriers for your lanes.
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "list" && <CarrierListTab />}
      {activeTab === "find" && <FindCarriersTab />}
    </div>
  );
}

(CarriersPage as PageWithLayout).title = "Carriers";
export default CarriersPage;
