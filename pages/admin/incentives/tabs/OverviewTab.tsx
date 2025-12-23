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

export default function OverviewTab() {
  const { testMode } = useTestMode();
  const { data: ventures = [], isLoading } = useSWR<Venture[]>(
    `/api/ventures?includeTest=${testMode}`,
    fetcher
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">
          Configure and manage incentive plans for each venture
        </p>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-400">Loading ventures...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ventures.map((v) => (
          <Link
            key={v.id}
            href={`/incentives/${v.id}`}
            className="block p-5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg">
                {v.type === "LOGISTICS" && "🚛"}
                {v.type === "HOSPITALITY" && "🏨"}
                {v.type === "BPO" && "📞"}
                {v.type === "SAAS" && "💻"}
                {v.type === "HOLDINGS" && "🏦"}
              </div>
              <div>
                <div className="font-medium text-gray-900">{v.name}</div>
                <div className="text-xs text-gray-500">{v.type}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!isLoading && ventures.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No ventures found
        </div>
      )}
    </div>
  );
}
