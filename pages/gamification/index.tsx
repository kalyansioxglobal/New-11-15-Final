import React, { useState } from "react";
import useSWR from "swr";
import { useTestMode } from "@/contexts/TestModeContext";

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

type GamificationConfig = {
  id: number;
  ventureId: number;
  pointsPerLoad: number;
  pointsPerCall: number;
  pointsPerBooking: number;
  bonusThreshold: number;
  bonusMultiplier: number;
  isActive: boolean;
};

type LeaderboardEntry = {
  userId: number;
  userName: string;
  totalPoints: number;
  rank: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function GamificationPage() {
  const { testMode } = useTestMode();
  const [selectedVentureId, setSelectedVentureId] = useState<string>("");
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");

  const { data: ventures = [] } = useSWR<Venture[]>(
    `/api/ventures?includeTest=${testMode}`,
    fetcher
  );

  const { data: offices = [] } = useSWR<Office[]>(
    selectedVentureId ? `/api/offices?ventureId=${selectedVentureId}&includeTest=${testMode}` : null,
    fetcher
  );

  const { data: configData, mutate: mutateConfig } = useSWR<{ config: GamificationConfig | null }>(
    selectedVentureId ? `/api/gamification/config?ventureId=${selectedVentureId}` : null,
    fetcher
  );

  const leaderboardUrl = selectedVentureId
    ? `/api/gamification/leaderboard?ventureId=${selectedVentureId}${selectedOfficeId ? `&officeId=${selectedOfficeId}` : ""}`
    : null;

  const { data: leaderboardData } = useSWR<{ leaderboard: LeaderboardEntry[] }>(
    leaderboardUrl,
    fetcher
  );
  const config = configData?.config;
  const leaderboard = leaderboardData?.leaderboard ?? [];

  const handleVentureChange = (ventureId: string) => {
    setSelectedVentureId(ventureId);
    setSelectedOfficeId("");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Gamification
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Points, badges, and leaderboards to motivate your team
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedVentureId}
            onChange={(e) => handleVentureChange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a Venture</option>
            {ventures.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name}
              </option>
            ))}
          </select>

          {selectedVentureId && offices.length > 0 && (
            <select
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

      {!selectedVentureId && (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          Select a venture to view gamification settings
        </div>
      )}

      {selectedVentureId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Point Configuration
            </h2>
            
            {config ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Points per Load</span>
                  <span className="text-gray-900 dark:text-white font-medium">{config.pointsPerLoad}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Points per Call</span>
                  <span className="text-gray-900 dark:text-white font-medium">{config.pointsPerCall}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Points per Booking</span>
                  <span className="text-gray-900 dark:text-white font-medium">{config.pointsPerBooking}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Bonus Threshold</span>
                  <span className="text-gray-900 dark:text-white font-medium">{config.bonusThreshold} pts</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Bonus Multiplier</span>
                  <span className="text-gray-900 dark:text-white font-medium">{config.bonusMultiplier}x</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    config.isActive 
                      ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" 
                      : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                  }`}>
                    {config.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No gamification config found for this venture.
                <br />
                <button className="mt-4 px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-colors">
                  Create Config
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Leaderboard
            </h2>
            
            {leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div 
                    key={entry.userId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors"
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" :
                      idx === 1 ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300" :
                      idx === 2 ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400" :
                      "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                      {entry.rank}
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 dark:text-white font-medium">{entry.userName}</div>
                    </div>
                    <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      {entry.totalPoints.toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No points recorded yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

GamificationPage.title = "Gamification";

export default GamificationPage;
