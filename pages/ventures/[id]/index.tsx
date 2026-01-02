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
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
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
    return <div className="p-4">Venture not found.</div>;
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{venture.name}</h1>
        <p className="text-sm text-gray-600">Type: {venture.type}</p>
      </div>

      <div className="border-b border-zinc-200">
        <nav className="flex gap-4 text-sm">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2 border-b-2 ${
              activeTab === "overview"
                ? "border-zinc-900 text-zinc-900 font-medium"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`pb-2 border-b-2 ${
              activeTab === "documents"
                ? "border-zinc-900 text-zinc-900 font-medium"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Documents {documents.length > 0 && `(${documents.length})`}
          </button>
          {isFreight && (
            <button
              onClick={() => setActiveTab("approvals")}
              className={`pb-2 border-b-2 ${
                activeTab === "approvals"
                  ? "border-zinc-900 text-zinc-900 font-medium"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
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
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-xs rounded-md border ${
                    statusFilter === status
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <Link
              href={`/logistics/ventures/${id}/customer-approval`}
              className="px-3 py-1.5 text-xs bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 rounded-md"
            >
              + New Approval
            </Link>
          </div>

          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Customer</th>
                  <th className="px-4 py-2 text-left font-medium">Requested By</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Notes</th>
                  <th className="px-4 py-2 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals?.map((approval) => (
                  <tr key={approval.id} className="border-b border-zinc-100">
                    <td className="px-4 py-2 font-medium text-zinc-900">
                      {approval.customer.name}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {approval.requestedBy.name || approval.requestedBy.email}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          approval.status === "PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : approval.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {approval.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-500 text-xs max-w-[200px] truncate">
                      {approval.notes || "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">
                      {new Date(approval.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredApprovals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                      No approvals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "overview" && summary && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-700">Workforce snapshot</div>
            <Link
              href={`/ventures/${id}/people`}
              className="text-[11px] text-blue-600 hover:underline"
            >
              View People KPIs
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-2">Offices</h2>
              {venture.offices.length === 0 ? (
                <p className="text-sm text-gray-500">No offices created yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {venture.offices.map((office: any) => (
                    <li key={office.id}>
                      <Link
                        href={`/offices/${office.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {office.name}
                      </Link>{" "}
                      <span className="text-gray-500">
                        ({office.city || "No location set"})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border rounded p-4">
              <h2 className="text-lg font-semibold mb-3">Quick Links</h2>
              <div className="space-y-2">
                <Link
                  href={`/ventures/${id}/people`}
                  className="block text-sm text-blue-600 hover:underline"
                >
                  View People KPIs
                </Link>
                {isFreight && (
                  <Link
                    href={`/ventures/${id}/freight`}
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    View Freight KPIs
                  </Link>
                )}
                {isHotel && (
                  <>
                    <Link
                      href={`/ventures/${id}/hotels`}
                      className="block text-sm text-blue-600 hover:underline"
                    >
                      View Hotel Properties
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {isHotel && venture.hotels && venture.hotels.length > 0 && (
            <div className="border rounded p-4">
              <h2 className="text-lg font-semibold mb-3">Hotel Properties</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-2 text-left">Property Name</th>
                    <th className="p-2 text-center">Total Rooms</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {venture.hotels.map((hotel) => (
                    <tr key={hotel.id} className="border-b">
                      <td className="p-2">{hotel.name}</td>
                      <td className="p-2 text-center">{hotel.rooms || 0}</td>
                      <td className="p-2 text-right">
                        <Link
                          href={`/hotels/${hotel.id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View KPIs
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

VentureDetailPage.title = "Venture Details";

export default VentureDetailPage;
