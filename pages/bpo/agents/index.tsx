import { useState, useEffect } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { Skeleton } from "@/components/ui/Skeleton";

type Agent = {
  id: number;
  userId: number;
  employeeId: string | null;
  isActive: boolean;
  user: { id: number; name: string | null; email: string };
  venture: { id: number; name: string };
  campaign: { id: number; name: string; clientName: string | null } | null;
};

type Venture = { id: number; name: string };
type Campaign = { id: number; name: string };
type User = { id: number; fullName: string | null; email: string };

export default function BpoAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bpoVentures, setBpoVentures] = useState<Venture[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [formCampaigns, setFormCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventureFilter, setVentureFilter] = useState<string>("");
  const [campaignFilter, setCampaignFilter] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userId: "",
    ventureId: "",
    campaignId: "",
    employeeId: "",
  });

  const { testMode, setTestMode } = useTestMode();
  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = isSuperAdmin(role);

  useEffect(() => {
    fetch("/api/ventures?types=BPO")
      .then((r) => r.json())
      .then((data) => setBpoVentures(data || []))
      .catch(() => { });
    
    // Fetch users for the form
    fetch("/api/users/lookup")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (ventureFilter) params.set("ventureId", ventureFilter);
    fetch(`/api/bpo/campaigns?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        // Handle both array and object responses
        const items = Array.isArray(data) ? data : data?.items || data?.campaigns || [];
        setCampaigns(items);
      })
      .catch(() => {
        setCampaigns([]);
      });
  }, [ventureFilter]);

  // Fetch campaigns for the form when form venture changes
  useEffect(() => {
    if (formData.ventureId) {
      const params = new URLSearchParams();
      params.set("ventureId", formData.ventureId);
      fetch(`/api/bpo/campaigns?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          const items = Array.isArray(data) ? data : data?.items || data?.campaigns || [];
          setFormCampaigns(items);
        })
        .catch(() => {
          setFormCampaigns([]);
        });
    } else {
      setFormCampaigns([]);
    }
  }, [formData.ventureId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (ventureFilter) params.set("ventureId", ventureFilter);
        if (campaignFilter) params.set("campaignId", campaignFilter);
        params.set("includeTest", testMode ? "true" : "false");

        const res = await fetch(`/api/bpo/agents?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load agents");

        const json = await res.json();
        const items = Array.isArray(json) ? json : json.items ?? [];
        if (!cancelled) setAgents(items);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ventureFilter, campaignFilter, testMode]);

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/bpo/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(formData.userId),
          ventureId: Number(formData.ventureId),
          campaignId: formData.campaignId ? Number(formData.campaignId) : null,
          employeeId: formData.employeeId || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.detail || "Failed to create agent");
      }

      // Reset form and close modal
      setFormData({ userId: "", ventureId: "", campaignId: "", employeeId: "" });
      setShowAddModal(false);
      
      // Reload agents list
      const params = new URLSearchParams();
      if (ventureFilter) params.set("ventureId", ventureFilter);
      if (campaignFilter) params.set("campaignId", campaignFilter);
      params.set("includeTest", testMode ? "true" : "false");
      
      const agentsRes = await fetch(`/api/bpo/agents?${params.toString()}`);
      if (agentsRes.ok) {
        const json = await agentsRes.json();
        const items = Array.isArray(json) ? json : json.items ?? [];
        setAgents(items);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">BPO Agents</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage BPO agents across campaigns and ventures
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={ventureFilter}
            onChange={(e) => {
              setVentureFilter(e.target.value);
              setCampaignFilter("");
            }}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500"
          >
            <option value="">All Ventures</option>
            {bpoVentures.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500"
          >
            <option value="">All Campaigns</option>
            {Array.isArray(campaigns) && campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setTestMode(!testMode)}
            className={`px-3 py-1 rounded text-sm border transition-colors ${
              testMode 
                ? "bg-yellow-200 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-700 text-yellow-900 dark:text-yellow-300" 
                : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300"
            }`}
          >
            Test: {testMode ? "ON" : "OFF"}
          </button>

          {allowCreate && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn"
            >
              + Add Agent
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton className="w-full h-[85vh]" />
      ) : agents.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            No agents found.
            {allowCreate && " Add agents to start tracking BPO performance."}
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Agent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Venture</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Campaign</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Employee ID</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{agent.user.name || "Unnamed"}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{agent.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{agent.venture.name}</td>
                  <td className="px-4 py-3">
                    {agent.campaign ? (
                      <Link
                        href={`/bpo/campaigns/${agent.campaign.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {agent.campaign.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{agent.employeeId || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        agent.isActive
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 pt-4">
        Test Mode {testMode ? "ON" : "OFF"} – when OFF, test data is excluded.
      </p>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add BPO Agent</h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                  setFormData({ userId: "", ventureId: "", campaignId: "", employeeId: "" });
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  User <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName || "Unnamed"} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Venture <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.ventureId}
                  onChange={(e) => {
                    setFormData({ ...formData, ventureId: e.target.value, campaignId: "" });
                  }}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                >
                  <option value="">Select a venture</option>
                  {bpoVentures.map((venture) => (
                    <option key={venture.id} value={venture.id}>
                      {venture.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Campaign (Optional)
                </label>
                <select
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  disabled={!formData.ventureId}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">No campaign (unassigned)</option>
                  {formCampaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Employee ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="e.g. EMP001"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError(null);
                    setFormData({ userId: "", ventureId: "", campaignId: "", employeeId: "" });
                  }}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Agent
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

BpoAgentsPage.title = "BPO Agents";
