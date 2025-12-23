import { useState, useEffect } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

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

export default function BpoAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bpoVentures, setBpoVentures] = useState<Venture[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventureFilter, setVentureFilter] = useState<string>("");
  const [campaignFilter, setCampaignFilter] = useState<string>("");

  const { testMode, setTestMode } = useTestMode();
  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = isSuperAdmin(role);

  useEffect(() => {
    fetch("/api/ventures?types=BPO")
      .then((r) => r.json())
      .then((data) => setBpoVentures(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (ventureFilter) params.set("ventureId", ventureFilter);
    fetch(`/api/bpo/campaigns?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setCampaigns(data || []))
      .catch(() => {});
  }, [ventureFilter]);

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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">BPO Agents</h1>
          <p className="text-sm text-gray-500 mt-1">
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
            className="border rounded px-2 py-1 text-sm"
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
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setTestMode(!testMode)}
            className={`px-3 py-1 rounded text-sm border ${
              testMode ? "bg-yellow-200 border-yellow-400" : "bg-gray-100"
            }`}
          >
            Test: {testMode ? "ON" : "OFF"}
          </button>

          {allowCreate && (
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              + Add Agent
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm py-8">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-gray-50">
          <div className="text-gray-500 text-sm">
            No agents found.
            {allowCreate && " Add agents to start tracking BPO performance."}
          </div>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Agent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Venture</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Campaign</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Employee ID</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{agent.user.name || "Unnamed"}</div>
                    <div className="text-xs text-gray-500">{agent.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{agent.venture.name}</td>
                  <td className="px-4 py-3">
                    {agent.campaign ? (
                      <Link
                        href={`/bpo/campaigns/${agent.campaign.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {agent.campaign.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{agent.employeeId || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        agent.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
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

      <p className="text-xs text-gray-400 pt-4">
        Test Mode {testMode ? "ON" : "OFF"} – when OFF, test data is excluded.
      </p>
    </div>
  );
}

BpoAgentsPage.title = "BPO Agents";
