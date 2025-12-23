import React, { useEffect, useMemo, useState } from "react";
import { GetServerSideProps } from "next";
import { PageWithLayout } from "@/types/page";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

interface MyIncentiveDaily {
  date: string;
  ventureId: number;
  ventureName: string | null;
  amount: number;
  currency: string;
  breakdown: {
    rules: { ruleId: number; amount: number }[];
  } | null;
}

interface GamificationResponse {
  userId: number;
  window: { from: string; to: string };
  streaks: { current: number; longest: number };
  totals: { amount: number; days: number };
  rank: { rank: number; totalUsers: number; percentile: number };
  badges: string[];
}

const MyIncentivesPage: PageWithLayout = () => {
  const [items, setItems] = useState<MyIncentiveDaily[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitial, setIsInitial] = useState(true);

  const [quickRange, setQuickRange] = useState<"7d" | "30d" | null>("30d");

  const [gamification, setGamification] = useState<GamificationResponse | null>(null);
  const [gamificationLoading, setGamificationLoading] = useState(false);
  const [gamificationError, setGamificationError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize with last 30 days on first load
    const now = new Date();
    const toDay = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 29);
    const fromDay = fromDate.toISOString().slice(0, 10);
    setFrom(fromDay);
    setTo(toDay);
    setIsInitial(false);
  }, []);

  const loadData = async (overrideFrom?: string, overrideTo?: string) => {
    const f = overrideFrom ?? from;
    const t = overrideTo ?? to;
    if (!f || !t) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("from", f);
      params.set("to", t);
      const res = await fetch(`/api/incentives/my-daily?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load incentives");
      }
      setItems(json.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load incentives");
    } finally {
      setLoading(false);
    }
  };

  const loadGamification = async (overrideFrom?: string, overrideTo?: string) => {
    const f = overrideFrom ?? from;
    const t = overrideTo ?? to;
    if (!f || !t) return;

    setGamificationLoading(true);
    setGamificationError(null);
    try {
      const params = new URLSearchParams();
      params.set("from", f);
      params.set("to", t);
      const res = await fetch(`/api/incentives/gamification/my?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load gamification data");
      }
      setGamification(json);
    } catch (e: any) {
      setGamificationError(e?.message || "Failed to load gamification data");
    } finally {
      setGamificationLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitial && from && to) {
      loadData();
      loadGamification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + (i.amount ?? 0), 0),
    [items],
  );

  const nonZeroDays = useMemo(
    () => items.filter((i) => (i.amount ?? 0) > 0).length,
    [items],
  );

  const [selected, setSelected] = useState<MyIncentiveDaily | null>(null);

  const applyQuickRange = (preset: "7d" | "30d") => {
    const now = new Date();
    const toDay = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - (preset === "7d" ? 6 : 29));
    const fromDay = fromDate.toISOString().slice(0, 10);
    setQuickRange(preset);
    setFrom(fromDay);
    setTo(toDay);
  };

  const clearFilters = () => {
    setQuickRange(null);
    setFrom("");
    setTo("");
    setItems([]);
    setGamification(null);
  };

  const hasBadge = (name: string) => gamification?.badges.includes(name) ?? false;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Incentives</h1>
          <p className="text-xs text-gray-500 mt-1">
            Read-only view of your daily incentives over a chosen period.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 border border-red-300 rounded px-3 py-2 bg-red-50">
          {error}
        </div>
      )}

      {/* Gamification Panel */}
      <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="font-semibold text-gray-700 uppercase tracking-wide">
            Gamification
          </div>
          {gamificationError && (
            <div className="text-[10px] text-red-600">{gamificationError}</div>
          )}
        </div>
        {gamificationLoading ? (
          <div className="text-xs text-gray-500">Loading gamification…</div>
        ) : gamification ? (
          <>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <div className="text-xs text-gray-500">Current streak</div>
                <div className="text-lg font-semibold">
                  {gamification.streaks.current} days
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Longest streak</div>
                <div className="text-lg font-semibold">
                  {gamification.streaks.longest} days
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Venture rank</div>
                <div className="text-sm font-semibold">
                  Top {gamification.rank.percentile}%
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Badges</div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {[
                  "Daily Starter",
                  "Consistent Performer",
                  "Top Earner",
                ].map((badge) => {
                  const active = hasBadge(badge);
                  return (
                    <span
                      key={badge}
                      className={`px-2 py-0.5 rounded-full border ${
                        active
                          ? "border-yellow-500 bg-yellow-50 text-yellow-800"
                          : "border-gray-200 bg-gray-50 text-gray-400"
                      }`}
                    >
                      {badge}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-500 mb-1">Total incentives (window)</div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-green-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (gamification.totals.amount > 0
                          ? (gamification.totals.amount /
                              Math.max(gamification.totals.amount, totalAmount || 1)) *
                            100
                          : 0) || 0,
                      ).toFixed(0)}%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-gray-600">
                  {gamification.totals.amount.toFixed(2)} total in this window.
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Days with incentives</div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (gamification.totals.days > 0
                          ? (gamification.totals.days /
                              Math.max(gamification.totals.days, nonZeroDays || 1)) *
                            100
                          : 0) || 0,
                      ).toFixed(0)}%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-gray-600">
                  {gamification.totals.days} days with incentives.
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-500">
            Gamification data will appear once you have incentives in this window.
          </div>
        )}
      </div>

      <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Quick range:</span>
            <button
              type="button"
              onClick={() => applyQuickRange("7d")}
              className={`px-2 py-0.5 rounded-full border text-xs ${
                quickRange === "7d"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-700 bg-white"
              }`}
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange("30d")}
              className={`px-2 py-0.5 rounded-full border text-xs ${
                quickRange === "30d"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-700 bg-white"
              }`}
            >
              Last 30 days
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                loadData();
                loadGamification();
              }}
              className="px-2 py-1 rounded border border-gray-300 text-xs text-gray-700 bg-white"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-2 py-1 rounded border border-gray-200 text-xs text-gray-500 bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm pt-2">
          <div>
            <div className="text-xs text-gray-500">Total incentives in this period</div>
            <div className="text-lg font-semibold">
              {totalAmount.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Days with non-zero incentives</div>
            <div className="text-lg font-semibold">{nonZeroDays}</div>
          </div>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
          Daily Incentives
        </div>
        {loading ? (
          <div className="text-xs text-gray-500">Loading…</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-[11px] text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="py-1.5 px-2 border-b">Date</th>
                  <th className="py-1.5 px-2 border-b">Venture</th>
                  <th className="py-1.5 px-2 border-b text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr
                    key={`${i.ventureId}-${i.date}`}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelected(i)}
                  >
                    <td className="py-1.5 px-2">
                      {i.date}
                    </td>
                    <td className="py-1.5 px-2">
                      {i.ventureName || `Venture #${i.ventureId}`}
                    </td>
                    <td className="py-1.5 px-2 text-right font-semibold">
                      {i.amount.toFixed(2)} {i.currency}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-3 text-center text-xs text-gray-500"
                    >
                      No incentives recorded for this period yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 text-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs text-gray-500">Date</div>
                <div className="text-sm font-semibold">{selected.date}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Venture</div>
                <div className="text-sm font-semibold">
                  {selected.ventureName || `Venture #${selected.ventureId}`}
                </div>
              </div>
            </div>

            <div className="mt-2 mb-3">
              <div className="text-xs text-gray-500">Total amount</div>
              <div className="text-lg font-semibold">
                {selected.amount.toFixed(2)} {selected.currency}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Rule breakdown
              </div>
              {selected.breakdown && selected.breakdown.rules.length > 0 ? (
                <ul className="space-y-1 max-h-48 overflow-auto text-xs">
                  {selected.breakdown.rules.map((r, idx) => (
                    <li
                      key={`${r.ruleId}-${idx}`}
                      className="flex items-center justify-between border-b border-gray-100 py-1"
                    >
                      <span className="text-gray-700">
                        Rule #{r.ruleId}
                      </span>
                      <span className="font-semibold">
                        {r.amount.toFixed(2)} {selected.currency}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-gray-500">
                  No rule-level breakdown available for this day.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

MyIncentivesPage.title = "My Incentives";

export default MyIncentivesPage;
