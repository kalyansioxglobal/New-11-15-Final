import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTestMode } from "@/contexts/TestModeContext";

type VentureStatus = "Healthy" | "Attention" | "Critical";

type Venture = {
  id: number;
  name: string;
  type: string;
  logisticsRole: "BROKER" | "CARRIER" | null;
  officesCount: number;
  health: VentureStatus;
};

const roleLabels: Record<string, string> = {
  BROKER: "Broker",
  CARRIER: "Carrier",
};

const STATUS_COLORS: Record<VentureStatus, string> = {
  Healthy: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Attention: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Critical: "bg-red-500/20 text-red-300 border-red-500/30",
};

function StatusBadge({ status }: { status: VentureStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status] || STATUS_COLORS.Attention}`}
    >
      {status}
    </span>
  );
}

function TypeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
        active
          ? "bg-emerald-500 text-white border-emerald-500"
          : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function VenturesPage() {
  const router = useRouter();
  const { testMode } = useTestMode();
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/overview/ventures?includeTest=${testMode}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load ventures");
        }
        const json = await res.json();
        if (!cancelled) setVentures(json.ventures || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load ventures");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [testMode]);

  const ventureTypes = useMemo(() => {
    const types = Array.from(new Set(ventures.map((v) => v.type)));
    return ["All", ...types];
  }, [ventures]);

  const filteredVentures = useMemo(() => {
    return ventures.filter((v) => {
      const matchesType = typeFilter === "All" || v.type === typeFilter;
      const matchesSearch =
        !search ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.type.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [ventures, search, typeFilter]);

  const handleRowClick = (id: number) => {
    router.push(`/ventures/${id}`);
  };

  if (loading) {
    return (
      <div className="px-8 py-6">
        <h1 className="text-2xl font-semibold text-slate-100">Ventures</h1>
        <p className="text-sm text-slate-400 mt-1">
          All ventures across logistics, hospitality, BPO and SaaS under central command.
        </p>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-8 py-6">
        <h1 className="text-2xl font-semibold text-slate-100">Ventures</h1>
        <div className="mt-4 p-4 bg-red-500/20 text-red-300 rounded-lg border border-red-500/30">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Ventures</h1>
          <p className="text-sm text-slate-400 mt-1">
            All ventures across logistics, hospitality, BPO and SaaS under central command.
          </p>
        </div>
        <div className="text-right text-sm text-slate-400">
          <div>Total ventures: <span className="text-slate-200 font-medium">{ventures.length}</span></div>
          <div>Showing: <span className="text-slate-200 font-medium">{filteredVentures.length}</span></div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex flex-wrap gap-2">
          {ventureTypes.map((t) => (
            <TypeChip
              key={t}
              label={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
            />
          ))}
        </div>

        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search by name or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/50">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Offices</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredVentures.map((venture) => (
              <tr
                key={venture.id}
                onClick={() => handleRowClick(venture.id)}
                className="hover:bg-slate-700/30 cursor-pointer transition-colors"
              >
                <td className="px-5 py-4 font-medium text-slate-100">
                  <span className="hover:text-emerald-400 transition-colors">{venture.name}</span>
                </td>
                <td className="px-5 py-4 text-slate-300">{venture.type}</td>
                <td className="px-5 py-4 text-slate-300">
                  {venture.logisticsRole ? roleLabels[venture.logisticsRole] : "—"}
                </td>
                <td className="px-5 py-4 text-center text-slate-300">{venture.officesCount}</td>
                <td className="px-5 py-4 text-center">
                  <StatusBadge status={venture.health} />
                </td>
                <td className="px-5 py-4 text-right">
                  <Link 
                    href={`/ventures/${venture.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}

            {filteredVentures.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm text-slate-400"
                >
                  {ventures.length === 0
                    ? "No ventures yet. Create the first one in Admin."
                    : "No ventures match your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

VenturesPage.title = "Ventures";

export default VenturesPage;
