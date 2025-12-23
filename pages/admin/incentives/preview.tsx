import React, { useEffect, useMemo, useState } from "react";
import { PageWithLayout } from "@/types/page";

interface VenturePlan {
  id: number;
  name: string;
}

interface IncentivePreviewItem {
  userId: number;
  ruleId: number;
  amount: number;
  date: string;
  planId: number;
}

interface UserMapEntry {
  id: number;
  fullName: string | null;
  email: string | null;
}

interface RuleMapEntry {
  id: number;
  metricKey: string;
  calcType: string;
  label?: string | null;
}

const AdminIncentivesPreviewPage: PageWithLayout = () => {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [plans, setPlans] = useState<VenturePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | "">("");
  const [date, setDate] = useState<string>(todayIso);

  const [items, setItems] = useState<IncentivePreviewItem[]>([]);
  const [users, setUsers] = useState<Record<number, UserMapEntry>>({});
  const [rulesById, setRulesById] = useState<Record<number, RuleMapEntry>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string>("");
  const [lastRunOk, setLastRunOk] = useState(false);
  const [commitStatus, setCommitStatus] = useState<string | null>(null);

  // Load ventures as synthetic plans (planId === ventureId v1)
  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const res = await fetch("/api/ventures");
        if (!res.ok) throw new Error("Failed to load ventures");
        const ventures = await res.json();
        const mapped: VenturePlan[] = (ventures || []).map((v: any) => ({
          id: v.id,
          name: v.name,
        }));
        if (!cancelled) setPlans(mapped);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load ventures");
      }
    }

    loadPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load rules for the selected plan to enrich rule metadata
  useEffect(() => {
    if (!selectedPlanId || typeof selectedPlanId !== "number") {
      setRulesById({});
      return;
    }

    let cancelled = false;

    async function loadRules() {
      try {
        const res = await fetch(`/api/incentives/rules?planId=${selectedPlanId}`);
        if (!res.ok) throw new Error("Failed to load rules");
        const json = await res.json();
        if (!Array.isArray(json)) return;

        const map: Record<number, RuleMapEntry> = {};
        for (const r of json) {
          map[r.id] = {
            id: r.id,
            metricKey: r.metricKey,
            calcType: r.calcType,
            label: (r as any).name ?? null,
          };
        }
        if (!cancelled) setRulesById(map);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load rules");
      }
    }

    loadRules();
    return () => {
      cancelled = true;
    };
  }, [selectedPlanId]);

  const handleRun = async () => {
    if (!selectedPlanId || typeof selectedPlanId !== "number") {
      setError("Please select a plan/venture first");
      return;
    }

    setLoading(true);
    setError(null);
    setItems([]);
    setLastRunOk(false);
    setCommitStatus(null);

    try {
      const res = await fetch("/api/incentives/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId, date }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to compute incentives");
      }

      const computed: IncentivePreviewItem[] = Array.isArray(json.items)
        ? json.items
        : [];
      setItems(computed);
      setLastRunOk(true);

      // Load user details for the involved users only
      const userIds = Array.from(new Set(computed.map((i) => i.userId)));
      if (userIds.length) {
        const userRes = await fetch("/api/admin/users?ids=" + userIds.join(","));
        if (userRes.ok) {
          const userJson = await userRes.json();
          const uMap: Record<number, UserMapEntry> = {};
          for (const u of userJson.items || userJson || []) {
            uMap[u.id] = {
              id: u.id,
              fullName: u.fullName ?? null,
              email: u.email ?? null,
            };
          }
          setUsers(uMap);
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to compute incentives");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedPlanId || typeof selectedPlanId !== "number") return;
    setCommitStatus(null);

    try {
      const res = await fetch("/api/incentives/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId, date }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to commit incentives");
      }

      setCommitStatus(
        `Incentives saved for ${date} (inserted=${json.inserted}, updated=${json.updated}).`,
      );
    } catch (e: any) {
      setCommitStatus(e.message || "Failed to commit incentives");
    }
  };

  const rows = useMemo(() => {
    let base = items;
    if (filterUser.trim()) {
      const term = filterUser.trim().toLowerCase();
      base = base.filter((i) => {
        const user = users[i.userId];
        const name = user?.fullName?.toLowerCase() ?? "";
        const email = user?.email?.toLowerCase() ?? "";
        return (
          String(i.userId).includes(term) ||
          name.includes(term) ||
          email.includes(term)
        );
      });
    }
    return base;
  }, [items, users, filterUser]);

  const totalAmount = useMemo(
    () => rows.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    [rows],
  );

  const selectedPlan =
    typeof selectedPlanId === "number"
      ? plans.find((p) => p.id === selectedPlanId)
      : null;

  const canCommit =
    !!selectedPlanId && !!date && lastRunOk && !loading && rows.length >= 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Incentive Preview</h1>
          <p className="text-xs text-gray-500 mt-1">
            Compute and inspect incentives for a given plan and day. Use Commit to persist results.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 border border-red-300 rounded px-3 py-2 bg-red-50">
          {error}
        </div>
      )}
      {commitStatus && (
        <div className="text-xs text-gray-700 border border-gray-200 rounded px-3 py-2 bg-gray-50">
          {commitStatus}
        </div>
      )}

      <div className="rounded border border-gray-200 bg-white p-4 space-y-3 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-gray-600">Incentive Plan (by venture)</div>
            <select
              value={selectedPlanId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedPlanId(v ? Number(v) : "");
              }}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">Select a venture / plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-gray-600">Date</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-gray-600">User filter (optional)</div>
            <input
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="Search by user id, name, or email…"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 gap-2">
          <div className="text-xs text-gray-500">
            {selectedPlan ? (
              <span>
                Previewing plan <span className="font-medium">{selectedPlan.name}</span> for {date}
              </span>
            ) : (
              <span>Select a plan and date, then run a preview.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={loading || !selectedPlanId}
              className="px-3 py-1.5 rounded bg-black text-white text-xs disabled:opacity-60"
            >
              {loading ? "Running…" : "Run incentives"}
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={!canCommit}
              className="px-3 py-1.5 rounded border border-gray-300 text-xs text-gray-700 bg-white disabled:opacity-40"
            >
              Commit this day
            </button>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Showing {rows.length} rule payouts · Total amount: <span className="font-semibold">{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-[11px] text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="py-1.5 px-2 border-b">User</th>
                  <th className="py-1.5 px-2 border-b">Rule</th>
                  <th className="py-1.5 px-2 border-b">Metric</th>
                  <th className="py-1.5 px-2 border-b">Calc Type</th>
                  <th className="py-1.5 px-2 border-b text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const user = users[row.userId];
                  const rule = rulesById[row.ruleId];

                  const userLabel = user
                    ? `${user.fullName || `User #${user.id}`} ${user.email ? `(${user.email})` : ""}`
                    : `User #${row.userId}`;

                  const ruleLabel = rule?.label || `Rule #${row.ruleId}`;

                  return (
                    <tr key={`${row.userId}-${row.ruleId}-${idx}`} className="border-b hover:bg-gray-50">
                      <td className="py-1.5 px-2 whitespace-nowrap">{userLabel}</td>
                      <td className="py-1.5 px-2 whitespace-nowrap">{ruleLabel}</td>
                      <td className="py-1.5 px-2 whitespace-nowrap">{rule?.metricKey ?? "—"}</td>
                      <td className="py-1.5 px-2 whitespace-nowrap">{rule?.calcType ?? "—"}</td>
                      <td className="py-1.5 px-2 whitespace-nowrap text-right">{row.amount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !rows.length && selectedPlanId && (
        <div className="text-xs text-gray-500">
          No incentive payouts computed for this plan and day.
        </div>
      )}
    </div>
  );
};

AdminIncentivesPreviewPage.title = "Incentive Preview";

export default AdminIncentivesPreviewPage;
