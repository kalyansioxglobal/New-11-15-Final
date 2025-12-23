import React from "react";
import Link from "next/link";
import useSWR from "swr";
import { useTestMode } from "@/contexts/TestModeContext";

type Venture = {
  id: number;
  name: string;
  type: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function BpoIncentivesPage() {
  const { testMode } = useTestMode();
  const { data: venturesData = [], isLoading } = useSWR<Venture[]>(
    `/api/ventures?types=BPO&includeTest=${testMode}`,
    fetcher
  );

  const bpoVentures = venturesData;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          BPO Incentive Plans
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage incentive plans for BPO operations
        </p>
      </div>

      {isLoading && (
        <div className="text-sm text-slate-400">Loading ventures...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bpoVentures.map((v) => (
          <Link
            key={v.id}
            href={`/incentives/${v.id}`}
            className="block p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-600/20 flex items-center justify-center text-green-400 text-lg">
                📞
              </div>
              <div>
                <div className="font-medium text-slate-100">{v.name}</div>
                <div className="text-xs text-slate-400">View Incentive Plan</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!isLoading && bpoVentures.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No BPO ventures found
        </div>
      )}
    </div>
  );
}

BpoIncentivesPage.title = "BPO Incentives";

export default BpoIncentivesPage;
