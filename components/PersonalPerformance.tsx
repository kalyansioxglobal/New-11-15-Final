import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PerformanceData = {
  coveredLoads: {
    today: number;
    week: number;
    month: number;
    allTime: number;
  };
  margin: {
    today: number;
    week: number;
    month: number;
    allTime: number;
    avgPercentage: number;
  };
  ranking: {
    position: number | null;
    totalMembers: number;
    percentile: number;
    hasLoadsThisMonth: boolean;
  };
  comparison: {
    myMonthLoads: number;
    teamAvgLoads: number;
    myMonthMargin: number;
    teamAvgMargin: number;
    aboveAvgLoads: boolean;
    aboveAvgMargin: boolean;
  };
  goals: {
    loadsGoal: number;
    loadsProgress: number;
    loadsPercentage: number;
    marginGoal: number;
    marginProgress: number;
    marginPercentage: number;
  };
};

export default function PersonalPerformance() {
  const { data, isLoading, error } = useSWR<{ data: PerformanceData }>(
    "/api/kpi/my-performance",
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-yellow-800 text-sm">Unable to load performance data</p>
      </div>
    );
  }

  const perf = data.data;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">My Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm opacity-80">Today&apos;s Loads</div>
            <div className="text-3xl font-bold">{perf.coveredLoads.today}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm opacity-80">This Week</div>
            <div className="text-3xl font-bold">{perf.coveredLoads.week}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm opacity-80">This Month</div>
            <div className="text-3xl font-bold">{perf.coveredLoads.month}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm opacity-80">All Time</div>
            <div className="text-3xl font-bold">{perf.coveredLoads.allTime}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">My Margin</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Today</span>
              <span className="font-medium text-green-600">{formatCurrency(perf.margin.today)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Week</span>
              <span className="font-medium text-green-600">{formatCurrency(perf.margin.week)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="font-medium text-green-600">{formatCurrency(perf.margin.month)}</span>
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
              <span className="text-gray-600">Avg Margin %</span>
              <span className="font-medium">{perf.margin.avgPercentage}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Where I Stand</h3>
          <div className="text-center py-2">
            {perf.ranking.hasLoadsThisMonth ? (
              <>
                <div className="text-4xl font-bold text-blue-600">
                  #{perf.ranking.position}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  of {perf.ranking.totalMembers} team members
                </div>
                <div className="mt-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    perf.ranking.percentile >= 75 ? "bg-green-100 text-green-700" :
                    perf.ranking.percentile >= 50 ? "bg-blue-100 text-blue-700" :
                    perf.ranking.percentile >= 25 ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    Top {perf.ranking.percentile}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-medium text-gray-400">
                  Not ranked
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  No covered loads this month
                </div>
              </>
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">My Loads</span>
              <span className={perf.comparison.aboveAvgLoads ? "text-green-600" : "text-gray-900"}>
                {perf.comparison.myMonthLoads} {perf.comparison.aboveAvgLoads && "^"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Team Avg</span>
              <span className="text-gray-500">{perf.comparison.teamAvgLoads}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Goal Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Loads Goal</span>
                <span className="font-medium">{perf.goals.loadsProgress} / {perf.goals.loadsGoal}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    perf.goals.loadsPercentage >= 100 ? "bg-green-500" :
                    perf.goals.loadsPercentage >= 75 ? "bg-blue-500" :
                    perf.goals.loadsPercentage >= 50 ? "bg-yellow-500" :
                    "bg-gray-400"
                  }`}
                  style={{ width: `${perf.goals.loadsPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{perf.goals.loadsPercentage}% complete</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Margin Goal</span>
                <span className="font-medium">{formatCurrency(perf.goals.marginProgress)} / {formatCurrency(perf.goals.marginGoal)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    perf.goals.marginPercentage >= 100 ? "bg-green-500" :
                    perf.goals.marginPercentage >= 75 ? "bg-blue-500" :
                    perf.goals.marginPercentage >= 50 ? "bg-yellow-500" :
                    "bg-gray-400"
                  }`}
                  style={{ width: `${perf.goals.marginPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{perf.goals.marginPercentage}% complete</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
