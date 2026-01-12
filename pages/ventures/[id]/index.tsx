import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { VentureDocuments } from "../../../components/VentureDocuments";
import { Skeleton } from "@/components/ui/Skeleton";

interface Venture {
  id: string;
  name: string;
  type: string;
  logisticsRole?: string;
  offices: { id: string; name: string; city: string }[];
  hotels?: { id: string; name: string; rooms: number }[];
}

type Summary = {
  headcountApprox: number;
  headcountFte: number;
  utilizationPct: number | null;
  presencePct: number | null;
  tasksPerFtePerDay: number | null;
};

type DocumentRecord = {
  id: number;
  fileName: string;
  sizeBytes: number;
  tag: string | null;
  createdAt: string;
  sourceType: string;
  sourceLabel: string;
};

type ApprovalRecord = {
  id: number;
  status: string;
  notes: string | null;
  createdAt: string;
  customer: { id: number; name: string };
  requestedBy: { id: number; name: string | null; email: string };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function MiniMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function VentureDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [venture, setVenture] = useState<Venture | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "approvals">("overview");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data: people } = useSWR<{ summary: Summary }>(
    id ? `/api/ventures/${id}/people?days=7` : null,
    fetcher
  );

  const { data: docsData } = useSWR<{ documents: DocumentRecord[] }>(
    id ? `/api/ventures/${id}/documents` : null,
    fetcher
  );

  const { data: approvalsData } = useSWR<{ items: ApprovalRecord[] } | ApprovalRecord[]>(
    id ? `/api/logistics/customer-approvals?ventureId=${id}` : null,
    fetcher
  );

  useEffect(() => {
    if (!id) return;
    fetch(`/api/ventures?id=${id}`)
      .then((r) => {
        if (r.status === 403) {
          router.push("/ventures");
          return;
        }
        if (!r.ok) {
          throw new Error("Failed to fetch venture");
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setVenture(d.venture);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return <Skeleton className="w-full h-[85vh]" />;
  }

  if (!venture) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-900 dark:text-white">Venture not found.</p>
          <Link
            href="/ventures"
            className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            ← Back to Ventures
          </Link>
        </div>
      </div>
    );
  }

  const isFreight = venture.type === "LOGISTICS" || venture.type === "TRANSPORT";
  const isHotel = venture.type === "HOSPITALITY";
  const summary = people?.summary;

  const documents = docsData?.documents ?? [];
  // Handle approvals data - API returns object with items property
  const approvals = Array.isArray(approvalsData) 
    ? approvalsData 
    : (approvalsData as { items: ApprovalRecord[] })?.items || [];
  const filteredApprovals = statusFilter === "ALL"
    ? approvals
    : approvals.filter((a: ApprovalRecord) => a.status === statusFilter);

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{venture.name}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Type: {venture.type}</p>
        </div>
        <Link
          href="/ventures"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          ← Back to Ventures
        </Link>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 text-sm">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "documents"
                ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Documents {documents.length > 0 && `(${documents.length})`}
          </button>
          {isFreight && (
            <button
              onClick={() => setActiveTab("approvals")}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === "approvals"
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-semibold"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Approvals {approvals.length > 0 && `(${approvals.length})`}
            </button>
          )}
        </nav>
      </div>

      {activeTab === "documents" && (
        <VentureDocuments
          ventureId={Number(id)}
          documents={documents}
          currentUserId={1}
        />
      )}

      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-2">
              {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    statusFilter === status
                      ? "bg-blue-600 dark:bg-blue-600 text-white border-blue-600 dark:border-blue-600"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <Link
              href={`/logistics/ventures/${id}/customer-approval`}
              className="btn text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Approval
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Requested By</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredApprovals?.map((approval) => (
                    <tr key={approval.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {approval.customer.name}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {approval.requestedBy.name || approval.requestedBy.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            approval.status === "PENDING"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              : approval.status === "APPROVED"
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                          }`}
                        >
                          {approval.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">
                        {approval.notes || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(approval.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredApprovals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg
                            className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No approvals found</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {statusFilter === "ALL" ? "No approvals have been created yet." : `No ${statusFilter.toLowerCase()} approvals found.`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && summary && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Workforce Snapshot</h2>
            <Link
              href={`/ventures/${id}/people`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
            >
              View People KPIs →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniMetric
              label="FTE (approx)"
              value={summary.headcountFte ? summary.headcountFte.toFixed(1) : "—"}
              sub={`${summary.headcountApprox} employees`}
            />
            <MiniMetric
              label="Utilization"
              value={summary.utilizationPct != null ? `${summary.utilizationPct}%` : "—"}
            />
            <MiniMetric
              label="Presence"
              value={summary.presencePct != null ? `${summary.presencePct}%` : "—"}
            />
            <MiniMetric
              label="Tasks / FTE / day"
              value={
                summary.tasksPerFtePerDay != null
                  ? summary.tasksPerFtePerDay.toFixed(1)
                  : "—"
              }
            />
          </div>
        </div>
      )}

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Offices</h2>
              {venture.offices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg
                    className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No offices created yet.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {venture.offices.map((office: any) => (
                    <li key={office.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div>
                        <Link
                          href={`/offices/${office.id}`}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          {office.name}
                        </Link>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          ({office.city || "No location set"})
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h2>
              <div className="space-y-3">
                <Link
                  href={`/ventures/${id}/people`}
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  View People KPIs
                </Link>
                {isFreight && (
                  <Link
                    href={`/ventures/${id}/freight`}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Freight KPIs
                  </Link>
                )}
                {isHotel && (
                  <Link
                    href={`/ventures/${id}/hotels`}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    View Hotel Properties
                  </Link>
                )}
              </div>
            </div>
          </div>

          {isHotel && venture.hotels && venture.hotels.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hotel Properties</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Property Name</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Total Rooms</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {venture.hotels.map((hotel) => (
                      <tr key={hotel.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{hotel.name}</td>
                        <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{hotel.rooms?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/hospitality/hotels/${hotel.id}`}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

VentureDetailPage.title = "Venture Details";

export default VentureDetailPage;
