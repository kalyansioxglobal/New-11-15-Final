import React, { useEffect, useState } from "react";

interface IncentivePlan {
  id: number;
  name: string;
}

interface IncentiveRule {
  id: number;
  planId: number;
  roleKey: string;
  metricKey: string;
  calcType: string;
  rate: number | null;
  currency: string | null;
  qualificationId?: number | null;
  config?: any | null;
  isEnabled: boolean;
}

const METRIC_OPTIONS = [
  "freight_margin_usd",
  "freight_revenue_usd",
  "loads_covered",
  "loads_touched",
  "calls_made",
  "revenue_generated",
  "demos_booked",
  "rooms_sold",
  "room_revenue",
];

const CALC_TYPE_OPTIONS = [
  "PERCENT_OF_METRIC",
  "FLAT_PER_UNIT",
  "CURRENCY_PER_DOLLAR",
  "TIERED_SLAB",
  "BONUS_ON_TARGET",
  "LOAD_LEVEL_BONUS",
];

const ROLE_KEY_OPTIONS = [
  "SALES",
  "CSR",
  "DISPATCH",
  "CARRIER_TEAM",
  "ACCOUNTING",
  "BPO_AGENT",
];

export default function RulesTab() {
  const [plans, setPlans] = useState<IncentivePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | "">("");
  const [rules, setRules] = useState<IncentiveRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingRule, setEditingRule] = useState<IncentiveRule | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      try {
        setLoading(true);
        const res = await fetch("/api/ventures");
        if (!res.ok) throw new Error("Failed to load ventures");
        const ventures = await res.json();

        const mapped: IncentivePlan[] = (ventures || []).map((v: any) => ({
          id: v.id,
          name: v.name,
        }));
        if (!cancelled) setPlans(mapped);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load plans");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlanId || typeof selectedPlanId !== "number") {
      setRules([]);
      return;
    }

    let cancelled = false;
    async function loadRules() {
      try {
        setLoading(true);
        const res = await fetch(`/api/incentives/rules?planId=${selectedPlanId}`);
        if (!res.ok) throw new Error("Failed to load rules");
        const json = await res.json();
        if (!cancelled) setRules(Array.isArray(json) ? json : []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load rules");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRules();
    return () => {
      cancelled = true;
    };
  }, [selectedPlanId]);

  function openNewRule() {
    if (!selectedPlanId || typeof selectedPlanId !== "number") return;
    setEditingRule({
      id: 0,
      planId: selectedPlanId,
      roleKey: "SALES",
      metricKey: "freight_margin_usd",
      calcType: "PERCENT_OF_METRIC",
      rate: 1,
      currency: "USD",
      isEnabled: true,
    });
    setShowModal(true);
  }

  function openEditRule(rule: IncentiveRule) {
    setEditingRule({ ...rule });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingRule(null);
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRule || !selectedPlanId || typeof selectedPlanId !== "number") return;

    setSaving(true);
    setError(null);
    try {
      const isNew = !editingRule.id;
      const payload = {
        ...editingRule,
        planId: selectedPlanId,
      };

      const res = await fetch("/api/incentives/rules", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save rule");
      }

      const saved: IncentiveRule = await res.json();
      if (isNew) {
        setRules((prev) => [...prev, saved]);
      } else {
        setRules((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      }
      closeModal();
    } catch (err: any) {
      setError(err.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  }

  async function handleSoftDelete(rule: IncentiveRule) {
    if (!window.confirm("Disable this rule? It will remain in history but not be used for new calculations.")) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/incentives/rules?action=delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to disable rule");
      }
      const updated: IncentiveRule = await res.json();
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message || "Failed to disable rule");
    } finally {
      setSaving(false);
    }
  }

  const selectedPlan =
    typeof selectedPlanId === "number"
      ? plans.find((p) => p.id === selectedPlanId)
      : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">
          Manage per-metric incentive rules. Changes affect how daily incentives are calculated.
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-600 border border-red-300 rounded px-3 py-2 bg-red-50">
          {error}
        </div>
      )}

      <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
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

        {selectedPlan && (
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-gray-500">
              Managing rules for: <span className="font-medium">{selectedPlan.name}</span>
            </div>
            <button
              onClick={openNewRule}
              disabled={loading || saving}
              className="px-3 py-1.5 rounded bg-black text-white text-xs disabled:opacity-60"
            >
              New Rule
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-xs text-gray-500">Loading…</div>
      )}

      {selectedPlan && !loading && (
        <div className="rounded border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Rules
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-[11px] text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="py-1.5 px-2 border-b">Role</th>
                  <th className="py-1.5 px-2 border-b">Metric</th>
                  <th className="py-1.5 px-2 border-b">Calc Type</th>
                  <th className="py-1.5 px-2 border-b">Rate</th>
                  <th className="py-1.5 px-2 border-b">Currency</th>
                  <th className="py-1.5 px-2 border-b">Enabled</th>
                  <th className="py-1.5 px-2 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b hover:bg-gray-50">
                    <td className="py-1.5 px-2">{rule.roleKey}</td>
                    <td className="py-1.5 px-2">{rule.metricKey}</td>
                    <td className="py-1.5 px-2">{rule.calcType}</td>
                    <td className="py-1.5 px-2">{rule.rate ?? "—"}</td>
                    <td className="py-1.5 px-2">{rule.currency ?? "—"}</td>
                    <td className="py-1.5 px-2">{rule.isEnabled ? "Yes" : "No"}</td>
                    <td className="py-1.5 px-2 text-right space-x-2">
                      <button
                        onClick={() => openEditRule(rule)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleSoftDelete(rule)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Disable
                      </button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-3 text-center text-xs text-gray-500"
                    >
                      No rules defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && editingRule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4 text-sm">
            <h2 className="text-base font-semibold mb-3">
              {editingRule.id ? "Edit Rule" : "New Rule"}
            </h2>
            <form onSubmit={handleSaveRule} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Role</div>
                  <select
                    value={editingRule.roleKey}
                    onChange={(e) =>
                      setEditingRule((prev) =>
                        prev ? { ...prev, roleKey: e.target.value } : prev
                      )
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    {ROLE_KEY_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Metric</div>
                  <select
                    value={editingRule.metricKey}
                    onChange={(e) =>
                      setEditingRule((prev) =>
                        prev ? { ...prev, metricKey: e.target.value } : prev
                      )
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    {METRIC_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Calc Type</div>
                  <select
                    value={editingRule.calcType}
                    onChange={(e) =>
                      setEditingRule((prev) =>
                        prev ? { ...prev, calcType: e.target.value } : prev
                      )
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    {CALC_TYPE_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Rate</div>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRule.rate ?? ""}
                    onChange={(e) =>
                      setEditingRule((prev) =>
                        prev
                          ? {
                              ...prev,
                              rate:
                                e.target.value === ""
                                  ? null
                                  : parseFloat(e.target.value),
                            }
                          : prev
                      )
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Currency</div>
                  <input
                    type="text"
                    value={editingRule.currency ?? ""}
                    onChange={(e) =>
                      setEditingRule((prev) =>
                        prev ? { ...prev, currency: e.target.value } : prev
                      )
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="USD / INR"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Active</div>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={editingRule.isEnabled}
                      onChange={(e) =>
                        setEditingRule((prev) =>
                          prev ? { ...prev, isEnabled: e.target.checked } : prev
                        )
                      }
                    />
                    Enabled
                  </label>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 bg-white disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
