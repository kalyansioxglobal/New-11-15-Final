import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useTestMode } from "@/contexts/TestModeContext";

type Office = {
  id: number;
  name: string;
  ventureId: number;
};

type IncentiveRule = {
  id: number;
  roleKey: string;
  metricKey: string;
  calcType: string;
  rate: number | null;
  currency: string | null;
  isEnabled: boolean;
};

type IncentivePlan = {
  id: number;
  name: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  rules: IncentiveRule[];
};

type IncentiveDaily = {
  date: string;
  amount: number;
  currency: string;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

function IncentivePlanEditor({
  ventureId,
  isAdmin,
}: {
  ventureId: number;
  isAdmin: boolean;
}) {
  const [plan, setPlan] = useState<IncentivePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ventureId || !isAdmin) return;

    const loadPlan = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/incentives/plan?ventureId=${ventureId}`);
        if (res.ok) {
          const data = await res.json();
          setPlan(data);
        }
      } catch (err) {
        console.error("Failed to load incentive plan", err);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [ventureId, isAdmin]);

  const handleRuleChange = (
    ruleId: number,
    field: keyof IncentiveRule,
    value: string
  ) => {
    if (!plan) return;

    setPlan({
      ...plan,
      rules: plan.rules.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              [field]:
                field === "rate"
                  ? value === ""
                    ? null
                    : parseFloat(value)
                  : field === "isEnabled"
                  ? value === "true"
                  : value,
            }
          : r
      ),
    });
  };

  const savePlan = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/incentives/plan?ventureId=${ventureId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (!res.ok) {
        console.error("Failed to save plan");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
        <h2 className="font-semibold mb-2">Incentive Plan (Admin View)</h2>
        <p className="text-sm text-gray-400">
          You don&apos;t have access to edit incentive plans.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
        <h2 className="font-semibold mb-2">Incentive Plan</h2>
        <p className="text-sm text-gray-400">Loading plan…</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
        <h2 className="font-semibold mb-2">Incentive Plan</h2>
        <p className="text-sm text-gray-400">
          No plan configured yet. Ask admin to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="font-semibold">Incentive Plan</h2>
          <p className="text-xs text-gray-400">
            {plan.name} · Effective from {formatDate(plan.effectiveFrom)}
          </p>
        </div>
        <button
          onClick={savePlan}
          disabled={saving}
          className="px-3 py-1.5 rounded-md border border-blue-500 text-blue-200 text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 pr-3">Role</th>
              <th className="text-left py-2 pr-3">Metric</th>
              <th className="text-left py-2 pr-3">Calc Type</th>
              <th className="text-left py-2 pr-3">Rate</th>
              <th className="text-left py-2 pr-3">Currency</th>
              <th className="text-left py-2 pr-3">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {plan.rules.map((rule) => (
              <tr key={rule.id} className="border-b border-gray-800">
                <td className="py-2 pr-3">{rule.roleKey}</td>
                <td className="py-2 pr-3">{rule.metricKey}</td>
                <td className="py-2 pr-3">{rule.calcType}</td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                    value={rule.rate ?? ""}
                    onChange={(e) =>
                      handleRuleChange(rule.id, "rate", e.target.value)
                    }
                    step="0.01"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="text"
                    className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                    value={rule.currency ?? ""}
                    onChange={(e) =>
                      handleRuleChange(rule.id, "currency", e.target.value)
                    }
                  />
                </td>
                <td className="py-2 pr-3">
                  <select
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                    value={rule.isEnabled ? "true" : "false"}
                    onChange={(e) =>
                      handleRuleChange(rule.id, "isEnabled", e.target.value)
                    }
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyIncentivesPanel({ ventureId, officeId }: { ventureId: number; officeId?: number }) {
  const [daily, setDaily] = useState<IncentiveDaily[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ventureId) return;

    const loadDaily = async () => {
      setLoading(true);
      try {
        let url = `/api/incentives/my-daily?ventureId=${ventureId}`;
        if (officeId) {
          url += `&officeId=${officeId}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setDaily(Array.isArray(data) ? data : (data.items ?? []));
        }
      } catch (err) {
        console.error("Failed to load daily incentives", err);
      } finally {
        setLoading(false);
      }
    };

    loadDaily();
  }, [ventureId, officeId]);

  const currency = daily[0]?.currency ?? "INR";
  const today = daily[daily.length - 1]?.amount ?? 0;
  const mtd = daily.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
      <h2 className="font-semibold mb-2">My Incentives</h2>
      {loading ? (
        <p className="text-sm text-gray-400">Loading your incentives…</p>
      ) : daily.length === 0 ? (
        <p className="text-sm text-gray-400">
          No incentive data for this venture yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400">Today</p>
              <p className="text-xl font-bold">
                {currency} {today.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Month-to-Date</p>
              <p className="text-xl font-bold">
                {currency} {mtd.toFixed(0)}
              </p>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border-t border-gray-800 pt-2">
            <p className="text-xs text-gray-400 mb-1">
              Daily breakdown (most recent last):
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-1 pr-2">Date</th>
                  <th className="text-right py-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.date} className="border-b border-gray-900">
                    <td className="py-1 pr-2">{formatDate(d.date)}</td>
                    <td className="py-1 text-right">
                      {currency} {d.amount.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function VentureIncentivesPage() {
  const router = useRouter();
  const { testMode } = useTestMode();
  const ventureIdParam = router.query.ventureId;
  const ventureId = ventureIdParam ? Number(ventureIdParam) : NaN;

  const [isAdmin, setIsAdmin] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch("/api/me", { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const role = data?.data?.role ?? data?.role ?? "";
        setIsAdmin(["CEO", "ADMIN", "COO", "CFO", "VENTURE_HEAD"].includes(role));
      })
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (!ventureId || Number.isNaN(ventureId)) return;
    fetch(`/api/offices?ventureId=${ventureId}&includeTest=${testMode}`)
      .then((r) => r.json())
      .then((data) => setOffices(Array.isArray(data) ? data : []))
      .catch(() => setOffices([]));
  }, [ventureId, testMode]);

  const handleRecalculateYesterday = async () => {
    if (!ventureId) return;
    setRecalculating(true);
    setRecalcMessage(null);
    try {
      const res = await fetch(`/api/incentives/run?ventureId=${ventureId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Recalc failed", data);
        setRecalcMessage("Recalculation failed. Check console for details.");
      } else {
        console.log("Recalc success", data);
        setRecalcMessage(`Recalculated incentives for ${data.date}`);
      }
    } catch (err) {
      console.error("Recalc error", err);
      setRecalcMessage("Recalculation failed.");
    } finally {
      setRecalculating(false);
    }
  };

  if (!ventureId || Number.isNaN(ventureId)) {
    return <div className="p-6 text-gray-300">Invalid venture</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Venture Incentives</h1>
          <p className="text-sm text-gray-400 mb-4">
            Configure incentive plans and see your daily incentive performance for
            this venture.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {offices.length > 0 && (
            <select
              value={selectedOfficeId ?? ""}
              onChange={(e) => setSelectedOfficeId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Offices</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          {isAdmin && (
            <button
              onClick={handleRecalculateYesterday}
              disabled={recalculating}
              className="px-3 py-1.5 rounded-md border border-amber-500 text-amber-200 text-xs disabled:opacity-60"
            >
              {recalculating ? "Recalculating…" : "Recalculate Yesterday"}
            </button>
          )}
        </div>
      </div>

      {recalcMessage && (
        <div className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded px-3 py-2">
          {recalcMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IncentivePlanEditor ventureId={ventureId} isAdmin={isAdmin} />
        <MyIncentivesPanel ventureId={ventureId} officeId={selectedOfficeId} />
      </div>
    </div>
  );
}

(VentureIncentivesPage as any).title = "Venture Incentives";

export default VentureIncentivesPage;
