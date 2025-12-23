import { useState, useEffect } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

type Campaign = {
  id: number;
  name: string;
  clientName: string | null;
  description: string | null;
  isActive: boolean;
  venture: { id: number; name: string };
  _count: { agents: number; kpiRecords: number };
};

type Venture = { id: number; name: string };

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [bpoVentures, setBpoVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventureFilter, setVentureFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = isSuperAdmin(role);

  useEffect(() => {
    fetch("/api/ventures?types=BPO")
      .then((r) => r.json())
      .then((data) => setBpoVentures(data || []));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (ventureFilter) params.set("ventureId", ventureFilter);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        const res = await fetch(`/api/bpo/campaigns?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load campaigns");

        const json = await res.json();
        if (!cancelled) {
          setCampaigns(json.items || []);
          setTotal(json.total || 0);
        }
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
  }, [ventureFilter, page, pageSize]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">BPO Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage BPO campaigns and client projects
          </p>
        </div>
        {allowCreate && (
          <Link
            href="/bpo/campaigns/new"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Campaign
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Ventures</option>
          {bpoVentures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No campaigns found
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/bpo/campaigns/${c.id}`}
              className="block p-4 bg-white rounded-lg border hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{c.name}</h3>
                  <p className="text-sm text-gray-500">{c.clientName || "No client"}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    c.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {c.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {c.description}
                </p>
              )}
              <div className="flex gap-4 mt-3 text-sm text-gray-500">
                <span>{c._count?.agents || 0} agents</span>
        {total > pageSize && (
          <div className="flex justify-between items-center mt-4 text-xs text-gray-600">
            <span>
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} campaigns
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

                <span>{c._count?.kpiRecords || 0} KPI records</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {c.venture?.name}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

CampaignsListPage.title = 'BPO Campaigns';
